/**
 * src/logic/player/classDeploymentEngine.ts
 *
 * Pure logic engine for Player Class Deployments (Misiones Idle).
 * Calculates costs, rewards, Bug-type expeditions, Rocket valuations,
 * Cazabichos streak mechanics, and mutations for all 4 classes.
 *
 * Adheres strictly to @/project-standards (pure functions, low complexity, 0 Vue/Pinia dependencies).
 */

import type { PlayerClassId, MissionId } from '@/data/player/playerClasses';
import type { Pokemon, PokemonStatKey } from '@/types/pokemon/pokemon';
import type { ItemId } from '@/data/inventory/itemIds';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { POKEMON_STAT_KEYS } from '@/types/pokemon/pokemon';
import { MAX_SINGLE_STAT_IV } from '@/logic/constants/gameplay';

const CAZABICHOS_KIT_UNLOCK_LEVEL = 10;
const CAZABICHOS_KIT_CAPTURES_THRESHOLD = 10;

export type DeploymentCostType = 'money' | 'battleCoins' | 'sacrifice';

export interface DeploymentCost {
  readonly type: DeploymentCostType;
  readonly amount: number;
}

export interface DeploymentItemReward {
  readonly id: ItemId;
  readonly qty: number;
}

export interface ResolvedDeploymentRewards {
  readonly money: number;
  readonly battleCoins: number;
  readonly items: readonly DeploymentItemReward[];
  readonly classXP: number;
  readonly criminality: number;
  readonly generatedPokemon: readonly Pokemon[];
  readonly shouldSacrifice: boolean;
  readonly expGained: number;
  readonly bonusLevels: number;
  readonly ivIncrements: readonly PokemonStatKey[];
  readonly vigorConsumed: number;
}

export interface CazabichosStreakState {
  readonly streak: number;
  readonly kitCaptures: number;
  readonly awardedPokeballs: number;
}

export const HATCH_STEP_REDUCTION_CRIADOR = 0.25;

const ROCKET_RANGES: Record<MissionId, { min: number; max: number }> = {
  mission_6h: { min: 15000, max: 35000 },
  mission_12h: { min: 40000, max: 90000 },
  mission_24h: { min: 100000, max: 250000 }
};

const BUG_IV_FLOORS: Record<MissionId, number> = {
  mission_6h: 5,
  mission_12h: 10,
  mission_24h: 15
};

const BUG_SHINY_DIVISORS: Record<MissionId, number> = {
  mission_6h: 2,
  mission_12h: 4,
  mission_24h: 8
};

/**
 * Gets the deployment cost for a given class and mission duration.
 */
export function getDeploymentCost(classId: PlayerClassId, missionId: MissionId): DeploymentCost {
  if (classId === 'cazabichos' || classId === 'entrenador') {
    const costs: Record<MissionId, number> = {
      mission_6h: 5000,
      mission_12h: 10000,
      mission_24h: 20000
    };
    return { type: 'money', amount: costs[missionId] || 5000 };
  }

  if (classId === 'criador') {
    const costs: Record<MissionId, number> = {
      mission_6h: 300,
      mission_12h: 600,
      mission_24h: 1000
    };
    return { type: 'battleCoins', amount: costs[missionId] || 300 };
  }

  // Rocket has no cash cost, requires sacrificing 1 Poison-type Pokémon
  return { type: 'sacrifice', amount: 0 };
}

/**
 * Modernized valuation formula for Rocket sacrifice missions.
 * Scales dynamically between the UI ranges based on level (60%) and IVs (40%).
 */
export function calcRocketSacrificeMoney(pokemon: Pokemon | null, missionId: MissionId): number {
  const range = ROCKET_RANGES[missionId] || ROCKET_RANGES.mission_6h;
  if (!pokemon) return range.min;

  const level = Math.max(1, Math.min(100, pokemon.level || 1));
  const levelRatio = level / 100;

  const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
  const ivRatio = Math.max(0, Math.min(186, totalIvs)) / 186;

  const factor = (levelRatio * 0.6) + (ivRatio * 0.4);
  const money = range.min + Math.floor((range.max - range.min) * factor);
  return Math.min(range.max, Math.max(range.min, money));
}

interface BugExpeditionCandidate {
  readonly id: PokemonSpeciesId;
  readonly lvMin: number;
  readonly lvMax: number;
}

