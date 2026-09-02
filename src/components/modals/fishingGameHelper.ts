/**
 * src/components/modals/fishingGameHelper.ts
 *
 * Pure domain generation and calculation helpers for the Fishing minigame.
 * Combines Pokemon level and encounter rarity to derive difficulty tiers,
 * human-accessible rhythm speeds, note counts, and battle bonuses.
 */

import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';

export const FISHING_DIFFICULTIES = {
  easy: {
    notes: 5,
    speedBase: 910,
    spawnInterval: 680,
    hitWindow: 200,
    label: 'Fácil',
    color: '#4ade80',
    minLevelBonus: 0,
    maxLevelBonus: 0,
    rerollIVs: false
  },
  medium: {
    notes: 8,
    speedBase: 780,
    spawnInterval: 580,
    hitWindow: 160,
    label: 'Medio',
    color: '#facc15',
    minLevelBonus: 1,
    maxLevelBonus: 4,
    rerollIVs: false
  },
  hard: {
    notes: 11,
    speedBase: 680,
    spawnInterval: 500,
    hitWindow: 130,
    label: 'Difícil',
    color: '#fb923c',
    minLevelBonus: 4,
    maxLevelBonus: 7,
    rerollIVs: false
  },
  expert: {
    notes: 13,
    speedBase: 580,
    spawnInterval: 420,
    hitWindow: 100,
    label: 'Experto',
    color: '#f87171',
    minLevelBonus: 7,
    maxLevelBonus: 10,
    rerollIVs: true
  }
} as const;

export type FishingDifficultyKey = keyof typeof FISHING_DIFFICULTIES;

const MAX_REFERENCE_LEVEL = 70;
const LEVEL_WEIGHT = 0.40;
const RARITY_WEIGHT = 0.60;
const TOTAL_IV_POSSIBILITIES_COUNT = 32;

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
export function calculateFishingDifficulty(rarity: number, level: number): FishingDifficultyKey {
  const score = calculateFishingDifficultyScore(rarity, level);

  if (score <= 45) return 'easy';
  if (score <= 70) return 'medium';
  if (score <= 85) return 'hard';
  return 'expert';
}

/**
 * Applies random level bonuses and expert IV rerolls to a caught/fished Pokemon.
 * Returns the applied level increase (number >= 0).
 */
export function applyFishingLevelAndIvBonus(
  pokemon: Pokemon,
  difficulty: FishingDifficultyKey,
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
      pokemon.level = Math.min(100, pokemon.level + bonus);
    }
  }

  // 2. Expert IV single reroll (keep highest)
  if (config.rerollIVs && pokemon.ivs) {
    const stats: (keyof PokemonIVs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    stats.forEach(stat => {
      const current = pokemon.ivs[stat] || 0;
      const reroll = Math.floor(randomFn() * TOTAL_IV_POSSIBILITIES_COUNT);
      pokemon.ivs[stat] = Math.max(current, reroll);
    });
  }

  // 3. Recalculate stats with new level/IVs
  recalcPokemonStats(pokemon);

  return bonus;
}
