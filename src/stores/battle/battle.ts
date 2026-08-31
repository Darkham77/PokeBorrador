import { defineStore } from 'pinia'
import { gsapSleep } from '@/logic/utils/gsapHelpers'
import { ref, computed, watch, nextTick } from 'vue'
import { logger } from '@/logic/utils/logger'
import { safeStorage } from '@/logic/utils/storage.ts'
import { useGameStore } from '@/stores/game.ts'
import { useWarStore } from '@/stores/war.ts'
import { useEventStore } from '@/stores/events.ts'
import { usePlayerClassStore } from '@/stores/player/playerClass.ts'
import { useAudioStore } from '@/stores/audio.ts'
import { useMapStore } from '@/stores/map.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useModalStore } from '@/stores/modals.ts'
import { useErrorStore } from '@/stores/errorStore.ts'
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine.ts'
import { clearVolatileStatus } from '@/logic/battle/battleStatus.ts'
import { startBattleSequence, initBattleSequence, restoreBattleState, isPlayerTrappedInWorker } from '@/logic/battle/orchestrator.ts'
import { processFaint, terminateBattle, syncAndPersist } from '@/logic/battle/resolution.ts'
import { handleBattleFlowCompletion, triggerNextEncounter, startEncounter } from '@/logic/battle/searchLoop.ts'
import { executeTurn, runEnemyAction } from '@/logic/battle/battleTurn.ts'
import { applyEndTurnEffects as executeEndTurnEffects } from '@/logic/battle/battleFlow.ts'
import { executeFlee } from '@/logic/battle/battleFlee.ts'
import { setupBattleDebug } from '@/logic/battle/battleDebug.ts'
import { executeSwitch as switchAction } from '@/logic/battle/actions/switchAction.ts'
import type { BattleSide } from '@/types/battle/battle'
import { setupBattleEventWatchers } from './battleEventWatchers.ts'
import { findMatchingPokemon } from '@/logic/battle/showdownUidMapper.ts'
import { createBattleLoggerHelper } from './battleLogHelper.ts'
import { requireWeatherId } from '@/logic/weather/weatherRegistry.ts'
import type { ItemId } from '@/data/inventory/items'
import { GAME_UI_EVENTS, type BattleEnteringDetail } from '@/types/system/gameEvents.ts'