const FALLBACK_BUG_SPECIES = ['caterpie', 'weedle', 'paras', 'venonat', 'scyther', 'pinsir'] as const;
const FALLBACK_BUG_LV_MIN = 10 as const;
const FALLBACK_BUG_LV_MAX = 30 as const;

function isBugSpecies(speciesId: unknown): speciesId is PokemonSpeciesId {
  if (typeof speciesId !== 'string' || !isPokemonSpeciesId(speciesId)) return false;
  const pData = POKEMON_DB[speciesId];
  return Boolean(pData && (pData.type === 'bug' || pData.type2 === 'bug'));
}

function resolveMapLevelRange(map: (typeof FIRE_RED_MAPS)[number]): { lvMin: number; lvMax: number } {
  const lv0 = map.lv?.[0] ?? 5;
  const lv1 = map.lv?.[1] ?? 15;
  return {
    lvMin: Math.min(lv0, lv1),
    lvMax: Math.max(lv0, lv1)
  };
}

function collectBugsFromMap(
  map: (typeof FIRE_RED_MAPS)[number],
  discoveredIds: Set<PokemonSpeciesId>,
  destination: BugExpeditionCandidate[]
): void {
  const allWild = Object.values(map.wild || {}).flat();
  const range = resolveMapLevelRange(map);

  for (const speciesId of allWild) {
    if (!isBugSpecies(speciesId) || discoveredIds.has(speciesId)) continue;
    discoveredIds.add(speciesId);
    destination.push({
      id: speciesId,
      lvMin: range.lvMin,
      lvMax: range.lvMax
    });
  }
}

function getFallbackBugPool(): BugExpeditionCandidate[] {
  return FALLBACK_BUG_SPECIES.map(id => ({
    id,
    lvMin: FALLBACK_BUG_LV_MIN,
    lvMax: FALLBACK_BUG_LV_MAX
  }));
}

function collectAccessibleBugPool(badgeCount: number): BugExpeditionCandidate[] {
  const accessibleBugs: BugExpeditionCandidate[] = [];
  const discoveredIds = new Set<PokemonSpeciesId>(); // runtime-set: Fast O(1) membership lookup set

  for (const map of FIRE_RED_MAPS) {
    if ((map.badges ?? 0) > badgeCount) continue;
    collectBugsFromMap(map, discoveredIds, accessibleBugs);
  }

  if (accessibleBugs.length === 0) {
    return getFallbackBugPool();
  }

  return accessibleBugs;
}

/**
 * Generates 3 Bug-type Pokémon for Cazabichos expeditions based on accessible routes.
 */
export function generateBugExpeditionPokemon(missionId: MissionId, badgeCount = 8): Pokemon[] {
  const accessibleBugs = collectAccessibleBugPool(badgeCount);
  const ivFloor = BUG_IV_FLOORS[missionId] || 5;
  const shinyDiv = BUG_SHINY_DIVISORS[missionId] || 2;
  const results: Pokemon[] = [];

  for (let i = 0; i < 3; i++) {
    const pick = accessibleBugs[Math.floor(Math.random() * accessibleBugs.length)] ?? accessibleBugs[0];
    if (!pick) continue;
    const level = Math.floor(Math.random() * (pick.lvMax - pick.lvMin + 1)) + pick.lvMin;
    const poke = makePokemon(pick.id, level, {
      ivFloor,
      shinyMultiplier: shinyDiv,
      obtainedMethod: 'reward',
    });

    if (poke) {
      results.push(poke);
    }
  }

  return results;
}

/**
 * Calculates Cazabichos capture streak progression and Kit de Campo balls.
 */
export function calculateCazabichosStreak(
  currentStreak: number,
  isSuccess: boolean,
  currentKitCaptures: number,
  classLevel: number
): CazabichosStreakState {
  if (!isSuccess) {
    return {
      streak: 0,
      kitCaptures: currentKitCaptures,
      awardedPokeballs: 0
    };
  }

  const newStreak = Math.min(4, Math.max(0, currentStreak) + 1);
  let newKitCaptures = currentKitCaptures;
  let awardedPokeballs = 0;

  if (classLevel >= CAZABICHOS_KIT_UNLOCK_LEVEL) {
    newKitCaptures++;
    if (newKitCaptures >= CAZABICHOS_KIT_CAPTURES_THRESHOLD) {
      newKitCaptures = 0;
      awardedPokeballs = 1;
    }
  }

  return {
    streak: newStreak,
    kitCaptures: newKitCaptures,
    awardedPokeballs
  };
}

