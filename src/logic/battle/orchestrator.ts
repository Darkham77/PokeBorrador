import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'

import { generateEncounter } from '@/logic/encounters'
import { handleEntryAbilities } from './battleFlow.ts'
import { getMechanicalWeather } from '../weather/weatherRegistry.ts'
import { FIRE_RED_MAPS } from '@/data/maps'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useEventStore } from '@/stores/events'
import { useWarStore } from '@/stores/war'
import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon } from '@/types/pokemon'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle'
import type { UIStore, MapStore, EventStore, WarStore } from '@/types/stores'

export interface BattleOptions {
  isGym?: boolean;
  gymId?: string;
  locationId?: string;
  isTrainer?: boolean;
  enemyTeam?: Pokemon[];
  trainerName?: string;
  battleOptions?: Record<string, unknown>;
  isFishing?: boolean;
  isArchaeology?: boolean;
  wasSearching?: boolean;
  isDebug?: boolean;
  over?: boolean;
  turn?: 'player' | 'enemy' | null;
}

/**
 * Orchestrates the start of a battle.
 * @param {BattleContext} ctx - The battle store context (refs, state, etc)
 */
export async function startBattleSequence(ctx: BattleContext, enemyPoke: Pokemon, options: BattleOptions = {}) {
  const { 
    isGym = false, gymId = undefined, locationId = 'plains', 
    isTrainer = false, enemyTeam = undefined, trainerName = 'Entrenador',
    battleOptions = {}, isFishing = false, isArchaeology = false, wasSearching: wasSearchingOpt = null
  } = options

  const map = FIRE_RED_MAPS.find(m => m.id === locationId)
  let activeBiome = 'isPlains'
  const mapTags: string[] = []
  if (map) {
    const hierarchy = [
      'isArctic', 'isIndoors', 'isUrban', 'isVolcanic', 'isCrystalCave', 'isCave',
      'isDesert', 'isSwamp', 'isMountain',
      'isCoastal', 'isForest', 'isPlains'
    ];
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        activeBiome = key;
        break;
      }
    }
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        mapTags.push(key)
      }
    }
  }
  const tagsStr = mapTags.join(', ') || 'ninguno'

  logger.info('Orchestrator', `startBattleSequence starting... Biome: ${activeBiome} (Tags: ${tagsStr}) for location: ${locationId}`, { isTrainer, isGym, wasSearchingOpt })

  const playerPoke = ctx.gs.state.team.find((p) => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    (useUIStore() as unknown as UIStore).notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
  if (ctx.isBattleActive.value && !ctx.isFinishing.value && !ctx.activeBattle.value?.over && !ctx.isSearching.value) {
    logger.warn('BATTLE', 'Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }

  const wasSearching = wasSearchingOpt !== null ? wasSearchingOpt : true
  
  const { sanitizePokemon } = await import('@/logic/pokemonFactory')
  const mapStore = useMapStore() as unknown as MapStore

  const isFromUpcoming = wasSearching && ctx.upcomingPokemon.value && (ctx.upcomingPokemon.value.id === enemyPoke.id)
  const finalEnemyPoke = isFromUpcoming ? ctx.upcomingPokemon.value as Pokemon : enemyPoke

  sanitizePokemon(playerPoke)
  sanitizePokemon(finalEnemyPoke)

  // LIMPIEZA DE ESTADOS VOLÁTILES
  ctx.clearVolatileStatus(playerPoke)
  ctx.clearVolatileStatus(finalEnemyPoke)

  // Initial context values
  let rarity = 50

  ctx.activeBattle.value = {
    enemy: null, 
    player: null, 
    _initialEnemy: finalEnemyPoke,
    _initialPlayer: playerPoke,
    isGym, gymId, isTrainer, enemyTeam,
    trainerSprite: battleOptions.trainerSprite as string || undefined,
    playerTeam: ctx.gs.state.team,
    trainerName, locationId,
    isCave: FIRE_RED_MAPS.find(m => m.id === locationId)?.isCave || false,
    isIndoors: FIRE_RED_MAPS.find(m => m.id === locationId)?.isIndoors || false,
    isCrystalCave: FIRE_RED_MAPS.find(m => m.id === locationId)?.isCrystalCave || false,
    turn: 'player', turnCount: 1, over: false,
    isFishing, isArchaeology, rarity,
    weather: { 
      type: getMechanicalWeather(mapStore.currentWeather), 
      visual: mapStore.currentWeather, 
      turns: -1 
    },
    playerTeamIndex: ctx.gs.state.team.indexOf(playerPoke),
    participants: [playerPoke.uid], learnQueue: [], ...battleOptions,
    escapeAttempts: 0
  }

  if (battleOptions.isDebug) {
    ctx.debugLoopPokemon.value = JSON.parse(JSON.stringify(enemyPoke))
    if (!wasSearching) ctx.debugLoopPokemon.value = null
  }

  ctx.gs.registerPokedex(enemyPoke.id)
  if (isTrainer && enemyTeam) enemyTeam.forEach((p: Pokemon) => ctx.gs.registerPokedex(p.id))
  ctx.persistBattle()
  
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  ctx.isIntroAnimating.value = true

  // PROTOCOLO DE ASIENTOS
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = null 
    
    const currentP = ctx.activeBattle.value.player
    const team = (ctx.gs.state.team as Pokemon[]) || []
    const firstAlive = team.find(p => p && p.hp > 0)
    if (!currentP || !firstAlive || currentP.uid !== (firstAlive?.uid)) {
      ctx.activeBattle.value.player = null
    }
  }
  
  ctx.clearLogs()

  logger.debug('Orchestrator', 'Transitions starting...');
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.APPLY_ITEM_MODIFIERS)
  
  // Weight Calculation
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.WEIGHT_CALCULATION)
  if (isFishing) {
    const loc = FIRE_RED_MAPS.find(l => l.id === locationId)
    if (loc && loc.fishing) {
      const pool = loc.fishing.pool
      const rates = loc.fishing.rates
      const idx = pool.indexOf(finalEnemyPoke.id)
      if (idx !== -1) {
        const totalRate = rates.reduce((a, b) => a + b, 0)
        const rateVal = rates[idx]
        rarity = ((rateVal !== undefined ? rateVal : 0) / totalRate) * 100
      }
    }
  }
  if (ctx.activeBattle.value) ctx.activeBattle.value.rarity = rarity

  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.INJECT_FILTERS)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.READY_FOR_GEN)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.VACATE_ALL_SEATS)

  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_CONTEXT)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ASYNC_THREAD)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_TEAMS)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MARK_EVENT)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS, 50)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.SET_SEARCH_FLAG)

  if (wasSearching) {
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PARALLEL_PREP)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.UPDATE_BUTTON)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_VISIBLE)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.SILHOUETTE_MODE)
    if (ctx.activeBattle.value) ctx.activeBattle.value.enemy = finalEnemyPoke
    return 
  } else {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENTRY_ANIM)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    
    if (isTrainer || isGym) {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENTRY)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.T_VISUAL)
      if (ctx.animations?.triggerTrainerEntry) {
        await ctx.animations.triggerTrainerEntry()
      }
    } else {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
      if (ctx.activeBattle.value) ctx.activeBattle.value.enemy = finalEnemyPoke
    }
  }

  logger.info('Orchestrator', 'Calling initBattleSequence...');
  await initBattleSequence(ctx, { 
    locationId, isTrainer, trainerName, isGym, gymId, wasSearching,
    initialEnemy: finalEnemyPoke,
    initialPlayer: playerPoke
  })
}

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(ctx: BattleContext, options: BattleOptions & { initialEnemy: Pokemon | null, initialPlayer: Pokemon | null }) {
  const { locationId, isTrainer, trainerName, isGym, wasSearching, initialEnemy, initialPlayer } = options
  if (!initialPlayer || !initialEnemy) return;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  ctx.isIntroAnimating.value = true
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS)

  // Esperar a que la vista (BattleArenaView) se monte y registre las funciones de animación
  for (let i = 0; i < 40; i++) {
    if (ctx.animations) break
    await sleep(50)
  }

  const currentPlayer = ctx.activeBattle.value?.player
  const needsCall = !currentPlayer || (currentPlayer.uid !== initialPlayer.uid)

  if (wasSearching) {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENCOUNTER)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.CHECK_BINOCULARS)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_JUMP)
    
    const inventoryBinoculars = ctx.gs.state.inventory['binoculars'] || 0
    const hasBinoculars = ctx.debugBinoculars.value || (inventoryBinoculars > 0)
    
    // Capture current (wrong-order) pokemon BEFORE overwriting activeBattle.player
    const oldPlayerBeforeSearch = needsCall ? ctx.activeBattle.value?.player ?? null : null
    const hasRealSwap = oldPlayerBeforeSearch && oldPlayerBeforeSearch.uid !== initialPlayer.uid

    if (needsCall && ctx.activeBattle.value) {
      if (hasRealSwap) ctx.exitingPlayer.value = oldPlayerBeforeSearch
      ctx.activeBattle.value.player = initialPlayer
    }

    const promises: Promise<void>[] = []
    if (!hasBinoculars) {
      if (ctx.animations?.triggerSearchEncounter) {
        fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.JUMP_SHADOW)
        promises.push(ctx.animations.triggerSearchEncounter())
      } else {
        promises.push(fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.REVEAL_COLORS, 600))
      }
    } else {
      promises.push(sleep(600))
    }

    if (needsCall && ctx.animations?.handleReleaseRequest) {
      // Run recall of wrong-order pokemon + sendout of correct pokemon in parallel
      if (hasRealSwap && ctx.animations.handleCatchRequest) {
        promises.push(ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPlayerBeforeSearch }))
      }
      promises.push(ctx.animations.handleReleaseRequest({ side: 'player', pokemon: initialPlayer }))
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }
    if (hasRealSwap) ctx.exitingPlayer.value = null
  } else {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)

    if (isTrainer || isGym) {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER)
      if (ctx.animations?.triggerTrainerEntry) {
        await ctx.animations.triggerTrainerEntry()
      }

      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SHOW_DIALOGS)
      if (ctx.animations?.triggerTrainerDialogs) {
        await ctx.animations.triggerTrainerDialogs()
      }

      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_RETREAT)
      if (ctx.animations?.triggerTrainerRetreat) {
        await ctx.animations.triggerTrainerRetreat()
      }

      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.POKEMON_CALL)
      if (ctx.animations?.triggerPokemonCall) {
        await ctx.animations.triggerPokemonCall()
      }
      if (ctx.activeBattle.value) ctx.activeBattle.value.enemy = initialEnemy
    } else {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_PREP, 400)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_VISIBLE)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_MODE)
    }

    if (needsCall && ctx.activeBattle.value) {
      const oldPoke = ctx.activeBattle.value.player
      if (oldPoke && oldPoke.uid !== initialPlayer.uid) {
        ctx.exitingPlayer.value = oldPoke
      }
      
      ctx.activeBattle.value.player = initialPlayer
      
      const withdrawPromise = oldPoke && oldPoke.uid !== initialPlayer.uid && ctx.animations?.handleCatchRequest
        ? ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPoke })
        : Promise.resolve()
        
      const sendOutPromise = ctx.animations?.handleReleaseRequest
        ? ctx.animations.handleReleaseRequest({ side: 'player', pokemon: initialPlayer })
        : Promise.resolve()
        
      // FSM transition moved AFTER animations complete so the watcher
      // doesn't overwrite UID-tracked animState values mid-animation
      await Promise.all([withdrawPromise, sendOutPromise])
      await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
      ctx.exitingPlayer.value = null
    }
  }

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, null)
  
  window.dispatchEvent(new Event('resize'))
  
  ctx.attackerSide.value = null
  ctx.activeMove.value = null
  
  // Log active biome and map properties
  const map = FIRE_RED_MAPS.find(m => m.id === locationId)
  let activeBiome = 'isPlains'
  const mapTags: string[] = []
  if (map) {
    const hierarchy = [
      'isArctic', 'isIndoors', 'isUrban', 'isVolcanic', 'isCrystalCave', 'isCave',
      'isDesert', 'isSwamp', 'isMountain',
      'isCoastal', 'isForest', 'isPlains'
    ];
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        activeBiome = key;
        break;
      }
    }
    for (const key of hierarchy) {
      if ((map as Record<string, unknown>)[key]) {
        mapTags.push(key)
      }
    }
  }

  const startMsg = isTrainer || isGym 
    ? `¡${trainerName} te desafía!` 
    : `¡Un ${initialEnemy.name} salvaje apareció!`
  
  ctx.addLog(startMsg, 'log-info', initialEnemy)
  logger.info('Orchestrator', `Combat started in biome: ${activeBiome} (Tags: ${mapTags.join(', ') || 'ninguno'}) for location: ${locationId}`)
  
  handleEntryAbilities(initialPlayer, initialEnemy, ctx.playerStages.value, ctx.enemyStages.value, ctx.addLog)
  
  if (isTrainer || isGym) await ctx.gs.scheduleSave()
  
  if (!isTrainer && !isGym) {
    const mapStore = useMapStore() as unknown as MapStore
    const eventStore = useEventStore() as unknown as EventStore
    const warStore = useWarStore() as unknown as WarStore
    const encounterOptions = {
      activeEvents: mapStore.activeEvents,
      dominanceData: warStore.mapDominance,
      shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
      forceEncounter: true 
    }
    
    generateEncounter(locationId || 'plains', ctx.gs.state, encounterOptions).then((encounter) => {
      if (encounter && encounter.type === 'wild' && encounter.pokemon) {
        if (fsm.currentState.value !== BATTLE_STATES.EXIT_BATTLE) {
          // background update only, NO FSM transition here to avoid hijacking
          ctx.upcomingPokemon.value = encounter.pokemon
        }
      }
    })
  }

  ctx.isIntroAnimating.value = false
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  ctx.isIntroAnimating.value = false
}

/**
 * Restores a battle state from saved data.
 */
export function restoreBattleState(ctx: BattleContext, battleData: unknown) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  if (!battleData) {
    ctx.activeBattle.value = null
    ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }
  const d = battleData as Partial<BattleState & { playerStages: BattleStages, enemyStages: BattleStages, battleLogs: BattleLog[] }>;
  ctx.activeBattle.value = d as BattleState
  if (d.playerStages) ctx.playerStages.value = d.playerStages
  if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
  if (d.battleLogs) ctx.battleLogs.value = d.battleLogs
  
  if (!d.over) {
    ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  } else {
    ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
  }
}
