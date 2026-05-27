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
} from '../../src/logic/minigames/minigameMath.ts';

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
      // rarity 1 -> diffFactor = 100 -> 1100 - (100 * 7.5) = 350 -> clamped to 380
      assert.strictEqual(calculateFishingSpeedBase(1), 380);
      assert.strictEqual(calculateFishingSpeedBase(-5), 380);
      // rarity 100 -> diffFactor = 1 -> 1100 - (1 * 7.5) = 1092.5
      assert.strictEqual(calculateFishingSpeedBase(100), 1092.5);
      assert.strictEqual(calculateFishingSpeedBase(150), 1092.5);
    });

    it('should correctly scale durations at intermediate rarities', () => {
      // rarity 50 -> diffFactor = 51 -> 1100 - (51 * 7.5) = 1100 - 382.5 = 717.5
      assert.strictEqual(calculateFishingSpeedBase(50), 717.5);
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
