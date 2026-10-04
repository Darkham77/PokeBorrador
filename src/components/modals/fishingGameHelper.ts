/**
 * src/components/modals/fishingGameHelper.ts
 *
 * Pure domain generation and calculation helpers for the Fishing minigame.
 * Combines Pokemon level and encounter rarity to derive difficulty tiers,
 * human-accessible rhythm speeds, note counts, and battle bonuses.
 */

import { POKEMON_STAT_KEYS, type Pokemon } from '@/types/pokemon/pokemon';
import type { MinigameDifficulty } from '@/types/battle/battle';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import { generateIvPure } from '@/logic/pokemon/generationMath';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';

const FISHING_SPEED = {
  EASY: 910,
  MEDIUM: 780,
  HARD: 680,
  EXPERT: 580,
} as const;

const FISHING_SPAWN_INTERVAL = {
  EASY: 680,
  MEDIUM: 580,
  HARD: 500,
  EXPERT: 420,
} as const;

const FISHING_HIT_WINDOW = {
  EASY: 200,
  MEDIUM: 160,
  HARD: 130,
  EXPERT: 100,
} as const;

const FISHING_NOTE_COUNTS = {
  EASY: 5,
  MEDIUM: 8,
  HARD: 11,
  EXPERT: 13,
} as const;

const FISHING_MAX_LEVEL_BONUS_EXPERT = 10;

export const FISHING_DIFFICULTIES = {
  easy: {
    notes: FISHING_NOTE_COUNTS.EASY,
    speedBase: FISHING_SPEED.EASY,
    spawnInterval: FISHING_SPAWN_INTERVAL.EASY,
    hitWindow: FISHING_HIT_WINDOW.EASY,
    label: 'Fácil',
    color: '#4ade80',
    minLevelBonus: 0,
    maxLevelBonus: 0,
    rerollIVs: false
  },
  medium: {
    notes: FISHING_NOTE_COUNTS.MEDIUM,
    speedBase: FISHING_SPEED.MEDIUM,
    spawnInterval: FISHING_SPAWN_INTERVAL.MEDIUM,
    hitWindow: FISHING_HIT_WINDOW.MEDIUM,
    label: 'Medio',
    color: '#facc15',
    minLevelBonus: 1,
    maxLevelBonus: 4,
    rerollIVs: false
  },
  hard: {
    notes: FISHING_NOTE_COUNTS.HARD,
    speedBase: FISHING_SPEED.HARD,
    spawnInterval: FISHING_SPAWN_INTERVAL.HARD,
    hitWindow: FISHING_HIT_WINDOW.HARD,
    label: 'Difícil',
    color: '#fb923c',
    minLevelBonus: 4,
    maxLevelBonus: 7,
    rerollIVs: false
  },
  expert: {
    notes: FISHING_NOTE_COUNTS.EXPERT,
    speedBase: FISHING_SPEED.EXPERT,
    spawnInterval: FISHING_SPAWN_INTERVAL.EXPERT,
    hitWindow: FISHING_HIT_WINDOW.EXPERT,
    label: 'Experto',
    color: '#f87171',
    minLevelBonus: 7,
    maxLevelBonus: FISHING_MAX_LEVEL_BONUS_EXPERT,
    rerollIVs: true
  }
} as const;

export type FishingDifficultyKey = keyof typeof FISHING_DIFFICULTIES;
export const FISHING_DIFFICULTY_KEYS = Object.keys(FISHING_DIFFICULTIES) as readonly FishingDifficultyKey[];
const FISHING_DIFFICULTY_KEYS_SET: ReadonlySet<string> = new Set(FISHING_DIFFICULTY_KEYS);

export function isFishingDifficultyKey(value: unknown): value is FishingDifficultyKey {
  return typeof value === 'string' && FISHING_DIFFICULTY_KEYS_SET.has(value);
}

export function requireFishingDifficultyKey(value: unknown): FishingDifficultyKey {
  if (!isFishingDifficultyKey(value)) {
    throw new Error(`[fishingGameHelper] Invalid FishingDifficultyKey: ${String(value)}`);
  }
  return value;
}

const MAX_REFERENCE_LEVEL = 70;
const LEVEL_WEIGHT = 0.40;
const RARITY_WEIGHT = 0.60;
const EASY_DIFFICULTY_MAX_SCORE = 45;
const MEDIUM_DIFFICULTY_MAX_SCORE = 70;
const HARD_DIFFICULTY_MAX_SCORE = 85;

/**
 * Calculates a continuous difficulty score (0 - 100) combining level and rarity.
 * Higher level and lower rarity increase the score.
 */
export function calculateFishingDifficultyScore(rarity: number, level: number): number {
  const safeRarity = Math.max(1, Math.min(100, rarity));
  const safeLevel = Math.max(1, Math.min(100, level));

  const rarityScore = 100 - safeRarity;
  const levelScore = Math.min(100, (safeLevel / MAX_REFERENCE_LEVEL) * 100);

  const combinedScore = (levelScore * LEVEL_WEIGHT) + (rarityScore * RARITY_WEIGHT);
  return Math.round(Math.max(0, Math.min(100, combinedScore)));
}

/**
 * Derives the discrete fishing difficulty tier ('easy' | 'medium' | 'hard' | 'expert')
 * from the encounter's rarity and the Pokemon's level.
 */
export function calculateFishingDifficulty(rarity: number, level: number): MinigameDifficulty {
  const score = calculateFishingDifficultyScore(rarity, level);

  if (score <= EASY_DIFFICULTY_MAX_SCORE) return 'easy';
  if (score <= MEDIUM_DIFFICULTY_MAX_SCORE) return 'medium';
  if (score <= HARD_DIFFICULTY_MAX_SCORE) return 'hard';
  return 'expert';
}

/**
 * Applies random level bonuses and expert IV rerolls to a caught/fished Pokemon.
 * Returns the applied level increase (number >= 0).
 */
export function applyFishingLevelAndIvBonus(
  pokemon: Pokemon,
  difficulty: MinigameDifficulty,
  randomFn: () => number = Math.random
): number {
  const config = FISHING_DIFFICULTIES[difficulty];
  if (!config) return 0;

  // 1. Random level bonus within [minLevelBonus, maxLevelBonus]
  let bonus = 0;
  if (config.maxLevelBonus > 0) {
    const min = config.minLevelBonus;
    const max = config.maxLevelBonus;
    bonus = Math.floor(randomFn() * (max - min + 1)) + min;
    if (bonus > 0) {
      pokemon.level = Math.min(MAX_POKEMON_LEVEL, pokemon.level + bonus);
    }
  }

  // 2. Expert IV single reroll (keep highest)
  if (config.rerollIVs && pokemon.ivs) {
    POKEMON_STAT_KEYS.forEach(stat => {
      const current = pokemon.ivs[stat] || 0;
      const reroll = generateIvPure(randomFn);
      pokemon.ivs[stat] = Math.max(current, reroll);
    });
  }

  // 3. Recalculate stats with new level/IVs
  recalcPokemonStats(pokemon);

  return bonus;
}
