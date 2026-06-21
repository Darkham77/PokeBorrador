// fallow-ignore-file circular-dependencies
// [PureVue-Ignore-Length]
import { defineStore } from 'pinia'
import { sleep } from '@/logic/utils/timeUtils'
import { ref, computed, watch } from 'vue'
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
import { startBattleSequence, initBattleSequence, restoreBattleState } from '@/logic/battle/orchestrator.ts'
import { processFaint, terminateBattle, syncAndPersist } from '@/logic/battle/resolution.ts'
import { handleBattleFlowCompletion, triggerNextEncounter, startEncounter } from '@/logic/battle/searchLoop.ts'
import { formatBattleLog } from '@/logic/battle/battleLogger.ts'
import { executeTurn, runEnemyAction } from '@/logic/battle/battleTurn.ts'
import { applyEndTurnEffects as executeEndTurnEffects } from '@/logic/battle/battleFlow.ts'
import { handleItemUsage } from '@/logic/battle/battleItems.ts'
import { executeFlee } from '@/logic/battle/battleFlee.ts'
import { setupBattleDebug } from '@/logic/battle/battleDebug.ts'
import { executeSwitch as switchAction } from '@/logic/battle/actions/switchAction.ts'
import { getMechanicalWeather } from '@/logic/weather/weatherRegistry.ts'
import type { GameStore, EventStore, AudioStore, UIStore, BattleOptions } from '@/types/system/stores'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState, BattleStages, BattleLog, BattleSource } from '@/types/battle/battle'
import type { Move } from '@/types/pokemon/pokemon'

