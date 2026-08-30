/**
 * tests/node/evolution/friendship_evolution_logic.test.ts
 *
 * Tier 1 Isolated Unit Tests for friendship level-up evolutions and multi-generational thresholds.
 */
import { describe, test, expect } from 'vitest';
import { checkLevelUpEvolution } from '../../../src/logic/evolution/evolutionLogic.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

function createMockPokemon(partial: Partial<Pokemon>): Pokemon {
  return {
    uid: 'test-mock-uid',
    id: 'golbat',
    name: 'Golbat',
    species: 'golbat',
    level: 30,
    exp: 1000,
    expNeeded: 1200,
    hp: 100,
    maxHp: 100,
    atk: 80,
    def: 70,
    spa: 65,
    spd: 75,
    spe: 90,
    type: 'poison',
    type2: 'flying',
    status: '',
    isShiny: false,
    moves: [],
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    nature: 'hardy',
    friendship: 70,
    ...partial,
  } as Pokemon;
}

describe('Friendship Evolution Logic', () => {
  test('Golbat evolves to Crobat only when reaching friendship threshold (>= 160)', () => {
    // Low friendship (70) -> does not evolve
    const lowFriendshipGolbat = createMockPokemon({ id: 'golbat', friendship: 70 });
    expect(checkLevelUpEvolution(lowFriendshipGolbat)).toBe(null);

    // High friendship (160) -> evolves to crobat
    const highFriendshipGolbat = createMockPokemon({ id: 'golbat', friendship: 160 });
    expect(checkLevelUpEvolution(highFriendshipGolbat)).toBe('crobat');

    // Max friendship (255) -> evolves to crobat
    const maxFriendshipGolbat = createMockPokemon({ id: 'golbat', friendship: 255 });
    expect(checkLevelUpEvolution(maxFriendshipGolbat)).toBe('crobat');
  });

  test('All canonical friendship evolution species resolve properly', () => {
    const friendshipPairs: Array<[string, string]> = [
      ['golbat', 'crobat'],
      ['chansey', 'blissey'],
      ['pichu', 'pikachu'],
      ['cleffa', 'clefairy'],
      ['igglybuff', 'jigglypuff'],
      ['togepi', 'togetic'],
      ['buneary', 'lopunny'],
      ['riolu', 'lucario'],
      ['budew', 'roselia'],
      ['chingling', 'chimecho'],
      ['woobat', 'swoobat'],
      ['swadloon', 'leavanny'],
      ['snom', 'frosmoth'],
      ['meowthalola', 'persianalola'],
      ['munchlax', 'snorlax'],
      ['azurill', 'marill'],
      ['eevee', 'sylveon'],
    ];

    for (const [fromId, expectedToId] of friendshipPairs) {
      // Under threshold: returns null
      const unreadyPoke = createMockPokemon({ id: fromId as any, friendship: 50 });
      expect(checkLevelUpEvolution(unreadyPoke)).toBe(null);

      // Over threshold: returns evolved target
      const readyPoke = createMockPokemon({ id: fromId as any, friendship: 180 });
      expect(checkLevelUpEvolution(readyPoke)).toBe(expectedToId);
    }
  });

  test('Standard level-up evolutions remain unaffected by friendship', () => {
    // Bulbasaur evolves at level 16 regardless of friendship
    const lowFriendshipBulba = createMockPokemon({ id: 'bulbasaur', level: 16, friendship: 0 });
    expect(checkLevelUpEvolution(lowFriendshipBulba)).toBe('ivysaur');

    const highFriendshipBulba = createMockPokemon({ id: 'bulbasaur', level: 16, friendship: 255 });
    expect(checkLevelUpEvolution(highFriendshipBulba)).toBe('ivysaur');

    const unreadyBulba = createMockPokemon({ id: 'bulbasaur', level: 15, friendship: 255 });
    expect(checkLevelUpEvolution(unreadyBulba)).toBe(null);
  });
});
