import { requireItemId, type ItemId } from '@/data/inventory/items';
import { isPlayerClassId } from '@/data/player/playerClasses';
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import { requireGymId, type GymId } from '@/data/world/gyms';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets';
import { MAPS_BY_ROUTE_ID, getMapLocationById } from '@/data/world/maps';
import { PERCENT_BASE_MULTIPLIER } from '@/logic/constants/gameplay';
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts';
import { clampFriendship } from '@/logic/pokemon/friendshipLogic.ts';
import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import { requireNpcArchetype, type NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import {
  BATTLE_DIFFICULTIES,
  type BattleDifficulty,
  type BattleParticipantUid,
  type BattleState,
  type BattleWeather
} from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Inventory } from '@/types/inventory/items';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { isGenderId, type GenderId, type PlayerClassId } from '@/types/system/game';
import type { BattleOptions } from '@/types/system/stores.ts';

import {
  isWeatherId,
  requireWeatherId,
  resolveCurrentWeather,
  type WeatherId
} from '../weather/weatherRegistry.ts';
import { getMapBiomeAndTags } from './biomeHelper.ts';
import { generateNPCInventory } from './trainerInventory.ts';

const INITIAL_RATE_CUMULATIVE_SUM = 0 as const;
const DEFAULT_RARITY_WEIGHT_BASE = 50 as const;

export interface ResolvedLocationData {
  resolvedLocationId: MapRouteId;
  locationMap: MapLocation | undefined;
  activeBiome: string;
  mapTags: string[];
}

export function extractLocationAndBiome(
  options: BattleOptions,
  rawMapLocation?: string
): ResolvedLocationData {
  const rawLoc = options.locationId || rawMapLocation;
  if (!rawLoc) {
    throw new Error(
      '[Battle] locationId or gameStore.state.map.currentMap is required to start a battle'
    );
  }
  const cleanLoc = requireMapRouteId(rawLoc);
  const resolvedLocationId: MapRouteId = cleanLoc === 'gym' ? 'stadium' : cleanLoc;
  const locationMap = getMapLocationById(resolvedLocationId);
  const { activeBiome, mapTags } = getMapBiomeAndTags(resolvedLocationId);
  return { resolvedLocationId, locationMap, activeBiome, mapTags };
}

function resolveArchetypeAndGym(options: BattleOptions): {
  resolvedTrainerArchetype: NpcArchetype | undefined;
  resolvedGymId: GymId | undefined;
} {
  const { trainerArchetype, battleOptions = {}, gymId } = options;
  const optArch =
    typeof battleOptions.trainerArchetype === 'string'
      ? requireNpcArchetype(battleOptions.trainerArchetype)
      : undefined;
  const resolvedTrainerArchetype = trainerArchetype
    ? requireNpcArchetype(trainerArchetype)
    : optArch;
  const resolvedGymId = gymId ? requireGymId(gymId) : undefined;
  return { resolvedTrainerArchetype, resolvedGymId };
}

const BATTLE_DIFFICULTY_SET: ReadonlySet<BattleDifficulty> = new Set<BattleDifficulty>(
  BATTLE_DIFFICULTIES
);

function resolveDifficultyAndReward(options: BattleOptions): {
  resolvedDifficulty: BattleDifficulty | undefined;
  resolvedRewardTM: ItemId | undefined;
} {
  const { difficulty, rewardTM } = options;
  const resolvedDifficulty =
    difficulty && BATTLE_DIFFICULTY_SET.has(difficulty) ? difficulty : undefined;
  const resolvedRewardTM = rewardTM ? requireItemId(rewardTM) : undefined;
  return { resolvedDifficulty, resolvedRewardTM };
}

export interface ExtractedBattleConfig {
  isGym: boolean;
  resolvedGymId: GymId | undefined;
  isTrainer: boolean;
  enemyTeam: Pokemon[] | undefined;
  trainerName: string;
  battleOptions: Record<string, unknown>;
  minigame: 'archaeology' | 'fishing' | null | undefined;
  wasSearchingOpt: boolean | null;
  trainerSprite: string | undefined;
  resolvedTrainerArchetype: NpcArchetype | undefined;
  isRival: boolean;
  resolvedDifficulty: BattleDifficulty | undefined;
  resolvedRewardTM: ItemId | undefined;
  cannotEscape: boolean;
  trainerQuote: string | undefined;
  isPvP: boolean;
  pvpMatchId: string | undefined;
  pvpIsHost: boolean | undefined;
  pvpOpponentId: string | undefined;
  pvpOpponentName: string | undefined;
  playerTeam: Pokemon[] | undefined;
}

