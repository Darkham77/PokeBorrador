/**
 * tests/node/economy.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests pure economy/healing formulas from src/logic/economy/economyFormulas.ts.
 * Zero mocks, zero Pinia, zero Vue.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateIndividualHealCost,
  calculateTotalHealCost,
  pokemonNeedsHealing,
} from '../../src/logic/economy/economyFormulas.ts';

import type { Pokemon } from '../../src/types/pokemon.ts';

function makeTestMon(hp: number, maxHp: number, status: string | null = null, pp: number = 10, maxPP: number = 10): Pokemon {
  return {
    uid: 'mon1',
    id: 'pikachu',
    name: 'Pikachu',
    level: 25,
    hp,
    maxHp,
    status,
    moves: [{ name: 'Placaje', pp, maxPP }],
    atk: 55, def: 40, spa: 50, spd: 50, spe: 90,
    type: 'electric', nature: 'Fuerte', ability: 'Estática',
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
  } as unknown as Pokemon;
}

describe('Economy & Healing Formulas', () => {
  describe('pokemonNeedsHealing', () => {
    it('returns false when pokemon is fully healthy', () => {
      const mon = makeTestMon(50, 50, null, 10, 10);
      assert.strictEqual(pokemonNeedsHealing(mon), false);
    });

    it('returns true when pokemon has lost HP', () => {
      const mon = makeTestMon(30, 50, null, 10, 10);
      assert.strictEqual(pokemonNeedsHealing(mon), true);
    });

    it('returns true when pokemon has status condition', () => {
      const mon = makeTestMon(50, 50, 'paralysis', 10, 10);
      assert.strictEqual(pokemonNeedsHealing(mon), true);
    });

    it('returns true when pokemon has lost move PP', () => {
      const mon = makeTestMon(50, 50, null, 5, 10);
      assert.strictEqual(pokemonNeedsHealing(mon), true);
    });
  });

  describe('calculateIndividualHealCost', () => {
    it('returns 0 for classes other than rocket', () => {
      const mon = makeTestMon(10, 50);
      assert.strictEqual(calculateIndividualHealCost(mon, 5, 'trainer'), 0);
    });

    it('calculates correct cost for rocket class at level 5 with D-tier pokemon', () => {
      const mon = makeTestMon(10, 50); // IV sum is 15*6 = 90 (Tier D)
      // Base Price = 20 + 5 * 3 = 35.
      // Multiplier = 1.2 (D-tier).
      // Expected Cost = Math.floor(35 * 1.2) = 42.
      assert.strictEqual(calculateIndividualHealCost(mon, 5, 'rocket'), 42);
    });
  });

  describe('calculateTotalHealCost', () => {
    it('sums individual healing costs for all party members needing recovery', () => {
      const mon1 = makeTestMon(10, 50); // Needs healing (D-tier: cost 42)
      const mon2 = makeTestMon(50, 50); // Healthy (Cost 0)
      const party = [mon1, mon2];

      assert.strictEqual(calculateTotalHealCost(party, 5, 'rocket'), 42);
    });

    it('returns 0 if no party members require recovery', () => {
      const mon1 = makeTestMon(50, 50);
      const mon2 = makeTestMon(60, 60);
      const party = [mon1, mon2];

      assert.strictEqual(calculateTotalHealCost(party, 5, 'rocket'), 0);
    });
  });
});
