/**
 * tests/node/minigameMath.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests pure minigame difficulty calculations from src/logic/minigames/minigameMath.ts.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateFishingTotalNotes,
  calculateFishingSpeedBase,
  calculateFishingHitWindow,
  calculateArchaeologyEncounterRate,
  calculateCloningCost,
  calculateCloningRerolls,
  calculateCloningShinyChance,
} from '../../../src/logic/minigames/minigameMath.ts';

describe('Fishing Minigame Math Formulas', () => {
  describe('calculateFishingTotalNotes', () => {
    it('should clamp low rarity inputs and return the maximum notes (19)', () => {
      assert.strictEqual(calculateFishingTotalNotes(-5), 19);
      assert.strictEqual(calculateFishingTotalNotes(0), 19);
      assert.strictEqual(calculateFishingTotalNotes(1), 19);
    });

    it('should clamp high rarity inputs and return the minimum notes (5)', () => {
      assert.strictEqual(calculateFishingTotalNotes(100), 5);
      assert.strictEqual(calculateFishingTotalNotes(150), 5);
    });

    it('should correctly scale notes between min and max bounds', () => {
      // rarity 50 -> diffFactor = 51 -> 5 + floor(51 / 7) = 5 + 7 = 12
      assert.strictEqual(calculateFishingTotalNotes(50), 12);
      // rarity 20 -> diffFactor = 81 -> 5 + floor(81 / 7) = 5 + 11 = 16
      assert.strictEqual(calculateFishingTotalNotes(20), 16);
    });
  });

  describe('calculateFishingSpeedBase', () => {
    it('should clamp values at extreme rarities', () => {
      // rarity 1 -> diffFactor = 100 -> (1100 - (100 * 7.5) = 350 -> clamped to 380) * 1.1 = 418
      assert.strictEqual(calculateFishingSpeedBase(1), 418);
      assert.strictEqual(calculateFishingSpeedBase(-5), 418);
      // rarity 100 -> diffFactor = 1 -> Math.round((1100 - (1 * 7.5) = 1092.5) * 1.1) = 1202
      assert.strictEqual(calculateFishingSpeedBase(100), 1202);
      assert.strictEqual(calculateFishingSpeedBase(150), 1202);
    });

    it('should correctly scale durations at intermediate rarities', () => {
      // rarity 50 -> diffFactor = 51 -> Math.round((1100 - (51 * 7.5) = 1100 - 382.5 = 717.5) * 1.1) = 789
      assert.strictEqual(calculateFishingSpeedBase(50), 789);
    });
  });

  describe('calculateFishingHitWindow', () => {
    it('should clamp timing windows within the 100ms to 190ms bounds', () => {
      // rarity 1 -> diffFactor = 100 -> 190 - (100 / 1.3) = 113.08
      assert.ok(Math.abs(calculateFishingHitWindow(1) - 113.08) < 0.01);
      // rarity 100 -> diffFactor = 1 -> 190 - (1 / 1.3) = 189.23
      assert.ok(Math.abs(calculateFishingHitWindow(100) - 189.23) < 0.01);
      // rarity 150 -> clamped to 100 -> diffFactor = 1 -> 189.23
      assert.ok(Math.abs(calculateFishingHitWindow(150) - 189.23) < 0.01);
    });

    it('should calculate correct intermediate hit windows', () => {
      // rarity 50 -> diffFactor = 51 -> 190 - (51 / 1.3) = 190 - 39.23 = 150.77
      assert.ok(Math.abs(calculateFishingHitWindow(50) - 150.77) < 0.01);
    });
  });
});

describe('Archaeology and Fossil Cloning Math Formulas', () => {
  describe('calculateArchaeologyEncounterRate', () => {
    it('should return 10% for caves', () => {
      assert.strictEqual(calculateArchaeologyEncounterRate(true, false), 0.10);
      assert.strictEqual(calculateArchaeologyEncounterRate(true, true), 0.10); // Cave wins priority
    });

    it('should return 5% for mountains if not cave', () => {
      assert.strictEqual(calculateArchaeologyEncounterRate(false, true), 0.05);
    });

    it('should return 0% for other biomes', () => {
      assert.strictEqual(calculateArchaeologyEncounterRate(false, false), 0.00);
    });
  });

  describe('calculateCloningCost', () => {
    it('should return base cost for 0 extra fossils', () => {
      assert.strictEqual(calculateCloningCost(0), 3000);
    });

    it('should scale cost with extra fossils', () => {
      assert.strictEqual(calculateCloningCost(3), 6000);
      assert.strictEqual(calculateCloningCost(6), 9000);
    });

    it('should clamp extra fossils at maximum of 6', () => {
      assert.strictEqual(calculateCloningCost(8), 9000);
    });

    it('should clamp negative inputs to 0', () => {
      assert.strictEqual(calculateCloningCost(-2), 3000);
    });
  });

  describe('calculateCloningRerolls', () => {
    it('should return 1 roll for 0 extra fossils', () => {
      assert.strictEqual(calculateCloningRerolls(0), 1);
    });

    it('should return deterministic rolls for even extra fossils', () => {
      assert.strictEqual(calculateCloningRerolls(2), 2); // 1 + 2/2 = 2
      assert.strictEqual(calculateCloningRerolls(4), 3); // 1 + 4/2 = 3
      assert.strictEqual(calculateCloningRerolls(6), 4); // 1 + 6/2 = 4
    });

    it('should grant extra roll with 50% chance for odd extra fossils', () => {
      // Mock random returning < 0.5 (should trigger extra roll)
      const randTrigger = () => 0.25;
      assert.strictEqual(calculateCloningRerolls(1, randTrigger), 2); // 1 + floor(1/2) + 1 = 2
      assert.strictEqual(calculateCloningRerolls(3, randTrigger), 3); // 1 + floor(3/2) + 1 = 3

      // Mock random returning >= 0.5 (should NOT trigger extra roll)
      const randNoTrigger = () => 0.75;
      assert.strictEqual(calculateCloningRerolls(1, randNoTrigger), 1); // 1 + floor(1/2) = 1
      assert.strictEqual(calculateCloningRerolls(3, randNoTrigger), 2); // 1 + floor(3/2) = 2
    });
  });

  describe('calculateCloningShinyChance', () => {
    it('should return base rate for 0 extra fossils', () => {
      assert.strictEqual(calculateCloningShinyChance(0), 1 / 4096);
    });

    it('should increase shiny chance with extra fossils', () => {
      // 3 extra fossils: 1 + 0.25 * 3 = 1.75x -> 1.75 / 4096
      assert.strictEqual(calculateCloningShinyChance(3), 1.75 / 4096);
      // 6 extra fossils: 1 + 0.25 * 6 = 2.5x -> 2.5 / 4096
      assert.strictEqual(calculateCloningShinyChance(6), 2.5 / 4096);
    });

    it('should clamp extra fossils to maximum of 6', () => {
      assert.strictEqual(calculateCloningShinyChance(8), 2.5 / 4096);
    });
  });
});