export function extractBattleConfig(options: BattleOptions): ExtractedBattleConfig {
  const isGym = Boolean(
    options.isGym ||
    (typeof options.battleOptions === 'object' && options.battleOptions?.isGym) ||
    options.gymId ||
    options.locationId === 'stadium' ||
    options.locationId === 'gym'
  );
  const isPvP = Boolean(options.isPvP || options.pvpMatchId);

  const {
    isTrainer = false,
    enemyTeam,
    trainerName = 'Entrenador',
    battleOptions = {},
    minigame = options.minigame ?? null,
    wasSearching: wasSearchingOpt = options.wasSearching ?? null,
    trainerSprite,
    isRival = false,
    cannotEscape = false,
    trainerQuote,
    pvpMatchId,
    pvpIsHost,
    pvpOpponentId,
    pvpOpponentName,
    playerTeam
  } = options;

  const { resolvedTrainerArchetype, resolvedGymId } = resolveArchetypeAndGym(options);
  const { resolvedDifficulty, resolvedRewardTM } = resolveDifficultyAndReward(options);

  return {
    isGym,
    resolvedGymId,
    isTrainer,
    enemyTeam,
    trainerName,
    battleOptions,
    minigame,
    wasSearchingOpt,
    trainerSprite,
    resolvedTrainerArchetype,
    isRival,
    resolvedDifficulty,
    resolvedRewardTM,
    cannotEscape,
    trainerQuote,
    isPvP,
    pvpMatchId,
    pvpIsHost,
    pvpOpponentId,
    pvpOpponentName,
    playerTeam
  };
}

export function resolveBattleWeather(
  options: BattleOptions,
  cfg: ReturnType<typeof extractBattleConfig>,
  loc: ResolvedLocationData
): {
  activeWeatherId: WeatherId;
  weather: ReturnType<ReturnType<typeof getMapEnvironment>['resolveCombatWeather']>;
} {
  const environment = getMapEnvironment(loc.resolvedLocationId, {
    isGym: cfg.isGym,
    gymId: cfg.resolvedGymId,
    isPvP: cfg.isPvP,
    isCave: loc.locationMap?.isCave,
    isIndoors: loc.locationMap?.isIndoors
  });

  const rawFixedWeather =
    options.fixedWeather ||
    (typeof cfg.battleOptions?.fixedWeather === 'string' &&
    isWeatherId(cfg.battleOptions.fixedWeather)
      ? cfg.battleOptions.fixedWeather
      : undefined);
  const rawIncomingWeather =
    rawFixedWeather ?? (environment.isWeatherAllowed() ? resolveCurrentWeather() : undefined);
  const weather = environment.resolveCombatWeather(rawIncomingWeather);
  const activeWeatherId = requireWeatherId(weather.visual || weather.type || 'clear');
  return { activeWeatherId, weather };
}

export function calculateFishingRarity(
  minigame: string | null,
  locationMap: (typeof MAPS_BY_ROUTE_ID)[keyof typeof MAPS_BY_ROUTE_ID] | undefined,
  enemyPoke: Pokemon
): number {
  if (minigame !== 'fishing' || !locationMap?.fishing) {
    return DEFAULT_RARITY_WEIGHT_BASE;
  }
  const { pool, rates } = locationMap.fishing;
  const enemySpeciesId = requirePokemonSpeciesId(enemyPoke.id);
  const idx = pool.indexOf(enemySpeciesId);
  if (idx === -1) {
    return DEFAULT_RARITY_WEIGHT_BASE;
  }
  const totalRate = rates.reduce((a, b) => a + b, INITIAL_RATE_CUMULATIVE_SUM);
  const rateVal = rates[idx] ?? INITIAL_RATE_CUMULATIVE_SUM;
  return (rateVal / totalRate) * PERCENT_BASE_MULTIPLIER;
}

