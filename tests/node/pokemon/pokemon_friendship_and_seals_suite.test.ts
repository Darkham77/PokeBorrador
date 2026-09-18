/**
 * tests/node/pokemon/pokemon_friendship_and_seals_suite.test.ts
 *
 * Consolidated Suite for Pokemon Friendship, Seals & Evolution Readiness:
 * 1. Friendship Logic & Formulas: Clamping, seal resolution, Return/Frustration base powers, combat perks, evolution readiness.
 * 2. Domain Boundary Guards & Schema Validation: Valibot schemas, seal tier guards.
 * 3. Friendship Tier Transitions & Battle Log Notifications: Level up deltas, ascending/descending notifications, instance mutation.
 * 4. Box & Selector Filtering / Sorting: Friendship sorting (asc/desc), friendship-evo and friendship-max tag filters.
 */

import { describe, it, test, expect, vi } from 'vitest';
import { safeParse } from 'valibot';
import {
  clampFriendship,
  resolveFriendshipSeal,
  resolveFriendshipSealTier,
  calculateReturnPower,
  calculateFrustrationPower,
  getFriendshipCombatPerks,
  isReadyForFriendshipEvolution,
  getFriendshipTooltipDetails,
  calculateFriendshipLevelUpDelta,
  getFriendshipTransitionLog,
  applyFriendshipDelta,
} from '../../../src/logic/pokemon/friendshipLogic.ts';
import {
  isFriendshipSealTier,
  requireFriendshipSealTier,
  FRIENDSHIP_BOUNDS,
  FRIENDSHIP_SEAL_TIERS,
} from '../../../src/types/pokemon/friendship.ts';
import {
  pokemonSchema,
  friendshipSealTierSchema,
} from '../../../src/logic/validation/subschemas/pokemonSchemas.ts';
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

