import { PERCENTAGE_SCALE_FACTOR } from '@/logic/constants/encounters'
import { cloneReactive } from '@/logic/utils/cloneUtils.ts'
import { getMapBiomeAndTags } from './biomeHelper.ts'
import { MAPS_BY_ROUTE_ID, getMapLocationById } from '@/data/world/maps'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleWeather } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MapLocation } from '@/types/pokemon/encounters'
import { isWeatherId, requireWeatherId, resolveCurrentWeather } from '../weather/weatherRegistry.ts'
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts'
import { generateNPCInventory } from './trainerInventory.ts'
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import { requireGymId } from '@/data/world/gyms'
import { requireNpcArchetype } from '@/logic/utils/npcSpriteRouter'
import { requireItemId } from '@/data/inventory/items'
import { isPlayerClassId } from '@/data/player/playerClasses'
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import { isGenderId, type GenderId, type PlayerClassId } from '@/types/system/game'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { clampFriendship } from '@/logic/pokemon/friendshipLogic.ts'
import type { BattleOptions } from '@/types/system/stores.ts'

const INITIAL_RATE_CUMULATIVE_SUM = 0 as const;
const DEFAULT_RARITY_WEIGHT_BASE = 50 as const;

export interface ResolvedLocationData {
  resolvedLocationId: MapRouteId
  locationMap: MapLocation | undefined
  activeBiome: string
  mapTags: string[]
}

export function extractLocationAndBiome(options: BattleOptions, rawMapLocation?: string): ResolvedLocationData {
  const rawLoc = options.locationId || rawMapLocation
  if (!rawLoc) {
    throw new Error('[Battle] locationId or gameStore.state.map.currentMap is required to start a battle')
  }
  const cleanLoc = requireMapRouteId(rawLoc)
  const resolvedLocationId: MapRouteId = cleanLoc === 'gym' ? 'stadium' : cleanLoc
  const locationMap = getMapLocationById(resolvedLocationId)
  const { activeBiome, mapTags } = getMapBiomeAndTags(resolvedLocationId)
  return { resolvedLocationId, locationMap, activeBiome, mapTags }
}

function resolveArchetypeAndGym(options: BattleOptions) {
  const { trainerArchetype, battleOptions = {}, gymId } = options
  const optArch = typeof battleOptions.trainerArchetype === 'string'
    ? requireNpcArchetype(battleOptions.trainerArchetype)
    : undefined
  const resolvedTrainerArchetype = trainerArchetype ? requireNpcArchetype(trainerArchetype) : optArch
  const resolvedGymId = gymId ? requireGymId(gymId) : undefined
  return { resolvedTrainerArchetype, resolvedGymId }
}

function resolveDifficultyAndReward(options: BattleOptions) {
  const { difficulty, rewardTM } = options
  const resolvedDifficulty = difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard' ? difficulty : undefined
  const resolvedRewardTM = rewardTM ? requireItemId(rewardTM) : undefined
  return { resolvedDifficulty, resolvedRewardTM }
}

export function extractBattleConfig(options: BattleOptions) {
  const isGym = Boolean(
    options.isGym ||
    (typeof options.battleOptions === 'object' && options.battleOptions?.isGym) ||
    options.gymId ||
    options.locationId === 'stadium' ||
    options.locationId === 'gym'
  )
  const isPvP = Boolean(options.isPvP || options.pvpMatchId)

  const {
    isTrainer = false, enemyTeam = undefined, trainerName = 'Entrenador',
    battleOptions = {}, minigame = options.minigame ?? null, wasSearching: wasSearchingOpt = options.wasSearching ?? null,
    trainerSprite = undefined, isRival = false, cannotEscape = false,
    trainerQuote = undefined,
    pvpMatchId = undefined,
    pvpIsHost = undefined,
    pvpOpponentId = undefined,
    pvpOpponentName = undefined,
    playerTeam = undefined
  } = options

  const { resolvedTrainerArchetype, resolvedGymId } = resolveArchetypeAndGym(options)
  const { resolvedDifficulty, resolvedRewardTM } = resolveDifficultyAndReward(options)

  return {
    isGym, resolvedGymId,
    isTrainer, enemyTeam, trainerName,
    battleOptions, minigame, wasSearchingOpt,
    trainerSprite, resolvedTrainerArchetype, isRival,
    resolvedDifficulty, resolvedRewardTM, cannotEscape,
    trainerQuote,
    isPvP,
    pvpMatchId,
    pvpIsHost,
    pvpOpponentId,
    pvpOpponentName,
    playerTeam
  }
}

