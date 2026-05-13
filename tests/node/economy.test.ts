import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateIndividualHealCost, 
  pokemonNeedsHealing, 
  calculateTotalHealCost,
  HEAL_COST_TIER_MULTIPLIERS
} from '../../src/logic/economy/economyFormulas.ts';
import type { Pokemon } from '../../src/types/pokemon';

test('Economy Formulas: pokemonNeedsHealing', () => {
  const healthyPkmn: Partial<Pokemon> = {
    hp: 100,
    maxHp: 100,
    status: null,
    moves: [{ name: 'Tackle', pp: 20, maxPP: 20 }] as any
  };

  const damagedPkmn: Partial<Pokemon> = {
    hp: 90,
    maxHp: 100,
    status: null,
    moves: []
  };

  const statusPkmn: Partial<Pokemon> = {
    hp: 100,
    maxHp: 100,
    status: 'poison',
    moves: []
  };

  const ppPkmn: Partial<Pokemon> = {
    hp: 100,
    maxHp: 100,
    status: null,
    moves: [{ name: 'Tackle', pp: 10, maxPP: 20 }] as any
  };

  assert.strictEqual(pokemonNeedsHealing(healthyPkmn as Pokemon), false, 'Healthy pokemon should not need healing');
  assert.strictEqual(pokemonNeedsHealing(damagedPkmn as Pokemon), true, 'Damaged pokemon should need healing');
  assert.strictEqual(pokemonNeedsHealing(statusPkmn as Pokemon), true, 'Pokemon with status should need healing');
  assert.strictEqual(pokemonNeedsHealing(ppPkmn as Pokemon), true, 'Pokemon with low PP should need healing');
});

test('Economy Formulas: calculateIndividualHealCost', () => {
  const pkmn: Partial<Pokemon> = {
    id: 'bulbasaur',
    ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  };

  // For non-rocket, cost is always 0
  assert.strictEqual(calculateIndividualHealCost(pkmn as Pokemon, 10, 'trainer'), 0);
  
  // For rocket, level 10, tier F (multiplier 1)
  // basePrice = 20 + (10 * 3) = 50
  assert.strictEqual(calculateIndividualHealCost(pkmn as Pokemon, 10, 'rocket'), 50);

  // For rocket, level 10, tier S+ (multiplier 10)
  // Let's mock a high IV pokemon
  const highTierPkmn: Partial<Pokemon> = {
    id: 'bulbasaur',
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
  };
  // basePrice 50 * 10 = 500
  assert.strictEqual(calculateIndividualHealCost(highTierPkmn as Pokemon, 10, 'rocket'), 500);
});

test('Economy Formulas: calculateTotalHealCost', () => {
  const p1: Partial<Pokemon> = { hp: 100, maxHp: 100, ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }; // Healthy
  const p2: Partial<Pokemon> = { hp: 50, maxHp: 100, ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }; // Needs healing
  
  const team = [p1 as Pokemon, p2 as Pokemon, null];
  
  // For trainer, cost 0
  assert.strictEqual(calculateTotalHealCost(team, 10, 'trainer'), 0);
  
  // For rocket, only p2 counts
  // cost = 50
  assert.strictEqual(calculateTotalHealCost(team, 10, 'rocket'), 50);
});
