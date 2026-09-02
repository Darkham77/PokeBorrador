/**
 * tests/node/world/fishingGameHelper.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Tests difficulty scoring, tier configuration, level bonuses, and IV reroll mechanics for fishing minigame.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  FISHING_DIFFICULTIES,
  calculateFishingDifficulty,
  calculateFishingDifficultyScore,
  applyFishingLevelAndIvBonus,
} from '../../../src/components/modals/fishingGameHelper.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Fishing Game Helper - Difficulty & Math', () => {
  describe('calculateFishingDifficultyScore', () => {
    it('should give a very low score for low-level common Pokemon (e.g. Magikarp Lv 5, Rarity 80%)', () => {
      const score = calculateFishingDifficultyScore(80, 5);
      // RarityScore: 100 - 80 = 20
      // LevelScore: (5 / 70) * 100 = 7.14
      // Weighted: 0.40 * 7.14 + 0.60 * 20 = 2.85 + 12 = 14.85 -> 15
      assert.ok(score <= 35, `Expected score <= 35, got ${score}`);
    });

    it('should give a high score for high-level rare Pokemon (e.g. Dratini Lv 45, Rarity 5%)', () => {
      const score = calculateFishingDifficultyScore(5, 45);
      // RarityScore: 100 - 5 = 95
      // LevelScore: (45 / 70) * 100 = 64.28
      // Weighted: 0.40 * 64.28 + 0.60 * 95 = 25.71 + 57 = 82.71 -> 83
      assert.ok(score >= 70, `Expected score >= 70, got ${score}`);
    });

    it('should clamp score properly for boundary cases (rarity 0/100, level 0/100)', () => {
      const minScore = calculateFishingDifficultyScore(100, 1);
      const maxScore = calculateFishingDifficultyScore(1, 100);
      assert.ok(minScore >= 0 && minScore <= 10);
      assert.ok(maxScore >= 90 && maxScore <= 100);
    });
  });

  describe('calculateFishingDifficulty', () => {
    it('should categorize low-level common catches as easy', () => {
      assert.strictEqual(calculateFishingDifficulty(60, 5), 'easy');
      assert.strictEqual(calculateFishingDifficulty(40, 10), 'easy');
    });

    it('should categorize mid-level / medium rarity catches as medium', () => {
      assert.strictEqual(calculateFishingDifficulty(35, 25), 'medium');
      assert.strictEqual(calculateFishingDifficulty(20, 20), 'medium');
    });

    it('should categorize high-level or rare catches as hard', () => {
      assert.strictEqual(calculateFishingDifficulty(15, 40), 'hard');
      assert.strictEqual(calculateFishingDifficulty(10, 35), 'hard');
    });

    it('should categorize legendary/ultra rare high-level catches as expert', () => {
      assert.strictEqual(calculateFishingDifficulty(2, 50), 'expert');
      assert.strictEqual(calculateFishingDifficulty(1, 60), 'expert');
    });
  });

  describe('FISHING_DIFFICULTIES configuration', () => {
    it('should have easy speed accessible and accelerated (around 910ms collapse, 680ms spawn interval)', () => {
      const easy = FISHING_DIFFICULTIES.easy;
      assert.strictEqual(easy.notes, 5);
      assert.ok(easy.speedBase <= 950 && easy.speedBase >= 800, `Speed base should be ~910ms, got ${easy.speedBase}`);
      assert.ok(easy.spawnInterval <= 750 && easy.spawnInterval >= 600, `Spawn interval should be ~680ms, got ${easy.spawnInterval}`);
      assert.strictEqual(easy.minLevelBonus, 0);
      assert.strictEqual(easy.maxLevelBonus, 0);
      assert.strictEqual(easy.rerollIVs, false);
    });

    it('should define correct level bonus ranges and reroll rules across tiers', () => {
      assert.strictEqual(FISHING_DIFFICULTIES.easy.minLevelBonus, 0);
      assert.strictEqual(FISHING_DIFFICULTIES.easy.maxLevelBonus, 0);
      assert.strictEqual(FISHING_DIFFICULTIES.easy.rerollIVs, false);

      assert.strictEqual(FISHING_DIFFICULTIES.medium.minLevelBonus, 1);
      assert.strictEqual(FISHING_DIFFICULTIES.medium.maxLevelBonus, 4);
      assert.strictEqual(FISHING_DIFFICULTIES.medium.rerollIVs, false);

      assert.strictEqual(FISHING_DIFFICULTIES.hard.minLevelBonus, 4);
      assert.strictEqual(FISHING_DIFFICULTIES.hard.maxLevelBonus, 7);
      assert.strictEqual(FISHING_DIFFICULTIES.hard.rerollIVs, false);

      assert.strictEqual(FISHING_DIFFICULTIES.expert.minLevelBonus, 7);
      assert.strictEqual(FISHING_DIFFICULTIES.expert.maxLevelBonus, 10);
      assert.strictEqual(FISHING_DIFFICULTIES.expert.rerollIVs, true);
    });
  });

  describe('applyFishingLevelAndIvBonus', () => {
    it('should not increase level on easy difficulty', () => {
      const p = makePokemon('magikarp', 10) as Pokemon;
      assert.ok(p);
      const bonus = applyFishingLevelAndIvBonus(p, 'easy');
      assert.strictEqual(bonus, 0);
      assert.strictEqual(p.level, 10);
    });

    it('should randomly increase level within defined range on medium, hard, expert', () => {
      // Medium: min roll (0.0) -> +1, max roll (0.99) -> +4
      const p1Min = makePokemon('magikarp', 10) as Pokemon;
      const bonus1Min = applyFishingLevelAndIvBonus(p1Min, 'medium', () => 0.0);
      assert.strictEqual(bonus1Min, 1);
      assert.strictEqual(p1Min.level, 11);

      const p1Max = makePokemon('magikarp', 10) as Pokemon;
      const bonus1Max = applyFishingLevelAndIvBonus(p1Max, 'medium', () => 0.99);
      assert.strictEqual(bonus1Max, 4);
      assert.strictEqual(p1Max.level, 14);

      // Hard: min roll (0.0) -> +4, max roll (0.99) -> +7
      const p2Min = makePokemon('magikarp', 10) as Pokemon;
      const bonus2Min = applyFishingLevelAndIvBonus(p2Min, 'hard', () => 0.0);
      assert.strictEqual(bonus2Min, 4);
      assert.strictEqual(p2Min.level, 14);

      const p2Max = makePokemon('magikarp', 10) as Pokemon;
      const bonus2Max = applyFishingLevelAndIvBonus(p2Max, 'hard', () => 0.99);
      assert.strictEqual(bonus2Max, 7);
      assert.strictEqual(p2Max.level, 17);

      // Expert: min roll (0.0) -> +7, max roll (0.99) -> +10
      const p3Min = makePokemon('magikarp', 10) as Pokemon;
      const bonus3Min = applyFishingLevelAndIvBonus(p3Min, 'expert', () => 0.0);
      assert.strictEqual(bonus3Min, 7);
      assert.strictEqual(p3Min.level, 17);

      const p3Max = makePokemon('magikarp', 10) as Pokemon;
      const bonus3Max = applyFishingLevelAndIvBonus(p3Max, 'expert', () => 0.99);
      assert.strictEqual(bonus3Max, 10);
      assert.strictEqual(p3Max.level, 20);
    });

    it('should reroll IVs taking the maximum on expert difficulty, but not below original', () => {
      const p = makePokemon('magikarp', 10) as Pokemon;
      assert.ok(p);
      p.ivs = { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 };
      
      // Seed random to return high rolls (e.g. 0.9 -> 28)
      const mockRandom = () => 0.9;
      applyFishingLevelAndIvBonus(p, 'expert', mockRandom);

      assert.ok(p.ivs.hp >= 10);
      assert.ok(p.ivs.atk >= 10);
      assert.strictEqual(p.ivs.hp, 28);
    });
  });
});
