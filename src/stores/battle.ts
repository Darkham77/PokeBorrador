import { defineStore } from 'pinia'
import { ref, computed, reactive, watch } from 'vue'
import { useGameStore } from './game'
import { useWarStore } from './war'
import { useEventStore } from './events'
import { usePlayerClassStore } from './playerClass'
import { useAudioStore } from './audio'
import { useMapStore } from './map'
import { useUIStore } from './ui'
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '../logic/battle/battleStateMachine'
import { clearVolatileStatus, tickStatus, tickLeechSeed } from '../logic/battle/battleStatus'
import { startBattleSequence, initBattleSequence, restoreBattleState } from '../logic/battle/orchestrator'
import { processFaint, terminateBattle, syncAndPersist } from '../logic/battle/resolution'
import { handleBattleFlowCompletion, triggerNextEncounter, startEncounter } from '../logic/battle/searchLoop'
import { formatBattleLog } from '../logic/battle/battleLogger'
import { executeTurn, runEnemyAction } from '../logic/battle/battleTurn'
import { applyEndTurnWeather, handleEntryAbilities } from '../logic/battle/battleFlow'
import { handleItemUsage } from '../logic/battle/battleItems'
import { gameBus } from '@/logic/gameBus'

export const useBattleStore = defineStore('battle', () => {
  const gs = useGameStore() as any
  const warStore = useWarStore() as any
  const eventStore = useEventStore() as any
  const classStore = usePlayerClassStore() as any
  const audio = useAudioStore() as any
  const uiStore = useUIStore() as any
  
  const activeBattle = ref(null) as any
  const fsm = createBattleStateMachine()
  const currentFsmState = computed(() => fsm.currentState.value)
  const faintedSides = ref(new Set())
  
  const isBattleActive = computed(() => 
    fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE || 
    fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE ||
    fsm.currentState.value === BATTLE_STATES.LEVEL_UP_MODAL ||
    fsm.currentState.value === BATTLE_STATES.POST_BATTLE_STABILIZATION ||
    fsm.currentState.value === (BATTLE_SUBSTATES as any).REORDER_TEAM ||
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
  const battleLogs = ref([]) as any
  const logQueue = ref([]) as any
  const isProcessingLogs = ref(false)
  const battleEndCallback = ref(null) as any
  const attackerSide = ref(null) as any
  const activeMove = ref(null) as any

  const playerStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }) as any
  const enemyStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }) as any
  const upcomingPokemon = ref(null) as any
  const debugLoopPokemon = ref(null) as any

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)
  
  watch(() => (useMapStore() as any).currentWeather, (newWeather) => {
    if (activeBattle.value && activeBattle.value.weather?.turns === -1) {
      activeBattle.value.weather.type = newWeather || 'clear'
    }
  })

  const getContext = () => ({
    gs, warStore, eventStore, classStore, audio, uiStore,
    activeBattle, player, enemy, fsm, BATTLE_STATES, BATTLE_SUBSTATES,
    isBattleActive, isFinishing, isSearching, isReadyToExit, isIntroAnimating,
    isProcessing, debugBinoculars, upcomingPokemon, debugLoopPokemon,
    playerStages, enemyStages, battleLogs, attackerSide, activeMove,
    faintedSides,
    addLog, endBattle, completeBattleFlow, persistBattle, waitForLogs, 
    clearLogs, clearVolatileStatus, startBattle, _startBattle: startBattle, initBattle
  })

  const restoreBattle = (battleData: any) => restoreBattleState(getContext() as any, battleData)

  const persistBattle = () => syncAndPersist(getContext() as any)

  const startBattle = async (enemyPoke: any, options: any) => startBattleSequence(getContext() as any, enemyPoke, options)
  const initBattle = async (locId: any, isTr: any, trName: any, isGym: any, gymId: any, wasSearching: any) => 
    initBattleSequence(getContext() as any, { 
      locationId: locId, isTrainer: isTr, trainerName: trName, isGym, gymId, wasSearching,
      initialEnemy: activeBattle.value?.enemy,
      initialPlayer: gs.state.team[0]
    })

  const addLog = (msg: any, type = 'log-info', source: any = null, sideOverride = null) => {
    const ctx = {
      gs,
      activeBattle: activeBattle.value,
      attackerSide: attackerSide.value
    }
    
    const logItem = formatBattleLog(msg, type, source, ctx)
    if (sideOverride) (logItem as any).side = sideOverride

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
        battleLogs.value.push(nextItem)
        if (battleLogs.value.length > 30) battleLogs.value.shift()
      }

      const delay = logQueue.value.length > 0 ? 100 : 350
      await new Promise(r => setTimeout(r, delay))
    }
  }

  const clearLogs = () => {
    battleLogs.value = []; logQueue.value = []; isProcessingLogs.value = false;
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    activeMove.value = null
    attackerSide.value = null
  }

  const waitForLogs = async () => {
    while (isProcessingLogs.value || logQueue.value.length > 0) {
      await new Promise(r => setTimeout(r, 100))
    }
  }

  const executeMove = async (moveIndex: any) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
    const thisStore = reactive({ 
      activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
      attackerSide, activeMove, persistBattle, handleFaint, isFinishing,
      fsm, BATTLE_STATES, BATTLE_SUBSTATES
    })
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
    await executeTurn(thisStore as any, moveIndex)
    
    if (!activeBattle.value) {
      isProcessing.value = false
      return
    }

    if (!activeBattle.value.over) await applyEndTurnEffects()
    activeMove.value = null
    
    if (activeBattle.value && !activeBattle.value.over) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ANIM_SYNC)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.UPDATE_BUTTON)
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      isProcessing.value = false
    }
  }

  const applyEndTurnEffects = async () => {
    const p = activeBattle.value?.player
    const e = activeBattle.value?.enemy
    if (!p || !e) return
    
    if (activeBattle.value.futureSightTurns > 0) {
      activeBattle.value.futureSightTurns--
      if (activeBattle.value.futureSightTurns === 0) {
        const fsTarget = activeBattle.value.futureSightTarget
        if (fsTarget && fsTarget.hp > 0) {
          const dmg = Math.max(10, Math.floor(fsTarget.maxHp * 0.15))
          fsTarget.hp = Math.max(0, fsTarget.hp - dmg)
          addLog(`¡Se cumplió la premonición! ${fsTarget.name} recibió daño.`, 'log-info', fsTarget)
          gameBus.emit('PLAY_SOUND', 'statusDamage')
        }
      }
    }

    tickStatus(p, addLog, 'player')
    tickStatus(e, addLog, 'enemy')
    tickLeechSeed(p, e, addLog)
    tickLeechSeed(e, p, addLog)
    
    const w = activeBattle.value.weather
    if (w && w.turns > 0) {
      w.turns--
      if (w.turns === 0) {
        addLog(`¡El efecto de ${w.type} se desvaneció!`, 'log-info')
        w.type = (useMapStore() as any).currentWeather || 'clear'
        w.turns = -1
      }
    }

    const fieldEffects = ['reflect', 'lightScreen', 'safeguard', 'mist']
    const sides = [
      { stages: playerStages, name: 'Jugador', log: 'log-player' },
      { stages: enemyStages, name: 'Enemigo', log: 'log-enemy' }
    ]
    sides.forEach(side => {
      fieldEffects.forEach(effect => {
        if (side.stages.value[effect] > 0) {
          side.stages.value[effect]--
          if (side.stages.value[effect] === 0) {
            const effectLabel = effect === 'reflect' ? 'Reflejo' : effect === 'lightScreen' ? 'Pantalla Luz' : effect
            addLog(`¡El efecto de ${effectLabel} del ${side.name} se desvaneció!`, side.log)
          }
        }
      })
    })

    applyEndTurnWeather(p, e, activeBattle.value.weather, addLog)
    
    if (p.hp <= 0) await handleFaint('player')
    if (isBattleActive.value && e.hp <= 0) await handleFaint('enemy')
    
    persistBattle()
    if (activeBattle.value && !activeBattle.value.over) {
      activeBattle.value.turnCount++
    }
  }

  const handleFaint = async (side: any) => await processFaint(getContext() as any, side)

  const useItemInBattle = async (itemName: any, targetIndex = null) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    
    const targetPoke = (targetIndex !== null) ? gs.state.team[targetIndex] : activeBattle.value.player
    
    attackerSide.value = 'player'
    const ctx = {
      turnCount: activeBattle.value.turnCount,
      locationId: activeBattle.value.locationId,
      weather: activeBattle.value.weather,
      cycle: (useMapStore() as any).currentCycle
    }
    const res = await handleItemUsage(itemName, targetPoke, activeBattle.value.enemy, { 
      gs, eventStore, addLog, audio, consumeItem, ctx, fsm 
    } as any)
    attackerSide.value = null
    activeMove.value = null
    
    if ((res as any).action === 'capture') {
      activeBattle.value.isCapture = true
      activeBattle.value.over = true 
      gs.addPokemon((res as any).pokemon, { notify: true })
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
      activeBattle.value.enemy = null
      await new Promise(r => setTimeout(r, 2000))
      
      isProcessing.value = false
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
      await endBattle(true, false)
      return
    } else if ((res as any).action !== 'fail') {
      if ((res as any).pokemon && activeBattle.value?.player) {
        activeBattle.value.player = { ...(res as any).pokemon }
        syncTeamHP()
      }
      
      persistBattle()
      await new Promise(r => setTimeout(r, 800))
      
      const thisStore = reactive({ 
        activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
        attackerSide, activeMove, persistBattle, handleFaint, isFinishing
      })
      await runEnemyAction(thisStore as any)
    }
    
    if (activeBattle.value && !activeBattle.value.over) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    }
    isProcessing.value = false
  }

  const endBattle = async (win: any, fled: any) => await terminateBattle(getContext() as any, win, fled)

  const syncTeamHP = () => {
    // Sincronización manual de HP
    if (activeBattle.value?.player && gs.state.team[activeBattle.value.playerTeamIndex]) {
      gs.state.team[activeBattle.value.playerTeamIndex].hp = activeBattle.value.player.hp
    }
  }
  
  const _executeSwitch = async (teamIndex: any, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.FIND_HEALTHY)
    
    activeMove.value = null
    attackerSide.value = null
    
    const newPoke = gs.state.team[teamIndex]
    if (!newPoke || newPoke.hp <= 0) { isProcessing.value = false; return }
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.CHECK_ACTIVE_SEAT)
    const oldPoke = activeBattle.value.player
    
    if (oldPoke && oldPoke.uid === newPoke.uid) {
      isProcessing.value = false
      return
    }

    if (oldPoke && oldPoke.hp > 0) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_RECALL)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
      addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.WAIT_TIMER, 500)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.VACATE_SEAT)
      activeBattle.value.player = null
      clearVolatileStatus(oldPoke)
    }

    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.OCCUPY_SEAT)
    activeBattle.value.player = newPoke; 
    activeBattle.value.playerTeamIndex = teamIndex
    
    gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: newPoke })
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RELEASE)
    await new Promise(r => setTimeout(r, 800))
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_APPEAR)
    
    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }
    
    const s = playerStages.value
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
      reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
    
    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
    await new Promise(r => setTimeout(r, 400))

    if (playerStages.value.spikes > 0 && newPoke.type !== 'flying' && (newPoke as any).type2 !== 'flying' && newPoke.ability !== 'Levitación') {
      const dmg = Math.floor(newPoke.maxHp * (playerStages.value.spikes / 8))
      newPoke.hp = Math.max(0, newPoke.hp - dmg)
      addLog(`¡${newPoke.name} recibió daño por las púas!`, 'log-info', newPoke)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
    
    handleEntryAbilities(newPoke, activeBattle.value.enemy, playerStages.value, enemyStages.value, addLog)
    persistBattle()
    
    const thisStore = reactive({ 
      activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
      attackerSide, activeMove, persistBattle, handleFaint, isFinishing
    })
    
    if (!isForced) await runEnemyAction(thisStore as any)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    isProcessing.value = false
  }

  const consumeItem = (itemName: any) => {
    if (gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
  }

  const completeBattleFlow = async (option: any) => await handleBattleFlowCompletion(getContext() as any, option)

  const triggerSearchEncounter = async () => await triggerNextEncounter(getContext() as any)




  if (typeof window !== 'undefined') {
    (window as any).__VITE_DEBUG__ = (window as any).__VITE_DEBUG__ || {};
    (window as any).__VITE_DEBUG__.forceFlee = async () => {
      console.warn('[DEBUG] Forzando huida del combate...')
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FLEE_ATTEMPT)
      await endBattle(false, true)
    };

    (window as any).__VITE_DEBUG__.battle = {
      setPlayerStatus: (s: any) => activeBattle.value.player.status = s,
      setEnemyStatus: (s: any) => activeBattle.value.enemy.status = s,
      setPlayerStage: (stat: any, val: any) => playerStages.value[stat] = val,
      setEnemyStage: (stat: any, val: any) => enemyStages.value[stat] = val,
      setWeather: (w: any) => activeBattle.value.weather = { type: w, turns: 5 },
      fullHeal: () => {
        const p = activeBattle.value.player;
        p.hp = p.maxHp; p.status = null; p.confused = 0; p.seeded = false
      },
      killEnemy: () => activeBattle.value.enemy.hp = 0,
      store: () => useBattleStore()
    }
  }

  return {
    state: activeBattle,
    battleLogs,
    isBattleActive,
    isFinishing,
    isProcessing,
    player,
    enemy,
    playerStages,
    enemyStages,
    attackerSide,
    activeMove,
    upcomingPokemon,
    debugLoopPokemon,
    restoreBattle,
    addLog,
    clearLogs,
    executeMove,
    persistBattle,
    flee: async () => {
      if (isProcessing.value) return;
      
      if (activeBattle.value && (activeBattle.value.isTrainer || activeBattle.value.isGym)) {
        addLog('¡No puedes huir de un combate de entrenador!', 'log-error', 'player');
        return;
      }

      uiStore.openConfirm({
        title: 'HUIR DEL COMBATE',
        message: '¿Estás seguro que deseas huir de este encuentro?',
        confirmText: 'SÍ, HUIR',
        cancelText: 'VOLVER',
        type: 'primary',
        variant: 'retro',
        onConfirm: async () => {
          isProcessing.value = true;
          activeBattle.value.escapeAttempts = (activeBattle.value.escapeAttempts || 0);
          
          const { calculateEscapeChance } = await import('../logic/battle/battleEngine');
          const canEscape = calculateEscapeChance(
            activeBattle.value.player, 
            activeBattle.value.enemy, 
            activeBattle.value.escapeAttempts, 
            { 
              playerStages: playerStages.value, 
              enemyStages: enemyStages.value, 
              weather: activeBattle.value.weather 
            }
          );

          if (canEscape) {
            audio.flee();
            addLog('¡Escapaste sin problemas!', 'log-info', 'player');
            
            fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ESCAPE_PROCESS);
            fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM);
            gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player' });
            
            await new Promise(r => setTimeout(r, 1000));
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT);
            activeBattle.value.enemy = null;
            await endBattle(false, true);
          } else {
            activeBattle.value.escapeAttempts++;
            addLog('¡No pudiste escapar!', 'log-info', 'player');
            
            const thisStore = reactive({ 
              activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
              attackerSide, activeMove, persistBattle, handleFaint, isFinishing
            });
            await runEnemyAction(thisStore as any);
          }
          isProcessing.value = false;
        }
      });
    },
    completeBattleFlow,
    triggerSearchEncounter,
    setFinishing: (cb: any) => { fsm.transition(BATTLE_STATES.REWARDS_PHASE); battleEndCallback.value = cb },
    useItemInBattle,
    endBattle,
    handleFaint,
    applyEndTurnEffects,
    startBattle,
    _startBattle: startBattle,
    startEncounter: async () => await startEncounter(getContext() as any),
    executeSwitch: _executeSwitch,
    isSearching,
    isIntroAnimating,
    debugBinoculars,
    fsm,
    currentFsmState
  }
})