describe('Pokemon Friendship & Seals Suite', () => {
  describe('Friendship Logic & Formulas', () => {
    describe('clampFriendship', () => {
      test('clamps negative and excessive values within [0, 255]', () => {
        expect(clampFriendship(-10)).toBe(0);
        expect(clampFriendship(0)).toBe(0);
        expect(clampFriendship(120)).toBe(120);
        expect(clampFriendship(255)).toBe(255);
        expect(clampFriendship(300)).toBe(255);
      });

      test('defaults undefined, null, or NaN to standard default base (50)', () => {
        expect(clampFriendship(undefined)).toBe(FRIENDSHIP_BOUNDS.DEFAULT_BASE);
        expect(clampFriendship(null)).toBe(FRIENDSHIP_BOUNDS.DEFAULT_BASE);
        expect(clampFriendship(Number.NaN)).toBe(FRIENDSHIP_BOUNDS.DEFAULT_BASE);
      });
    });

    describe('resolveFriendshipSeal', () => {
      test('resolves distrust seal for [0 - 49]', () => {
        expect(resolveFriendshipSeal(0).id).toBe('distrust');
        expect(resolveFriendshipSeal(49).id).toBe('distrust');
        expect(resolveFriendshipSeal(0).iconEmoji).toBe('⛓️');
        expect(resolveFriendshipSeal(0).isEvolutionReady).toBe(false);
        expect(resolveFriendshipSeal(0).isCombatPerksActive).toBe(false);
      });

      test('resolves sprout seal for [50 - 99]', () => {
        expect(resolveFriendshipSeal(50).id).toBe('sprout');
        expect(resolveFriendshipSeal(99).id).toBe('sprout');
        expect(resolveFriendshipSeal(50).iconEmoji).toBe('🌱');
        expect(resolveFriendshipSeal(50).isEvolutionReady).toBe(false);
        expect(resolveFriendshipSeal(50).isCombatPerksActive).toBe(false);
      });

      test('resolves comrade seal for [100 - 159]', () => {
        expect(resolveFriendshipSeal(100).id).toBe('comrade');
        expect(resolveFriendshipSeal(159).id).toBe('comrade');
        expect(resolveFriendshipSeal(100).iconEmoji).toBe('🤝');
        expect(resolveFriendshipSeal(100).isEvolutionReady).toBe(false);
        expect(resolveFriendshipSeal(100).isCombatPerksActive).toBe(false);
      });

      test('resolves radiant_prism seal for [160 - 219]', () => {
        expect(resolveFriendshipSeal(160).id).toBe('radiant_prism');
        expect(resolveFriendshipSeal(219).id).toBe('radiant_prism');
        expect(resolveFriendshipSeal(160).iconEmoji).toBe('💎');
        expect(resolveFriendshipSeal(160).isEvolutionReady).toBe(true);
        expect(resolveFriendshipSeal(160).isCombatPerksActive).toBe(false);
      });

      test('resolves best_friends ribbon for [220 - 255]', () => {
        expect(resolveFriendshipSeal(220).id).toBe('best_friends');
        expect(resolveFriendshipSeal(255).id).toBe('best_friends');
        expect(resolveFriendshipSeal(255).iconEmoji).toBe('🎀');
        expect(resolveFriendshipSeal(255).isEvolutionReady).toBe(true);
        expect(resolveFriendshipSeal(255).isCombatPerksActive).toBe(true);
      });

      test('resolveFriendshipSealTier returns seal id string directly', () => {
        expect(resolveFriendshipSealTier(255)).toBe('best_friends');
        expect(resolveFriendshipSealTier(180)).toBe('radiant_prism');
        expect(resolveFriendshipSealTier(120)).toBe('comrade');
        expect(resolveFriendshipSealTier(70)).toBe('sprout');
        expect(resolveFriendshipSealTier(20)).toBe('distrust');
      });
    });

    describe('Domain Boundary Guards (@/domain-type-first)', () => {
      test('isFriendshipSealTier validates all 5 canonical seal tiers', () => {
        for (const tier of FRIENDSHIP_SEAL_TIERS) {
          expect(isFriendshipSealTier(tier)).toBe(true);
        }
        expect(isFriendshipSealTier('unknown')).toBe(false);
        expect(isFriendshipSealTier(123)).toBe(false);
        expect(isFriendshipSealTier(null)).toBe(false);
      });

      test('requireFriendshipSealTier returns valid tier or throws loudly', () => {
        expect(requireFriendshipSealTier('best_friends')).toBe('best_friends');
        expect(requireFriendshipSealTier('radiant_prism')).toBe('radiant_prism');
        expect(() => requireFriendshipSealTier('invalid_tier')).toThrow(
          '[DomainTypeFirst] Invalid FriendshipSealTier value: invalid_tier'
        );
      });
    });

    describe('Move Base Power Calculations (Return & Frustration)', () => {
      test('calculateReturnPower computes floor(friendship / 2.5), max 102', () => {
        expect(calculateReturnPower(0)).toBe(1); // Min base power 1
        expect(calculateReturnPower(50)).toBe(20);
        expect(calculateReturnPower(100)).toBe(40);
        expect(calculateReturnPower(200)).toBe(80);
        expect(calculateReturnPower(255)).toBe(102); // 255 / 2.5 = 102
      });

      test('calculateFrustrationPower computes floor((255 - friendship) / 2.5), max 102', () => {
        expect(calculateFrustrationPower(0)).toBe(102); // Max frustration at 0 friendship
        expect(calculateFrustrationPower(50)).toBe(82);
        expect(calculateFrustrationPower(100)).toBe(62);
        expect(calculateFrustrationPower(200)).toBe(22);
        expect(calculateFrustrationPower(255)).toBe(1); // Min frustration at max friendship
      });
    });

    describe('getFriendshipCombatPerks', () => {
      test('activates miracle perks only at threshold >= 220', () => {
        const inactive = getFriendshipCombatPerks(180);
        expect(inactive.isActive).toBe(false);
        expect(inactive.endureThreshold).toBe(false);
        expect(inactive.statusCleanseChance).toBe(0);
        expect(inactive.criticalStageBoost).toBe(0);
        expect(inactive.expMultiplier).toBe(1.0);

        const active = getFriendshipCombatPerks(220);
        expect(active.isActive).toBe(true);
        expect(active.endureThreshold).toBe(true);
        expect(active.statusCleanseChance).toBe(0.2);
        expect(active.criticalStageBoost).toBe(1);
        expect(active.expMultiplier).toBe(1.2);
      });
    });

    describe('isReadyForFriendshipEvolution across generations', () => {
      test('Gen 8/9 threshold is 160', () => {
        expect(isReadyForFriendshipEvolution({ friendship: 159 }, 9)).toBe(false);
        expect(isReadyForFriendshipEvolution({ friendship: 160 }, 9)).toBe(true);
        expect(isReadyForFriendshipEvolution({ friendship: 220 }, 9)).toBe(true);
      });

      test('Legacy Gen 1-7 threshold is 220', () => {
        expect(isReadyForFriendshipEvolution({ friendship: 160 }, 7)).toBe(false);
        expect(isReadyForFriendshipEvolution({ friendship: 219 }, 7)).toBe(false);
        expect(isReadyForFriendshipEvolution({ friendship: 220 }, 7)).toBe(true);
      });
    });

    describe('getFriendshipTooltipDetails', () => {
      test('builds comprehensive self-documenting tooltip data', () => {
        const details = getFriendshipTooltipDetails({ friendship: 255 });
        expect(details.seal.id).toBe('best_friends');
        expect(details.currentValue).toBe(255);
        expect(details.maxValue).toBe(255);
        expect(details.isEvolutionReady).toBe(true);
        expect(details.returnPower).toBe(102);
        expect(details.frustrationPower).toBe(1);
        expect(details.combatPerks.isActive).toBe(true);
        expect(details.evaluatorQuote).toContain('No podría quererte más');
      });
    });

    describe('Valibot Schema Boundaries', () => {
      test('friendshipSealTierSchema parses valid tiers and rejects invalid ones', () => {
        for (const tier of FRIENDSHIP_SEAL_TIERS) {
          const parsed = safeParse(friendshipSealTierSchema, tier);
          expect(parsed.success).toBe(true);
        }

        const invalid = safeParse(friendshipSealTierSchema, 'invalid_seal');
        expect(invalid.success).toBe(false);
      });

      test('pokemonSchema validates valid friendship and rejects negative or > 255 numbers', () => {
        const basePoke = {
          uid: 'test-uid-1',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 25,
          exp: 100,
          expNeeded: 200,
          hp: 50,
          maxHp: 50,
          atk: 30,
          def: 25,
          spa: 35,
          spd: 30,
          spe: 55,
          type: 'electric',
          isShiny: false,
          friendship: 160,
        };

        const validResult = safeParse(pokemonSchema, basePoke);
        expect(validResult.success).toBe(true);

        const negativeResult = safeParse(pokemonSchema, { ...basePoke, friendship: -5 });
        expect(negativeResult.success).toBe(false);

        const overflowResult = safeParse(pokemonSchema, { ...basePoke, friendship: 256 });
        expect(overflowResult.success).toBe(false);
      });
    });
  });

  describe('Friendship Tier Transitions & Battle Log Notifications', () => {
    it('calculates level up friendship gains properly with and without Soothe Bell', () => {
      expect(calculateFriendshipLevelUpDelta(40, false)).toBe(5);
      expect(calculateFriendshipLevelUpDelta(40, true)).toBe(7);

      expect(calculateFriendshipLevelUpDelta(150, false)).toBe(3);
      expect(calculateFriendshipLevelUpDelta(150, true)).toBe(4);

      expect(calculateFriendshipLevelUpDelta(230, false)).toBe(2);
      expect(calculateFriendshipLevelUpDelta(230, true)).toBe(3);
    });

    it('detects ascending tier transitions and formats rich log messages', () => {
      const logSprout = getFriendshipTransitionLog(49, 50, 'Pikachu');
      expect(logSprout).not.toBeNull();
      expect(logSprout?.newTier).toBe('sprout');
      expect(logSprout?.direction).toBe('up');
      expect(logSprout?.message).toContain('🌱');
      expect(logSprout?.message).toContain('florecer');

      const logComrade = getFriendshipTransitionLog(99, 100, 'Pikachu');
      expect(logComrade).not.toBeNull();
      expect(logComrade?.newTier).toBe('comrade');
      expect(logComrade?.direction).toBe('up');
      expect(logComrade?.message).toContain('🤝');
      expect(logComrade?.message).toContain('camarada');

      const logRadiant = getFriendshipTransitionLog(159, 160, 'Pikachu');
      expect(logRadiant).not.toBeNull();
      expect(logRadiant?.newTier).toBe('radiant_prism');
      expect(logRadiant?.direction).toBe('up');
      expect(logRadiant?.message).toContain('💎');
      expect(logRadiant?.message).toContain('evolucionar');

      const logBestFriends = getFriendshipTransitionLog(219, 220, 'Pikachu');
      expect(logBestFriends).not.toBeNull();
      expect(logBestFriends?.newTier).toBe('best_friends');
      expect(logBestFriends?.direction).toBe('up');
      expect(logBestFriends?.message).toContain('🎀');
      expect(logBestFriends?.message).toContain('Mejores Amigos');
    });

    it('detects descending tier transitions when friendship drops and alerts the trainer', () => {
      const logDropBestFriends = getFriendshipTransitionLog(220, 219, 'Lucario');
      expect(logDropBestFriends).not.toBeNull();
      expect(logDropBestFriends?.newTier).toBe('radiant_prism');
      expect(logDropBestFriends?.direction).toBe('down');
      expect(logDropBestFriends?.type).toBe('log-error');
      expect(logDropBestFriends?.message).toContain('ha descendido del nivel de Mejores Amigos');

      const logDropRadiant = getFriendshipTransitionLog(160, 159, 'Lucario');
      expect(logDropRadiant).not.toBeNull();
      expect(logDropRadiant?.newTier).toBe('comrade');
      expect(logDropRadiant?.direction).toBe('down');
      expect(logDropRadiant?.message).toContain('ya no está listo para evolucionar');

      const logDropComrade = getFriendshipTransitionLog(100, 99, 'Lucario');
      expect(logDropComrade).not.toBeNull();
      expect(logDropComrade?.newTier).toBe('sprout');
      expect(logDropComrade?.direction).toBe('down');
      expect(logDropComrade?.message).toContain('parece dudar');

      const logDropDistrust = getFriendshipTransitionLog(50, 49, 'Lucario');
      expect(logDropDistrust).not.toBeNull();
      expect(logDropDistrust?.newTier).toBe('distrust');
      expect(logDropDistrust?.direction).toBe('down');
      expect(logDropDistrust?.message).toContain('⛓️');
      expect(logDropDistrust?.message).toContain('desconfianza');
    });

    it('returns null when friendship changes within the same tier (no spam)', () => {
      expect(getFriendshipTransitionLog(50, 75, 'Eevee')).toBeNull();
      expect(getFriendshipTransitionLog(120, 140, 'Eevee')).toBeNull();
      expect(getFriendshipTransitionLog(180, 200, 'Eevee')).toBeNull();
      expect(getFriendshipTransitionLog(230, 255, 'Eevee')).toBeNull();
      expect(getFriendshipTransitionLog(30, 10, 'Eevee')).toBeNull();
    });

    it('applies friendship delta directly on Pokemon instance and dispatches log function', () => {
      const dummyPokemon = {
        id: 'pikachu',
        name: 'Pikachu',
        nickname: 'Sparky',
        friendship: 159,
      } as unknown as Pokemon;

      const mockLogFn = vi.fn();

      const result = applyFriendshipDelta(dummyPokemon, 3, mockLogFn);

      expect(dummyPokemon.friendship).toBe(162);
      expect(result.newFriendship).toBe(162);
      expect(result.transition).not.toBeNull();
      expect(mockLogFn).toHaveBeenCalledTimes(1);
      expect(mockLogFn).toHaveBeenCalledWith(
        expect.stringContaining('💎 ¡El lazo de Sparky brilla intensamente!'),
        'log-player',
        dummyPokemon
      );
    });
  });

  describe('Box & Selector Friendship Filtering and Sorting', () => {
    const p1 = createMockPokemon('u1', 'LowFriendship', 20, 'golbat');
    const p2 = createMockPokemon('u2', 'MidFriendship', 100, 'pikachu');
    const p3 = createMockPokemon('u3', 'EvoReadyFriendship', 180, 'golbat');
    const p4 = createMockPokemon('u4', 'MaxFriendship', 255, 'togepi');

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
});
