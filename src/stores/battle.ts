import { defineStore } from 'pinia'
import { sleep } from '@/logic/timeUtils'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { safeStorage } from '@/logic/utils/storage.ts'
import { useGameStore } from './game.ts'
import { useWarStore } from './war.ts'
import { useEventStore } from './events.ts'
import { usePlayerClassStore } from './playerClass.ts'
import { useAudioStore } from './audio.ts'
import { useMapStore } from './map.ts'
import { useUIStore } from './ui.ts'
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '../logic/battle/battleStateMachine.ts'
import { clearVolatileStatus } from '../logic/battle/battleStatus.ts'
import { startBattleSequence, initBattleSequence, restoreBattleState } from '../logic/battle/orchestrator.ts'
import { processFaint, terminateBattle, syncAndPersist } from '../logic/battle/resolution.ts'
import { handleBattleFlowCompletion, triggerNextEncounter, startEncounter } from '../logic/battle/searchLoop.ts'
import { formatBattleLog } from '../logic/battle/battleLogger.ts'
import { executeTurn, runEnemyAction } from '../logic/battle/battleTurn.ts'
import { handleEntryAbilities, applyEndTurnEffects as executeEndTurnEffects } from '../logic/battle/battleFlow.ts'
import { handleItemUsage } from '../logic/battle/battleItems.ts'
import { executeFlee } from '../logic/battle/battleFlee.ts'
import { setupBattleDebug } from '../logic/battle/battleDebug.ts'
import { gameBus } from '@/logic/gameBus'
import type { GameStore, EventStore, AudioStore, UIStore, BattleOptions } from '@/types/stores'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon } from '@/types/pokemon'
import type { BattleState, BattleStages, BattleLog, BattleSource } from '@/types/battle'
import type { Move } from '@/types/pokemon'

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
    fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE || 
    fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE ||
    fsm.currentState.value === BATTLE_STATES.LEVEL_UP_MODAL ||
    fsm.currentState.value === BATTLE_STATES.POST_BATTLE_STABILIZATION ||
    fsm.currentState.value === BATTLE_STATES.REORDER_TEAM ||
    fsm.currentState.value === BATTLE_STATES.FIRST_INTRO ||
    fsm.currentState.value === BATTLE_STATES.INITIALIZING ||
    fsm.currentState.value === BATTLE_STATES.SEARCH_PHASE
  )
  const isFinishing = computed(() => 
    fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE || 
    fsm.currentState.value === BATTLE_STATES.LEVEL_UP_MODAL ||
    fsm.currentState.value === BATTLE_STATES.POST_BATTLE_STABILIZATION ||
    fsm.currentSubState.value === BATTLE_SUBSTATES.ENEMY_FAINT ||
    fsm.currentSubState.value === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ ||
    fsm.currentSubState.value === BATTLE_SUBSTATES.CATCH_SUCCESS
  )
  const isSearching = computed(() => fsm.currentState.value === BATTLE_STATES.SEARCH_PHASE)
  const isReadyToExit = computed(() => 
    fsm.currentState.value === BATTLE_STATES.POST_BATTLE_STABILIZATION && 
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
  const upcomingPokemon = ref<Pokemon | null>(null)
  const debugLoopPokemon = ref<Pokemon | null>(null)
  const exitingPlayer = ref<Pokemon | null>(null)
  const exitingEnemy = ref<Pokemon | null>(null)
  const animations = ref<BattleContext['animations']>()

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)
  
  watch(() => mapStore.currentWeather, (newWeather) => {
    if (activeBattle.value && activeBattle.value.weather && activeBattle.value.weather.turns === -1) {
      activeBattle.value.weather.type = newWeather || 'clear'
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
    upcomingPokemon, 
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
    
  const initBattle = async (locId: string, isTr: boolean, trName: string, isGym: boolean, gymId: string, wasSearching: boolean) => 
    initBattleSequence(getContext(), { 
      locationId: locId, isTrainer: isTr, trainerName: trName, isGym, gymId, wasSearching,
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
      
      if (activeBattle.value && !activeBattle.value.over) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      }
    } catch (error) {
      logger.error('BattleStore', `Error executing move index ${moveIndex}: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al ejecutar el movimiento!', 'log-error')
    } finally {
      isProcessing.value = false
    }
  }

  const applyEndTurnEffects = async () => await executeEndTurnEffects(getContext())

  const handleFaint = async (side: 'player' | 'enemy') => await processFaint(getContext(), side)

  const useItemInBattle = async (itemName: string, targetIndex: number | null = null, itemId?: string) => {
    if (isProcessing.value || !isBattleActive.value || !activeBattle.value) return
    isProcessing.value = true
    
    const targetPoke = (targetIndex !== null) ? gs.state.team[targetIndex] : activeBattle.value.player
    if (!targetPoke) { isProcessing.value = false; return }

    attackerSide.value = 'player'
    if (!activeBattle.value || !activeBattle.value.enemy) { isProcessing.value = false; return }
    
    const res = await handleItemUsage(itemName, targetPoke, activeBattle.value.enemy, { 
      eventStore, addLog, audio, consumeItem, ctx: getContext(), fsm, itemId
    })
    attackerSide.value = null
    activeMove.value = null
    
    const castRes = res as { action: string, pokemon?: Pokemon }
    if (castRes.action === 'capture') {
      activeBattle.value.isCapture = true
      activeBattle.value.over = true 
      gs.addPokemon(castRes.pokemon || null, { notify: true })
      
      // Fase de Festejo (Phase 3 de la captura)
      if (animations.value) {
        await animations.value.playCatchCelebration('enemy')
      }
      
      // Fase de Desvanecimiento (Phase 4 de la captura)
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
      if (animations.value) await animations.value.playBallFadeOut('enemy')
      
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
      activeBattle.value.enemy = null
      isProcessing.value = false
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
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
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

      if (activeBattle.value?.player && activeBattle.value.player.hp <= 0) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RESOLVE_PLAYER_FAINT)
        await handleFaint('player')
        isProcessing.value = false
        return
      }
      if (activeBattle.value?.enemy && activeBattle.value.enemy.hp <= 0) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RESOLVE_ENEMY_FAINT)
        await handleFaint('enemy')
        isProcessing.value = false
        return
      }
    }
    if (activeBattle.value && !activeBattle.value.over) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    }
    isProcessing.value = false
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
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.FIND_HEALTHY)
    
    activeMove.value = null
    attackerSide.value = null
    
    const newPoke = gs.state.team[teamIndex]
    if (!newPoke || newPoke.hp <= 0) { isProcessing.value = false; return }
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.CHECK_ACTIVE_SEAT)
    if (!activeBattle.value) { isProcessing.value = false; return }
    const oldPoke = activeBattle.value.player
    
    if (oldPoke && oldPoke.uid === newPoke.uid) {
      isProcessing.value = false
      return
    }

    if (oldPoke && oldPoke.hp > 0) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
      addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
      addLog(`¡Envía a ${newPoke.name}!`, 'log-info', newPoke)
      
      exitingPlayer.value = oldPoke
      activeBattle.value.player = newPoke
      activeBattle.value.playerTeamIndex = teamIndex
      clearVolatileStatus(oldPoke)

      if (!activeBattle.value.participants.includes(newPoke.uid)) {
        activeBattle.value.participants.push(newPoke.uid)
      }

      const withdrawPromise = animations.value?.handleCatchRequest
        ? animations.value.handleCatchRequest({ side: 'player', pokemon: oldPoke })
        : Promise.resolve()

      const sendOutPromise = animations.value?.handleReleaseRequest
        ? animations.value.handleReleaseRequest({ side: 'player', pokemon: newPoke })
        : Promise.resolve()

      await Promise.all([withdrawPromise, sendOutPromise])
      exitingPlayer.value = null
    } else {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
      activeBattle.value.player = newPoke
      activeBattle.value.playerTeamIndex = teamIndex
      
      if (animations.value?.handleReleaseRequest) {
        await animations.value.handleReleaseRequest({ side: 'player', pokemon: newPoke })
      } else {
        await sleep(800)
      }
    }
    
    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }
    
    const s = playerStages.value
    playerStages.value = { ...INITIAL_STAGES, 
      reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
    
    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
    await sleep(400)

    if (playerStages.value.spikes > 0 && newPoke.type !== 'flying' && newPoke.type2 !== 'flying' && newPoke.ability !== 'Levitación') {
      const dmg = Math.floor(newPoke.maxHp * (playerStages.value.spikes / 8))
      newPoke.hp = Math.max(0, newPoke.hp - dmg)
      addLog(`¡${newPoke.name} recibió daño por las púas!`, 'log-info', newPoke)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
    
    if (activeBattle.value && activeBattle.value.enemy) {
      handleEntryAbilities(newPoke, activeBattle.value.enemy, playerStages.value, enemyStages.value, addLog)
    }
    persistBattle()
    
    if (typeof isForced !== 'undefined' && !isForced) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)
      await runEnemyAction(getContext())
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

      if (activeBattle.value?.player && activeBattle.value.player.hp <= 0) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RESOLVE_PLAYER_FAINT)
        await handleFaint('player')
        isProcessing.value = false
        return
      }
      if (activeBattle.value?.enemy && activeBattle.value.enemy.hp <= 0) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RESOLVE_ENEMY_FAINT)
        await handleFaint('enemy')
        isProcessing.value = false
        return
      }
    }
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    isProcessing.value = false
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
    const { awardDebugExp: awardExpFn } = await import('../logic/battle/resolution.ts')
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
    upcomingPokemon,
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
    flee: async () => await executeFlee(getContext()),
    completeBattleFlow: (option?: string) => completeBattleFlow(option),
    triggerSearchEncounter,
    setFinishing: (cb: () => void) => { fsm.transition(BATTLE_STATES.REWARDS_PHASE); battleEndCallback.value = cb },
    useItemInBattle,
    endBattle,
    handleFaint,
    applyEndTurnEffects,
    startBattle,
    _startBattle: startBattle,
    startEncounter: async () => await startEncounter(getContext()),
    executeSwitch: _executeSwitch
  }
})
