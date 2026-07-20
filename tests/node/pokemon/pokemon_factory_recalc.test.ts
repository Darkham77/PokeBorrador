import { test, describe, beforeEach } from 'vitest';
import assert from 'node:assert';
import { setActivePinia, createPinia } from 'pinia';
import { makePokemon, recalcPokemonStats } from '../../../src/logic/pokemon/pokemonFactory.ts';

describe('pokemonFactory - recalcPokemonStats HP clamping safety', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test('Clamps hp to maxHp if recalculation decreases maxHp below current hp', () => {
    // Generate a level 1 bulbasaur
    const p = makePokemon('bulbasaur', 1, {
      nature: 'hardy'
    });
    
    assert.ok(p, 'Should generate Bulbasaur');
    
    // Manually set HP to be high, and maxHp to be high
    p.hp = 12;
    p.maxHp = 12;
    
    // Change IVs or set stats such that maxHp will decrease to 11
    p.ivs.hp = 0;
    
    // Recalculate stats. This should clamp p.hp from 12 down to 11 and NOT throw an error.
    recalcPokemonStats(p);
    
    assert.strictEqual(p.hp, p.maxHp, 'HP should be clamped to new maxHp');
    assert.ok(p.hp <= 11, 'HP should be reduced to 11 or lower');
  });
});