import type { GameStore, EventStore, AudioStore, UIStore, BattleOptions } from '@/types/system/stores'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'
import type { Move } from '@/types/pokemon/pokemon'

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
  const mapStore = useMapStore()
  
  const activeBattle = ref<BattleState | null>(null)
  const fsm = createBattleStateMachine()
  const currentFsmState = computed(() => fsm.currentState.value)
  const currentSubState = computed(() => fsm.currentSubState.value)
  const faintedSides = ref(new Set<string>())
  
  const isBattleActive = computed(() => 
    activeBattle.value !== null && (
      fsm.currentState.value === BATTLE_STATES.CONTEXT_SETUP ||
      fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE || 
      fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE ||
      fsm.currentState.value === BATTLE_STATES.LEVEL_UP_MODAL ||
      fsm.currentState.value === BATTLE_STATES.REORDER_TEAM ||
      fsm.currentState.value === BATTLE_STATES.FIRST_INTRO ||
      fsm.currentState.value === BATTLE_STATES.INITIALIZING ||
      fsm.currentState.value === BATTLE_STATES.SEARCH_PHASE ||
      fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE
    )
  )
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
    () => activeBattle.value?.playerRequest,
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
  
  watch(() => mapStore.currentWeather, (newWeather) => {
    if (activeBattle.value && activeBattle.value.weather && activeBattle.value.weather.turns === -1) {
      // Sincronizar el tipo con el clima oficial según la generación, y el visual con el del mapa
      activeBattle.value.weather.type = requireWeatherId(newWeather || 'clear')
      activeBattle.value.weather.visual = newWeather || 'clear'
    }
  })

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
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    try {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
      
      const move = player.value?.moves[moveIndex]
      if (move && move.id) {
        if (!playerUsedMoves.value.includes(move.id)) {
          playerUsedMoves.value.push(move.id)
        }
      }
      
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
    if (!activeBattle.value) {
      return
    }

    const subBeforeEndTurn = fsm.currentSubState.value
    const isFaintSeqBefore = subBeforeEndTurn === BATTLE_SUBSTATES.SWITCH_MENU || 
                             subBeforeEndTurn === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ || 
                             subBeforeEndTurn === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ

    if (!activeBattle.value.over && !isFaintSeqBefore) await applyEndTurnEffects()
    let sub = fsm.currentSubState.value
    const hasPendingForceSwitch = Array.isArray(activeBattle.value?.playerRequest?.forceSwitch)
      ? activeBattle.value.playerRequest.forceSwitch.some(x => !!x)
      : !!activeBattle.value?.playerRequest?.forceSwitch

    if ((sub === BATTLE_SUBSTATES.SWITCH_MENU || sub === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ) && 
        activeBattle.value?.player && activeBattle.value.player.hp > 0 && 
        !hasPendingForceSwitch) {
      console.debug(`[E2E-FSM-Safeguard] Player Pokémon was revived/healed. Resetting FSM substate to ANIM_SYNC.`);
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
      sub = BATTLE_SUBSTATES.ANIM_SYNC
    }

    const isFaintSeq = sub === BATTLE_SUBSTATES.SWITCH_MENU || 
                       sub === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ || 
                       sub === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ
    console.debug(`[E2E-FSM-Safeguard] sub: "${sub}", SWITCH_MENU: "${BATTLE_SUBSTATES.SWITCH_MENU}", PLAYER_FAINT_SEQ: "${BATTLE_SUBSTATES.PLAYER_FAINT_SEQ}", ENEMY_REPLACEMENT_SEQ: "${BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ}", isFaintSeq: ${isFaintSeq}`);
    if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE && !isFaintSeq) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
      isProcessing.value = false
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    }
  }

  const executeStruggle = async () => {
    if (isProcessing.value || !isBattleActive.value) return
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
    if (!active || !team) return;

    if (active.player?.uid) {
      const activeMatch = findMatchingPokemon(active.player.uid, team);
      if (activeMatch) activeMatch.hp = active.player.hp;
    }

    if (Array.isArray(active.playerTeam)) {
      for (const bp of active.playerTeam) {
        if (!bp) continue;
        const matchingMon = bp.uid
          ? findMatchingPokemon(bp.uid, team)
          : team.find(p => p && p.id === bp.id);
        if (matchingMon && typeof bp.hp === 'number') {
          matchingMon.hp = bp.hp;
        }
      }
    }
  }
  const _executeSwitch = async (teamIndex: number, isForced = false) => {
    if (isProcessing.value && !isForced) return
    
    if (!isForced) {
      const isTrapped = await isPlayerTrappedInWorker()
      if (isTrapped) {
        uiStore.notify('¡No puedes cambiar de Pokémon ahora! (Atrapado)', '🚫')
        return
      }
    }

    isProcessing.value = true
    try {
      await switchAction(getContext(), teamIndex, isForced)
    } catch (error) {
      logger.error('BattleStore', `Error switching pokemon: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al cambiar de Pokémon!', 'log-error', 'player')
      useErrorStore().setError(error, { type: 'Battle Switch Error', source: 'battleStore.executeSwitch' })
    } finally {
      isProcessing.value = false
    }
  }

  const consumeItem = (itemId: ItemId) => {
    if (gs.state?.inventory?.[itemId]) {
      gs.state.inventory[itemId]!--
      if (gs.state.inventory[itemId]! <= 0) delete gs.state.inventory[itemId]
    }
  }

  const completeBattleFlow = async (option?: string) => await handleBattleFlowCompletion(getContext(), option)

  const triggerSearchEncounter = async () => await triggerNextEncounter(getContext())

  const awardDebugExp = async () => {
    const { awardDebugExp: awardExpFn } = await import('@/logic/battle/resolution.ts')
    await awardExpFn(getContext())
  }

  const checkAndAutoRecharge = async () => {
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isDeterministicSimulation) return
    if (!activeBattle.value || activeBattle.value.over) return
    const req = activeBattle.value.playerRequest
    if (req && req.active?.[0]?.moves) {
      const moves = req.active[0].moves
      if (moves && moves.length === 1 && moves[0] && moves[0].move === 'Recharge') {
        logger.info('BattleStore', 'Forced recharge detected, waiting for isProcessing to clear...')
        await nextTick()
        let retries = 0
        const MAX_PROCESSING_WAIT_RETRIES = 20
        const PROCESSING_WAIT_SLEEP_MS = 20
        while (isProcessing.value && retries < MAX_PROCESSING_WAIT_RETRIES) {
          await gsapSleep(PROCESSING_WAIT_SLEEP_MS)
          retries++
        }
        logger.info('BattleStore', 'Auto-submitting executeMove(0) for forced recharge.')
        await executeMove(0)
      }
    }
  }

  watch(fsm.currentSubState, async (newVal) => {
    if (newVal === BATTLE_SUBSTATES.WAIT_INPUT) {
      if (activeBattle.value) {
        const switchingToPlayer = Reflect.get(activeBattle.value, 'switchingToPlayer') as Pokemon | undefined
        if (switchingToPlayer) {
          activeBattle.value.player = switchingToPlayer
          Reflect.deleteProperty(activeBattle.value, 'switchingToPlayer')
        }
        const switchingToEnemy = Reflect.get(activeBattle.value, 'switchingToEnemy') as Pokemon | undefined
        if (switchingToEnemy) {
          activeBattle.value.enemy = switchingToEnemy
          Reflect.deleteProperty(activeBattle.value, 'switchingToEnemy')
        }
      }
      await checkAndAutoRecharge()
    }
  })

  setupBattleEventWatchers({
    activeBattle,
    fsm,
    player,
    isProcessing,
    isIntroAnimating,
  })

  if (typeof window !== 'undefined') {
    window.__VITE_DEBUG_STORE_RESOLVER__ = () => useBattleStore() as DebugStore
    setupBattleDebug(getContext())
  }

  return {
    state: activeBattle, isBattleActive, awardDebugExp, isFinishing, isProcessing,
    isSearching, player, enemy,
    // fallow-ignore-next-line unused-store-member
    playerUsedMoves, isIntroAnimating,
    // fallow-ignore-next-line unused-store-member
    isPvP,
    playerStages, enemyStages, battleLogs, debugLoopPokemon, debugBinoculars,
    debugShowGuides, debugShowFxRadius, debugShowPokeRadius, debugZoom,
    attackerSide, activeMove, exitingPlayer, exitingEnemy, animations,
    trainerAnimState, isSilhouetteMode, fsm, currentFsmState, currentSubState,
    isReadyToExit, restoreBattle, addLog,
    // fallow-ignore-next-line unused-store-member
    clearLogs, executeMove, executeStruggle,
    // fallow-ignore-next-line unused-store-member
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
