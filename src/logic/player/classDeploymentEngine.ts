/**
 * src/logic/player/classDeploymentEngine.ts
 *
 * Pure logic engine for Player Class Deployments (Misiones Idle).
 * Calculates costs, rewards, Bug-type expeditions, Rocket valuations,
 * Cazabichos streak mechanics, and mutations for all 4 classes.
 *
 * Adheres strictly to @/project-standards (pure functions, <500 lines, 0 Vue/Pinia dependencies).
 */

import type { PlayerClassId, MissionId } from '@/data/player/playerClasses';
import type { Pokemon, PokemonStatKey } from '@/types/pokemon/pokemon';
import type { ItemId } from '@/data/inventory/itemIds';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
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

/**
 * Generates 3 Bug-type Pokémon for Cazabichos expeditions based on accessible routes.
 */
export function generateBugExpeditionPokemon(missionId: MissionId, badgeCount = 8): Pokemon[] {
  const accessibleBugs: { id: string; lvMin: number; lvMax: number }[] = [];

  for (const map of FIRE_RED_MAPS) {
    if ((map.badges ?? 0) > badgeCount) continue;
    const allWild = Object.values(map.wild || {}).flat();
    for (const speciesId of allWild) {
      if (!isPokemonSpeciesId(speciesId)) continue;
      const pData = POKEMON_DB[speciesId];
      if (pData && (pData.type === 'bug' || pData.type2 === 'bug')) {
        if (!accessibleBugs.some(b => b.id === speciesId)) {
          const lv0 = map.lv?.[0] ?? 5;
          const lv1 = map.lv?.[1] ?? 15;
          accessibleBugs.push({
            id: speciesId,
            lvMin: Math.min(lv0, lv1),
            lvMax: Math.max(lv0, lv1)
          });
        }
      }
    }
  }

  // Guaranteed fallback pool if no maps matched
  if (accessibleBugs.length === 0) {
    ['caterpie', 'weedle', 'paras', 'venonat', 'scyther', 'pinsir'].forEach(id => {
      accessibleBugs.push({ id, lvMin: 10, lvMax: 30 });
    });
  }

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
      obtainedMethod: 'reward'
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

/**
 * Pure resolution of deployment rewards for any class.
 */
export function resolveDeploymentRewards(
  classId: PlayerClassId,
  missionId: MissionId,
  targetPokemon: Pokemon | null,
  extraData: Record<string, unknown> = {}
): ResolvedDeploymentRewards {
  let money = 0;
  let battleCoins = 0;
  const items: DeploymentItemReward[] = [];
  let classXP = 0;
  let criminality = 0;
  let generatedPokemon: Pokemon[] = [];
  let shouldSacrifice = false;
  let expGained = 0;
  let bonusLevels = 0;
  const ivIncrements: PokemonStatKey[] = [];
  let vigorConsumed = 0;

  if (classId === 'rocket') {
    shouldSacrifice = true;
    const projected = Number(extraData.projectedReward);
    money = Number.isFinite(projected) && projected > 0
      ? projected
      : calcRocketSacrificeMoney(targetPokemon, missionId);

    if (missionId === 'mission_6h') {
      items.push({ id: 'nugget', qty: 1 });
      classXP = 50;
      criminality = 5;
    } else if (missionId === 'mission_12h') {
      items.push({ id: 'bignugget', qty: 1 });
      classXP = 250;
      criminality = 10;
    } else {
      items.push({ id: 'masterball', qty: 1 });
      classXP = 600;
      criminality = 20;
    }
  } else if (classId === 'cazabichos') {
    const badges = typeof extraData.badgeCount === 'number' ? extraData.badgeCount : 8;
    generatedPokemon = generateBugExpeditionPokemon(missionId, badges);

    if (missionId === 'mission_6h') {
      items.push({ id: 'netball', qty: 3 });
      classXP = 50;
    } else if (missionId === 'mission_12h') {
      items.push({ id: 'silverpowder', qty: 1 });
      classXP = 250;
    } else {
      items.push({ id: 'focussash', qty: 1 });
      classXP = 600;
    }
  } else if (classId === 'entrenador') {
    const level = targetPokemon?.level || 1;
    const baseExp = 25000 + (level * 1000);

    if (missionId === 'mission_6h') {
      battleCoins = 50;
      expGained = baseExp;
      classXP = 50;
    } else if (missionId === 'mission_12h') {
      battleCoins = 150;
      expGained = baseExp * 2;
      items.push({ id: 'rarecandy', qty: 1 });
      classXP = 250;
    } else {
      battleCoins = 400;
      expGained = baseExp * 4;
      items.push({ id: 'rarecandy', qty: 3 });
      bonusLevels = 1;
      classXP = 600;
    }
  } else if (classId === 'criador') {
    let blocks: number;
    let baseVigorCost: number;

    if (missionId === 'mission_6h') {
      items.push({ id: 'everstone', qty: 1 });
      classXP = 50;
      blocks = 1;
      baseVigorCost = 5;
    } else if (missionId === 'mission_12h') {
      items.push({ id: 'destinyknot', qty: 1 });
      classXP = 250;
      blocks = 2;
      baseVigorCost = 10;
    } else {
      items.push({ id: 'goldbottlecap', qty: 1 });
      classXP = 600;
      blocks = 4;
      baseVigorCost = 15;
    }

    // 10% chance to save vigor on 24h mission
    const saveVigor = missionId === 'mission_24h' && Math.random() < 0.10;
    vigorConsumed = saveVigor ? 0 : baseVigorCost;

    if (targetPokemon) {
      const pIvs = targetPokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      for (let b = 0; b < blocks; b++) {
        // Find non-31 stats
        const eligibleStats = POKEMON_STAT_KEYS.filter(stat => (pIvs[stat] || 0) < MAX_SINGLE_STAT_IV);
        if (eligibleStats.length > 0) {
          const chosen = eligibleStats[Math.floor(Math.random() * eligibleStats.length)];
          if (chosen) {
            ivIncrements.push(chosen);
          }
        }
      }
    }
  }

  return {
    money,
    battleCoins,
    items,
    classXP,
    criminality,
    generatedPokemon,
    shouldSacrifice,
    expGained,
    bonusLevels,
    ivIncrements,
    vigorConsumed
  };
}

/**
 * Returns the projected initial rewards structure to store on activeMission
 * so that UI components and unified rewards display preview items immediately.
 */
export function getInitialProjectedRewards(
  cls: PlayerClassId,
  missionId: MissionId,
  pokemon?: Pokemon | null
): { projectedReward?: number; rewards?: Record<string, unknown> } {
  if (cls === 'rocket') {
    const proj = pokemon ? calcRocketSacrificeMoney(pokemon, missionId) : 15000;
    const itemId: ItemId = missionId === 'mission_6h' ? 'nugget' : missionId === 'mission_12h' ? 'bignugget' : 'masterball';
    return {
      projectedReward: proj,
      rewards: { money: proj, [itemId]: 1 }
    };
  }
  if (cls === 'cazabichos') {
    const ballQty = missionId === 'mission_6h' ? 5 : missionId === 'mission_12h' ? 10 : 20;
    return {
      rewards: { pokeball: ballQty }
    };
  }
  if (cls === 'entrenador') {
    const bc = missionId === 'mission_6h' ? 30 : missionId === 'mission_12h' ? 75 : 200;
    const itemId: ItemId = missionId === 'mission_6h' ? 'rarecandy' : missionId === 'mission_12h' ? 'protein' : 'choiceband';
    return {
      rewards: { battleCoins: bc, [itemId]: 1 }
    };
  }
  if (cls === 'criador') {
    const itemId: ItemId = missionId === 'mission_6h' ? 'everstone' : missionId === 'mission_12h' ? 'destinyknot' : 'goldbottlecap';
    return {
      rewards: { [itemId]: 1 }
    };
  }
  return {};
}

