import type { ItemId } from '@/data/inventory/items.ts';

const BASE_ARCHAEOLOGY_WEIGHT_FOSSIL = 45;
const BASE_ARCHAEOLOGY_WEIGHT_STONE = 25;
const BASE_ARCHAEOLOGY_WEIGHT_COMMON = 20;
const BASE_ARCHAEOLOGY_WEIGHT_RARE = 10;

const TOOL_BUDGET_GOOD_TIER = 500;
const TOOL_BUDGET_SUPER_TIER = 1000;
const SPLIT_REMAINING_FACTOR = 0.5;

export type ArchaeologyCategory = 'common' | 'rare' | 'stone' | 'fossil';

export interface ArchaeologyWeights {
  fossil: number;
  stone: number;
  common: number;
  rare: number;
}

export function calculateArchaeologyWeights(pickaxeType: string | null, brushType: string | null): ArchaeologyWeights {
  const categoryWeights = {
    fossil: BASE_ARCHAEOLOGY_WEIGHT_FOSSIL,
    stone: BASE_ARCHAEOLOGY_WEIGHT_STONE,
    common: BASE_ARCHAEOLOGY_WEIGHT_COMMON,
    rare: BASE_ARCHAEOLOGY_WEIGHT_RARE
  };

  if (pickaxeType === 'good' || pickaxeType === 'super') {
    const budget = pickaxeType === 'good' ? TOOL_BUDGET_GOOD_TIER : TOOL_BUDGET_SUPER_TIER;
    const affected = [
      { key: 'rare', base: BASE_ARCHAEOLOGY_WEIGHT_RARE },
      { key: 'common', base: BASE_ARCHAEOLOGY_WEIGHT_COMMON },
      { key: 'stone', base: BASE_ARCHAEOLOGY_WEIGHT_STONE }
    ];
    let remaining = budget;
    for (let i = 0; i < affected.length; i++) {
      const item = affected[i]!;
      const added = i === affected.length - 1
        ? remaining
        : Math.round(remaining * SPLIT_REMAINING_FACTOR);
      categoryWeights[item.key as ArchaeologyCategory] += added;
      remaining -= added;
    }
  }

  if (brushType === 'good' || brushType === 'super') {
    const budget = brushType === 'good' ? TOOL_BUDGET_GOOD_TIER : TOOL_BUDGET_SUPER_TIER;
    categoryWeights.fossil += budget;
  }

  return categoryWeights;
}

const ARCHAEOLOGY_ROLLS_EXPERT = 4;
const ARCHAEOLOGY_ROLLS_HARD = 3;
const ARCHAEOLOGY_ROLLS_MEDIUM = 2;
const ARCHAEOLOGY_ROLLS_DEFAULT = 1;
export const ARCHAEOLOGY_MULTI_ROLL_CONTINUE_CHANCE = 0.5;

interface ArchaeologyRewardItem {
  readonly id: ItemId;
  readonly icon: string;
}

export interface ArchaeologyReward {
  readonly rewardId: ItemId;
  readonly rewardIcon: string;
}

const ARCHAEOLOGY_STONE_REWARDS = [
  'firestone',
  'waterstone',
  'thunderstone',
  'leafstone',
  'moonstone',
  'sunstone'
] as const satisfies readonly ItemId[];

const ARCHAEOLOGY_COMMON_REWARDS: readonly ArchaeologyRewardItem[] = [
  { id: 'pearl', icon: '⚪' },
  { id: 'stardust', icon: '✨' },
  { id: 'coalore', icon: '🪨' },
  { id: 'copperore', icon: '🟫' },
  { id: 'ironore', icon: '🧱' }
] as const;

const ARCHAEOLOGY_RARE_REWARDS: readonly ArchaeologyRewardItem[] = [
  { id: 'nugget', icon: '🟡' },
  { id: 'bigpearl', icon: '🔘' },
  { id: 'starpiece', icon: '⭐' },
  { id: 'silverore', icon: '⬜' },
  { id: 'goldore', icon: '🟨' },
  { id: 'tungstenore', icon: '🌑' },
  { id: 'uraniumore', icon: '🟢' },
  { id: 'rubiore', icon: '🔺' },
  { id: 'zaphireore', icon: '🔹' },
  { id: 'emmeraldore', icon: '💚' },
  { id: 'topazore', icon: '🟡' },
  { id: 'diamondore', icon: '💎' }
] as const;

export function getArchaeologyMaxRolls(difficulty?: string): number {
  if (difficulty === 'expert') return ARCHAEOLOGY_ROLLS_EXPERT;
  if (difficulty === 'hard') return ARCHAEOLOGY_ROLLS_HARD;
  if (difficulty === 'medium') return ARCHAEOLOGY_ROLLS_MEDIUM;
  return ARCHAEOLOGY_ROLLS_DEFAULT;
}

export function rollArchaeologyCategory(weights: ArchaeologyWeights): ArchaeologyCategory {
  const total = weights.fossil + weights.stone + weights.common + weights.rare;
  const rand = Math.random() * total;
  if (rand < weights.fossil) return 'fossil';
  if (rand < weights.fossil + weights.stone) return 'stone';
  if (rand < weights.fossil + weights.stone + weights.common) return 'common';
  return 'rare';
}

export function rollArchaeologyReward(
  category: ArchaeologyCategory,
  fossilPool?: readonly string[]
): ArchaeologyReward {
  if (category === 'fossil') {
    const pool = (fossilPool && fossilPool.length > 0) ? fossilPool : (['kabuto', 'omanyte'] as const);
    const selectedPoke = pool[Math.floor(Math.random() * pool.length)];
    if (selectedPoke === 'kabuto') return { rewardId: 'domefossil', rewardIcon: '🛡' };
    if (selectedPoke === 'omanyte') return { rewardId: 'helixfossil', rewardIcon: '🐚' };
    return { rewardId: 'oldamber', rewardIcon: '💎' };
  }
  if (category === 'stone') {
    const rewardId = ARCHAEOLOGY_STONE_REWARDS[Math.floor(Math.random() * ARCHAEOLOGY_STONE_REWARDS.length)]!;
    return { rewardId, rewardIcon: '💎' };
  }
  if (category === 'common') {
    const item = ARCHAEOLOGY_COMMON_REWARDS[Math.floor(Math.random() * ARCHAEOLOGY_COMMON_REWARDS.length)]!;
    return { rewardId: item.id, rewardIcon: item.icon };
  }
  const item = ARCHAEOLOGY_RARE_REWARDS[Math.floor(Math.random() * ARCHAEOLOGY_RARE_REWARDS.length)]!;
  return { rewardId: item.id, rewardIcon: item.icon };
}