export function resolveBattleWeather(
  options: BattleOptions,
  cfg: ReturnType<typeof extractBattleConfig>,
  loc: ResolvedLocationData
) {
  const environment = getMapEnvironment(loc.resolvedLocationId, {
    isGym: cfg.isGym,
    gymId: cfg.resolvedGymId,
    isPvP: cfg.isPvP,
    isCave: loc.locationMap?.isCave,
    isIndoors: loc.locationMap?.isIndoors
  })

  const rawFixedWeather = options.fixedWeather || (typeof cfg.battleOptions?.fixedWeather === 'string' && isWeatherId(cfg.battleOptions.fixedWeather) ? cfg.battleOptions.fixedWeather : undefined)
  const rawIncomingWeather = rawFixedWeather ?? (environment.isWeatherAllowed() ? resolveCurrentWeather() : undefined)
  const weather = environment.resolveCombatWeather(rawIncomingWeather)
  const activeWeatherId = requireWeatherId(weather.visual || weather.type || 'clear')
  return { activeWeatherId, weather }
}

export function calculateFishingRarity(
  minigame: string | null,
  locationMap: (typeof MAPS_BY_ROUTE_ID)[keyof typeof MAPS_BY_ROUTE_ID] | undefined,
  enemyPoke: Pokemon
): number {
  if (minigame !== 'fishing' || !locationMap?.fishing) {
    return DEFAULT_RARITY_WEIGHT_BASE
  }
  const { pool, rates } = locationMap.fishing
  const enemySpeciesId = requirePokemonSpeciesId(enemyPoke.id)
  const idx = pool.indexOf(enemySpeciesId)
  if (idx === -1) {
    return DEFAULT_RARITY_WEIGHT_BASE
  }
  const totalRate = rates.reduce((a, b) => a + b, INITIAL_RATE_CUMULATIVE_SUM)
  const rateVal = rates[idx] ?? INITIAL_RATE_CUMULATIVE_SUM
  return (rateVal / totalRate) * PERCENTAGE_SCALE_FACTOR
}

function resolveTrainerSprite(rawSprite?: string): NpcSpriteId | PlayerClassId | undefined {
  if (!rawSprite) return undefined
  return isPlayerClassId(rawSprite) ? rawSprite : requireNpcSpriteId(rawSprite)
}

function pickTrainerGender(options: BattleOptions, rawGender: unknown): GenderId | undefined {
  if (options.trainerGender) return options.trainerGender
  return isGenderId(rawGender) ? rawGender : undefined
}

function resolveTrainerDetails(cfg: ReturnType<typeof extractBattleConfig>, options: BattleOptions) {
  const { battleOptions } = cfg
  const nestedSprite = typeof battleOptions.trainerSprite === 'string' ? battleOptions.trainerSprite : undefined
  const sprite = resolveTrainerSprite(cfg.trainerSprite ?? nestedSprite)
  const gender = pickTrainerGender(options, battleOptions.trainerGender)
  const isNamed = [cfg.isTrainer, cfg.isGym, cfg.isPvP, cfg.isRival].some(Boolean)
  const name = isNamed ? cfg.trainerName : undefined
  const nestedQuote = typeof battleOptions.quote === 'string' ? battleOptions.quote : undefined
  const quote = cfg.trainerQuote ?? nestedQuote
  return { sprite, gender, name, quote }
}

function resolveReturnTab(options: BattleOptions, ctx: BattleContext, isGym: boolean, isPvP: boolean): string {
  if (options.returnTab) return options.returnTab
  if (ctx.uiStore?.activeTab) return ctx.uiStore.activeTab
  if (isGym) return 'gyms'
  if (isPvP) return 'arena'
  return 'map'
}

