/**
 * classMath.ts
 * Pure functions and mathematical formulas module for player class mechanics
 * without database side effects or state storage.
 */

import {
  MINIMUM_POKEMON_LEVEL,
  DECIMAL_PLACES_PRECISION_TWO,
  CLASS_XP_THRESHOLD_RANKS,
  CRIMINALITY_DENOMINATOR_FACTOR,
  BUG_SYNERGY_BONUS_PER_BUG,
  BUG_SYNERGY_MAX_COUNT,
  TRAINER_HIGH_IV_THRESHOLD,
  MAX_POKEMON_TEAM_SIZE
} from '../constants/gameplay.ts';
import { MAX_POKEMON_LEVEL } from '../../data/system/constants.ts';
import type { GymId } from '@/data/world/gyms';

/** Bonus level calculation step for excess criminality (1 level per 10%). */
export const CRIMINALITY_BONUS_LEVEL_STEP_PERCENT = 10;

/** Excess threshold to spawn a full 6-Pokemon SWAT team (200%). */
export const CRIMINALITY_SWAT_TEAM_THRESHOLD_PERCENT = 200;

/** Excess threshold to spawn a heavy 4-5 Pokemon police team (140%). */
export const CRIMINALITY_HEAVY_TEAM_THRESHOLD_PERCENT = 140;

/** Base level offset added to map route base level for police officers (+5). */
export const POLICE_BASE_LEVEL_OFFSET = 5;

/** Base bail calculation factor for police defeats (80). */
export const POLICE_BAIL_BASE_MULTIPLIER = 80;

/** Base steal chance when defeating a police officer (5%). */
export const POLICE_STEAL_CHANCE_PERCENT = 0.05;

/** Team Rocket quick steal base chance (15%). */
const ROCKET_QUICK_STEAL_BASE_CHANCE = 0.15;

/** Team Rocket quick steal chance increase per level (1%). */
const ROCKET_QUICK_STEAL_PER_LEVEL = 0.01;

/** Team Rocket quick steal maximum cap (30%). */
const ROCKET_QUICK_STEAL_MAX_CAP = 0.3;

/** Bug Catcher catch rate synergy base multiplier. */
const BUG_SYNERGY_BASE_BONUS = 1.0;

/** Trainer class catch rate penalty multiplier for high-IV targets (90%). */
const TRAINER_CATCH_PENALTY_MULTIPLIER = 0.9;

/** Maximum player class level limit. */
export const MAX_PLAYER_CLASS_LEVEL = 30;

/** Level requirement for unlocking class-specific cosmetics (Level 25). */
export const COSMETIC_UNLOCK_CLASS_LEVEL = 25;

/** Cost in Battle Coins to change player class (10,000). */
export const CLASS_CHANGE_COST_BATTLE_COINS = 10_000;

/** Maximum criminality level cap for Team Rocket. */
export const MAX_CRIMINALITY_LEVEL = 100;

/** XP cap requirement return for max-level player classes. */
const MAX_LEVEL_XP_CAP = 99999999;

/** Quadratic coefficient factor for NPC robbery limit (8 * L^2). */
const NPC_ROBBERY_LIMIT_QUADRATIC_COEFF = 8;

/** Fallback XP multiplier per level if threshold rank is missing. */
const CLASS_LEVEL_FALLBACK_XP_MULTIPLIER = 1000;

/** Quadratic exponent factor (2). */
const QUADRATIC_EXPONENT = 2;

/**
 * Team Rocket:
 * Calculates "Quick Steal" success chance at battle start based on class level.
 * Level 1: 15%, Level 2: 16%, ... max 30%.
 */
export function calculateQuickStealChance(classLevel: number): number {
  const level = Math.max(MINIMUM_POKEMON_LEVEL, classLevel);
  const rawChance =
    ROCKET_QUICK_STEAL_BASE_CHANCE + (level - MINIMUM_POKEMON_LEVEL) * ROCKET_QUICK_STEAL_PER_LEVEL;
  const chance = Math.min(ROCKET_QUICK_STEAL_MAX_CAP, rawChance);
  return Number(chance.toFixed(DECIMAL_PLACES_PRECISION_TWO));
}

/**
 * Bug Catcher:
 * Returns "Bug Synergy" Catch Rate multiplier according to Bug-type count in active team.
 * For each 'bug' or 'bicho' Pokémon in active team, increases catch rate by 5% (linearly stacked, max +30%).
 */
export function calculateBugSymmetryBonus(
  activeTeam: { type1: string; type2?: string | null }[]
): number {
  const bugCount = activeTeam.filter((p) => {
    const t1 = String(p.type1 || '').toLowerCase();
    const t2 = String(p.type2 || '').toLowerCase();
    return t1 === 'bug' || t1 === 'bicho' || t2 === 'bug' || t2 === 'bicho';
  }).length;
  return (
    BUG_SYNERGY_BASE_BONUS + Math.min(BUG_SYNERGY_MAX_COUNT, bugCount) * BUG_SYNERGY_BONUS_PER_BUG
  );
}

/**
 * Trainer:
 * Applies a 10% penalty to base catch rate if the wild Pokémon has exceptional IVs (Total IV > 120).
 */
