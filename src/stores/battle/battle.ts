import { defineStore } from 'pinia'
import { ref, computed, watch, nextTick, getCurrentScope, onScopeDispose } from 'vue'
import { logger } from '@/logic/utils/logger'
import { safeStorage } from '@/logic/utils/storage.ts'
import { useGameStore } from '@/stores/game.ts'
import { useWarStore } from '@/stores/war.ts'
import { useEventStore } from '@/stores/events.ts'
import { usePlayerClassStore } from '@/stores/player/playerClass.ts'
import { useAudioStore } from '@/stores/audio.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useModalStore } from '@/stores/modals.ts'
import { useErrorStore } from '@/stores/errorStore.ts'
import { gameBus } from '@/logic/events/gameBus.ts'
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine.ts'
import { clearVolatileStatus } from '@/logic/battle/battleStatus.ts'
import { startBattleSequence, initBattleSequence, restoreBattleState } from '@/logic/battle/orchestrator.ts'
import { processFaint, terminateBattle, syncAndPersist } from '@/logic/battle/resolution.ts'
import { handleBattleFlowCompletion, triggerNextEncounter, startEncounter } from '@/logic/battle/searchLoop.ts'
import { executeTurn, runEnemyAction } from '@/logic/battle/battleTurn.ts'
import { applyEndTurnEffects as executeEndTurnEffects } from '@/logic/battle/battleFlow.ts'
import { executeFlee } from '@/logic/battle/battleFlee.ts'
import { setupBattleDebug } from '@/logic/battle/battleDebug.ts'
import { executeBattleSwitch } from './battleSwitchHelper.ts'
import type { BattleSide } from '@/types/battle/battle'
import { setupBattleEventWatchers } from './battleEventWatchers.ts'
import { checkAndAutoRecharge, consumeInventoryItem } from './battleRechargeHelper.ts'
import { createBattleLoggerHelper } from './battleLogHelper.ts'
import type { WeatherId } from '@/logic/weather/weatherRegistry.ts'
import type { MapRouteId } from '@/data/world/map-assets'
import type { ItemId } from '@/data/inventory/items'
import { buildCombatReplayPayload } from '@/logic/battle/helpers/combatReplayHelper.ts'
import { GAME_UI_EVENTS, type BattleEnteringDetail } from '@/types/system/gameEvents.ts'
import { registerBattleFormulasContextResolver } from '@/logic/battle/battleFormulas.ts'
import {
  ACTIVE_BATTLE_STATES,
  isFaintSubstate,
  hasForceSwitchRequest,
  resolveBattleUiConfig,
  syncBattleMapWeather,
  canExecuteMove,
  trackPlayerUsedMove,
  syncPokemonHpEntry,
  applyPendingBattleSwitches,
  shouldResetRevivedPlayerSubstate,
  shouldAdvanceToWaitInput
} from './battleStoreHelper.ts'

import type { GameStore, EventStore, AudioStore, UIStore, BattleOptions } from '@/types/system/stores'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'
import type { Move, Pokemon } from '@/types/pokemon/pokemon'
import type { BattleUiConfig } from '@/types/battle/battleConfig'

const INITIAL_STAGES: BattleStages = { 
  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, 
  reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 
}

