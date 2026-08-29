import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('GameStore O(1) Reactive Lookups', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should find pokemon by uid in O(1) via pokemonByUid and getPokemonByUid', () => {
    const store = useGameStore();
    const p1 = makePokemon('pikachu', 10) as Pokemon;
    p1.uid = 'pika-unique-uid-01';

    const p2 = makePokemon('charmander', 12) as Pokemon;
    p2.uid = 'char-unique-uid-02';

    store.state.team = [p1];
    store.state.box = [p2];

    expect(store.pokemonByUid.has('pika-unique-uid-01')).toBe(true);
    expect(store.pokemonByUid.has('char-unique-uid-02')).toBe(true);
    expect(store.pokemonByUid.has('non-existent-uid')).toBe(false);

    expect(store.getPokemonByUid('pika-unique-uid-01')).toStrictEqual(p1);
    expect(store.getPokemonByUid('char-unique-uid-02')).toStrictEqual(p2);
    expect(store.getPokemonByUid('non-existent-uid')).toBeNull();
  });

  it('should reactively update pokemonByUid when team or box changes', () => {
    const store = useGameStore();
    const p1 = makePokemon('bulbasaur', 5) as Pokemon;
    p1.uid = 'bulba-uid-99';

    store.state.team = [];
    expect(store.getPokemonByUid('bulba-uid-99')).toBeNull();

    store.state.team.push(p1);
    expect(store.getPokemonByUid('bulba-uid-99')).toStrictEqual(p1);

    store.state.team.splice(0, 1);
    expect(store.getPokemonByUid('bulba-uid-99')).toBeNull();
  });

  it('should check caught and seen pokedex status in O(1)', () => {
    const store = useGameStore();
    store.state.pokedex = ['pikachu', 'charizard'];
    store.state.seenPokedex = ['bulbasaur'];

    expect(store.isSpeciesCaught('pikachu')).toBe(true);
    expect(store.isSpeciesCaught('charizard')).toBe(true);
    expect(store.isSpeciesCaught('bulbasaur')).toBe(false);

    expect(store.isSpeciesSeen('bulbasaur')).toBe(true);
    expect(store.isSpeciesSeen('pikachu')).toBe(true); // Caught implies seen
    expect(store.isSpeciesSeen('squirtle')).toBe(false);
  });
});