function resolveTrainerSprite(rawSprite?: string): NpcSpriteId | PlayerClassId | undefined {
  if (!rawSprite) return undefined;
  return isPlayerClassId(rawSprite) ? rawSprite : requireNpcSpriteId(rawSprite);
}

function pickTrainerGender(options: BattleOptions, rawGender: unknown): GenderId | undefined {
  if (options.trainerGender) return options.trainerGender;
  return isGenderId(rawGender) ? rawGender : undefined;
}

function resolveTrainerDetails(
  cfg: ReturnType<typeof extractBattleConfig>,
  options: BattleOptions
): {
  sprite: NpcSpriteId | PlayerClassId | undefined;
  gender: GenderId | undefined;
  name: string | undefined;
  quote: string | undefined;
} {
  const { battleOptions } = cfg;
  const nestedSprite =
    typeof battleOptions.trainerSprite === 'string' ? battleOptions.trainerSprite : undefined;
  const sprite = resolveTrainerSprite(cfg.trainerSprite ?? nestedSprite);
  const gender = pickTrainerGender(options, battleOptions.trainerGender);
  const isNamed = [cfg.isTrainer, cfg.isGym, cfg.isPvP, cfg.isRival].some(Boolean);
  const name = isNamed ? cfg.trainerName : undefined;
  const nestedQuote = typeof battleOptions.quote === 'string' ? battleOptions.quote : undefined;
  const quote = cfg.trainerQuote ?? nestedQuote;
  return { sprite, gender, name, quote };
}

interface ReturnTabOptions {
  isGym: boolean;
  isPvP: boolean;
}

function resolveReturnTab(
  options: BattleOptions,
  ctx: BattleContext,
  flags: ReturnTabOptions
): string {
  if (options.returnTab) return options.returnTab;
  if (ctx.uiStore?.activeTab) return ctx.uiStore.activeTab;
  if (flags.isGym) return 'gyms';
  if (flags.isPvP) return 'arena';
  return 'map';
}

function buildInitialEnemiesMap(
  finalEnemyTeam: Pokemon[],
  startingEnemyPoke: Pokemon
): Record<BattleParticipantUid, Pokemon> {
  if (finalEnemyTeam?.length) {
    return Object.fromEntries(
      finalEnemyTeam.filter(Boolean).map((pk) => [pk.uid, cloneReactive(pk)])
    );
  }
  if (startingEnemyPoke?.uid) {
    return { [startingEnemyPoke.uid]: cloneReactive(startingEnemyPoke) };
  }
  return {};
}

export interface BuildBattleStateParams {
  cfg: ReturnType<typeof extractBattleConfig>;
  loc: ResolvedLocationData;
  options: BattleOptions;
  playerPoke: Pokemon;
  startingEnemyPoke: Pokemon;
  finalEnemyPoke: Pokemon;
  finalEnemyTeam: Pokemon[];
  effectivePlayerTeam: Pokemon[];
  maxEnemyLv: number;
  enemyInventory: Inventory | undefined;
  enemyMoney: number | undefined;
  weather: BattleWeather;
  wasSearching: boolean;
  ctx: BattleContext;
}

export function buildInitialBattleState(p: BuildBattleStateParams): BattleState {
  const {
    cfg,
    loc,
    options,
    playerPoke,
    startingEnemyPoke,
    finalEnemyTeam,
    effectivePlayerTeam,
    maxEnemyLv,
    enemyInventory,
    enemyMoney,
    weather,
    wasSearching,
    ctx
  } = p;
  const { battleOptions } = cfg;
  const trainer = resolveTrainerDetails(cfg, options);
  const locationMap = loc.locationMap;
  const returnTab = resolveReturnTab(options, ctx, { isGym: cfg.isGym, isPvP: cfg.isPvP });

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
  };
}

export function generateNpcInventoryForBattle(
  cfg: ReturnType<typeof extractBattleConfig>,
  maxEnemyLv: number
): { inventory: Inventory; remainingMoney: number } | null {
  if (!cfg.isTrainer && !cfg.isGym) return null;
  const isRival = cfg.isRival || cfg.battleOptions.isRival === true;
  return generateNPCInventory(
    maxEnemyLv,
    cfg.resolvedDifficulty,
    cfg.isGym,
    isRival,
    cfg.resolvedTrainerArchetype
  );
}