export const useBattleStore = defineStore('battle', () => {
  const gs = useGameStore()
  const warStore = useWarStore()
  const eventStore = useEventStore()
  const classStore = usePlayerClassStore()
  const audio = useAudioStore()
  const uiStore = useUIStore()
  
  const activeBattle = ref<BattleState | null>(null)
  const fsm = createBattleStateMachine()
  const currentFsmState = computed(() => fsm.currentState.value)
  const currentSubState = computed(() => fsm.currentSubState.value)
  const faintedSides = ref(new Set<string>())
  const rawShowdownLogs = ref<string[]>([])
  
  const isBattleActive = computed(() => 
    activeBattle.value !== null && ACTIVE_BATTLE_STATES.has(fsm.currentState.value)
  )

  watch(isBattleActive, (active) => {
    uiStore.setBattleActive(active)
  }, { immediate: true })

  const isFinishing = computed(() => 
    fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE || 
    fsm.currentState.value === BATTLE_STATES.LEVEL_UP_MODAL ||
    fsm.currentSubState.value === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ ||
    fsm.currentSubState.value === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ ||
    fsm.currentSubState.value === BATTLE_SUBSTATES.CATCH_SUCCESS
  )
  const isSearching = computed(() => fsm.currentState.value === BATTLE_STATES.SEARCH_PHASE)
  const isReadyToExit = computed(() => 
    fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE && 
    fsm.currentSubState.value === BATTLE_SUBSTATES.DEFEAT_WAIT
  )
  const isIntroAnimating = ref(false)

  
  const isProcessing = ref(false)
  const debugBinoculars = ref(false)
  const debugShowGuides = ref(false)
  const debugShowFxRadius = ref(false)
  const debugShowPokeRadius = ref(false)
  
  const savedZoomVal = safeStorage.getItem('pvs_combat_zoom')
  const debugZoom = ref(savedZoomVal ? Math.max(0.5, Math.min(1.0, parseFloat(savedZoomVal) || 1.0)) : 1.0)

  watch(debugZoom, (newZoom) => {
    safeStorage.setItem('pvs_combat_zoom', String(newZoom))
  })

  const syncActiveMovesFromRequest = async (side: BattleSide) => {
    const { syncActiveMovesFromRequest: syncMoves } = await import('./battleMoveSync.ts')
    syncMoves(activeBattle.value, side)
  }

  watch(
    () => [activeBattle.value?.playerRequest, activeBattle.value?.player],
    () => {
      syncActiveMovesFromRequest('player')
    },
    { deep: true }
  )

  watch(
    () => activeBattle.value?.enemyRequest,
    () => {
      syncActiveMovesFromRequest('enemy')
    },
    { deep: true }
  )

  const battleLogs = ref<BattleLog[]>([])
  const logQueue = ref<BattleLog[]>([])
  const isProcessingLogs = ref(false)
  const battleEndCallback = ref<(() => void) | null>(null)
  const attackerSide = ref<'player' | 'enemy' | null>(null)
  const activeMove = ref<Move | null>(null)

  const trainerAnimState = ref<'idle' | 'in' | 'out'>('idle')
  const isSilhouetteMode = ref(false)

  const playerStages = ref<BattleStages>({ ...INITIAL_STAGES })
  const enemyStages = ref<BattleStages>({ ...INITIAL_STAGES })
  const debugLoopPokemon = ref<Pokemon | null>(null)
  const exitingPlayer = ref<Pokemon | null>(null)
  const exitingEnemy = ref<Pokemon | null>(null)
  const animations = ref<BattleContext['animations']>()

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)
  const playerUsedMoves = ref<string[]>([])
  
  watch(() => player.value?.uid, (newUid, oldUid) => {
    if (newUid !== oldUid) {
      playerUsedMoves.value = []
    }
  })
  
  const handleMapWeatherChanged = (e: Event) => {
    const detail = (e as CustomEvent<{ weather?: WeatherId; mapId?: MapRouteId }>).detail
    if (!detail || !activeBattle.value) return
    syncBattleMapWeather(activeBattle.value, detail.weather, detail.mapId)
  }
  gameBus.on('MAP_WEATHER_CHANGED', handleMapWeatherChanged)
  const handleBattleUseItem = (e: Event) => {
    const detail = (e as CustomEvent<{ itemId: ItemId; targetIndex: number | null }>).detail
    if (detail?.itemId) {
      void useItemInBattle(detail.itemId, detail.targetIndex)
    }
  }
  gameBus.on('BATTLE_USE_ITEM', handleBattleUseItem)
  if (getCurrentScope()) {
    onScopeDispose(() => {
      gameBus.off('MAP_WEATHER_CHANGED', handleMapWeatherChanged)
      gameBus.off('BATTLE_USE_ITEM', handleBattleUseItem)
    })
  }

  registerBattleFormulasContextResolver(() => ({
    isGym: activeBattle.value?.isGym,
    fieldConditions: activeBattle.value?.fieldConditions
  }))

  watch(() => [fsm.currentState.value, fsm.currentSubState.value], ([state, sub]) => {
    if (
      state === BATTLE_STATES.CONTEXT_SETUP ||
      state === BATTLE_STATES.EXIT_BATTLE ||
      sub === BATTLE_SUBSTATES.RESET_FLAGS
    ) {
      if (activeBattle.value) {
        activeBattle.value.minigame = null
      }
      // Ensure minigame modals are closed on exit or reset
      try {
        const modalStore = useModalStore()
        modalStore.close('Fishing')
        modalStore.close('Archaeology')
      } catch (e) {
        logger.warn('BattleStore', 'Could not close minigame modals:', e)
      }
    }
  })

  const isPvP = computed(() => !!activeBattle.value?.isPvP)

  const uiConfig = computed<BattleUiConfig>(() => resolveBattleUiConfig(activeBattle.value))

  const getContext = (): BattleContext => ({
    gs: gs as GameStore,
    warStore, 
    eventStore: eventStore as EventStore,
    classStore, 
    audio: audio as AudioStore,
    uiStore: uiStore as UIStore,
    activeBattle, 
    player, 
    enemy, 
    fsm, 
    BATTLE_STATES, 
    BATTLE_SUBSTATES,
    isBattleActive, 
    isFinishing, 
    isSearching, 
    isReadyToExit, 
    isIntroAnimating,
    isPvP,
    uiConfig,
    isProcessing, 
    debugBinoculars, 
    debugLoopPokemon,
    playerStages, 
    enemyStages, 
    battleLogs, 
    attackerSide, 
    activeMove,
    faintedSides,
    exitingPlayer,
    exitingEnemy,
    get animations() { return animations.value || undefined },
    addLog, 
    endBattle, 
    completeBattleFlow, 
    persistBattle, 
    waitForLogs, 
    clearLogs, 
    clearVolatileStatus, 
    startBattle, 
    _startBattle: startBattle, 
    initBattle,
    handleFaint
  })

  const restoreBattle = async (battleData: BattleState) => await restoreBattleState(getContext(), battleData)

  const persistBattle = () => syncAndPersist(getContext())

  const startBattle = async (enemyPoke: Pokemon, options?: BattleOptions) => {
    logger.info('BattleStore', `startBattle called for ${enemyPoke.name}`, options)
    
    // ATOMIC SYNCHRONOUS PRE-CLEANUP: Transition FSM to CONTEXT_SETUP and vacate all seats immediately!
    fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)

    if (activeBattle.value) {
      activeBattle.value.enemy = null
      activeBattle.value._initialEnemy = null
      activeBattle.value.player = null
      activeBattle.value.enemyTeam = []
    }
    exitingEnemy.value = null
    exitingPlayer.value = null

    if (animations.value?.resetAll) {
      animations.value.resetAll()
    }

    uiStore.closeAll()
    if (typeof window !== 'undefined') {
      const detail: BattleEnteringDetail = { source: 'battle-store' }
      window.dispatchEvent(new CustomEvent<BattleEnteringDetail>(GAME_UI_EVENTS.BATTLE_ENTERING, { detail }))
    }
    await nextTick()
    return startBattleSequence(getContext(), enemyPoke, options)
  }
    
  const initBattle = async (options?: { initialEnemy?: Pokemon | null; initialPlayer?: Pokemon | null; wasSearching?: boolean }) => 
    initBattleSequence(getContext(), { 
      initialEnemy: options?.initialEnemy ?? activeBattle.value?.enemy ?? null,
      initialPlayer: options?.initialPlayer ?? (gs.state.team as Pokemon[]).find(p => p && p.hp > 0) ?? null,
      wasSearching: options?.wasSearching
    })

  const { addLog, clearLogs, waitForLogs } = createBattleLoggerHelper(
    gs,
    activeBattle,
    attackerSide,
    battleLogs,
    logQueue,
    isProcessingLogs,
    playerStages,
    enemyStages,
    activeMove,
    INITIAL_STAGES
  )

  const executeMove = async (moveIndex: number) => {
    if (!canExecuteMove(isProcessing.value, isBattleActive.value, activeBattle.value)) return
    if (isPvP.value) {
      gameBus.emit('PVP_COMMIT_PICK', {
        type: 'move',
        moveIndex,
        choiceString: `move ${moveIndex + 1}`
      })
      return
    }
    isProcessing.value = true
    try {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
      
      trackPlayerUsedMove(playerUsedMoves.value, player.value?.moves, moveIndex)
      
      await executeTurn(getContext(), moveIndex)
      
      if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
        await finalizeTurnExecution()
      }
    } catch (error) {
      logger.error('BattleStore', `Error executing move index ${moveIndex}`, error)
      addLog('¡Ocurrió un error al ejecutar el movimiento!', 'log-error', 'player')
      useErrorStore().setError(error, { type: 'Battle Engine Error', source: `battleStore.executeMove(index:${moveIndex})` })
    } finally {
      isProcessing.value = false
    }
  }

  const finalizeTurnExecution = async () => {
    const battle = activeBattle.value
    if (!battle) return

    if (!battle.over && !isFaintSubstate(fsm.currentSubState.value)) {
      await applyEndTurnEffects()
    }
    let sub = fsm.currentSubState.value

    if (shouldResetRevivedPlayerSubstate(sub, battle, hasForceSwitchRequest(battle))) {
      console.debug(`[E2E-FSM-Safeguard] Player Pokémon was revived/healed. Resetting FSM substate to ANIM_SYNC.`)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
      sub = BATTLE_SUBSTATES.ANIM_SYNC
    }

    if (shouldAdvanceToWaitInput(activeBattle.value, fsm.currentState.value, sub)) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
      isProcessing.value = false
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    }
  }

  const executeStruggle = async () => {
    if (!canExecuteMove(isProcessing.value, isBattleActive.value, activeBattle.value)) return
    isProcessing.value = true
    try {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
      await executeTurn(getContext(), -1)

      if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
        await finalizeTurnExecution()
      }
    } catch (error) {
      logger.error('BattleStore', 'Error executing struggle', error)
      addLog('¡Ocurrió un error al ejecutar Combate!', 'log-error', 'player')
      useErrorStore().setError(error, { type: 'Battle Engine Error', source: 'battleStore.executeCombat' })
    } finally {
      isProcessing.value = false
    }
  }

  const applyEndTurnEffects = async () => await executeEndTurnEffects(getContext())

  const handleFaint = async (side: BattleSide) => await processFaint(getContext(), side)

  const useItemInBattle = async (itemId: ItemId, targetIndex: number | null = null) => {
    if (isProcessing.value || !isBattleActive.value || !activeBattle.value) return

    isProcessing.value = true
    try {
      const { processUseItemInBattle } = await import('./battleItemUseHelper.ts')
      await processUseItemInBattle(getContext(), itemId, targetIndex, {
        eventStore,
        addLog,
        audio,
        consumeItem,
        fsm,
        gs,
        uiStore,
        endBattle,
        handleFaint,
        runEnemyAction,
        persistBattle,
        syncTeamHP
      })
    } catch (error) {
      logger.error('BattleStore', `Error using item in battle: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al usar el objeto!', 'log-error', 'player')
      useErrorStore().setError(error, { type: 'Battle Item Error', source: 'battleStore.useItemInBattle' })
    } finally {
      isProcessing.value = false
    }
  }
  const endBattle = async (win: boolean, fled: boolean) => {
    logger.info('BattleStore', `endBattle called. Win: ${win}, Fled: ${fled}`)
    return terminateBattle(getContext(), win, fled)
  }
  const syncTeamHP = () => {
    const team = gs.state.team;
    const active = activeBattle.value;
    if (!active || !team || active.isPvP) return;

    if (active.player) {
      syncPokemonHpEntry(team, active.player);
    }

    if (Array.isArray(active.playerTeam)) {
      for (const bp of active.playerTeam) {
        syncPokemonHpEntry(team, bp);
      }
    }
  }
  const _executeSwitch = async (targetIdentifier: number | string, isForced = false) => {
    await executeBattleSwitch(getContext(), targetIdentifier, isForced)
  }

  const consumeItem = (itemId: ItemId) => consumeInventoryItem(gs, itemId)

  const completeBattleFlow = async (option?: string) => await handleBattleFlowCompletion(getContext(), option)

  const triggerSearchEncounter = async () => await triggerNextEncounter(getContext())

  const awardDebugExp = async () => {
    const { awardDebugExp: awardExpFn } = await import('@/logic/battle/resolution.ts')
    await awardExpFn(getContext())
  }

  watch(fsm.currentSubState, async (newVal) => {
    if (newVal !== BATTLE_SUBSTATES.WAIT_INPUT) return
    applyPendingBattleSwitches(activeBattle.value)
    await checkAndAutoRecharge(activeBattle, isProcessing, executeMove)
  })

  setupBattleEventWatchers({
    activeBattle,
    fsm,
    player,
    isProcessing,
    isIntroAnimating,
  })

  const getCombatReplayPayload = () => {
    const active = activeBattle.value
    if (!active) return null
    if (!active.rawShowdownLogs && rawShowdownLogs.value.length > 0) {
      active.rawShowdownLogs = [...rawShowdownLogs.value]
    }
    return buildCombatReplayPayload(active)
  }

  if (typeof window !== 'undefined') {
    window.__VITE_DEBUG_STORE_RESOLVER__ = () => useBattleStore() as DebugStore
    setupBattleDebug(getContext())
  }

  return {
    state: activeBattle, isBattleActive, awardDebugExp, isFinishing, isProcessing,
    getCombatReplayPayload,
    isSearching, player, enemy,
    playerUsedMoves, isIntroAnimating,
    isPvP, uiConfig,
    playerStages, enemyStages, battleLogs, debugLoopPokemon, debugBinoculars,
    debugShowGuides, debugShowFxRadius, debugShowPokeRadius, debugZoom,
    attackerSide, activeMove, exitingPlayer, exitingEnemy, animations,
    trainerAnimState, isSilhouetteMode, fsm, currentFsmState, currentSubState,
    isReadyToExit,
    // fallow-ignore-next-line unused-store-member
    restoreBattle,
    addLog,
    // fallow-ignore-next-line unused-store-member
    clearLogs, executeMove, executeStruggle,
    persistBattle, useItemInBattle, endBattle, handleFaint, applyEndTurnEffects, syncTeamHP,
    startBattle, _startBattle: startBattle,
    // fallow-ignore-next-line unused-store-member
    initBattle, executeSwitch: _executeSwitch,
    flee: async () => {
      try {
        await executeFlee(getContext())
      } catch (error) {
        logger.error('BattleStore', `Error fleeing from battle: ${(error as Error).message}`, error)
        useErrorStore().setError(error, { type: 'Battle Flee Error', source: 'battleStore.flee' })
      }
    },
    completeBattleFlow: (option?: string) => completeBattleFlow(option),
    // fallow-ignore-next-line unused-store-member
    triggerSearchEncounter,
    // fallow-ignore-next-line unused-store-member
    setFinishing: (cb: () => void) => { fsm.transition(BATTLE_STATES.REWARDS_PHASE); battleEndCallback.value = cb },
    startEncounter: async () => await startEncounter(getContext()),
    getContext
  }
})