const INITIAL_STAGES: BattleStages = { 
  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
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
  const parsedZoom = savedZoomVal !== null ? parseFloat(savedZoomVal) : 1.0
  const initialZoom = !isNaN(parsedZoom) ? Math.max(0.5, Math.min(1.0, parsedZoom)) : 1.0
  const debugZoom = ref(initialZoom)

  watch(debugZoom, (newZoom) => {
    safeStorage.setItem('pvs_combat_zoom', String(newZoom))
  })

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
  
  watch(() => mapStore.currentWeather, (newWeather) => {
    if (activeBattle.value && activeBattle.value.weather && activeBattle.value.weather.turns === -1) {
      // Sincronizar tanto el tipo mecánico como el visual con el clima actual del mapa
      activeBattle.value.weather.type = getMechanicalWeather(newWeather || 'clear')
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
        activeBattle.value.isFishing = false
        activeBattle.value.isArchaeology = false
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
    gs: gs as unknown as GameStore, 
    warStore, 
    eventStore: eventStore as unknown as EventStore, 
    classStore, 
    audio: audio as unknown as AudioStore, 
    uiStore: uiStore as unknown as UIStore,
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

  const restoreBattle = (battleData: BattleState) => restoreBattleState(getContext(), battleData)

  const persistBattle = () => syncAndPersist(getContext())

  const startBattle = async (enemyPoke: Pokemon, options?: BattleOptions) => {
    logger.info('BattleStore', `startBattle called for ${enemyPoke.name}`, options)
    return startBattleSequence(getContext(), enemyPoke, options)
  }
    
  const initBattle = async () => 
    initBattleSequence(getContext(), { 
      initialEnemy: activeBattle.value?.enemy || null,
      initialPlayer: (gs.state.team as Pokemon[]).find(p => p && p.hp > 0) || null
    })

  const addLog = (msg: string, type = 'log-info', source: BattleSource | null = null, sideOverride: 'player' | 'enemy' | null = null) => {
    const ctx = {
      gs,
      activeBattle: activeBattle.value,
      attackerSide: attackerSide.value
    }
    
    const logItem = formatBattleLog(msg, type, source as BattleSource, ctx)
    if (sideOverride) logItem.side = sideOverride

    logQueue.value.push(logItem)
    if (!isProcessingLogs.value) processNextLog()
  }


  const processNextLog = async () => {
    if (isProcessingLogs.value) return 
    isProcessingLogs.value = true

    while (true) {
      if (logQueue.value.length === 0) {
        isProcessingLogs.value = false
        if (logQueue.value.length > 0) {
          isProcessingLogs.value = true
          continue
        }
        break
      }

      const batchSize = logQueue.value.length > 6 ? 3 : (logQueue.value.length > 3 ? 2 : 1)
      
      for (let i = 0; i < batchSize; i++) {
        if (logQueue.value.length === 0) break
        const nextItem = logQueue.value.shift()
        if (nextItem) {
          battleLogs.value.push(nextItem)
          if (battleLogs.value.length > 30) battleLogs.value.shift()
        }
      }

      const delay = logQueue.value.length > 0 ? 100 : 350
      await sleep(delay)
    }
  }

  const clearLogs = () => {
    battleLogs.value = []; logQueue.value = []; isProcessingLogs.value = false;
    playerStages.value = { ...INITIAL_STAGES }
    enemyStages.value = { ...INITIAL_STAGES }
    activeMove.value = null
    attackerSide.value = null
  }

  const waitForLogs = async () => {
    while (isProcessingLogs.value || logQueue.value.length > 0) {
      await sleep(100)
    }
  }

  const executeMove = async (moveIndex: number) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    try {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
      await executeTurn(getContext(), moveIndex)
      
      if (!activeBattle.value) {
        return
      }

      if (!activeBattle.value.over) await applyEndTurnEffects()
      activeMove.value = null
      
      if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      }
    } catch (error) {
      logger.error('BattleStore', `Error executing move index ${moveIndex}: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al ejecutar el movimiento!', 'log-error')
      useErrorStore().setError(error, { type: 'Battle Engine Error', source: `battleStore.executeMove(index:${moveIndex})` })
    } finally {
      isProcessing.value = false
    }
  }

  const applyEndTurnEffects = async () => await executeEndTurnEffects(getContext())

  const handleFaint = async (side: 'player' | 'enemy') => await processFaint(getContext(), side)

  const useItemInBattle = async (itemId: string, targetIndex: number | null = null) => {
    if (isProcessing.value || !isBattleActive.value || !activeBattle.value) return
    isProcessing.value = true
    
    try {
      const targetPoke = (targetIndex !== null) ? gs.state.team[targetIndex] : activeBattle.value.player
      if (!targetPoke) { isProcessing.value = false; return }

      attackerSide.value = 'player'
      if (!activeBattle.value || !activeBattle.value.enemy) { isProcessing.value = false; return }
      
      const res = await handleItemUsage(itemId, targetPoke, activeBattle.value.enemy, { 
        eventStore, addLog, audio, consumeItem, ctx: getContext(), fsm, itemId
      })
      attackerSide.value = null
      activeMove.value = null
      
      const castRes = res as { action: string, pokemon?: Pokemon }
      if (castRes.action === 'capture') {
        activeBattle.value.isCapture = true
        activeBattle.value.over = true 
        
        // Cazabichos: Red Maestra (20% chance to duplicate captured bug Pokemon)
        if (gs.state.playerClass === 'cazabichos' && castRes.pokemon) {
          const cap = castRes.pokemon;
          const t1 = String(cap.type || '').toLowerCase();
          const t2 = String(cap.type2 || '').toLowerCase();
          const isBug = t1 === 'bug' || t1 === 'bicho' || t2 === 'bug' || t2 === 'bicho';
          
          if (isBug && Math.random() < 0.20) {
            const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
            const clone = makePokemon(cap.id, cap.level || 5);
            if (clone) {
              clone.caught = true;
              clone.nickname = cap.nickname;
              gs.state.box.push(clone);
              addLog(`¡Red Maestra duplicó la captura! Se envió una copia de ${clone.name} a la caja.`, 'log-success', 'player');
              uiStore.notify(`¡Captura duplicada! Copia de ${clone.name} en la caja`, '🕸️');
            }
          }
        }

        gs.addPokemon(castRes.pokemon || null, { notify: true })
        isProcessing.value = false
        await endBattle(true, false)
        return
      } else if (castRes.action !== 'fail') {
        if (castRes.pokemon && activeBattle.value?.player) {
          const isTargetActive = (targetIndex === null || targetIndex === activeBattle.value.playerTeamIndex)
          if (isTargetActive) {
            activeBattle.value.player = { ...castRes.pokemon }
            syncTeamHP()
          }
        }
        persistBattle()
        if (castRes.action === 'heal') {
          await sleep(800)
        }
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
        await runEnemyAction(getContext())
        
        if (activeBattle.value?.over) {
          if (activeBattle.value.fled) {
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
            const ctx = getContext()
            if (ctx.animations?.awaitTween) {
              await ctx.animations.awaitTween('escape-enemy')
            } else {
              await sleep(800)
            }
            await endBattle(false, true)
          }
          isProcessing.value = false
          return
        }

        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

        if (activeBattle.value?.player && activeBattle.value.player.hp <= 0) {
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
          await handleFaint('player')
          isProcessing.value = false
          return
        }
        if (activeBattle.value?.enemy && activeBattle.value.enemy.hp <= 0) {
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
          await handleFaint('enemy')
          isProcessing.value = false
          return
        }
      }
      if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      }
    } catch (error) {
      logger.error('BattleStore', `Error using item in battle: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al usar el objeto!', 'log-error')
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
    if (active?.player && team && team[active.playerTeamIndex]) {
      const p = team[active.playerTeamIndex];
      if (p) p.hp = active.player.hp
    }
  }
  const _executeSwitch = async (teamIndex: number, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true
    try {
      await switchAction(getContext(), teamIndex, isForced)
    } catch (error) {
      logger.error('BattleStore', `Error switching pokemon: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al cambiar de Pokémon!', 'log-error')
      useErrorStore().setError(error, { type: 'Battle Switch Error', source: 'battleStore.executeSwitch' })
    } finally {
      isProcessing.value = false
    }
  }

  const consumeItem = (itemName: string) => {
    if (gs.state && gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state && gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
  }

  const completeBattleFlow = async (option?: string) => await handleBattleFlowCompletion(getContext(), option)

  const triggerSearchEncounter = async () => await triggerNextEncounter(getContext())

  const awardDebugExp = async () => {
    const { awardDebugExp: awardExpFn } = await import('@/logic/battle/resolution.ts')
    await awardExpFn(getContext())
  }

  if (typeof window !== 'undefined') {
    const win = window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => unknown }
    win.__VITE_DEBUG_STORE_RESOLVER__ = () => useBattleStore()
    setupBattleDebug(getContext())
  }

  return {
    state: activeBattle,
    isBattleActive,
    awardDebugExp,
    isFinishing,
    isProcessing,
    isSearching,
    player,
    enemy,
    isIntroAnimating,
    isPvP,
    playerStages,
    enemyStages,
    battleLogs,
    debugLoopPokemon,
    debugBinoculars,
    debugShowGuides,
    debugShowFxRadius,
    debugShowPokeRadius,
    debugZoom,
    attackerSide,
    activeMove,
    exitingPlayer,
    exitingEnemy,
    animations,
    trainerAnimState,
    isSilhouetteMode,
    fsm,
    currentFsmState,
    currentSubState,
    isReadyToExit,
    restoreBattle,
    addLog,
    clearLogs,
    executeMove,
    persistBattle,
    flee: async () => {
      try {
        await executeFlee(getContext())
      } catch (error) {
        logger.error('BattleStore', `Error fleeing from battle: ${(error as Error).message}`, error)
        useErrorStore().setError(error, { type: 'Battle Flee Error', source: 'battleStore.flee' })
      }
    },
    completeBattleFlow: (option?: string) => completeBattleFlow(option),
    triggerSearchEncounter,
    setFinishing: (cb: () => void) => { fsm.transition(BATTLE_STATES.REWARDS_PHASE); battleEndCallback.value = cb },
    useItemInBattle,
    endBattle,
    handleFaint,
    applyEndTurnEffects,
    startBattle,
    _startBattle: startBattle,
    initBattle,
    startEncounter: async () => await startEncounter(getContext()),
    executeSwitch: _executeSwitch
  }
})
