/**
 * tests/node/world/world_minigames_and_harvesting_suite.test.ts
 *
 * Consolidated Suite for Environmental Bush Library, Fishing Minigame, and Minigame Math Formulas.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { getActiveBushesForMap, BIOME_BUSH_CONFIG, BUSH_FAMILIES } from '../../../src/logic/environment/bushLibrary.ts';
import {
  FISHING_DIFFICULTIES,
  calculateFishingDifficulty,
  calculateFishingDifficultyScore,
  applyFishingLevelAndIvBonus,
} from '../../../src/components/modals/fishingGameHelper.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import {
  calculateFishingTotalNotes,
  calculateFishingSpeedBase,
  calculateFishingHitWindow,
  calculateArchaeologyEncounterRate,
  calculateCloningCost,
  calculateCloningRerolls,
  calculateCloningShinyChance,
} from '../../../src/logic/minigames/minigameMath.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import { GYM_REMATCHES, isGymRematchAvailable, isGymRematchCompletedToday, recordGymRematchCompletion } from '../../../src/data/world/gymRematches.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { GymId } from '../../../src/data/world/gyms.ts';

const baseBushes = [
  { id: 1, cls: 'bush-front-1', scale: 1.3, tx: -60, ty: 10, ad: '1.2s', ay: '0s' },
  { id: 2, cls: 'bush-front-2', scale: 1.1, tx: 40, ty: 15, ad: '1.5s', ay: '0.3s' }
];

describe('World Domain: Minigames, Bushes & Harvesting Suite', () => {
  describe('Bush Library (bushLibrary.ts)', () => {
    it('debe resolver la configuración de coberturas para un mapa de llanuras (Ruta 1)', () => {
      const bushes = getActiveBushesForMap('route1', 'front', 12345, baseBushes);
      assert.strictEqual(bushes.length, 2);
      
      const first = bushes[0];
      assert.ok(first);
      assert.ok(Object.keys(BUSH_FAMILIES).includes(first.family));
      assert.ok(['bush', 'tree', 'none'].includes(first.animationType));
      assert.ok(typeof first.randomScale === 'number');
      assert.ok(first.randomScale > 0.5);
      assert.ok(first.flip === 1 || first.flip === -1);
    });

    it('debe aplicar tintes ambientales correctamente para biomas con tinte (isDesert)', () => {
      const bushes = getActiveBushesForMap('route25', 'front', 5555, baseBushes);
      assert.ok(bushes.length > 0);
    });

    it('debe aplicar tinte marrón (tint-cave) solo a las rocas en biomas de cueva', () => {
      const bushes = getActiveBushesForMap('mt_moon', 'front', 42, baseBushes);
      assert.ok(bushes.length > 0);
      for (const bush of bushes) {
        if (bush.family === 'rock') {
          assert.strictEqual(bush.tintClass, 'tint-cave');
        }
      }
    });

    it('debe aplicar la configuración de cueva de cristal (rocas y mezcla de cristales) en Cueva Celeste', () => {
      let foundRock = false;
      let foundCrystal = false;

      for (let seed = 0; seed < 100; seed++) {
        const bushes = getActiveBushesForMap('cerulean_cave', 'front', seed, baseBushes);
        assert.strictEqual(bushes.length, 2);
        
        for (const bush of bushes) {
          if (bush.family === 'rock') {
            foundRock = true;
            assert.strictEqual(bush.tintClass, 'tint-cave');
          } else {
            foundCrystal = true;
            assert.ok(bush.family.startsWith('crystal'), `Debería ser una familia de cristal (obtenido: ${bush.family})`);
            assert.strictEqual(bush.tintClass, '');
          }
        }
      }

      assert.ok(foundRock, 'Debería haber generado al menos un elemento rock');
      assert.ok(foundCrystal, 'Debería haber generado al menos un elemento de cristal');
    });

    it('debe priorizar isArctic sobre isCave e imponer tinte ártico solo a la familia rock en Islas Espuma', () => {
      let foundRock = false;
      let foundBush = false;

      for (let seed = 0; seed < 100; seed++) {
        const bushes = getActiveBushesForMap('seafoam_islands', 'front', seed, baseBushes);
        assert.strictEqual(bushes.length, 2);
        
        for (const bush of bushes) {
          if (bush.family === 'rock') {
            foundRock = true;
            assert.strictEqual(bush.tintClass, 'tint-arctic');
          } else if (bush.family === 'bushsnow') {
            foundBush = true;
            assert.strictEqual(bush.tintClass, '');
          }
        }
      }
      assert.ok(foundRock, 'Debería haber generado al menos un elemento rock');
      assert.ok(foundBush, 'Debería haber generado al menos un elemento bush');
    });

    it('debe ser determinista para la misma semilla de sesión y capa', () => {
      const bushesA = getActiveBushesForMap('route1', 'front', 999, baseBushes);
      const bushesB = getActiveBushesForMap('route1', 'front', 999, baseBushes);
      
      assert.deepStrictEqual(bushesA, bushesB);
    });

    it('debe generar diferentes resultados para capas front y back con la misma semilla', () => {
      const bushesFront = getActiveBushesForMap('route1', 'front', 999, baseBushes);
      const bushesBack  = getActiveBushesForMap('route1', 'back', 999, baseBushes);
      
      assert.notDeepStrictEqual(bushesFront, bushesBack);
    });

    it('debe contener la configuración correcta de biomas en BIOME_BUSH_CONFIG', () => {
      assert.ok(BIOME_BUSH_CONFIG['isDesert']);
      assert.strictEqual(BIOME_BUSH_CONFIG['isDesert'].tint?.class, 'tint-desert');
      assert.deepStrictEqual(BIOME_BUSH_CONFIG['isDesert'].tint?.families, ['rock']);
      assert.strictEqual(BIOME_BUSH_CONFIG['isDesert'].weights.rock, 70);

      assert.ok(BIOME_BUSH_CONFIG['isSwamp']);
      assert.strictEqual(BIOME_BUSH_CONFIG['isSwamp'].tint?.class, 'tint-swamp');
      assert.strictEqual(BIOME_BUSH_CONFIG['isSwamp'].tint?.families, undefined);
    });
  });

  describe('Fishing Game Helper - Difficulty & Math', () => {
    describe('calculateFishingDifficultyScore', () => {
      it('should give a very low score for low-level common Pokemon (e.g. Magikarp Lv 5, Rarity 80%)', () => {
        const score = calculateFishingDifficultyScore(80, 5);
        assert.ok(score <= 35, `Expected score <= 35, got ${score}`);
      });

      it('should give a high score for high-level rare Pokemon (e.g. Dratini Lv 45, Rarity 5%)', () => {
        const score = calculateFishingDifficultyScore(5, 45);
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
        const p1Min = makePokemon('magikarp', 10) as Pokemon;
        const bonus1Min = applyFishingLevelAndIvBonus(p1Min, 'medium', () => 0.0);
        assert.strictEqual(bonus1Min, 1);
        assert.strictEqual(p1Min.level, 11);

        const p1Max = makePokemon('magikarp', 10) as Pokemon;
        const bonus1Max = applyFishingLevelAndIvBonus(p1Max, 'medium', () => 0.99);
        assert.strictEqual(bonus1Max, 4);
        assert.strictEqual(p1Max.level, 14);

        const p2Min = makePokemon('magikarp', 10) as Pokemon;
        const bonus2Min = applyFishingLevelAndIvBonus(p2Min, 'hard', () => 0.0);
        assert.strictEqual(bonus2Min, 4);
        assert.strictEqual(p2Min.level, 14);

        const p2Max = makePokemon('magikarp', 10) as Pokemon;
        const bonus2Max = applyFishingLevelAndIvBonus(p2Max, 'hard', () => 0.99);
        assert.strictEqual(bonus2Max, 7);
        assert.strictEqual(p2Max.level, 17);

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
        
        const mockRandom = () => 0.9;
        applyFishingLevelAndIvBonus(p, 'expert', mockRandom);

        assert.ok(p.ivs.hp >= 10);
        assert.ok(p.ivs.atk >= 10);
        assert.strictEqual(p.ivs.hp, 28);
      });
    });
  });

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
        assert.strictEqual(calculateFishingTotalNotes(50), 12);
        assert.strictEqual(calculateFishingTotalNotes(20), 16);
      });
    });

    describe('calculateFishingSpeedBase', () => {
      it('should clamp values at extreme rarities', () => {
        assert.strictEqual(calculateFishingSpeedBase(1), 418);
        assert.strictEqual(calculateFishingSpeedBase(-5), 418);
        assert.strictEqual(calculateFishingSpeedBase(100), 1202);
        assert.strictEqual(calculateFishingSpeedBase(150), 1202);
      });

      it('should correctly scale durations at intermediate rarities', () => {
        assert.strictEqual(calculateFishingSpeedBase(50), 789);
      });
    });

    describe('calculateFishingHitWindow', () => {
      it('should clamp timing windows within the 100ms to 190ms bounds', () => {
        assert.ok(Math.abs(calculateFishingHitWindow(1) - 113.08) < 0.01);
        assert.ok(Math.abs(calculateFishingHitWindow(100) - 189.23) < 0.01);
        assert.ok(Math.abs(calculateFishingHitWindow(150) - 189.23) < 0.01);
      });

      it('should calculate correct intermediate hit windows', () => {
        assert.ok(Math.abs(calculateFishingHitWindow(50) - 150.77) < 0.01);
      });
    });
  });

  describe('Archaeology and Fossil Cloning Math Formulas', () => {
    describe('calculateArchaeologyEncounterRate', () => {
      it('should return 10% for caves', () => {
        assert.strictEqual(calculateArchaeologyEncounterRate(true, false), 0.10);
        assert.strictEqual(calculateArchaeologyEncounterRate(true, true), 0.10);
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
        assert.strictEqual(calculateCloningRerolls(2), 2);
        assert.strictEqual(calculateCloningRerolls(4), 3);
        assert.strictEqual(calculateCloningRerolls(6), 4);
      });

      it('should grant extra roll with 50% chance for odd extra fossils', () => {
        const randTrigger = () => 0.25;
        assert.strictEqual(calculateCloningRerolls(1, randTrigger), 2);
        assert.strictEqual(calculateCloningRerolls(3, randTrigger), 3);

        const randNoTrigger = () => 0.75;
        assert.strictEqual(calculateCloningRerolls(1, randNoTrigger), 1);
        assert.strictEqual(calculateCloningRerolls(3, randNoTrigger), 2);
      });
    });

    describe('calculateCloningShinyChance', () => {
      it('should return base rate for 0 extra fossils', () => {
        assert.strictEqual(calculateCloningShinyChance(0), 1 / 4096);
      });

      it('should increase shiny chance with extra fossils', () => {
        assert.strictEqual(calculateCloningShinyChance(3), 1.75 / 4096);
        assert.strictEqual(calculateCloningShinyChance(6), 2.5 / 4096);
      });

      it('should clamp extra fossils to maximum of 6', () => {
        assert.strictEqual(calculateCloningShinyChance(8), 2.5 / 4096);
      });
    });
  });

  describe('Daily Gym Rematches Logic & Progression', () => {
    function createMockGameState(partial?: Partial<GameState>): GameState {
      return {
        defeatedGyms: [],
        gymProgress: {},
        dailyGymRematches: {},
        inventory: {},
        battleCoins: 0,
        money: 0,
        ...partial
      } as unknown as GameState;
    }

    const today = '2026-09-07';
    const yesterday = '2026-09-06';

    it('has valid rematch configurations for all 8 Kanto gyms', () => {
      const gymIds: GymId[] = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'];
      for (const id of gymIds) {
        const config = GYM_REMATCHES[id];
        assert.ok(config);
        assert.strictEqual(config.pokemon.length, 6);
        assert.strictEqual(config.levels.length, 6);
        for (const lvl of config.levels) {
          assert.ok(lvl >= 70 && lvl <= 85);
        }
        assert.ok(config.rewardItems.length > 0);
        assert.ok(config.rewardBattleCoins > 0);
      }
    });

    it('isGymRematchAvailable returns false if hard mode has not been defeated', () => {
      const state = createMockGameState({
        gymProgress: {
          pewter: { easy: true, normal: true, hard: false, attempts: 2 }
        }
      });

      assert.strictEqual(isGymRematchAvailable(state, 'pewter', today), false);
    });

    it('isGymRematchAvailable returns true if hard mode defeated and no rematch done today', () => {
      const state = createMockGameState({
        gymProgress: {
          pewter: { easy: true, normal: true, hard: true, attempts: 3 }
        },
        dailyGymRematches: {
          pewter: yesterday
        }
      });

      assert.strictEqual(isGymRematchAvailable(state, 'pewter', today), true);
      assert.strictEqual(isGymRematchCompletedToday(state, 'pewter', today), false);
    });

    it('isGymRematchAvailable returns false if already completed today', () => {
      const state = createMockGameState({
        gymProgress: {
          pewter: { easy: true, normal: true, hard: true, attempts: 3 }
        },
        dailyGymRematches: {
          pewter: today
        }
      });

      assert.strictEqual(isGymRematchAvailable(state, 'pewter', today), false);
      assert.strictEqual(isGymRematchCompletedToday(state, 'pewter', today), true);
    });

    it('recordGymRematchCompletion updates date string for specific gym', () => {
      const state = createMockGameState({
        dailyGymRematches: {}
      });

      recordGymRematchCompletion(state, 'cerulean', today);
      assert.strictEqual(state.dailyGymRematches?.['cerulean'], today);
    });
  });
});