/**
 * Gets Cazabichos streak multipliers for Shiny boost and minimum IV floor.
 */
export function getCazabichosStreakMultipliers(streak: number): { ivFloor: number; shinyMult: number } {
  const safeStreak = Math.max(0, Math.min(4, streak));
  return {
    ivFloor: Math.min(20, safeStreak * 5),
    shinyMult: 1.0 + (0.75 * safeStreak)
  };
}

function createEmptyDeploymentRewards(): ResolvedDeploymentRewards {
  return {
    money: 0,
    battleCoins: 0,
    items: [],
    classXP: 0,
    criminality: 0,
    generatedPokemon: [],
    shouldSacrifice: false,
    expGained: 0,
    bonusLevels: 0,
    ivIncrements: [],
    vigorConsumed: 0
  };
}

function resolveRocketDeployment(
  missionId: MissionId,
  targetPokemon: Pokemon | null,
  extraData: Record<string, unknown>
): ResolvedDeploymentRewards {
  const projected = Number(extraData.projectedReward);
  const money = Number.isFinite(projected) && projected > 0
    ? projected
    : calcRocketSacrificeMoney(targetPokemon, missionId);

  const config = missionId === 'mission_6h'
    ? { item: 'nugget' as const, qty: 1, xp: 50, crim: 5 }
    : missionId === 'mission_12h'
      ? { item: 'bignugget' as const, qty: 1, xp: 250, crim: 10 }
      : { item: 'masterball' as const, qty: 1, xp: 600, crim: 20 };

  return {
    ...createEmptyDeploymentRewards(),
    shouldSacrifice: true,
    money,
    items: [{ id: config.item, qty: config.qty }],
    classXP: config.xp,
    criminality: config.crim
  };
}

function resolveBugCatcherDeployment(
  missionId: MissionId,
  extraData: Record<string, unknown>
): ResolvedDeploymentRewards {
  const badges = typeof extraData.badgeCount === 'number' ? extraData.badgeCount : 8;
  const generatedPokemon = generateBugExpeditionPokemon(missionId, badges);

  const config = missionId === 'mission_6h'
    ? { item: 'netball' as const, qty: 3, xp: 50 }
    : missionId === 'mission_12h'
      ? { item: 'silverpowder' as const, qty: 1, xp: 250 }
      : { item: 'focussash' as const, qty: 1, xp: 600 };

  return {
    ...createEmptyDeploymentRewards(),
    generatedPokemon,
    items: [{ id: config.item, qty: config.qty }],
    classXP: config.xp
  };
}

function resolveTrainerDeployment(
  missionId: MissionId,
  targetPokemon: Pokemon | null
): ResolvedDeploymentRewards {
  const level = targetPokemon?.level || 1;
  const baseExp = 25000 + (level * 1000);

  if (missionId === 'mission_6h') {
    return {
      ...createEmptyDeploymentRewards(),
      battleCoins: 50,
      expGained: baseExp,
      classXP: 50
    };
  }
  if (missionId === 'mission_12h') {
    return {
      ...createEmptyDeploymentRewards(),
      battleCoins: 150,
      expGained: baseExp * 2,
      items: [{ id: 'rarecandy', qty: 1 }],
      classXP: 250
    };
  }
  return {
    ...createEmptyDeploymentRewards(),
    battleCoins: 400,
    expGained: baseExp * 4,
    items: [{ id: 'rarecandy', qty: 3 }],
    bonusLevels: 1,
    classXP: 600
  };
}