export function calculateTrainerCatchRateModifier(baseCatchRate: number, ivTotal: number): number {
  if (ivTotal > TRAINER_HIGH_IV_THRESHOLD) {
    return Math.max(
      MINIMUM_POKEMON_LEVEL,
      Math.floor(baseCatchRate * TRAINER_CATCH_PENALTY_MULTIPLIER)
    );
  }
  return baseCatchRate;
}

/**
 * Trainer:
 * Returns true if player can get double rival battles by beating all gyms on Hard difficulty.
 */
export function hasDoubleRivalChance(
  defeatedGyms: string[],
  gymProgress: Partial<
    Record<GymId, { easy?: boolean; normal?: boolean; hard?: boolean } | undefined>
  >
): boolean {
  if (!defeatedGyms || defeatedGyms.length === 0) return false;
  // Must have defeated all conquered gyms on "hard" difficulty
  return defeatedGyms.every((gymId) => {
    const progress = (
      gymProgress as Record<
        string,
        { easy?: boolean; normal?: boolean; hard?: boolean } | undefined
      >
    )[gymId]; // open-record: Gym id lookup
    return !!(progress && progress.hard);
  });
}

/**
 * Returns experience needed to level up to next class level.
 */
export function getXPNeededForClassLevel(level: number): number {
  if (level >= MAX_PLAYER_CLASS_LEVEL) return MAX_LEVEL_XP_CAP;
  return (
    CLASS_XP_THRESHOLD_RANKS[level - MINIMUM_POKEMON_LEVEL] ||
    level * CLASS_LEVEL_FALLBACK_XP_MULTIPLIER
  );
}

/**
 * ENEMY Team Rocket:
 * Returns maximum money/resource value cap an NPC can steal based on their average level.
 * Scaling: V_max(L) = 8 * L^2
 */
export function calculateMaxNpcRobberyLimit(avgLevel: number): number {
  const level = Math.max(MINIMUM_POKEMON_LEVEL, avgLevel);
  return NPC_ROBBERY_LIMIT_QUADRATIC_COEFF * Math.pow(level, QUADRATIC_EXPONENT);
}

/**
 * Team Rocket / Police:
 * Calculates bonus difficulty levels for Police Officer based on excess criminality over 100%.
 * Formula: floor(max(0, criminality - 100) / 10). (+1 level per 10% excess).
 */
export function calculatePoliceBonusLevel(criminality: number): number {
  const excess = Math.max(0, (criminality || 0) - MAX_CRIMINALITY_LEVEL);
  return Math.floor(excess / CRIMINALITY_BONUS_LEVEL_STEP_PERCENT);
}

/**
 * Team Rocket / Police:
 * Calculates effective level of Police Officer's Pokémon, strictly clamped between 1 and MAX_POKEMON_LEVEL (100).
 * Prevents Pokémon generation exceptions or illegal overflows in Showdown/persistence.
 */
export function calculatePoliceEffectiveLevel(baseMapLv: number, criminality: number): number {
  const base = Math.max(MINIMUM_POKEMON_LEVEL, baseMapLv || MINIMUM_POKEMON_LEVEL);
  const bonus = calculatePoliceBonusLevel(criminality);
  const total = base + POLICE_BASE_LEVEL_OFFSET + bonus;
  return Math.max(MINIMUM_POKEMON_LEVEL, Math.min(MAX_POKEMON_LEVEL, total));
}

/**
 * Team Rocket / Police:
 * Dynamically calculates Police Officer team size based on criminality:
 * - < 140%: 3 to 4 Pokémon (Local patrol)
 * - 140% to 199%: 4 to 5 Pokémon (Strike force)
 * - >= 200%: Full 6 Pokémon (Full tactical SWAT squad)
 */
export function calculatePoliceTeamSize(
  criminality: number,
  randomFn: () => number = Math.random
): number {
  const crim = criminality || 0;
  if (crim >= CRIMINALITY_SWAT_TEAM_THRESHOLD_PERCENT) {
    return MAX_POKEMON_TEAM_SIZE;
  }
  if (crim >= CRIMINALITY_HEAVY_TEAM_THRESHOLD_PERCENT) {
    return Math.floor(randomFn() * 2) + 4;
  }
  return Math.floor(randomFn() * 2) + 3;
}

/**
 * Team Rocket / Police:
 * Calculates bail amount a Team Rocket member must pay when defeated by police.
 * Formula: floor(classLevel^2 * 80 * (criminality / 100)).
 */
export function calculatePoliceBail(classLevel: number, criminality: number): number {
  const level = Math.max(MINIMUM_POKEMON_LEVEL, classLevel || MINIMUM_POKEMON_LEVEL);
  const crim = Math.max(0, criminality || 0);
  return Math.floor(
    Math.pow(level, QUADRATIC_EXPONENT) *
      POLICE_BAIL_BASE_MULTIPLIER *
      (crim / MAX_CRIMINALITY_LEVEL)
  );
}

/**
 * Team Rocket / Police:
 * Calculates encounter chance with a Police Officer when player is Team Rocket and criminality >= 100%.
 * Formula: (criminality / 10) * trainerBonus.
 */
export function calculatePoliceEncounterChance(criminality: number, trainerBonus = 1): number {
  const crim = Math.max(0, criminality || 0);
  return (crim / CRIMINALITY_DENOMINATOR_FACTOR) * trainerBonus;
}
