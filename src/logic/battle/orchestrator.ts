const INITIAL_RATE_CUMULATIVE_SUM = 0;

import { PERCENTAGE_SCALE_FACTOR } from '@/logic/constants/encounters'
import { toRaw } from 'vue'
import { getMapBiomeAndTags } from './biomeHelper.ts'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleSide, BattleMinigame } from '@/types/battle/battle'
import { mapVisualToOfficialWeather } from '../weather/weatherGenerationProvider.ts'
import { requireWeatherId } from '../weather/weatherRegistry.ts'
import { ACTIVE_GENERATION } from '../../data/system/constants.ts'
import { generateNPCInventory } from './trainerInventory.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireGymId } from '@/data/world/gyms'
import { requireNpcArchetype } from '@/logic/utils/npcSpriteRouter'
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter'
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { requireItemId, type ItemId } from '@/data/inventory/items'
import type { DayPhase } from '@/logic/utils/timeUtils'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker
} from './showdownWorkerClient.ts';
import { initBattleSequence } from './helpers/battleLifecycleInitializer.ts';

const DEFAULT_RARITY_WEIGHT_BASE = 50;

export {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker,
  initBattleSequence
};

export interface BattleOptions {
  isGym?: boolean;
  gymId?: string;
  locationId?: string;
  isTrainer?: boolean;
  enemyTeam?: Pokemon[];
  trainerName?: string;
  battleOptions?: Record<string, unknown>;
  minigame?: BattleMinigame | null;
  wasSearching?: boolean;
  isDebug?: boolean;
  over?: boolean;
  turn?: BattleSide | null;
  trainerSprite?: NpcSpriteId;
  trainerArchetype?: NpcArchetype;
  isRival?: boolean;
  difficulty?: string;
  rewardTM?: ItemId;
  cannotEscape?: boolean;
  persistenceMode?: string;
  trainerQuote?: string;
  fixedCycle?: DayPhase;
  fixedWeather?: WeatherId;
}

/**
 * Orchestrates the start of a battle.
 * @param {BattleContext} ctx - The battle store context (refs, state, etc)
 */
