// fallow-ignore-file circular-dependencies
// [PureVue-Ignore-Length]
import { defineStore } from 'pinia'
import { sleep } from '@/logic/utils/timeUtils'
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
import { mapVisualToOfficialWeather } from '@/logic/weather/weatherGenerationProvider.ts'
import { ACTIVE_GENERATION } from '@/data/system/constants.ts'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
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
  const debugZoom = ref(savedZoomVal ? Math.max(0.5, Math.min(1.0, parseFloat(savedZoomVal) || 1.0)) : 1.0)

  watch(debugZoom, (newZoom) => {
    safeStorage.setItem('pvs_combat_zoom', String(newZoom))
  })

  const syncActiveMovesFromRequest = (side: 'player' | 'enemy') => {
    const active = activeBattle.value
    if (!active) return
    
    const request = side === 'player' ? active.playerRequest : active.enemyRequest
    const poke = side === 'player' ? active.player : active.enemy
    
    if (!poke || !request?.active?.[0]?.moves) return
    
    const reqMoves = request.active[0].moves
    const currentMoves = poke.moves || []
    
    const updatedMoves = reqMoves.map((reqMove: any) => {
      if (!reqMove) return null
      const moveId = reqMove.id
      const match = currentMoves.find(m => m && m.id === moveId)
      if (match) {
        match.pp = reqMove.pp
        match.maxPP = reqMove.maxpp
        return match
      }
      
      const md = pokemonDataProvider.getMoveData(moveId) || {}
      return {
        id: moveId,
        name: reqMove.move || md.name || moveId,
        type: md.type || 'normal',
        cat: (md.cat || 'physical') as 'physical' | 'special' | 'status',
        power: md.power,
        acc: md.acc,
        pp: reqMove.pp,
        maxPP: reqMove.maxpp,
        priority: md.priority || 0,
        effect: md.effect || '',
        target: (md as any).target || 'normal'
      }
    })
    
    poke.moves = updatedMoves.filter((m: any): m is Move => m !== null)
    console.log(`[useBattleStore] Sync'd ${side} moves from request:`, JSON.stringify(poke.moves.map(m => m ? m.id : '')))
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
      activeBattle.value.weather.type = mapVisualToOfficialWeather(newWeather || 'clear', ACTIVE_GENERATION)
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
      
      const move = player.value?.moves[moveIndex]
      if (move && move.id) {
        if (!playerUsedMoves.value.includes(move.id)) {
          playerUsedMoves.value.push(move.id)
        }
      }
      
      await executeTurn(getContext(), moveIndex)
      
      if (!activeBattle.value) {
        return
      }

      const subBeforeEndTurn = fsm.currentSubState.value
      const isFaintSeqBefore = subBeforeEndTurn === BATTLE_SUBSTATES.SWITCH_MENU || 
                               subBeforeEndTurn === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ || 
                               subBeforeEndTurn === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ

      if (!activeBattle.value.over && !isFaintSeqBefore) await applyEndTurnEffects()
      activeMove.value = null
      
      const sub = fsm.currentSubState.value
      const isFaintSeq = sub === BATTLE_SUBSTATES.SWITCH_MENU || 
                         sub === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ || 
                         sub === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ
      console.log(`[E2E-FSM-Safeguard] sub: "${sub}", SWITCH_MENU: "${BATTLE_SUBSTATES.SWITCH_MENU}", PLAYER_FAINT_SEQ: "${BATTLE_SUBSTATES.PLAYER_FAINT_SEQ}", ENEMY_REPLACEMENT_SEQ: "${BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ}", isFaintSeq: ${isFaintSeq}`);
      if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE && !isFaintSeq) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
        isProcessing.value = false
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

  const executeStruggle = async () => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    try {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
      await executeTurn(getContext(), -1)

      if (!activeBattle.value) return

      const subBeforeEndTurn = fsm.currentSubState.value
      const isFaintSeqBefore = subBeforeEndTurn === BATTLE_SUBSTATES.SWITCH_MENU || 
                               subBeforeEndTurn === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ || 
                               subBeforeEndTurn === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ

      if (!activeBattle.value.over && !isFaintSeqBefore) await applyEndTurnEffects()
      activeMove.value = null

      const sub = fsm.currentSubState.value
      const isFaintSeq = sub === BATTLE_SUBSTATES.SWITCH_MENU || 
                         sub === BATTLE_SUBSTATES.PLAYER_FAINT_SEQ || 
                         sub === BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ
      if (activeBattle.value && !activeBattle.value.over && fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE && !isFaintSeq) {
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
        fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      }
    } catch (error) {
      logger.error('BattleStore', `Error executing struggle: ${(error as Error).message}`, error)
      addLog('¡Ocurrió un error al ejecutar Combate!', 'log-error')
      useErrorStore().setError(error, { type: 'Battle Engine Error', source: `battleStore.executeStruggle()` })
    } finally {
      isProcessing.value = false
    }
  }

  const applyEndTurnEffects = async () => await executeEndTurnEffects(getContext())

  const handleFaint = async (side: 'player' | 'enemy') => await processFaint(getContext(), side)

  const useItemInBattle = async (itemId: string, targetIndex: number | null = null) => {
    if (isProcessing.value || !isBattleActive.value || !activeBattle.value) return
    
    const activePoke = activeBattle.value.player
    if (activePoke) {
      const volatile = activePoke.volatileCounters
      if (volatile) {
        if ((volatile['twoturnmove'] && volatile['twoturnmove'] > 0) ||
            (volatile['lockedmove'] && volatile['lockedmove'] > 0)) {
          return
        }
      }
    }

    isProcessing.value = true
    
    try {
      const targetPoke = (targetIndex !== null) ? gs.state.team[targetIndex] : activeBattle.value.player
      if (!targetPoke) { isProcessing.value = false; return }

      attackerSide.value = 'player'
      if (!activeBattle.value || !activeBattle.value.enemy) { isProcessing.value = false; return }
      
      const res = await handleItemUsage(itemId, targetPoke, activeBattle.value.enemy, { 
        eventStore, addLog, audio, consumeItem, ctx: getContext(), fsm, itemId
      })

      // Sincronizar de vuelta si el Pokémon modificado es el activo en el combate
      if (activeBattle.value.player && targetPoke.uid === activeBattle.value.player.uid) {
        activeBattle.value.player.hp = targetPoke.hp
        activeBattle.value.player.status = targetPoke.status
        activeBattle.value.player.moves = targetPoke.moves
      }

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
        if (castRes.pokemon) {
          if (targetIndex !== null && gs.state.team[targetIndex]) {
            gs.state.team[targetIndex] = castRes.pokemon;
          }
          const isTargetActive = (targetIndex === null || targetIndex === activeBattle.value.playerTeamIndex);
          if (isTargetActive && activeBattle.value?.player) {
            activeBattle.value.player = castRes.pokemon;
          }
          syncTeamHP();
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
        isProcessing.value = false
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
    
    if (!isForced) {
      const { isPlayerTrappedInWorker } = await import('@/logic/battle/orchestrator')
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

  const checkAndAutoRecharge = async () => {
    if (!activeBattle.value || activeBattle.value.over) return
    const req = activeBattle.value.playerRequest
    if (req && req.active?.[0]?.moves) {
      const moves = req.active[0].moves
      if (moves && moves.length === 1 && moves[0] && (moves[0].id === 'recharge' || moves[0].move === 'Recharge')) {
        logger.info('BattleStore', 'Forced recharge detected, waiting for isProcessing to clear...')
        await nextTick()
        let retries = 0
        while (isProcessing.value && retries < 20) {
          await sleep(20)
          retries++
        }
        logger.info('BattleStore', 'Auto-submitting executeMove(0) for forced recharge.')
        await executeMove(0)
      }
    }
  }

  watch(fsm.currentSubState, async (newVal) => {
    if (newVal === BATTLE_SUBSTATES.WAIT_INPUT) {
      await checkAndAutoRecharge()
    }
  })

  if (typeof window !== 'undefined') {
    const win = window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => unknown }
    win.__VITE_DEBUG_STORE_RESOLVER__ = () => useBattleStore()
    setupBattleDebug(getContext())
  }

  return {
    state: activeBattle, isBattleActive, awardDebugExp, isFinishing, isProcessing,
    isSearching, player, enemy, playerUsedMoves, isIntroAnimating, isPvP,
    playerStages, enemyStages, battleLogs, debugLoopPokemon, debugBinoculars,
    debugShowGuides, debugShowFxRadius, debugShowPokeRadius, debugZoom,
    attackerSide, activeMove, exitingPlayer, exitingEnemy, animations,
    trainerAnimState, isSilhouetteMode, fsm, currentFsmState, currentSubState,
    isReadyToExit, restoreBattle, addLog, clearLogs, executeMove, executeStruggle,
    persistBattle, useItemInBattle, endBattle, handleFaint, applyEndTurnEffects,
    startBattle, _startBattle: startBattle, initBattle, executeSwitch: _executeSwitch,
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
    startEncounter: async () => await startEncounter(getContext())
  }
})
