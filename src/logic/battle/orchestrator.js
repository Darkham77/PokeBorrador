import { gameBus } from '@/logic/gameBus'
import { generateEncounter } from '@/logic/encounters'
import { handleEntryAbilities } from './battleFlow'
import { getMechanicalWeather } from './weatherMapper'
import { FIRE_RED_MAPS } from '@/data/maps'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'

/**
 * Orchestrates the start of a battle.
 * @param {Object} ctx - The battle store context (refs, state, etc)
 */
export async function startBattleSequence(ctx, enemyPoke, options = {}) {
  const { 
    isGym = false, gymId = null, locationId = 'plains', 
    isTrainer = false, enemyTeam = null, trainerName = 'Entrenador',
    battleOptions = {}, isFishing = false, wasSearching: wasSearchingOpt = null
  } = options

  const playerPoke = ctx.gs.state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
  if (ctx.isBattleActive && !ctx.isFinishing && !ctx.activeBattle.value?.over && !ctx.isSearching) {
    console.warn('[BATTLE] Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }

  const wasSearching = wasSearchingOpt !== null ? wasSearchingOpt : ctx.isSearching.value
  const { sanitizePokemon } = await import('@/logic/pokemonFactory')
  const mapStore = useMapStore()

  const isFromUpcoming = wasSearching && ctx.upcomingPokemon.value && (ctx.upcomingPokemon.value.id === enemyPoke.id)
  const finalEnemyPoke = isFromUpcoming ? ctx.upcomingPokemon.value : enemyPoke

  sanitizePokemon(playerPoke)
  sanitizePokemon(finalEnemyPoke)

  // LIMPIEZA DE ESTADOS VOLÁTILES
  ctx.clearVolatileStatus(playerPoke)
  ctx.clearVolatileStatus(finalEnemyPoke)

  let rarity = 50
  if (isFishing) {
    const loc = FIRE_RED_MAPS.find(l => l.id === locationId)
    if (loc && loc.fishing) {
      const pool = loc.fishing.pool
      const rates = loc.fishing.rates
      const idx = pool.indexOf(finalEnemyPoke.id)
      if (idx !== -1) {
        const totalRate = rates.reduce((a, b) => a + b, 0)
        rarity = (rates[idx] / totalRate) * 100
      }
    }
  }

  ctx.activeBattle.value = {
    // Escenario Limpio: Iniciamos SIEMPRE en NULL para permitir animaciones de entrada
    enemy: null, 
    player: null, 
    // Data real preservada para la activación controlada
    _initialEnemy: finalEnemyPoke,
    _initialPlayer: playerPoke,
    isGym, gymId, isTrainer, enemyTeam,
    playerTeam: ctx.gs.state.team,
    trainerName, locationId, turn: 'player', turnCount: 1, over: false,
    isFishing, rarity,
    weather: { 
      type: getMechanicalWeather(mapStore.currentWeather), 
      visual: mapStore.currentWeather, 
      turns: -1 
    },
    playerTeamIndex: ctx.gs.state.team.indexOf(playerPoke),
    participants: [playerPoke.uid], learnQueue: [], ...battleOptions
  }

  if (battleOptions.isDebug) {
    ctx.debugLoopPokemon.value = JSON.parse(JSON.stringify(enemyPoke))
    if (!wasSearching) ctx.debugLoopPokemon.value = null
  }

  ctx.gs.registerPokedex(enemyPoke.id, false)
  if (isTrainer && enemyTeam) enemyTeam.forEach(p => ctx.gs.registerPokedex(p.id, false))
  ctx.persistBattle()
  
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)
  fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.VALIDATE_WEIGHTS)
  fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.INJECT_FILTERS)
  fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.READY_FOR_GEN)
  fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.HIDE_ALL_COMBAT_HUDS)

  ctx.isIntroAnimating.value = true

  fsm.transition(BATTLE_STATES.INITIALIZING)
  fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_SLOTS)

  if (wasSearching) {
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE_AND_REPOPULATE)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PROMOTE)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_NEW_S2)
    // PROTOCOLO DE ASIENTO VACÍO: Solo el enemigo se limpia aquí para el buscador
    ctx.activeBattle.value.enemy = null
  } else {
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.POPULATE_BOTH)
    fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_DATA)
    // No limpiamos el asiento del jugador todavía para evitar el 'flash' negro/vacío
    ctx.activeBattle.value.enemy = null
  }
  ctx.isIntroAnimating.value = true
  
  // Limpiar logs del combate anterior para evitar ruido visual
  ctx.clearLogs()

  if (wasSearching) {
    // Inyectar el enemigo en el store inmediatamente para que las siluetas y animaciones de búsqueda tengan data válida
    ctx.activeBattle.value.enemy = enemyPoke
    
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.JUMP_SHADOW, 400)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSHES_BACK, 400)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REVEAL_COLORS, 600)
  } else {
    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENTRY_ANIM)
    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    
    if (isTrainer || isGym) {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENTRY)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER, 800)
    } else {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
    }
  }

  await initBattleSequence(ctx, locationId, isTrainer, trainerName, isGym, gymId, wasSearching)
}

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(ctx, locationId, isTrainer, trainerName, isGym, gymId, wasSearching) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm
  const initialEnemy = ctx.activeBattle.value._initialEnemy
  const initialPlayer = ctx.activeBattle.value._initialPlayer

  ctx.isIntroAnimating.value = true

  // PROTOCOLO DE PRECARGA: Sincronizar anclajes de sombra antes de cualquier animación
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_COORDS, 50)

  if (!wasSearching) {
    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.AESTHETIC_CHECK)
    const isFlying = initialEnemy.type === 'flying' || initialEnemy.type2 === 'flying' || initialEnemy.ability === 'Levitación'
    
    if (isFlying) {
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.FLYING_FLOW)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SKIP_BUSHES)
    } else {
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.GROUND_FLOW)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_FLOW)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_SETUP)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.INSTANT_BUSHES)
    }

    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_LAYER)
    
    // Inyectar enemigo inmediatamente si es salvaje para permitir renderizado de silueta
    if (!isTrainer && !isGym) {
      ctx.activeBattle.value.enemy = initialEnemy
    }

    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_MODE)
    
    const hasBinoculars = ctx.debugBinoculars.value
    if (hasBinoculars) {
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.FULL_COLOR)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.COLOR_READY)
    } else {
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SOLID_SILHOUETTE)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_READY)
    }

    // Activación sincronizada del Enemigo
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_ANIM, 100)
    if (!ctx.activeBattle.value.enemy && ctx.activeBattle.value._initialEnemy) {
      ctx.activeBattle.value.enemy = ctx.activeBattle.value._initialEnemy
    }
    
    // Esperar al salto y al fade de arbustos
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_FADE, 600)
    
    if (!hasBinoculars) {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.JUMP_COLOR)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSHES_BACK_COLOR)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.REVEAL_COLORS, 600)
    }

    // [REORDER_TEAM] Flujo formal de llamado del jugador según diagramas
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.CHECK_PLAYER_SEAT)
    
    // PROTOCOLO DE ASIENTO VACÍO (PLAYER): Solo justo antes del llamado para minimizar desaparición visual
    ctx.activeBattle.value.player = null
    
    fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING)
    fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.READ_TARGET)
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL, 100)
    
    // Inyectar al jugador tras el inicio del llamado para que se vea el efecto de salida
    if (!ctx.activeBattle.value.player && ctx.activeBattle.value._initialPlayer) {
      ctx.activeBattle.value.player = ctx.activeBattle.value._initialPlayer
    }

    await fsm.transition(BATTLE_STATES.REORDER_TEAM, null, 1000) // Tiempo para la Poké Ball
  } else {
    // ACTIVACIÓN PARA BUCLE DE BÚSQUEDA (wasSearching = true)
    // Asegurar que ambos combatientes están en el store ANTES de la transición para que las animaciones encuentren el objeto pokemon
    if (ctx.activeBattle.value._initialEnemy) {
      ctx.activeBattle.value.enemy = ctx.activeBattle.value._initialEnemy
    }
    // Inyectar al jugador justo antes del llamado para que el componente se monte y reciba el evento
    if (ctx.activeBattle.value._initialPlayer) {
      ctx.activeBattle.value.player = ctx.activeBattle.value._initialPlayer
    }
    
    gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: ctx.activeBattle.value.player })
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.POKEMON_CALL, 100)
    
    // Esperar a que las animaciones de PARALLEL_PREP se completen
    await new Promise(r => setTimeout(r, 1200))
  }
  
  // Forzar actualización de cámara tras la activación paralela
  window.dispatchEvent(new Event('resize'))
  
  ctx.attackerSide.value = null
  ctx.activeMove.value = null
  
  // Usar la data preservada para logs y habilidades (ya que player/enemy pueden ser null por el protocolo Clean Stage)

  const startMsg = isTrainer || isGym 
    ? `¡${trainerName} te desafía!` 
    : `¡Un ${initialEnemy.name} salvaje apareció!`
  
  ctx.addLog(startMsg, 'log-info', initialEnemy)
  handleEntryAbilities(initialPlayer, initialEnemy, ctx.playerStages.value, ctx.enemyStages.value, ctx.addLog)
  
  if (isTrainer || isGym) await ctx.gs.save()
  
  if (wasSearching) {
    // Detenerse en SEARCH_PHASE para permitir interacción del buscador
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.WAIT_INPUT)
    ctx.isIntroAnimating.value = false // Liberar bloqueo para mostrar botones
    // Flujo normal de inicio de combate
    ctx.isIntroAnimating.value = false
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SHOW_ALL_MISSING_COMBAT_HUDS, 300)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  }

  ctx.upcomingPokemon.value = null 
  
  if (!isTrainer && !isGym) {
    const encounterOptions = {
      activeEvents: useMapStore().activeEvents,
      dominanceData: useMapStore().mapWinners,
      shinyMultiplier: useEventStore().globalMultipliers?.shiny || 1,
      forceEncounter: true 
    }
    
    generateEncounter(locationId, ctx.gs.state, encounterOptions).then(encounter => {
      if (encounter && encounter.type === 'wild') {
        if (fsm.currentState.value !== BATTLE_STATES.EXIT_BATTLE) {
          fsm.transition(null, BATTLE_SUBSTATES.GEN_NEW_S2)
          ctx.upcomingPokemon.value = { ...encounter.pokemon }
        }
      }
    })
  }

  ctx.isIntroAnimating.value = false
}

/**
 * Restores a battle state from saved data.
 */
export function restoreBattleState(ctx, battleData) {
  if (!battleData) {
    ctx.activeBattle.value = null
    ctx.fsm.transition(ctx.BATTLE_STATES.EXIT_BATTLE)
    return
  }
  ctx.activeBattle.value = battleData
  if (battleData.playerStages) ctx.playerStages.value = battleData.playerStages
  if (battleData.enemyStages) ctx.enemyStages.value = battleData.enemyStages
  if (battleData.battleLogs) ctx.battleLogs.value = battleData.battleLogs
  
  if (!battleData.over) {
    ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.WAIT_INPUT)
  } else {
    ctx.fsm.transition(ctx.BATTLE_STATES.EXIT_BATTLE)
  }
}