function resolveBreederDeployment(
  missionId: MissionId,
  targetPokemon: Pokemon | null
): ResolvedDeploymentRewards {
  const config = missionId === 'mission_6h'
    ? { item: 'everstone' as const, qty: 1, xp: 50, blocks: 1, baseVigor: 5 }
    : missionId === 'mission_12h'
      ? { item: 'destinyknot' as const, qty: 1, xp: 250, blocks: 2, baseVigor: 10 }
      : { item: 'goldbottlecap' as const, qty: 1, xp: 600, blocks: 4, baseVigor: 15 };

  const saveVigor = missionId === 'mission_24h' && Math.random() < 0.10;
  const vigorConsumed = saveVigor ? 0 : config.baseVigor;

  const ivIncrements: PokemonStatKey[] = [];
  if (targetPokemon) {
    const pIvs = targetPokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    for (let b = 0; b < config.blocks; b++) {
      const eligibleStats = POKEMON_STAT_KEYS.filter(stat => (pIvs[stat] || 0) < MAX_SINGLE_STAT_IV);
      if (eligibleStats.length > 0) {
        const chosen = eligibleStats[Math.floor(Math.random() * eligibleStats.length)];
        if (chosen) {
          ivIncrements.push(chosen);
        }
      }
    }
  }

  return {
    ...createEmptyDeploymentRewards(),
    items: [{ id: config.item, qty: config.qty }],
    classXP: config.xp,
    vigorConsumed,
    ivIncrements
  };
}

/**
 * Pure resolution of deployment rewards for any class.
 */
export function resolveDeploymentRewards(
  classId: PlayerClassId,
  missionId: MissionId,
  targetPokemon: Pokemon | null,
  extraData: Record<string, unknown> = {}
): ResolvedDeploymentRewards {
  switch (classId) {
    case 'rocket':
      return resolveRocketDeployment(missionId, targetPokemon, extraData);
    case 'cazabichos':
      return resolveBugCatcherDeployment(missionId, extraData);
    case 'entrenador':
      return resolveTrainerDeployment(missionId, targetPokemon);
    case 'criador':
      return resolveBreederDeployment(missionId, targetPokemon);
    default:
      return createEmptyDeploymentRewards();
  }
}

export interface ProjectedMissionRewards {
  readonly projectedReward?: number;
  readonly rewards?: Record<string, unknown>; // open-record: Generic key-value data dictionary container
}

const ROCKET_PROJECTED_ITEMS: Readonly<Record<MissionId, ItemId>> = {
  mission_6h: 'nugget',
  mission_12h: 'bignugget',
  mission_24h: 'masterball',
};
const CAZABICHOS_BALL_QTYS: Readonly<Record<MissionId, number>> = {
  mission_6h: 5,
  mission_12h: 10,
  mission_24h: 20,
};
const TRAINER_COINS_AND_ITEMS: Readonly<Record<MissionId, { coins: number; item: ItemId }>> = {
  mission_6h: { coins: 30, item: 'rarecandy' },
  mission_12h: { coins: 75, item: 'protein' },
  mission_24h: { coins: 200, item: 'choiceband' },
};
const BREEDER_ITEMS: Readonly<Record<MissionId, ItemId>> = {
  mission_6h: 'everstone',
  mission_12h: 'destinyknot',
  mission_24h: 'goldbottlecap',
};

const ROCKET_DEFAULT_SACRIFICE_MONEY = 15000 as const;

/**
 * Returns the projected initial rewards structure to store on activeMission
 * so that UI components and unified rewards display preview items immediately.
 */
export function getInitialProjectedRewards(
  cls: PlayerClassId,
  missionId: MissionId,
  pokemon?: Pokemon | null
): ProjectedMissionRewards {
  if (cls === 'rocket') {
    const proj = pokemon ? calcRocketSacrificeMoney(pokemon, missionId) : ROCKET_DEFAULT_SACRIFICE_MONEY;
    const itemId = ROCKET_PROJECTED_ITEMS[missionId] || 'nugget';
    return {
      projectedReward: proj,
      rewards: { money: proj, [itemId]: 1 }
    };
  }
  if (cls === 'cazabichos') {
    const ballQty = CAZABICHOS_BALL_QTYS[missionId] || 5;
    return { rewards: { pokeball: ballQty } };
  }
  if (cls === 'entrenador') {
    const config = TRAINER_COINS_AND_ITEMS[missionId] || { coins: 30, item: 'rarecandy' };
    return { rewards: { battleCoins: config.coins, [config.item]: 1 } };
  }
  if (cls === 'criador') {
    const itemId = BREEDER_ITEMS[missionId] || 'everstone';
    return { rewards: { [itemId]: 1 } };
  }
  return {};
}

