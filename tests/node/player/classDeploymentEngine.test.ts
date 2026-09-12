/**
 * tests/node/player/classDeploymentEngine.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Tier 1 Unit tests for Class Deployment Engine:
 * - Cost calculations per class and duration
 * - Rocket valuation formula (modernized UI ranges: 15k-35k, 40k-90k, 100k-250k)
 * - Cazabichos bug generation with IV floors and shiny divisors
 * - Cazabichos capture streak math & kit captures
 * - Full rewards resolution across all 4 classes
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  getDeploymentCost,
  calcRocketSacrificeMoney,
  generateBugExpeditionPokemon,
  resolveDeploymentRewards,
  calculateCazabichosStreak,
  getCazabichosStreakMultipliers,
  HATCH_STEP_REDUCTION_CRIADOR
} from '../../../src/logic/player/classDeploymentEngine.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Class Deployment Engine — Tier 1 Unit Tests', () => {

  describe('Deployment Costs', () => {
    it('returns correct costs for Cazabichos (money ₽5k, ₽10k, ₽20k)', () => {
      assert.deepStrictEqual(getDeploymentCost('cazabichos', 'mission_6h'), { type: 'money', amount: 5000 });
      assert.deepStrictEqual(getDeploymentCost('cazabichos', 'mission_12h'), { type: 'money', amount: 10000 });
      assert.deepStrictEqual(getDeploymentCost('cazabichos', 'mission_24h'), { type: 'money', amount: 20000 });
    });

    it('returns correct costs for Entrenador (money ₽5k, ₽10k, ₽20k)', () => {
      assert.deepStrictEqual(getDeploymentCost('entrenador', 'mission_6h'), { type: 'money', amount: 5000 });
      assert.deepStrictEqual(getDeploymentCost('entrenador', 'mission_12h'), { type: 'money', amount: 10000 });
      assert.deepStrictEqual(getDeploymentCost('entrenador', 'mission_24h'), { type: 'money', amount: 20000 });
    });

    it('returns correct costs for Criador (Battle Coins 300, 600, 1000 BC)', () => {
      assert.deepStrictEqual(getDeploymentCost('criador', 'mission_6h'), { type: 'battleCoins', amount: 300 });
      assert.deepStrictEqual(getDeploymentCost('criador', 'mission_12h'), { type: 'battleCoins', amount: 600 });
      assert.deepStrictEqual(getDeploymentCost('criador', 'mission_24h'), { type: 'battleCoins', amount: 1000 });
    });

    it('returns sacrifice cost for Rocket (no monetary cost, requires sacrifice)', () => {
      assert.deepStrictEqual(getDeploymentCost('rocket', 'mission_6h'), { type: 'sacrifice', amount: 0 });
      assert.deepStrictEqual(getDeploymentCost('rocket', 'mission_12h'), { type: 'sacrifice', amount: 0 });
      assert.deepStrictEqual(getDeploymentCost('rocket', 'mission_24h'), { type: 'sacrifice', amount: 0 });
    });
  });

  describe('Rocket Modernized Valuation Formula', () => {
    const lowPoke: Pokemon = {
      uid: 'p-low',
      id: 'koffing',
      name: 'Koffing',
      level: 5,
      ivs: { hp: 2, atk: 5, def: 10, spa: 4, spd: 3, spe: 6 },
      type: 'poison'
    } as unknown as Pokemon;

    const highPoke: Pokemon = {
      uid: 'p-high',
      id: 'gengar',
      name: 'Gengar',
      level: 95,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      type: 'ghost',
      type2: 'poison'
    } as unknown as Pokemon;

    it('scales within 6h range (₽15,000 to ₽35,000)', () => {
      const rewardLow = calcRocketSacrificeMoney(lowPoke, 'mission_6h');
      const rewardHigh = calcRocketSacrificeMoney(highPoke, 'mission_6h');

      assert.ok(rewardLow >= 15000, `Reward ${rewardLow} should be >= 15000`);
      assert.ok(rewardLow <= 35000, `Reward ${rewardLow} should be <= 35000`);
      assert.ok(rewardHigh >= 15000, `Reward ${rewardHigh} should be >= 15000`);
      assert.ok(rewardHigh <= 35000, `Reward ${rewardHigh} should be <= 35000`);
      assert.ok(rewardHigh > rewardLow, 'Higher level & IVs must yield strictly more money');
    });

    it('scales within 12h range (₽40,000 to ₽90,000)', () => {
      const rewardLow = calcRocketSacrificeMoney(lowPoke, 'mission_12h');
      const rewardHigh = calcRocketSacrificeMoney(highPoke, 'mission_12h');

      assert.ok(rewardLow >= 40000, `Reward ${rewardLow} should be >= 40000`);
      assert.ok(rewardLow <= 90000, `Reward ${rewardLow} should be <= 90000`);
      assert.ok(rewardHigh >= 40000, `Reward ${rewardHigh} should be >= 40000`);
      assert.ok(rewardHigh <= 90000, `Reward ${rewardHigh} should be <= 90000`);
      assert.ok(rewardHigh > rewardLow, 'Higher level & IVs must yield strictly more money');
    });

    it('scales within 24h range (₽100,000 to ₽250,000)', () => {
      const rewardLow = calcRocketSacrificeMoney(lowPoke, 'mission_24h');
      const rewardHigh = calcRocketSacrificeMoney(highPoke, 'mission_24h');

      assert.ok(rewardLow >= 100000, `Reward ${rewardLow} should be >= 100000`);
      assert.ok(rewardLow <= 250000, `Reward ${rewardLow} should be <= 250000`);
      assert.ok(rewardHigh >= 100000, `Reward ${rewardHigh} should be >= 100000`);
      assert.ok(rewardHigh <= 250000, `Reward ${rewardHigh} should be <= 250000`);
      assert.ok(rewardHigh > rewardLow, 'Higher level & IVs must yield strictly more money');
    });
  });

  describe('Cazabichos Bug Generator', () => {
    it('generates exactly 3 Bug-type pokemon with IV floors', () => {
      const bugs6h = generateBugExpeditionPokemon('mission_6h', 8);
      assert.strictEqual(bugs6h.length, 3);
      bugs6h.forEach(p => {
        assert.ok(p.type === 'bug' || p.type2 === 'bug', `Pokemon ${p.id} must be Bug type`);
        ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
          assert.ok((p.ivs?.[stat as keyof typeof p.ivs] ?? 0) >= 5, `IV ${stat} must be >= 5`);
        });
      });

      const bugs24h = generateBugExpeditionPokemon('mission_24h', 8);
      assert.strictEqual(bugs24h.length, 3);
      bugs24h.forEach(p => {
        ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
          assert.ok((p.ivs?.[stat as keyof typeof p.ivs] ?? 0) >= 15, `IV ${stat} must be >= 15`);
        });
      });

      for (let i = 0; i < 1000; i++) {
        const bCount = Math.floor(Math.random() * 9);
        const bugs = generateBugExpeditionPokemon('mission_6h', bCount);
        assert.strictEqual(bugs.length, 3, `BadgeCount ${bCount} iteration ${i} generated ${bugs.length} pokemon instead of 3`);
      }
    });
  });

  describe('Cazabichos Capture Streak & Kit de Campo', () => {
    it('increments streak up to cap of 4 on success, resets to 0 on failure/flee', () => {
      let result = calculateCazabichosStreak(0, true, 0, 1);
      assert.strictEqual(result.streak, 1);

      result = calculateCazabichosStreak(1, true, 0, 1);
      assert.strictEqual(result.streak, 2);

      result = calculateCazabichosStreak(3, true, 0, 1);
      assert.strictEqual(result.streak, 4);

      result = calculateCazabichosStreak(4, true, 0, 1);
      assert.strictEqual(result.streak, 4, 'Streak must cap at 4');

      result = calculateCazabichosStreak(4, false, 0, 1);
      assert.strictEqual(result.streak, 0, 'Streak must reset to 0 on fail or flee');
    });

    it('computes correct IV floor and shiny multipliers for streak levels', () => {
      assert.deepStrictEqual(getCazabichosStreakMultipliers(0), { ivFloor: 0, shinyMult: 1.0 });
      assert.deepStrictEqual(getCazabichosStreakMultipliers(1), { ivFloor: 5, shinyMult: 1.75 });
      assert.deepStrictEqual(getCazabichosStreakMultipliers(2), { ivFloor: 10, shinyMult: 2.50 });
      assert.deepStrictEqual(getCazabichosStreakMultipliers(3), { ivFloor: 15, shinyMult: 3.25 });
      assert.deepStrictEqual(getCazabichosStreakMultipliers(4), { ivFloor: 20, shinyMult: 4.00 });
    });

    it('awards 1 Pokéball every 10 captures at classLevel >= 10', () => {
      let res = calculateCazabichosStreak(1, true, 9, 10);
      assert.strictEqual(res.kitCaptures, 0);
      assert.strictEqual(res.awardedPokeballs, 1);

      res = calculateCazabichosStreak(1, true, 8, 10);
      assert.strictEqual(res.kitCaptures, 9);
      assert.strictEqual(res.awardedPokeballs, 0);

      // Below classLevel 10, Kit de Campo is inactive
      res = calculateCazabichosStreak(1, true, 9, 5);
      assert.strictEqual(res.awardedPokeballs, 0);
    });
  });

  describe('Rewards Resolution Across All 4 Classes', () => {
    it('resolves Rocket rewards correctly (money, item, classXP, criminality)', () => {
      const poke: Pokemon = {
        uid: 'p-arbok',
        id: 'arbok',
        level: 30,
        ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
        type: 'poison'
      } as unknown as Pokemon;

      const res6h = resolveDeploymentRewards('rocket', 'mission_6h', poke, { projectedReward: 22000 });
      assert.strictEqual(res6h.money, 22000);
      assert.strictEqual(res6h.items[0]?.id, 'nugget');
      assert.strictEqual(res6h.items[0]?.qty, 1);
      assert.strictEqual(res6h.classXP, 50);
      assert.strictEqual(res6h.criminality, 5);
      assert.strictEqual(res6h.shouldSacrifice, true);

      const res24h = resolveDeploymentRewards('rocket', 'mission_24h', poke, { projectedReward: 180000 });
      assert.strictEqual(res24h.money, 180000);
      assert.strictEqual(res24h.items[0]?.id, 'masterball');
      assert.strictEqual(res24h.classXP, 600);
      assert.strictEqual(res24h.criminality, 20);
    });

    it('resolves Cazabichos rewards correctly (3 bug pokemon, items, classXP)', () => {
      const res6h = resolveDeploymentRewards('cazabichos', 'mission_6h', null, { badgeCount: 8 });
      assert.strictEqual(res6h.items[0]?.id, 'netball');
      assert.strictEqual(res6h.items[0]?.qty, 3);
      assert.strictEqual(res6h.generatedPokemon.length, 3);
      assert.strictEqual(res6h.classXP, 50);

      const res24h = resolveDeploymentRewards('cazabichos', 'mission_24h', null, { badgeCount: 8 });
      assert.strictEqual(res24h.items[0]?.id, 'focussash');
      assert.strictEqual(res24h.classXP, 600);
    });

    it('resolves Entrenador rewards correctly (battleCoins, rarecandy, EXP, bonusLevel)', () => {
      const poke: Pokemon = {
        uid: 'p-charizard',
        id: 'charizard',
        level: 50,
        exp: 0,
        expNeeded: 10000
      } as unknown as Pokemon;

      const res6h = resolveDeploymentRewards('entrenador', 'mission_6h', poke, {});
      assert.strictEqual(res6h.battleCoins, 50);
      assert.ok(res6h.expGained >= 25000);
      assert.strictEqual(res6h.bonusLevels, 0);
      assert.strictEqual(res6h.classXP, 50);

      const res24h = resolveDeploymentRewards('entrenador', 'mission_24h', poke, {});
      assert.strictEqual(res24h.battleCoins, 400);
      assert.strictEqual(res24h.items[0]?.id, 'rarecandy');
      assert.strictEqual(res24h.items[0]?.qty, 3);
      assert.strictEqual(res24h.bonusLevels, 1, '24h mission must grant 1 bonus level');
      assert.strictEqual(res24h.classXP, 600);
    });

    it('resolves Criador rewards correctly (items, IV boosts, vigor loss, 10% save chance)', () => {
      const poke: Pokemon = {
        uid: 'p-ditto',
        id: 'ditto',
        level: 30,
        vigor: 20,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
      } as unknown as Pokemon;

      const res6h = resolveDeploymentRewards('criador', 'mission_6h', poke, {});
      assert.strictEqual(res6h.items[0]?.id, 'everstone');
      assert.strictEqual(res6h.classXP, 50);
      assert.strictEqual(res6h.ivIncrements.length, 1, '6h must boost 1 IV stat');
      assert.strictEqual(res6h.vigorConsumed, 5);

      const res24h = resolveDeploymentRewards('criador', 'mission_24h', poke, {});
      assert.strictEqual(res24h.items[0]?.id, 'goldbottlecap');
      assert.strictEqual(res24h.classXP, 600);
      assert.strictEqual(res24h.ivIncrements.length, 4, '24h must boost 4 IV stats');
    });

    it('verifies Criador hatch step reduction constant is 25%', () => {
      assert.strictEqual(HATCH_STEP_REDUCTION_CRIADOR, 0.25);
    });
  });

});
