import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { PokedexAggregator } from '../../../src/logic/pokemon/pokedexAggregator.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';

// Mock simple de Pokémon
const createMockPoke = (id: PokemonSpeciesId): Pokemon => ({
  id,
  name: id,
  uid: Math.random().toString(),
  hp: 100,
  maxHp: 100,
  level: 5,
  isShiny: false,
  ivs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
  evs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
  stats: { hp: 100, attack: 10, defense: 10, spAttack: 10, spDefense: 10, speed: 10 },
  moves: []
} as unknown as Pokemon);

describe('PokedexAggregator', () => {
  it('should concatenate species from different pools using native Iterators', () => {
    const team = [createMockPoke('pikachu'), createMockPoke('bulbasaur')];
    const pc = [createMockPoke('charmander')];
    const wild: PokemonSpeciesId[] = ['squirtle', 'caterpie'];

    const all = PokedexAggregator.getAllKnownSpecies(team, pc, wild);
    
    // Convertir iterador a array para validación
    const results = Array.from(all as unknown as Iterable<string>);
    
    assert.deepEqual(results, ['pikachu', 'bulbasaur', 'charmander', 'squirtle', 'caterpie']);
  });

  it('should return unique species list filtering duplicates', () => {
    const team = [createMockPoke('pikachu')];
    const pc = [createMockPoke('pikachu'), createMockPoke('eevee')];
    const wild: PokemonSpeciesId[] = ['eevee', 'mew'];

    const unique = PokedexAggregator.getFilteredSpecies(team, pc, wild);
    
    assert.deepEqual(unique, ['pikachu', 'eevee', 'mew']);
    assert.equal(unique.length, 3);
  });

  it('should handle empty pools gracefully', () => {
    const unique = PokedexAggregator.getFilteredSpecies([], [], []);
    assert.deepEqual(unique, []);
  });
});