export async function startBattleSequence(ctx: BattleContext, enemyPoke: Pokemon, options: BattleOptions = {}) {
  const rawLoc = options.locationId || ctx.gs.state.map?.currentMap;
  if (!rawLoc) {
    throw new Error('[Battle] locationId or gameStore.state.map.currentMap is required to start a battle');
  }
  const resolvedLocationId = requireMapRouteId(rawLoc);

  const { 
    isGym = false, gymId = undefined,
    isTrainer = false, enemyTeam = undefined, trainerName = 'Entrenador',
    battleOptions = {}, minigame = options.minigame ?? null, wasSearching: wasSearchingOpt = options.wasSearching ?? null,
    trainerSprite = undefined, trainerArchetype = undefined, isRival = false,
    difficulty = undefined, rewardTM = undefined, cannotEscape = false,
    trainerQuote = undefined
  } = options

  const optionTrainerArchetype = typeof battleOptions.trainerArchetype === 'string'
    ? requireNpcArchetype(battleOptions.trainerArchetype)
    : undefined
  const resolvedTrainerArchetype = trainerArchetype
    ? requireNpcArchetype(trainerArchetype)
    : optionTrainerArchetype
  const resolvedGymId = gymId ? requireGymId(gymId) : undefined
  const resolvedDifficulty = difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard'
    ? difficulty
    : undefined
  const resolvedRewardTM = rewardTM ? requireItemId(rewardTM) : undefined

  const { activeBiome, mapTags } = getMapBiomeAndTags(resolvedLocationId)
  const tagsStr = mapTags.join(', ') || 'ninguno'
  logger.info('Orchestrator', `startBattleSequence starting... Biome: ${activeBiome} (Tags: ${tagsStr}) for location: ${resolvedLocationId}`, { isTrainer, isGym, wasSearchingOpt })

  const playerPoke = ctx.gs.state.team.find((p) => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    const { useUIStore } = await import('@/stores/ui')
    useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  const isDebugOrReplay = typeof window !== 'undefined' && (
    Boolean(window.__VITE_DEBUG__?.isDeterministicSimulation) ||
    Boolean(window.__VITE_DEBUG__?.isScriptedReplayMode) ||
    Boolean(options.isDebug)
  );

  if (!isDebugOrReplay) {
    const { checkPokemonLegality } = await import('@/logic/pokemon/pokemonLegality')
    const illegalPoke = ctx.gs.state.team.find((p) => {
      if (!p) return false
      if (p.isIllegal) return true
      const legality = checkPokemonLegality(p)
      if (!legality.isLegal) {
        p.isIllegal = true
        p.illegalReasons = legality.issues
        return true
      }
      return false
    })
    if (illegalPoke) {
      const { useUIStore } = await import('@/stores/ui')
      useUIStore().notify(`No puedes combatir: tu equipo contiene Pokémon ilegales (${illegalPoke.name}). Repáralos antes de continuar.`, '⚠️')
      return
    }
  }

  // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
  if (ctx.isBattleActive.value && !ctx.isFinishing.value && !ctx.activeBattle.value?.over && !ctx.isSearching.value) {
    logger.warn('BATTLE', 'Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }

  const wasSearching = wasSearchingOpt !== null ? wasSearchingOpt : false
  logger.info('Orchestrator', `wasSearching evaluated: ${wasSearching} (wasSearchingOpt: ${wasSearchingOpt})`)
  
  const { validatePokemon } = await import('@/logic/pokemon/pokemonFactory')
  const { useMapStore } = await import('@/stores/map')
  const mapStore = useMapStore()
  const finalEnemyPoke = enemyPoke
  const finalEnemyTeam = enemyTeam && enemyTeam.length > 0 ? enemyTeam : [finalEnemyPoke]
  const startingEnemyPoke = finalEnemyTeam.find(p => p && p.hp > 0) || finalEnemyPoke

  validatePokemon(playerPoke, isDebugOrReplay)
  finalEnemyTeam.forEach((p: Pokemon) => p && validatePokemon(p, isDebugOrReplay))

  // LIMPIEZA DE ESTADOS VOLÁTILES
  ctx.clearVolatileStatus(playerPoke)
  ctx.clearVolatileStatus(startingEnemyPoke)

  // Initial context values
  let rarity = DEFAULT_RARITY_WEIGHT_BASE

  const maxEnemyLv = Math.max(...finalEnemyTeam.map(p => p?.level || 1))
  const npcInvResult = (isTrainer || isGym)
    ? generateNPCInventory(maxEnemyLv, resolvedDifficulty, isGym, isRival || battleOptions.isRival === true, resolvedTrainerArchetype)
    : null;
  const enemyInventory = npcInvResult?.inventory;
  const enemyMoney = npcInvResult?.remainingMoney;

  const nestedTrainerSprite = typeof battleOptions.trainerSprite === 'string' ? battleOptions.trainerSprite : undefined;
  const resolvedTrainerSprite = trainerSprite || nestedTrainerSprite;
  const locationMap = MAPS_BY_ROUTE_ID[resolvedLocationId];

  ctx.activeBattle.value = {
    ...battleOptions,
    enemy: null, 
    player: null, 
    _initialEnemy: structuredClone(toRaw(startingEnemyPoke)),
    _rewardCombatants: [],
    isGym, gymId: resolvedGymId, isTrainer, enemyTeam: finalEnemyTeam, difficulty: resolvedDifficulty, rewardTM: resolvedRewardTM,
    fixedCycle: options.fixedCycle,
    fixedWeather: options.fixedWeather,
    enemyInventory,
    enemyMoney,
    enemyMaxLevel: maxEnemyLv,
    trainerSprite: resolvedTrainerSprite ? requireNpcSpriteId(resolvedTrainerSprite) : undefined,
    trainerArchetype: resolvedTrainerArchetype,
    isRival: isRival || battleOptions.isRival === true,
    playerTeam: ctx.gs.state.team,
    trainerName, locationId: resolvedLocationId,
    quote: trainerQuote || (battleOptions.quote as string) || undefined,
    isCave: locationMap?.isCave || false,
    isIndoors: locationMap?.isIndoors || false,
    isCrystalCave: locationMap?.isCrystalCave || false,
    turn: 'player', turnCount: 1, over: false,
    minigame, rarity,
    wasSearching,
    cannotEscape: cannotEscape || (battleOptions.cannotEscape as boolean) || false,
    weather: { 
      type: isGym ? requireWeatherId('none') : requireWeatherId(mapVisualToOfficialWeather(mapStore.currentWeather, ACTIVE_GENERATION)), 
      visual: isGym ? 'clear' : mapStore.currentWeather, 
      turns: -1 
    },
    playerTeamIndex: ctx.gs.state.team.indexOf(playerPoke),
    enemyTeamIndex: 0,
    participants: [playerPoke.uid], learnQueue: [],
    escapeAttempts: 0,
    playerSideConditions: {},
    enemySideConditions: {},
  }

  if (battleOptions.isDebug) {
    ctx.debugLoopPokemon.value = JSON.parse(JSON.stringify(enemyPoke)) as Pokemon
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
    // Si es combate salvaje, el Pokémon enemigo ya ocupa el asiento desde el inicio.
    // Si es entrenador o gimnasio, el asiento inicia vacío hasta el envío visual (POKEMON_CALL).
    ctx.activeBattle.value.enemy = (!isTrainer && !isGym) ? finalEnemyPoke : null 
    
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
  if (minigame === 'fishing') {
    const loc = locationMap;
    if (loc && loc.fishing) {
      const pool = loc.fishing.pool
      const rates = loc.fishing.rates
      const enemySpeciesId = requirePokemonSpeciesId(finalEnemyPoke.id)
      const idx = pool.indexOf(enemySpeciesId)
      if (idx !== -1) {
        const totalRate = rates.reduce((a, b) => a + b, INITIAL_RATE_CUMULATIVE_SUM)
        const rateVal = rates[idx]
        rarity = ((rateVal !== undefined ? rateVal : INITIAL_RATE_CUMULATIVE_SUM) / totalRate) * PERCENTAGE_SCALE_FACTOR
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
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS, 0)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.SET_SEARCH_FLAG)
  logger.info('Orchestrator', `reached after SET_SEARCH_FLAG transition. wasSearching = ${wasSearching}`)

  if (wasSearching) {
    const { processSearchPhaseSequence } = await import('./orchestratorSearchPhaseHelper.ts')
    const handled = await processSearchPhaseSequence(ctx, finalEnemyPoke, minigame, isTrainer, isGym)
    if (handled) return
  }

  // Si wasSearching es false, llamamos primero a initBattleSequence (que maneja el PRELOAD_FINAL_COORDS en INITIALIZING)
  // antes de avanzar al flujo visual de FIRST_INTRO.
  logger.info('Orchestrator', 'Calling initBattleSequence...');
  await initBattleSequence(ctx, { 
    locationId: resolvedLocationId, isTrainer, trainerName, isGym, gymId: resolvedGymId, wasSearching,
    initialEnemy: startingEnemyPoke,
    initialPlayer: playerPoke
  })
}

export { restoreBattleState } from './orchestratorRestoreHelper.ts'
