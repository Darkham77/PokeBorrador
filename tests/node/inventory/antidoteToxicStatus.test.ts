import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { useItemOnPokemon } from '../../../src/logic/providers/itemProvider.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function createToxicPokemon(): Pokemon {
  return {
    uid: 'antidote-toxic-test', id: 'bulbasaur', species: 'bulbasaur', name: 'Bulbasaur', level: 20,
    exp: 0, expNeeded: 100, hp: 30, maxHp: 50, atk: 20, def: 20, spa: 20, spd: 20, spe: 20,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, nature: 'serious', type: 'grass',
    ability: 'overgrow', status: 'tox', volatileCounters: {}, moves: [],
  };
}

describe('Antidote status rules', () => {
  it('cures toxic poison as well as ordinary poison', () => {
    const pokemon = createToxicPokemon();

    const result = useItemOnPokemon('antidote', pokemon);

    assert.ok(result, 'Antidote must be consumable against toxic poison.');
    assert.equal(pokemon.status, '');
  });
});
