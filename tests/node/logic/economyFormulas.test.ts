
import test from 'node:test';
import assert from 'node:assert';
import { calculateIndividualHealCost, calculateTotalHealCost } from '../../../src/logic/economy/economyFormulas.ts';
import type { Pokemon } from '../../../src/types/pokemon';

test('Economy Formulas - Individual Heal Cost (Rocket)', async (t) => {
  const dummyPokemon: Partial<Pokemon> = {
    name: 'Bulbasaur',
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } // Total 60 -> Tier D (Mult 1.2)
  };

  await t.test('calculates correct cost for Tier D at level 10', () => {
    // Base = 20 + (10 * 3) = 50
    // Total = 50 * 1.2 = 60
    const cost = calculateIndividualHealCost(dummyPokemon as Pokemon, 10, 'rocket');
    assert.strictEqual(cost, 60);
  });

  await t.test('calculates correct cost for Tier S+ at level 50', () => {
    const legendary: Partial<Pokemon> = {
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } // Total 186 -> Tier S+ (Mult 10)
    };
    // Base = 20 + (50 * 3) = 170
    // Total = 170 * 10 = 1700
    const cost = calculateIndividualHealCost(legendary as Pokemon, 50, 'rocket');
    assert.strictEqual(cost, 1700);
  });

  await t.test('returns 0 for non-rocket class', () => {
    const cost = calculateIndividualHealCost(dummyPokemon as Pokemon, 50, 'trainer');
    assert.strictEqual(cost, 0);
  });
});

test('Economy Formulas - Total Team Heal Cost', async (t) => {
  const p1: Partial<Pokemon> = {
    hp: 10, maxHp: 100, // Damaged
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } // Tier D (Mult 1.2)
  };
  const p2: Partial<Pokemon> = {
    hp: 100, maxHp: 100, // Healthy
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
  };

  await t.test('sums only damaged pokemon', () => {
    // Lv 10 -> Base 50 -> Tier D (1.2) -> 60 per pokemon
    const team = [p1 as Pokemon, p2 as Pokemon, null, null, null, null];
    const total = calculateTotalHealCost(team, 10, 'rocket');
    assert.strictEqual(total, 60);
  });

  await t.test('includes PP depletion as damaged', () => {
    const p3: Partial<Pokemon> = {
      hp: 100, maxHp: 100,
      moves: [{ name: 'Tackle', pp: 5, maxPP: 35 } as any], // Needs PP
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
    };
    const team = [p3 as Pokemon];
    const total = calculateTotalHealCost(team, 10, 'rocket');
    assert.strictEqual(total, 60);
  });
});
