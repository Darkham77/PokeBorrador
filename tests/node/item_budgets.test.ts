/**
 * tests/node/item_budgets.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests probability budget redistribution math for Fishing Rods, Pickaxes and Brushes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper functions duplicating the exact mathematical algorithms in encounters.ts and map.ts
function redistributeFishingBudget(rates: number[], budget: number): number[] {
  const result = [...rates];
  const indexedPool = rates
    .map((rate, index) => ({ rate, index }))
    .sort((a, b) => a.rate - b.rate);

  let remaining = budget;
  for (let i = 0; i < indexedPool.length; i++) {
    const item = indexedPool[i]!;
    if (i === indexedPool.length - 1) {
      result[item.index] = (result[item.index] || 10) + remaining;
      remaining = 0;
    } else {
      const portion = Math.round(remaining / 2);
      result[item.index] = (result[item.index] || 10) + portion;
      remaining -= portion;
    }
  }
  return result;
}

function distributeArchaeologyBudget(
  pickaxeType: 'standard' | 'good' | 'super' | null,
  brushType: 'standard' | 'good' | 'super' | null
) {
  const categoryWeights = {
    fossil: 45,
    stone: 25,
    common: 20,
    rare: 10
  };

  if (pickaxeType === 'good' || pickaxeType === 'super') {
    const budget = pickaxeType === 'good' ? 500 : 1000;
    const affected = [
      { key: 'rare', base: 10 },
      { key: 'common', base: 20 },
      { key: 'stone', base: 25 }
    ];
    let remaining = budget;
    for (let i = 0; i < affected.length; i++) {
      const item = affected[i]!;
      let added = 0;
      if (i === affected.length - 1) {
        added = remaining;
      } else {
        added = Math.round(remaining * 0.5);
      }
      categoryWeights[item.key as 'rare' | 'common' | 'stone'] += added;
      remaining -= added;
    }
  }

  if (brushType === 'good' || brushType === 'super') {
    const budget = brushType === 'good' ? 500 : 1000;
    categoryWeights.fossil += budget;
  }

  return categoryWeights;
}

describe('Tool Probability Budget Redistribution Math', () => {
  describe('Fishing Rod Budget Redistribution', () => {
    it('should correctly redistribute 500 budget (good rod) among three species', () => {
      const baseRates = [10, 20, 30]; // Rare to common
      const finalRates = redistributeFishingBudget(baseRates, 500);
      
      // Expected math:
      // Sort: 10 (idx 0), 20 (idx 1), 30 (idx 2)
      // idx 0 gets Math.round(500 / 2) = 250 -> 10 + 250 = 260
      // idx 1 gets Math.round(250 / 2) = 125 -> 20 + 125 = 145
      // idx 2 gets remaining 125 -> 30 + 125 = 155
      assert.deepEqual(finalRates, [260, 145, 155]);
    });

    it('should correctly redistribute 1000 budget (super rod) among three species', () => {
      const baseRates = [10, 20, 30];
      const finalRates = redistributeFishingBudget(baseRates, 1000);
      
      // Expected math:
      // Sort: 10 (idx 0), 20 (idx 1), 30 (idx 2)
      // idx 0 gets Math.round(1000 / 2) = 500 -> 10 + 500 = 510
      // idx 1 gets Math.round(500 / 2) = 250 -> 20 + 250 = 270
      // idx 2 gets remaining 250 -> 30 + 250 = 280
      assert.deepEqual(finalRates, [510, 270, 280]);
    });

    it('should handle unsorted input arrays and distribute based on sorted order', () => {
      const unsortedRates = [30, 10, 20];
      const finalRates = redistributeFishingBudget(unsortedRates, 500);
      
      // Sort order by rate: 10 (idx 1), 20 (idx 2), 30 (idx 0)
      // idx 1 gets 250 -> 10 + 250 = 260
      // idx 2 gets 125 -> 20 + 125 = 145
      // idx 0 gets 125 -> 30 + 125 = 155
      assert.deepEqual(finalRates, [155, 260, 145]);
    });
  });

  describe('Archaeology Category Budget Redistribution', () => {
    it('should return base weights when no tools are active', () => {
      const weights = distributeArchaeologyBudget(null, null);
      assert.deepEqual(weights, { fossil: 45, stone: 25, common: 20, rare: 10 });
    });

    it('should apply pickaxe budget (+500) only to mineral/stone categories', () => {
      const weights = distributeArchaeologyBudget('good', null);
      // Expected math:
      // Sort affected: rare (10), common (20), stone (25)
      // rare gets 250 -> 260
      // common gets 125 -> 145
      // stone gets 125 -> 150
      // fossil remains 45
      assert.deepEqual(weights, { fossil: 45, stone: 150, common: 145, rare: 260 });
    });

    it('should apply pickaxe budget (+1000) only to mineral/stone categories', () => {
      const weights = distributeArchaeologyBudget('super', null);
      // Expected math:
      // Sort affected: rare (10), common (20), stone (25)
      // rare gets 500 -> 510
      // common gets 250 -> 270
      // stone gets 250 -> 275
      // fossil remains 45
      assert.deepEqual(weights, { fossil: 45, stone: 275, common: 270, rare: 510 });
    });

    it('should apply brush budget (+500) only to fossil category', () => {
      const weights = distributeArchaeologyBudget(null, 'good');
      // Expected math:
      // fossil gets 45 + 500 = 545
      // others remain unchanged
      assert.deepEqual(weights, { fossil: 545, stone: 25, common: 20, rare: 10 });
    });

    it('should apply brush budget (+1000) only to fossil category', () => {
      const weights = distributeArchaeologyBudget(null, 'super');
      // Expected math:
      // fossil gets 45 + 1000 = 1045
      // others remain unchanged
      assert.deepEqual(weights, { fossil: 1045, stone: 25, common: 20, rare: 10 });
    });
  });
});
