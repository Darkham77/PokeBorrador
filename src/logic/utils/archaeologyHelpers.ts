const BASE_ARCHAEOLOGY_WEIGHT_FOSSIL = 45;
const BASE_ARCHAEOLOGY_WEIGHT_STONE = 25;
const BASE_ARCHAEOLOGY_WEIGHT_COMMON = 20;
const BASE_ARCHAEOLOGY_WEIGHT_RARE = 10;

const TOOL_BUDGET_GOOD_TIER = 500;
const TOOL_BUDGET_SUPER_TIER = 1000;
const SPLIT_REMAINING_FACTOR = 0.5;

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
      let added = 0;
      if (i === affected.length - 1) {
        added = remaining;
      } else {
        added = Math.round(remaining * SPLIT_REMAINING_FACTOR);
      }
      categoryWeights[item.key as 'rare' | 'common' | 'stone'] += added;
      remaining -= added;
    }
  }

  if (brushType === 'good' || brushType === 'super') {
    const budget = brushType === 'good' ? TOOL_BUDGET_GOOD_TIER : TOOL_BUDGET_SUPER_TIER;
    categoryWeights.fossil += budget;
  }

  return categoryWeights;
}
