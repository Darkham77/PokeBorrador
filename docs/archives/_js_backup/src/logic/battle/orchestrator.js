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

  // [PROYECTO VICIO] Absolutamente todos los combates inician con wasSearching: true por defecto
  // para garantizar que pasen por la fase de inicialización de slots/arbustos
  const wasSearching = wasSearchingOpt !== null ? wasSearchingOpt : true
  
  const { sanitizePokemon } = await import('@/logic/pokemonFactory')
  const mapStore = useMapStore()

  const isFromUpcoming = wasSearching && ctx.upcomingPokemon.value && (ctx.upcomingPokemon.value.id === enemyPoke.id)
  const finalEnemyPoke = isFromUpcoming ? ctx.upcomingPokemon.value : enemyPoke

  sanitizePokemon(playerPoke)
  sanitizePokemon(finalEnemyPoke)

  // LIMPIEZA DE ESTADOS VOLÁTILES
  ctx.clearVolatileStatus(playerPoke)
  ctx.clearVolatileStatus(finalEnemyPoke)

  // Initial context values
  let rarity = 50

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

  ctx.isIntroAnimating.value = true

  // PROTOCOLO DE ASIENTOS: Fuente de Verdad para Visibilidad
  ctx.activeBattle.value.enemy = null // El enemigo siempre se vacía al empezar un encuentro
  
  // El jugador solo se vacía si el Pokémon líder ha cambiado (Modo Persistente)
  const currentP = ctx.activeBattle.value.player
  const leaderP = ctx.player.value?.team?.[0]
  if (!currentP || !leaderP || currentP.uid !== leaderP.uid) {
    ctx.activeBattle.value.player = null
  }
  
  ctx.clearLogs()

  // [PHASE] CONTEXT_SETUP (Manual 4. Context Setup)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)
  
  // Apply Item Modifiers (Manual 356)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.APPLY_ITEM_MODIFIERS)
  const hasBinoculars = ctx.debugBinoculars.value || (ctx.gs.state.inventory?.['binoculars'] > 0)
  
  // Weight Calculation (Manual 344)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.WEIGHT_CALCULATION)
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
  ctx.activeBattle.value.rarity = rarity

  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.INJECT_FILTERS)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.READY_FOR_GEN)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.VACATE_ALL_SEATS)

  // [PHASE] INITIALIZING (Manual 2. Initialization Phase)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_CONTEXT)
  
  // ASYNC_THREAD START (Manual 409)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ASYNC_THREAD)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_TEAMS)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MARK_EVENT)
  
  // PRELOAD_FINAL_COORDS (Manual 412)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS, 50)
  
  // SET_SEARCH_FLAG (Manual 413)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.SET_SEARCH_FLAG)
  ctx.isSearching.value = wasSearching

  if (wasSearching) {
    // FLUJO DE BÚSQUEDA (Manual 6. SEARCH PHASE)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PARALLEL_PREP)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.UPDATE_BUTTON)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_VISIBLE)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.SILHOUETTE_MODE)
    
    // OCUPACIÓN DEL ASIENTO: El Pokémon aparece visualmente con su silueta ya preparada
    ctx.activeBattle.value.enemy = finalEnemyPoke
    
    return // BLOQUEO: Esperamos interacción del usuario
  } else {
    // ENTRADA DIRECTA (Wild, Trainer o Gym)
    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENTRY_ANIM)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    
    if (isTrainer || isGym) {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENTRY)
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.T_VISUAL)
    } else {
      // Wild Entry Directa
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
      ctx.activeBattle.value.enemy = finalEnemyPoke
    }
  }

  await initBattleSequence(ctx, { 
    locationId, isTrainer, trainerName, isGym, gymId, wasSearching,
    initialEnemy: finalEnemyPoke,
    initialPlayer: playerPoke
  })
}

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(ctx, { locationId, isTrainer, trainerName, isGym, gymId, wasSearching, initialEnemy, initialPlayer }) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  ctx.isIntroAnimating.value = true

  // PRECARGA DE COORDENADAS FINAL (Manual 412)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS, 50)

  if (wasSearching) {
    // --- FLUJO BÚSQUEDA (Manual 7. ENCOUNTER ANIMATION) ---
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENCOUNTER)
    
    // SALTO PARALELO (Bushes + Jump + Binoculars Check)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.CHECK_BINOCULARS)
    fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_JUMP)
    
    const hasBinoculars = ctx.debugBinoculars.value || (ctx.gs.state.inventory?.['binoculars'] > 0)
    if (!hasBinoculars) {
      await await setTimeout(150)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_FADE, 100)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.REVEAL_COLORS, 500)
    } else {
      await await setTimeout(600)
    }
  } else {
    // --- FLUJO DIRECTO (Manual 5. FIRST_INTRO / 7. ENCOUNTER_ANIM) ---
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)

    if (isTrainer || isGym) {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SHOW_DIALOGS)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_RETREAT, 800)
      
      // Llamado del Pokémon del rival (Según diagrama 840)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.POKEMON_CALL, 100)
      ctx.activeBattle.value.enemy = initialEnemy
    } else {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_PREP, 400)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_VISIBLE)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_MODE)
      // El asiento ya fue ocupado en startBattleSequence
    }
  }

  // --- LLAMADO DEL JUGADOR (Identity Guard) ---
  const currentPlayer = ctx.activeBattle.value.player
  const needsCall = !currentPlayer || (currentPlayer.uid !== initialPlayer.uid)

  if (needsCall) {
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL, 100)
    ctx.activeBattle.value.player = initialPlayer
  } else {
    console.log('[Orchestrator] Player already in seat, maintaining presence')
  }
  
  // --- SINCRONIZACIÓN FINAL (Audit-Compliance) ---
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.ANIM_SYNC, 800)
  await fsm.transition(BATTLE_STATES.REORDER_TEAM, null)
  
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

  // Flujo normal de inicio de combate directo (Entrenadores o encuentro forzado)
  ctx.isIntroAnimating.value = false
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT, 300)

  ctx.upcomingPokemon.value = null 


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
