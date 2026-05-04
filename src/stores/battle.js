// [PureVue-Ignore-Length]
import { defineStore } from 'pinia'
import { ref, computed, reactive, watch } from 'vue'
import { useGameStore } from './game'
import { handleEntryAbilities, applyEndTurnWeather } from '../logic/battle/battleFlow'
import { getMechanicalWeather } from '../logic/battle/weatherMapper'
import { calculateBaseExp, processExpGain, calculateMoneyGain } from '../logic/battle/battleRewards'
import { handleItemUsage } from '../logic/battle/battleItems'
import { gameBus } from '@/logic/gameBus'
import { useWarStore } from './war'
import { useEventStore } from './events'
import { usePlayerClassStore } from './playerClass'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine'
import { tickStatus, tickLeechSeed } from '../logic/battle/battleStatus'
import { executeTurn, runEnemyAction } from '../logic/battle/battleTurn'
import { generateEncounter } from '@/logic/encounters'
import { useMapStore } from './map'
import { formatBattleLog } from '../logic/battle/battleLogger'
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '../logic/battle/battleStateMachine'

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
    fsm.currentState.value === BATTLE_STATES.REORDER_TEAM ||
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

  const restoreBattle = (battleData) => {
    if (!battleData) {
      activeBattle.value = null
      fsm.transition(BATTLE_STATES.EXIT_BATTLE)
      return
    }
    activeBattle.value = battleData
    if (battleData.playerStages) playerStages.value = battleData.playerStages
    if (battleData.enemyStages) enemyStages.value = battleData.enemyStages
    if (battleData.battleLogs) battleLogs.value = battleData.battleLogs
    
    if (!battleData.over) {
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
    } else {
      fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    }
  }

  const persistBattle = () => {
    if (!activeBattle.value || activeBattle.value.over) {
      gs.state.activeBattle = null
      return
    }
    gs.state.activeBattle = {
      ...activeBattle.value,
      playerStages: playerStages.value,
      enemyStages: enemyStages.value,
      battleLogs: battleLogs.value.slice(-10)
    }
    // No notificamos el guardado para evitar spam visual
    gs.save(false)
  }

  const _startBattle = async (enemyPoke, options = {}) => {
    const { 
      isGym = false, gymId = null, locationId = 'plains', 
      isTrainer = false, enemyTeam = null, trainerName = 'Entrenador',
      battleOptions = {} 
    } = options

    const playerPoke = gs.state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense)
    if (!playerPoke) {
      useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
      return
    }

    // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
    if (isBattleActive.value && !isFinishing.value && !activeBattle.value?.over && !isSearching.value) {
      console.warn('[BATTLE] Combate en curso detectado. Forzando huida del anterior.')
      await endBattle(false, true)
    }

    // 1. CARGA PREVIA (Async stuff first)
    const wasSearching = isSearching.value
    const { useMapStore } = await import('./map')
    const { sanitizePokemon } = await import('@/logic/pokemonFactory')
    const mapStore = useMapStore()

    const isFromUpcoming = wasSearching && upcomingPokemon.value && (upcomingPokemon.value.id === enemyPoke.id)
    const finalEnemyPoke = isFromUpcoming ? upcomingPokemon.value : enemyPoke

    sanitizePokemon(playerPoke)
    sanitizePokemon(finalEnemyPoke)

    // LIMPIEZA DE ESTADOS VOLÁTILES (Confusión, Drenadoras, etc)
    clearVolatileStatus(playerPoke)
    clearVolatileStatus(finalEnemyPoke)

    // 3. ACTUALIZACIÓN ATÓMICA DE ESTADO
    // Seteamos el combate. Esto disparará la reactividad en el HUD.
    activeBattle.value = {
      enemy: finalEnemyPoke, player: playerPoke, isGym, gymId, isTrainer, enemyTeam,
      playerTeam: gs.state.team, // [NEW] Incluimos el equipo completo para resolución de efectos
      trainerName, locationId, turn: 'player', turnCount: 1, over: false,
      weather: { 
        type: getMechanicalWeather(mapStore.currentWeather), 
        visual: mapStore.currentWeather, 
        turns: -1 
      },
      playerTeamIndex: gs.state.team.indexOf(playerPoke),
      participants: [playerPoke.uid], learnQueue: [], ...battleOptions
    }

    if (battleOptions.isDebug) {
      debugLoopPokemon.value = JSON.parse(JSON.stringify(enemyPoke))
    } else {
      if (!wasSearching) debugLoopPokemon.value = null
    }

    // Registro en pokedex y persistencia (antes de quitar flags de búsqueda para no retrasar la intro)
    gs.registerPokedex(enemyPoke.id, false)
    if (isTrainer && enemyTeam) enemyTeam.forEach(p => gs.registerPokedex(p.id, false))
    persistBattle()
    
    // 4. DISPARO DE ANIMACIÓN Y CAMBIO DE FASE
    if (wasSearching) {
      // Venimos de SEARCH_PHASE: solo ENCOUNTER_ANIM (el pasto + silueta ya estaban visibles).
      // El substate ENCOUNTER_ANIM señala a la vista que debe ejecutar triggerSearchEncounter().
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENCOUNTER_ANIM)
    } else {
      fsm.transition(BATTLE_STATES.INITIALIZING)
      setTimeout(() => fsm.transition(BATTLE_STATES.FIRST_INTRO), 50)
    }
    
    attackerSide.value = null
    activeMove.value = null
    faintedSides.value.clear()
    clearLogs()

    gameBus.emit('START_BATTLE', { 
      player: playerPoke, 
      enemy: enemyPoke, 
      locationId, 
      isTrainer, 
      isGym,
      animationPhase: wasSearching ? 3 : 1
    })

    enemyPoke.isShiny ? audio.shiny() : (isTrainer || isGym) ? audio.rival() : null
    const startMsg = isTrainer ? `¡${trainerName} te desafía!` : isGym ? `¡Combate de Gimnasio contra ${enemyPoke.name}!` : `¡Un ${enemyPoke.name} salvaje apareció!`
    addLog(startMsg, 'log-info', enemyPoke)
    handleEntryAbilities(playerPoke, enemyPoke, playerStages.value, enemyStages.value, addLog)
    
    if (isTrainer || isGym) await gs.save()

    // 5. Limpieza inmediata de previsualización (ya es el enemigo activo)
    upcomingPokemon.value = null 
    
    // 6. Pre-generación proactiva del SIGUIENTE encuentro
    if (!isTrainer && !isGym) {
      const encounterOptions = {
        activeEvents: useMapStore().activeEvents,
        dominanceData: useMapStore().mapWinners,
        shinyMultiplier: useEventStore().globalMultipliers?.shiny || 1,
        forceEncounter: true 
      }
      
      generateEncounter(locationId, gs.state, encounterOptions).then(encounter => {
        if (encounter && encounter.type === 'wild') {
          upcomingPokemon.value = { ...encounter.pokemon }
          console.log('[Battle] Próximo encuentro pre-generado:', upcomingPokemon.value.name)
        }
      })
    }
  }
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

    battleLogs.value.push(logItem)
    if (!isProcessingLogs.value) processNextLog()
  }

  const clearVolatileStatus = (poke) => {
    if (!poke) return
    poke.confused = 0
    poke.flinched = false
    poke.substitute = 0
    poke.seeded = false
    poke.attracted = false
    poke.cursed = false
    poke.protect = false
    poke.detect = false
    poke.destinyBond = false
    poke.perishSongCount = 0
    poke.tauntTurns = 0
    poke.disabledTurns = 0
    poke.disabledMove = null
    poke.encoreTurns = 0
    poke.encoreMove = null
    poke.ingrain = false
    poke.focusEnergy = false
    poke.lockOn = false
  }

  const processNextLog = async () => {
    if (logQueue.value.length === 0) { isProcessingLogs.value = false; return }
    isProcessingLogs.value = true

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
    
    setTimeout(processNextLog, delay)
  }

  const clearLogs = () => {
    battleLogs.value = []; logQueue.value = []; isProcessingLogs.value = false;
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    activeMove.value = null
    attackerSide.value = null
  }

  const executeMove = async (moveIndex) => {
    if (isProcessing.value || !isBattleActive.value) return
    isProcessing.value = true
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
    const thisStore = reactive({ 
      activeBattle, playerStages, enemyStages, addLog, endBattle, gs, completeBattleFlow,
      attackerSide, activeMove, persistBattle, handleFaint, isFinishing
    })
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
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
      isProcessing.value = false
    } else {
      isProcessing.value = false
    }
  }

  const applyEndTurnEffects = async () => {
    const p = activeBattle.value.player
    const e = activeBattle.value.enemy
    
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

  const handleFaint = async (side) => {
    const isPlayer = side === 'player'
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, isPlayer ? BATTLE_SUBSTATES.PLAYER_FAINT_SEQ : BATTLE_SUBSTATES.ENEMY_FAINT)
    
    // Guarda centralizada en la store, no en el objeto del pokemon
    if (faintedSides.value.has(side)) return
    faintedSides.value.add(side)

    const pokemon = isPlayer ? player.value : enemy.value
    const opponent = isPlayer ? enemy.value : player.value
    
    if (pokemon.destinyBond && opponent && opponent.hp > 0) {
      addLog(`¡${pokemon.name} se llevó a ${opponent.name} con él!`, 'log-info', pokemon)
      opponent.hp = 0
      setTimeout(() => handleFaint(isPlayer ? 'enemy' : 'player'), 500)
    }

    if (isPlayer) {
      addLog(`¡${pokemon.name} se ha debilitado!`, 'log-player', pokemon)
      
      // Según Manual: PLAYER_FAINT_SEQ -> TRAINER_RECALL (Modular Recall)
      gameBus.emit('PLAY_WITHDRAW', { side: 'player', isFaint: true })
      
      await new Promise(r => setTimeout(r, 1300)) // Esperar Animación (1.3s)
      
      const nextPoke = gs.state.team.find(p => p.hp > 0)
      if (!nextPoke) {
        activeBattle.value.over = true
        addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
        // Ya no se usa isFinishing directamente como bandera, se maneja via estado
        await endBattle(false)
      } else {
        addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
        faintedSides.value.delete('player') // Limpiar guarda antes del relevo
        useUIStore().isBattleSwitchForced = true
      }
    } else {
      const isTr = activeBattle.value.isTrainer || activeBattle.value.isGym
      const enemyName = isTr ? pokemon.name : `¡${pokemon.name} salvaje`
      addLog(`${enemyName} fue derrotado!`, 'log-enemy', pokemon)
      
      // Según Manual: ENEMY_FAINT -> PLAY_ENEMY_FAINT (Drop Anim)
      gameBus.emit('PLAY_FAINT', { side: 'enemy' })
      
      await new Promise(r => setTimeout(r, 1300)) // Esperar Animación (1.3s)
      
      if (isTr && activeBattle.value.enemyTeam) {
        const nextEnemy = activeBattle.value.enemyTeam.find(p => p.hp > 0)
        if (nextEnemy) {
          activeBattle.value.enemy = nextEnemy // Actualizar instancia ANTES de Send Out
          
          // Limpiar estadísticas pero preservar efectos de campo
          const s = enemyStages.value
          enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
            reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
          
          addLog(`¡Entrenador envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')
          gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
          await new Promise(r => setTimeout(r, 800))

          // Daño por Púas
          if (s.spikes > 0 && nextEnemy.type !== 'flying' && nextEnemy.type2 !== 'flying' && nextEnemy.ability !== 'Levitación') {
            const dmg = Math.floor(nextEnemy.maxHp * (s.spikes / 8))
            nextEnemy.hp = Math.max(0, nextEnemy.hp - dmg)
            addLog(`¡${nextEnemy.name} recibió daño por las púas!`, 'log-info', nextEnemy)
            gameBus.emit('PLAY_SOUND', 'statusDamage')
          }

          return
        }
      }
      
      activeBattle.value.over = true 
      faintedSides.value.add('enemy') // Bloquear cualquier otra acción enemiga
      await endBattle(true)
    }
  }

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
      fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CATCH_SUCCESS)
      activeBattle.value.isCapture = true
      activeBattle.value.over = true // Regla del Vacio (Ocultar Interfaz Inmediatamente)
      activeBattle.value.enemy = null
      gs.addPokemon(res.pokemon, { notify: true })
      // Retraso sincronizado: 1.0s de bola llena + 1.0s de pausa dramática (vacío) antes de la Fase 2
      setTimeout(() => {
        isProcessing.value = false
        fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.VOID_STATE)
        endBattle(true, false)
      }, 2000)
      return // Retenemos el control (isProcessing queda true durante el timeout)
    } else if (res.action !== 'fail') {
      // El log se genera en battleItems.js (Doble entrada: Entrenador + Item)
      
      // FORZAR REACTIVIDAD Y ACTUALIZACIÓN: Asignar el objeto curado
      if (res.pokemon && activeBattle.value?.player) {
        activeBattle.value.player = { ...res.pokemon }
        syncTeamHP()
      }
      
      persistBattle()
      await new Promise(r => setTimeout(r, 800))
      
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

  const endBattle = async (win, fled = false) => {
    if (!activeBattle.value) {
      fsm.transition(BATTLE_STATES.EXIT_BATTLE)
      return
    }

    // 0. Capturar datos necesarios antes de cualquier cambio
    const battleData = { ...activeBattle.value }
    const enemyRef = battleData.enemy
    const locId = battleData.locationId
    
    activeBattle.value.over = true
    faintedSides.value.clear()
    
    if (win && !fled) calculateRewards()
    
    // Sincronizar HP antes de guardar
    syncTeamHP();

    // Regla del Vacío: Borrar rastros del Pokémon para no influenciar los siguientes pasos
    if (activeBattle.value && !activeBattle.value.isTrainer && !activeBattle.value.isGym) {
      activeBattle.value.enemy = null
    }

    if (!win && !fled) {
      // DERROTA TOTAL: Aislamiento absoluto de animaciones
      // Pero mantenemos el modal abierto para mostrar resultados
      await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.VOID_STATE)
      await new Promise(r => setTimeout(r, 1000)) // "The Void" (1.0s)
      
      // Sincronizar y guardar antes de permitir salida
      await gs.save(false)
      return 
    }

    if (win && !fled) {
      // MARCAR INICIO DE FASE FINAL (The Void Standard)
      if (activeBattle.value && fsm.currentState.value !== BATTLE_STATES.REWARDS_PHASE) {
        await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.VOID_STATE)
        await new Promise(r => setTimeout(r, 1000)) // "The Void" (1.0s - Nothing Shown)
        
        // Verificar existencia después de la espera asíncrona
        if (!activeBattle.value) return 
        
        fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP)
      }
      
      const isTr = battleData.isTrainer || battleData.isGym
      if (enemyRef.isGuardian) await warStore.addPoints(locId, 'guardian', true)
      else await warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true)
      if (battleData.isCapture) await eventStore.submitCompetitionEntry(enemyRef, 'hourly_competition')
      if (battleData.isGym && battleData.gymId) {
        const gid = battleData.gymId
        if (!gs.state.defeatedGyms.includes(gid)) {
          gs.state.defeatedGyms.push(gid); gs.state.badges++
          if (activeBattle.value.rewardTM) { 
            gs.state.inventory[activeBattle.value.rewardTM] = (gs.state.inventory[activeBattle.value.rewardTM] || 0) + 1
            addLog(`¡Recibiste la ${activeBattle.value.rewardTM}!`, 'log-info', activeBattle.value.rewardTM) 
          }
          useUIStore().notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆')
          await gs.save(false)
        }
      }
    }
    
    if (fled) {
      fsm.transition(BATTLE_STATES.EXIT_BATTLE)
      await completeBattleFlow('map')
      return
    }

    // 1. Activar estado de finalización si no se hizo arriba
    if (fsm.currentState.value !== BATTLE_STATES.REWARDS_PHASE) {
      fsm.transition(BATTLE_STATES.REWARDS_PHASE)
    }

    // Persistir estado inmediatamente después del combate
    await gs.save(false)


    // 3. POST-BATTLE STABILIZATION (REORDER & LEVEL UP)
    // Se ejecuta al final de endBattle SOLO SI HUBO VICTORIA
     if (win && !fled) {
       syncTeamHP() // Sincronización atómica antes de chequear salud
       fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION)
       
       const firstHealthy = gs.state.team.find(p => p.hp > 0)
       const currentActive = player.value
       
       // Solo reordenamos si el jugador NO ha sido derrotado totalmente (hay alguien sano)
       if (firstHealthy && currentActive && firstHealthy.uid !== currentActive.uid) {
         // Lanzamos reordenamiento en segundo plano (Background Task)
         ;(async () => {
           fsm.transition(BATTLE_STATES.POST_BATTLE_STABILIZATION, BATTLE_STATES.REORDER_TEAM)
           
           if (currentActive.hp > 0) {
             gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
             await new Promise(r => setTimeout(r, 800))
           } else {
             await new Promise(r => setTimeout(r, 1300))
           }
           
           if (activeBattle.value) {
             activeBattle.value.player = firstHealthy
             activeBattle.value.playerTeamIndex = gs.state.team.findIndex(p => p.uid === firstHealthy.uid)
             gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: firstHealthy })
           }

           // Transición automática a SEARCH_PHASE tras el reordenamiento si es salvaje
           if (!activeBattle.value?.isTrainer) {
             await completeBattleFlow('search')
           }
         })()
       } else {
         // Si no se necesita reordenar el equipo, transicionamos a SEARCH_PHASE tras 500ms si es salvaje
         if (!activeBattle.value?.isTrainer) {
           setTimeout(async () => {
             await completeBattleFlow('search')
           }, 500)
         }
       }
     } else if (!win && !fled) {
       // Si el jugador pierde, se va a negro y se sale
       // El pokemon ya se retiro en handleFaint, no necesitamos animarlo de nuevo aquí
       fsm.transition(BATTLE_STATES.EXIT_BATTLE)
     }
   }

  const calculateRewards = () => {
    const e = activeBattle.value.enemy
    const baseExp = calculateBaseExp(e)
    const warMods = getBattleRewardModifiers(activeBattle.value.locationId, gs.state.faction, warStore.mapDominance)
    const totalExpMult = warMods.expMult + ((eventStore.globalMultipliers?.exp || 1) - 1)
    const classMult = classStore.getModifier('expMult', { isTrainer: activeBattle.value.isTrainer })

    gs.state.team.forEach(p => {
      const participantsSet = new Set(activeBattle.value.participants)
      const reward = processExpGain(p, baseExp, participantsSet, {
        isActive: p.uid === activeBattle.value.player.uid,
        classMult,
        totalExpMult,
        participantsSet
      })
      if (reward) {
        addLog(`${p.name} ganó ${reward.gained} EXP.`, 'log-player', p)
        if (reward.levelUp) { audio.levelUp(); addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p) }
      }
    })

    const moneyGained = calculateMoneyGain(e, { bcMult: classStore.getModifier('bcMult', { isGym: activeBattle.value.isGym }), totalMoneyMult: warMods.moneyMult + ((eventStore.globalMultipliers?.money || 1) - 1) })
    gs.state.money += moneyGained
    if (moneyGained > 0) audio.money()
    addLog(`¡Ganaste ₽${moneyGained}!`, 'log-info', 'player')
  }

  /**
   * Forzar sincronización de HP de TODO el equipo al GameStore.
   * Útil para asegurar persistencia atómica tras combates o cambios.
   */
  const syncTeamHP = () => {
    if (!activeBattle.value) return;
    
    // Sincronizar el activo actual
    if (activeBattle.value.player) {
      const currentIdx = activeBattle.value.playerTeamIndex ?? gs.state.team.findIndex(p => p.uid === activeBattle.value.player.uid);
      if (currentIdx !== -1) {
        gs.state.team[currentIdx].hp = activeBattle.value.player.hp;
        gs.state.team[currentIdx].status = activeBattle.value.player.status;
      }
    }

    // Nota: Otros miembros del equipo que hayan recibido daño (p.ej. púas, persecución)
    // ya deberían estar sincronizados si se mantienen las referencias de objetos,
    // pero este método asegura al menos el estado del Pokémon que cerró la batalla.
  }

  const _executeSwitch = async (teamIndex, isForced = false) => {
    if (isProcessing.value && !isForced) return
    isProcessing.value = true
    fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EXEC_TURN)
    
    // Regla de Atomicidad: Limpiar estados de animación antes de cambiar
    activeMove.value = null
    attackerSide.value = null
    
    const newPoke = gs.state.team[teamIndex]
    if (!newPoke || newPoke.hp <= 0) { isProcessing.value = false; return }
    const oldPoke = activeBattle.value.player

    // Animación de Retirada (solo si el pokemon actual está vivo)
    if (oldPoke && oldPoke.hp > 0) {
      addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player')
      gameBus.emit('PLAY_WITHDRAW', { side: 'player' })
      await new Promise(r => setTimeout(r, 800))
      clearVolatileStatus(oldPoke)
    }

    // Cambio de estado
    activeBattle.value.player = newPoke; activeBattle.value.playerTeamIndex = teamIndex
    if (!activeBattle.value.participants.includes(newPoke.uid)) {
      activeBattle.value.participants.push(newPoke.uid)
    }
    
    // Limpiar estadísticas pero preservar efectos de campo
    const s = playerStages.value
    playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, 
      reflect: s.reflect || 0, lightScreen: s.lightScreen || 0, safeguard: s.safeguard || 0, mist: s.mist || 0, spikes: s.spikes || 0 }
    
    // Animación de Salida
    addLog(`¡Adelante, ${newPoke.name}!`, 'log-player', newPoke)
    gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: newPoke })
    await new Promise(r => setTimeout(r, 800))

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
    isProcessing.value = false
  }

  const consumeItem = (itemName) => {
    if (gs.state.inventory[itemName]) {
      gs.state.inventory[itemName]--
      if (gs.state.inventory[itemName] <= 0) delete gs.state.inventory[itemName]
    }
  }

  const completeBattleFlow = async (option = 'continue') => { 
    const uiStore = useUIStore()
    const locId = activeBattle.value?.locationId
    
    if (battleEndCallback.value) { battleEndCallback.value(); battleEndCallback.value = null }; 
    
    if (option === 'search' && locId) {
      // Si no hay Pokémon pre-generado, generarlo ahora para que la silueta sea visible.
      if (!upcomingPokemon.value) {
        const { useMapStore } = await import('./map')
        const encounterOptions = {
          activeEvents: useMapStore().activeEvents,
          dominanceData: useMapStore().mapWinners,
          shinyMultiplier: useEventStore().globalMultipliers?.shiny || 1,
          forceEncounter: true
        }
        const encounter = await generateEncounter(locId, gs.state, encounterOptions)
        if (encounter && encounter.type === 'wild') {
          upcomingPokemon.value = { ...encounter.pokemon }
          console.log('[Battle] Encuentro generado para ENTRY_ANIM:', upcomingPokemon.value.name)
        }
      }

      if (activeBattle.value && upcomingPokemon.value) {
        activeBattle.value.enemy = { ...upcomingPokemon.value }
      }

      // SEARCH PHASE: solo ENTRY_ANIM (pasto gradual + silueta estática).
      fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM)
      isProcessing.value = false
      return
    }

    fsm.transition(BATTLE_STATES.EXIT_BATTLE); activeBattle.value = null; isProcessing.value = false; clearLogs() 

    if (option === 'map') {
      uiStore.activeTab = 'map'
    }
  }

  const triggerSearchEncounter = async () => {
    isProcessing.value = false
    const locId = activeBattle.value?.locationId
    if (!upcomingPokemon.value || !locId) {
      console.warn('[Battle] triggerSearchEncounter: sin upcomingPokemon o locationId.')
      return
    }
    const nextPoke = upcomingPokemon.value
    upcomingPokemon.value = null
    await _startBattle(nextPoke, {
      locationId: locId,
      battleOptions: { isDebug: !!debugLoopPokemon.value }
    })
  }




  if (typeof window !== 'undefined') {
    window.__VITE_DEBUG__ = window.__VITE_DEBUG__ || {}
    window.__VITE_DEBUG__.forceFlee = async () => {
      console.warn('[DEBUG] Forzando huida del combate...')
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
      useUIStore().openConfirm({
        title: 'HUIR DEL COMBATE',
        message: '¿Estás seguro que deseas huir de este encuentro?',
        confirmText: 'SÍ, HUIR',
        cancelText: 'VOLVER',
        type: 'primary',
        variant: 'retro',
        onConfirm: async () => {
          audio.flee();
          addLog('¡Huiste!', 'log-info', 'player');
          await endBattle(false, true);
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
    executeSwitch: _executeSwitch,
    isSearching,
    isIntroAnimating,
    debugBinoculars,
    fsm,
    currentFsmState
  }
})
