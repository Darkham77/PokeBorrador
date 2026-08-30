/**
 * tests/node/pokemon/box_friendship_filters.test.ts
 *
 * Tier 2 Integration Tests for Box and Selection filter/sort logic by friendship.
 */
import { describe, test, expect } from 'vitest';
import { filterAndSortPokemon, type PokemonFilterCriteria } from '../../../src/logic/pokemon/pokemonSelectionFilter.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function createMockPokemon(uid: string, name: string, friendship: number, id = 'pikachu'): Pokemon {
  return {
    uid,
    id: id as any,
    species: id as any,
    name,
    level: 25,
    exp: 100,
    expNeeded: 200,
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    type: 'electric',
    status: '',
    isShiny: false,
    moves: [],
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
    nature: 'hardy',
    friendship,
  } as Pokemon;
}

describe('Box & Selector Friendship Filtering and Sorting', () => {
  const p1 = createMockPokemon('u1', 'LowFriendship', 20, 'golbat'); // distrust (20)
  const p2 = createMockPokemon('u2', 'MidFriendship', 100, 'pikachu'); // comrade (100)
  const p3 = createMockPokemon('u3', 'EvoReadyFriendship', 180, 'golbat'); // radiant_prism (180, evo-ready)
  const p4 = createMockPokemon('u4', 'MaxFriendship', 255, 'togepi'); // best_friends (255, bond-max, evo-ready)

  const sourceList = [
    { pokemon: p1, _source: 'box' as const, index: 0 },
    { pokemon: p2, _source: 'box' as const, index: 1 },
    { pokemon: p3, _source: 'box' as const, index: 2 },
    { pokemon: p4, _source: 'box' as const, index: 3 },
  ];

  test('Sorts Pokemon by friendship descending', () => {
    const criteria: PokemonFilterCriteria = {
      searchQuery: '',
      sortBy: 'friendship',
      sortOrder: 'desc',
      activeTags: [],
    };

    const result = filterAndSortPokemon(sourceList, criteria);
    expect(result.map(r => r.pokemon.uid)).toEqual(['u4', 'u3', 'u2', 'u1']);
    expect(result.map(r => r.pokemon.friendship)).toEqual([255, 180, 100, 20]);
  });

  test('Sorts Pokemon by friendship ascending', () => {
    const criteria: PokemonFilterCriteria = {
      searchQuery: '',
      sortBy: 'friendship',
      sortOrder: 'asc',
      activeTags: [],
    };

    const result = filterAndSortPokemon(sourceList, criteria);
    expect(result.map(r => r.pokemon.uid)).toEqual(['u1', 'u2', 'u3', 'u4']);
    expect(result.map(r => r.pokemon.friendship)).toEqual([20, 100, 180, 255]);
  });

  test('Filters Pokemon with friendship-evo tag (friendship >= 160)', () => {
    const criteria: PokemonFilterCriteria = {
      searchQuery: '',
      sortBy: 'friendship',
      sortOrder: 'desc',
      activeTags: ['friendship-evo'],
    };

    const result = filterAndSortPokemon(sourceList, criteria);
    expect(result.map(r => r.pokemon.uid)).toEqual(['u4', 'u3']);
  });

  test('Filters Pokemon with friendship-max tag (friendship >= 220)', () => {
    const criteria: PokemonFilterCriteria = {
      searchQuery: '',
      sortBy: 'friendship',
      sortOrder: 'desc',
      activeTags: ['friendship-max'],
    };

    const result = filterAndSortPokemon(sourceList, criteria);
    expect(result.map(r => r.pokemon.uid)).toEqual(['u4']);
    expect(result[0]?.pokemon.friendship).toBe(255);
  });
});
