import { test, describe } from 'vitest';
import assert from 'node:assert';
import { calculateIndividualHealCost, calculateTotalHealCost, calculatePokemonCenterCooldown, pokemonNeedsHealing } from '../../../src/logic/economy/economyFormulas.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Economy Formulas - Individual Heal Cost (Rocket)', () => {
  const dummyPokemon: Partial<Pokemon> = {
    name: 'Bulbasaur',
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } // Total 60 -> Tier D (Mult 1.2)
  };

  test('calculates correct cost for Tier D at level 10', () => {
    // Base = 20 + (10 * 3) = 50
    // Total = 50 * 1.2 = 60
    const cost = calculateIndividualHealCost(dummyPokemon as Pokemon, 10, 'rocket');
    assert.strictEqual(cost, 60);
  });

  test('calculates correct cost for Tier S+ at level 50', () => {
    const legendary: Partial<Pokemon> = {
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } // Total 186 -> Tier S+ (Mult 10)
    };
    // Base = 20 + (50 * 3) = 170
    // Total = 170 * 10 = 1700
    const cost = calculateIndividualHealCost(legendary as Pokemon, 50, 'rocket');
    assert.strictEqual(cost, 1700);
  });

  test('returns 0 for non-rocket class', () => {
    const cost = calculateIndividualHealCost(dummyPokemon as Pokemon, 50, 'trainer');
    assert.strictEqual(cost, 0);
  });
});

describe('Economy Formulas - Total Team Heal Cost', () => {
  const p1: Partial<Pokemon> = {
    hp: 10, maxHp: 100, // Damaged
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 } // Tier D (Mult 1.2)
  };
  const p2: Partial<Pokemon> = {
    hp: 100, maxHp: 100, // Healthy
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
  };

  test('sums only damaged pokemon', () => {
    // Lv 10 -> Base 50 -> Tier D (1.2) -> 60 per pokemon
    const team = [p1 as Pokemon, p2 as Pokemon, null, null, null, null];
    const total = calculateTotalHealCost(team, 10, 'rocket');
    assert.strictEqual(total, 60);
  });

  test('includes PP depletion as damaged', () => {
    const p3 = {
      hp: 100, maxHp: 100,
      moves: [{ name: 'Tackle', pp: 5, maxPP: 35 }], // Needs PP
      ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
    } as unknown as Pokemon;
    const team = [p3];
    const total = calculateTotalHealCost(team, 10, 'rocket');
    assert.strictEqual(total, 60);
  });
});

describe('Economy Formulas - Pokemon Center Cooldown', () => {
  test('returns 0 for level <= 1', () => {
    assert.strictEqual(calculatePokemonCenterCooldown(1), 0);
    assert.strictEqual(calculatePokemonCenterCooldown(0), 0);
  });

  test('calculates correct cooldown for level 2', () => {
    // (2 - 1)^1.5 * 5.5 = 1 * 5.5 = 5.5 -> Math.floor = 5
    assert.strictEqual(calculatePokemonCenterCooldown(2), 5);
  });

  test('calculates correct cooldown for level 5', () => {
    // (5 - 1)^1.5 * 5.5 = 4^1.5 * 5.5 = 8 * 5.5 = 44
    assert.strictEqual(calculatePokemonCenterCooldown(5), 44);
  });

  test('calculates correct cooldown for level 10', () => {
    // (10 - 1)^1.5 * 5.5 = 9^1.5 * 5.5 = 27 * 5.5 = 148.5 -> Math.floor = 148
    assert.strictEqual(calculatePokemonCenterCooldown(10), 148);
  });

  test('calculates correct cooldown for level 30', () => {
    // (30 - 1)^1.5 * 5.5 = 29^1.5 * 5.5 = 156.17 * 5.5 = 858.9 -> Math.floor = 858
    assert.strictEqual(calculatePokemonCenterCooldown(30), 858);
  });
});

describe('Economy Formulas - Pokemon Needs Healing Checks', () => {
  test('returns false for completely healthy pokemon with full HP, no status, and full PP', () => {
    const healthy = {
      hp: 100,
      maxHp: 100,
      status: '',
      moves: [
        { name: 'Tackle', pp: 35, maxPP: 35 },
        { name: 'Growl', pp: 40, maxPP: 40 }
      ]
    } as unknown as Pokemon;
    assert.strictEqual(pokemonNeedsHealing(healthy), false);
  });

  test('returns true when pokemon HP is below maxHp (damaged)', () => {
    const damaged = {
      hp: 80,
      maxHp: 100,
      status: '',
      moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }]
    } as unknown as Pokemon;
    assert.strictEqual(pokemonNeedsHealing(damaged), true);
  });

  test('returns true when pokemon is fainted (hp === 0)', () => {
    const fainted = {
      hp: 0,
      maxHp: 100,
      status: '',
      moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }]
    } as unknown as Pokemon;
    assert.strictEqual(pokemonNeedsHealing(fainted), true);
  });

  test('returns true when pokemon has altered status condition', () => {
    const paralyzed = {
      hp: 100,
      maxHp: 100,
      status: 'par',
      moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }]
    } as unknown as Pokemon;
    assert.strictEqual(pokemonNeedsHealing(paralyzed), true);
  });

  test('returns true when pokemon has expended PP on any move', () => {
    const ppDepleted = {
      hp: 100,
      maxHp: 100,
      status: '',
      moves: [
        { name: 'Tackle', pp: 35, maxPP: 35 },
        { name: 'Thunderbolt', pp: 14, maxPP: 15 }
      ]
    } as unknown as Pokemon;
    assert.strictEqual(pokemonNeedsHealing(ppDepleted), true);
  });
});

