/**
 * tests/unit/inventory/inventory_domain_suite.spec.ts
 *
 * Consolidated Domain Suite for Inventory & Item Mechanics:
 * - Battle item usage and gameBus animation triggers (pokeballs).
 * - Item target validation (isValidTarget) for potions, antidotes, and purity.
 * - Inventory item usability (isItemUsableOn) zero-allocation checks and cloning purity.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleItemUsage } from '@/logic/battle/battleItems';
import { gameBus } from '@/logic/events/gameBus';
import { isValidTarget } from '@/logic/items/itemEffects';
import { isItemUsableOn, clonePokemonForSimulation } from '@/stores/inventory/inventoryHelpers';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';

vi.mock('@/logic/events/gameBus', () => ({
  gameBus: {
    emit: vi.fn(),
  },
}));

vi.mock('gsap', () => {
  return {
    default: {
      delayedCall: vi.fn((_delay, callback) => {
        if (callback) callback();
        return {
          then: (cb?: () => void) => {
            if (cb) cb();
          },
        };
      }),
    },
  };
});

vi.mock('@/logic/utils/gsapHelpers', () => ({
  awaitAnimation: vi.fn(() => Promise.resolve()),
}));

describe('Inventory Domain Suite', () => {
  describe('battleItems.js', () => {
    let mockOptions: Parameters<typeof handleItemUsage>[3];

    beforeEach(() => {
      vi.clearAllMocks();
      mockOptions = {
        addLog: vi.fn(),
        audio: { ballHit: vi.fn(), wobble: vi.fn(), caught: vi.fn() },
        consumeItem: vi.fn(),
        eventStore: { globalMultipliers: { catch: 1 } },
      } as unknown as Parameters<typeof handleItemUsage>[3];
    });

    it('should trigger gameBus animations when throwing a pokeball', async () => {
      const p = makePokemon('pikachu', 5)!;
      const e = makePokemon('pidgey', 5)!;

      // We expect PLAY_CATCH_ENERGY to be emitted
      await handleItemUsage('pokeball', p, e, mockOptions);

      expect(gameBus.emit).toHaveBeenCalledWith('PLAY_CATCH_ENERGY', {
        side: 'enemy',
        ballId: 'pokeball',
        isCritical: false,
      });
    });
  });

  describe('Item Target Validation (isValidTarget)', () => {
    const mockPokemon = {
      id: 'zubat',
      name: 'Zubat',
      hp: 10,
      maxHp: 40,
      status: null,
      moves: [{ name: 'Placaje', pp: 10, maxPP: 35 }],
    } as unknown as Pokemon;

    it('should return true for Potions if HP is low', () => {
      expect(isValidTarget('potion', mockPokemon)).toBe(true);
    });

    it('should return false for Potions if HP is full', () => {
      const fullHpPokemon = { ...mockPokemon, hp: 40 } as unknown as Pokemon;
      expect(isValidTarget('potion', fullHpPokemon)).toBe(false);
    });

    it('should return true for Antidote if poisoned', () => {
      const poisonedPokemon = { ...mockPokemon, status: 'psn' } as unknown as Pokemon;
      expect(isValidTarget('antidote', poisonedPokemon)).toBe(true);
    });

    it('should return true for Antidote if badly poisoned', () => {
      const badlyPoisonedPokemon = { ...mockPokemon, status: 'tox' } as unknown as Pokemon;
      expect(isValidTarget('antidote', badlyPoisonedPokemon)).toBe(true);
    });

    it('should return false for Antidote if not poisoned', () => {
      expect(isValidTarget('antidote', mockPokemon)).toBe(false);
    });

    it('should not mutate the original pokemon during check', () => {
      const originalHp = mockPokemon.hp;
      isValidTarget('potion', mockPokemon);
      expect(mockPokemon.hp).toBe(originalHp);
    });
  });

  describe('Inventory isItemUsableOn Zero-Allocation & Purity Tests', () => {
    it('should evaluate potion usability without mutating the original pokemon', () => {
      const poke = makePokemon('charmander', 10) as Pokemon;
      poke.maxHp = 30;
      poke.hp = 10; // Damaged

      const originalHp = poke.hp;
      const isUsable = isItemUsableOn('potion', poke);

      expect(isUsable).toBe(true);
      expect(poke.hp).toBe(originalHp); // Untouched
    });

    it('should not be usable when pokemon is at full hp for healing items', () => {
      const poke = makePokemon('charmander', 10) as Pokemon;
      poke.maxHp = 30;
      poke.hp = 30; // Full HP

      expect(isItemUsableOn('potion', poke)).toBe(false);
    });

    it('should evaluate evolution stones accurately without JSON.parse', () => {
      const eevee = makePokemon('eevee', 1) as Pokemon;
      expect(isItemUsableOn('waterstone', eevee)).toBe(true);
      expect(isItemUsableOn('firestone', eevee)).toBe(true);
      expect(isItemUsableOn('leafstone', eevee)).toBe(false);

      const pikachu = makePokemon('pikachu', 1) as Pokemon;
      expect(isItemUsableOn('thunderstone', pikachu)).toBe(true);
      expect(isItemUsableOn('waterstone', pikachu)).toBe(false);
    });

    it('should clone accurately via clonePokemonForSimulation without JSON serialization', () => {
      const poke = makePokemon('pikachu', 15) as Pokemon;
      const cloned = clonePokemonForSimulation(poke);

      expect(cloned.id).toBe(poke.id);
      expect(cloned.hp).toBe(poke.hp);
      expect(cloned.maxHp).toBe(poke.maxHp);
      expect(cloned.moves?.length).toBe(poke.moves?.length);

      // Ensure independence of references
      if (cloned.moves && cloned.moves[0]) {
        cloned.moves[0].pp = 0;
        expect(poke.moves?.[0]?.pp).not.toBe(0);
      }
    });
  });
});