function buildInitialEnemiesMap(finalEnemyTeam: Pokemon[], startingEnemyPoke: Pokemon): Record<string, Pokemon> {
  if (finalEnemyTeam?.length) {
    return Object.fromEntries(finalEnemyTeam.filter(Boolean).map(pk => [pk.uid, cloneReactive(pk)]))
  }
  if (startingEnemyPoke?.uid) {
    return { [startingEnemyPoke.uid]: cloneReactive(startingEnemyPoke) }
  }
  return {}
}

export interface BuildBattleStateParams {
  cfg: ReturnType<typeof extractBattleConfig>
  loc: ResolvedLocationData
  options: BattleOptions
  playerPoke: Pokemon
  startingEnemyPoke: Pokemon
  finalEnemyPoke: Pokemon
  finalEnemyTeam: Pokemon[]
  effectivePlayerTeam: Pokemon[]
  maxEnemyLv: number
  enemyInventory: Record<string, number> | undefined
  enemyMoney: number | undefined
  weather: BattleWeather
  wasSearching: boolean
  ctx: BattleContext
}

export function buildInitialBattleState(p: BuildBattleStateParams): BattleState {
  const { cfg, loc, options, playerPoke, startingEnemyPoke, finalEnemyTeam, effectivePlayerTeam, maxEnemyLv, enemyInventory, enemyMoney, weather, wasSearching, ctx } = p
  const { battleOptions } = cfg
  const trainer = resolveTrainerDetails(cfg, options)
  const locationMap = loc.locationMap
  const returnTab = resolveReturnTab(options, ctx, cfg.isGym, cfg.isPvP)

  return {
    ...battleOptions,
    returnTab,
    enemy: null,
    player: null,
    _initialEnemy: cloneReactive(startingEnemyPoke),
    _initialEnemies: buildInitialEnemiesMap(finalEnemyTeam, startingEnemyPoke),
    _rewardCombatants: [],
    isGym: cfg.isGym,
    gymId: cfg.resolvedGymId,
    isTrainer: cfg.isTrainer,
    enemyTeam: finalEnemyTeam,
    difficulty: cfg.resolvedDifficulty,
    rewardTM: cfg.resolvedRewardTM,
    isPvP: cfg.isPvP,
    pvpMatchId: cfg.pvpMatchId,
    pvpIsHost: cfg.pvpIsHost,
    pvpOpponentId: cfg.pvpOpponentId,
    pvpOpponentName: cfg.pvpOpponentName,
    fixedCycle: options.fixedCycle,
    fixedWeather: options.fixedWeather,
    enemyInventory,
    enemyMoney,
    enemyMaxLevel: maxEnemyLv,
    trainerSprite: trainer.sprite,
    trainerGender: trainer.gender,
    trainerArchetype: cfg.resolvedTrainerArchetype,
    isRival: cfg.isRival || battleOptions.isRival === true,
    playerTeam: effectivePlayerTeam,
    trainerName: trainer.name,
    locationId: loc.resolvedLocationId,
    quote: trainer.quote,
    isCave: locationMap?.isCave || false,
    isIndoors: locationMap?.isIndoors || false,
    isCrystalCave: locationMap?.isCrystalCave || false,
    turn: 'player',
    turnCount: 1,
    over: false,
    minigame: cfg.minigame,
    rarity: DEFAULT_RARITY_WEIGHT_BASE,
    wasSearching,
    cannotEscape: cfg.cannotEscape || Boolean(battleOptions.cannotEscape),
    weather,
    playerTeamIndex: effectivePlayerTeam.indexOf(playerPoke),
    enemyTeamIndex: 0,
    participants: [playerPoke.uid],
    learnQueue: [],
    escapeAttempts: 0,
    playerSideConditions: {},
    enemySideConditions: {},
    initialFriendships: Object.fromEntries(
      (effectivePlayerTeam || []).map((p: Pokemon) => [p.uid, clampFriendship(p.friendship)])
    )
  }
}

export function generateNpcInventoryForBattle(cfg: ReturnType<typeof extractBattleConfig>, maxEnemyLv: number) {
  if (!cfg.isTrainer && !cfg.isGym) return null
  const isRival = cfg.isRival || cfg.battleOptions.isRival === true
  return generateNPCInventory(maxEnemyLv, cfg.resolvedDifficulty, cfg.isGym, isRival, cfg.resolvedTrainerArchetype)
}
