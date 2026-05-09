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
  const gs = useGameStore()
  const warStore = useWarStore()
  const eventStore = useEventStore()
  const classStore = usePlayerClassStore()
  const audio = useAudioStore()
  
  const activeBattle = ref(null)
  const fsm = createBattleStateMachine()
  const currentFsmState = computed(() => fsm.currentState.value)
  const faintedSides = ref(new Set())
  
  const isBattleActive = computed(() => 
    fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE || 
    fsm.currentState.value === BATTLE_STATES.REWARDS_PHASE ||
    fsm.currentState.value === BATTLE_STATES.LEVEL_UP_MODAL ||
    fsm.currentState.value === BATTLE_STATES.POST_BATTLE_STABILIZATION ||
    fsm.currentState.value === BATTLE_SUBSTATES.REORDER_TEAM ||
    fsm.currentState.value === BATTLE_STATES.FIRST_INTRO ||
    fsm.currentState.value === BATTLE_STATES.PLAYER_INTRO ||
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
  const debugBinoculars = ref(false) // Nueva flag para debug
  const battleLogs = ref([])
  const logQueue = ref([])
  const isProcessingLogs = ref(false)
  const battleEndCallback = ref(null)
  const attackerSide = ref(null) // 'player' or 'enemy'
  const activeMove = ref(null)

  const playerStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 })
  const enemyStages = ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 })
  const upcomingPokemon = ref(null)
  const debugLoopPokemon = ref(null) // Plantilla para bucle infinito debug

  const player = computed(() => activeBattle.value?.player)
  const enemy = computed(() => activeBattle.value?.enemy)

  const mapStore = useMapStore()
  
  // Sincronizar clima permanente con cambios en el mapa (tiempo real)
  watch(() => mapStore.currentWeather, (newWeather) => {
    if (activeBattle.value && activeBattle.value.weather?.turns === -1) {
      activeBattle.value.weather.type = newWeather || 'clear'
    }
  })

  /**
   * Crea un objeto de contexto con las referencias y utilidades necesarias
   * para los servicios externos.
   */
  const getContext = () => ({
    gs, warStore, eventStore, classStore, audio, uiStore: useUIStore(),
    activeBattle, player, enemy, fsm, BATTLE_STATES, BATTLE_SUBSTATES,
    isBattleActive, isFinishing, isSearching, isReadyToExit, isIntroAnimating,
    isProcessing, debugBinoculars, upcomingPokemon, debugLoopPokemon,
    playerStages, enemyStages, battleLogs, attackerSide, activeMove,
    faintedSides,
    addLog, endBattle, completeBattleFlow, persistBattle, waitForLogs, 
    clearLogs, clearVolatileStatus, _startBattle, initBattle
  })

  const restoreBattle = (battleData) => restoreBattleState(getContext(), battleData)

  const persistBattle = () => syncAndPersist(getContext())

  const _startBattle = async (enemyPoke, options) => startBattleSequence(getContext(), enemyPoke, options)
  const initBattle = async (locId, isTr, trName, isGym, gymId, wasSearching) => 
    initBattleSequence(getContext(), { 
      locationId: locId, isTrainer: isTr, trainerName: trName, isGym, gymId, wasSearching,
      initialEnemy: activeBattle.value?.enemy,
      initialPlayer: gs.state.team[0]
    })
  /**
   * Añade un log al combate. 
   * MANDATORIO: source debe ser un Pokémon o una de las constantes ('player', 'enemy_trainer')
   */
  const addLog = (msg, type = 'log-info', source, sideOverride = null) => {
    const ctx = {
      gs,
      activeBattle: activeBattle.value,
      attackerSide: attackerSide.value
    }
    
    const logItem = formatBattleLog(msg, type, source, ctx)
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
        // Doble check para evitar condición de carrera
        if (logQueue.value.length > 0) {
          isProcessingLogs.value = true
          continue
        }
        break
      }

      // PROCESAMIENTO POR LOTES (Batching): 
      // Si la cola se está acumulando, mostramos más de un mensaje a la vez para "alcanzar" al combate.
      const batchSize = logQueue.value.length > 6 ? 3 : (logQueue.value.length > 3 ? 2 : 1)
      
      for (let i = 0; i < batchSize; i++) {
        if (logQueue.value.length === 0) break
        const nextItem = logQueue.value.shift()
        battleLogs.value.push(nextItem)
        if (battleLogs.value.length > 30) battleLogs.value.shift()
      }

      // Tiempos ultra-rápidos para mantener la sincronía
      // 300ms es suficiente para que el ojo humano lea, 100ms si hay mucha cola.
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
      await await setTimeout(100)
    }
  }

  const executeMove = async (moveIndex) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
    const thisStore = reactive({ 
      activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
      attackerSide, activeMove, persistBattle, handleFaint, isFinishing,
      fsm, BATTLE_STATES, BATTLE_SUBSTATES
    })
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TURN_ENGINE)
    await executeTurn(thisStore, moveIndex)
    
    // GUARDA CRÍTICA: Si el combate fue nulificado durante el turno (por salir), abortamos
    if (!activeBattle.value) {
      isProcessing.value = false
      return
    }

    if (!activeBattle.value.over) await applyEndTurnEffects()
    activeMove.value = null
    
    // Solo liberamos el procesamiento si el combate sigue activo y no ha terminado
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
    
    // Procesar Premonición (Future Sight)
    if (activeBattle.value.futureSightTurns > 0) {
      activeBattle.value.futureSightTurns--
      if (activeBattle.value.futureSightTurns === 0) {
        const fsTarget = activeBattle.value.futureSightTarget
        if (fsTarget && fsTarget.hp > 0) {
          const dmg = Math.max(10, Math.floor(fsTarget.maxHp * 0.15)) // Daño de premonición
          fsTarget.hp = Math.max(0, fsTarget.hp - dmg)
          addLog(`¡Se cumplió la premonición! ${fsTarget.name} recibió daño.`, 'log-info', fsTarget)
          gameBus.emit('PLAY_SOUND', 'statusDamage')
        }
      }
    }

    // Procesa efectos y guarda si hubo daño
    const _pDamaged = tickStatus(p, addLog, 'player')
    const _eDamaged = tickStatus(e, addLog, 'enemy')
    const _pSeeded = tickLeechSeed(p, e, addLog)
    const _eSeeded = tickLeechSeed(e, p, addLog)
    
    // Weather Turn Logic
    const w = activeBattle.value.weather
    if (w && w.turns > 0) {
      w.turns--
      if (w.turns === 0) {
        addLog(`¡El efecto de ${w.type} se desvaneció!`, 'log-info')
        // Volver al clima del mapa
        w.type = mapStore.currentWeather || 'clear'
        w.turns = -1 // Vuelve a ser permanente siguiendo al mapa
      }
    }

    // Field Effects (Screens/Mist/Safeguard)
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
    
    // Si alguien murió por efectos, procesar faint
    if (p.hp <= 0) await handleFaint('player')
    if (isBattleActive.value && e.hp <= 0) await handleFaint('enemy')
    
    persistBattle()
    if (activeBattle.value && !activeBattle.value.over) {
      activeBattle.value.turnCount++
    }
  }

  const handleFaint = async (side) => await processFaint(getContext(), side)

  const useItemInBattle = async (itemName, targetIndex = null) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    
    // Si se provee un índice, usar ese pokemon del equipo, si no, el activo.
    const targetPoke = (targetIndex !== null) ? gs.state.team[targetIndex] : activeBattle.value.player
    
    attackerSide.value = 'player'
    const ctx = {
      turnCount: activeBattle.value.turnCount,
      locationId: activeBattle.value.locationId,
      weather: activeBattle.value.weather,
      cycle: mapStore.currentCycle
    }
    const res = await handleItemUsage(itemName, targetPoke, activeBattle.value.enemy, { 
      gs, eventStore, addLog, audio, consumeItem, ctx, fsm 
    })
    attackerSide.value = null
    activeMove.value = null
    
    if (res.action === 'capture') {
      activeBattle.value.isCapture = true
      activeBattle.value.over = true 
      gs.addPokemon(res.pokemon, { notify: true })
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
      activeBattle.value.enemy = null
      // Retraso sincronizado: 1.0s de bola llena + 1.0s de pausa dramática (vacío) antes de la Fase 2
      await await setTimeout(2000)
      
      isProcessing.value = false
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT)
      await endBattle(true, false)
      return // Control liberado tras la pausa atómica
    } else if (res.action !== 'fail') {
      // El log se genera en battleItems.js (Doble entrada: Entrenador + Item)
      
      // FORZAR REACTIVIDAD Y ACTUALIZACIÓN: Asignar el objeto curado
      if (res.pokemon && activeBattle.value?.player) {
        activeBattle.value.player = { ...res.pokemon }
        syncTeamHP()
      }
      
      persistBattle()
      await await setTimeout(800)
      
      const thisStore = reactive({ 
        activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
        attackerSide, activeMove, persistBattle, handleFaint, isFinishing
      })
      await runEnemyAction(thisStore)
    }
    
    if (activeBattle.value && !activeBattle.value.over) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    }
    isProcessing.value = false
  }

  const endBattle = async (win, fled) => await terminateBattle(getContext(), win, fled)


  /**
   * Forzar sincronización de HP de TODO el equipo al GameStore.
   * Útil para asegurar persistencia atómica tras combates o cambios.
   */
  const syncTeamHP = () => syncTeamHP(getContext())
  
  const _executeSwitch = async (teamIndex, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true
    
    // REORDER_TEAM (Manual 11. Team Reordering)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.FIND_HEALTHY)
    
    // Regla de Atomicidad: Limpiar estados de animación antes de cambiar
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

    // Animación de Retirada (solo si el pokemon actual está vivo)
    if (oldPoke && oldPoke.hp > 0) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_RECALL)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
      addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.WAIT_TIMER, 500) // Manual: Min 0.5s Delay
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.VACATE_SEAT)
      activeBattle.value.player = null
      clearVolatileStatus(oldPoke)
    }

    // Cambio de estado
    // RECALL_FLOW
    if (activeBattle.value.player && activeBattle.value.player.hp > 0) {
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_RECALL)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RECALL)
      await await setTimeout(800)
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.VACATE_SEAT)
      activeBattle.value.player = null
    }

    // CALL_FLOW
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.RENDER_BALL)
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.OCCUPY_SEAT)
    activeBattle.value.player = newPoke; 
    activeBattle.value.playerTeamIndex = teamIndex
    
    gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: newPoke })
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ENERGY_RELEASE)
    await await setTimeout(800)
    
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_APPEAR)
    
    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }
    
    // Limpiar estadísticas pero preservar efectos de campo
    const s = playerStages.value
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
      reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
    
    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
    await await setTimeout(400)

    // Daño por Púas
    if (playerStages.value.spikes > 0 && newPoke.type !== 'flying' && newPoke.type2 !== 'flying' && newPoke.ability !== 'Levitación') {
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
    
    if (!isForced) await runEnemyAction(thisStore)
    
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    isProcessing.value = false
  }

  const consumeItem = (itemName) => {
    if (gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
  }

  const completeBattleFlow = async (option) => await handleBattleFlowCompletion(getContext(), option)

  const triggerSearchEncounter = async () => await triggerNextEncounter(getContext())




  if (typeof window !== 'undefined') {
    window.__VITE_DEBUG__ = window.__VITE_DEBUG__ || {}
    window.__VITE_DEBUG__.forceFlee = async () => {
      console.warn('[DEBUG] Forzando huida del combate...')
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FLEE_ATTEMPT)
      await endBattle(false, true)
    }

    // CLI de Combate Extendido
    window.__VITE_DEBUG__.battle = {
      // Acceso directo a estados
      setPlayerStatus: (s) => activeBattle.value.player.status = s,
      setEnemyStatus: (s) => activeBattle.value.enemy.status = s,
      setPlayerStage: (stat, val) => playerStages.value[stat] = val,
      setEnemyStage: (stat, val) => enemyStages.value[stat] = val,
      
      // Clima y Campo
      setWeather: (w) => activeBattle.value.weather = { type: w, turns: 5 },
      forceReflect: (side = 'player') => {
        const s = side === 'player' ? playerStages.value : enemyStages.value
        s.reflect = 5
      },
      forceLightScreen: (side = 'player') => {
        const s = side === 'player' ? playerStages.value : enemyStages.value
        s.lightScreen = 5
      },
      forceSpikes: (side = 'enemy') => {
        const s = side === 'player' ? playerStages.value : enemyStages.value
        s.spikes = (s.spikes || 0) + 1
      },

      // Volátiles
      setConfused: (val = 3) => activeBattle.value.player.confused = val,
      setSeeded: (val = true) => activeBattle.value.player.seeded = val,
      setSubstitute: (hp = 50) => activeBattle.value.player.substitute = hp,
      setIngrain: (val = true) => activeBattle.value.player.ingrain = val,
      setFocusEnergy: (val = true) => activeBattle.value.player.focusEnergy = val,
      setLockOn: (val = true) => activeBattle.value.player.lockOn = val,
      
      // Utilidades
      syncMoves: async () => {
        const p = activeBattle.value.player
        const { sanitizePokemon } = await import('@/logic/pokemonFactory')
        sanitizePokemon(p)
        console.log('[DEBUG] Movimientos sincronizados para:', p.name)
      },
      fullHeal: () => {
        const p = activeBattle.value.player
        p.hp = p.maxHp; p.status = null; p.confused = 0; p.seeded = false
      },
      killEnemy: () => activeBattle.value.enemy.hp = 0,
      
      // Referencia al store
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

      useUIStore().openConfirm({
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
            
            await await setTimeout(1000);
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
            await runEnemyAction(thisStore);
          }
          isProcessing.value = false;
        }
      });
    },
    completeBattleFlow,
    triggerSearchEncounter,
    setFinishing: (cb) => { fsm.transition(BATTLE_STATES.REWARDS_PHASE); battleEndCallback.value = cb },
    useItemInBattle,
    endBattle,
    handleFaint,
    applyEndTurnEffects,
    _startBattle,
    startEncounter: async () => await startEncounter(getContext()),
    executeSwitch: _executeSwitch,
    isSearching,
    isIntroAnimating,
    debugBinoculars,
    fsm,
    currentFsmState
  }
})

