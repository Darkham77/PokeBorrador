/**
 * tests/node/pokemon/friendship_seals_and_math.test.ts
 *
 * Tier 1 Isolated Unit Tests for Friendship formulas, seal resolution,
 * domain guards, combat perks, and Valibot schema validation.
 */
import { describe, test, expect } from 'vitest';
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
