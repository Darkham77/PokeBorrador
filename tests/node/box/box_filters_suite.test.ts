/**
 * tests/node/box/box_filters_suite.test.ts
 *
 * Tier 1 Unit Test Suite for Box Filters (EVs and Friendship Range) in useBoxFilters.
 */

import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useBoxFilters } from '@/composables/pokemon/useBoxFilters';
import type { Pokemon } from '@/types/pokemon/pokemon';

function createMockPokemonWithEVs(
  id: string,
  name: string,
  evs: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number },
  uid = name
): Pokemon {
  return {
    uid,
    id,
    name,
    species: name,
    level: 50,
    maxHp: 100,
    hp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: {
      hp: evs.hp || 0,
      atk: evs.atk || 0,
      def: evs.def || 0,
      spa: evs.spa || 0,
      spd: evs.spd || 0,
      spe: evs.spe || 0,
    },
    moves: [],
    ability: 'waterabsorb',
    isIllegal: false,
    friendship: 70,
  } as unknown as Pokemon;
}

function createMockPokemon(id: string, name: string, friendship: number, uid = name): Pokemon {
  return {
    uid,
    id,
    name,
    species: name,
    level: 50,
    maxHp: 100,
    hp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    moves: [],
    ability: 'waterabsorb',
    isIllegal: false,
    friendship,
  } as unknown as Pokemon;
}

describe('Box Filters Domain Suite', () => {
  describe('Box Individual EVs Filter (EVs STATS INDIVIDUALES)', () => {
    const p1 = createMockPokemonWithEVs('pikachu', 'Pikachu', { atk: 252, spe: 252 }, 'uid-1');
    const p2 = createMockPokemonWithEVs('eevee', 'Eevee', { hp: 252, def: 128, spd: 128 }, 'uid-2');
    const p3 = createMockPokemonWithEVs('chansey', 'Chansey', { hp: 252, def: 252 }, 'uid-3');
    const p4 = createMockPokemonWithEVs('snorlax', 'Snorlax', { hp: 100, atk: 100 }, 'uid-4');
    const p5 = createMockPokemonWithEVs('lapras', 'Lapras', {}, 'uid-5'); // 0 EVs

    const box = ref<(Pokemon | null)[]>([p1, p2, p3, p4, p5]);

    it('filters by single EV stat minimum (evATK)', () => {
      const { filters, sortMode, processedBoxList, hasActiveFilters } = useBoxFilters(box);
      sortMode.value = 'none';

      expect(processedBoxList.value.length).toBe(5);
      expect(hasActiveFilters.value).toBe(false);

      filters.value.evATK = 150;
      expect(hasActiveFilters.value).toBe(true);

      const filtered = processedBoxList.value.map((item) => item.p?.name);
      expect(filtered).toEqual(['Pikachu']);
    });

    it('filters by evHP minimum', () => {
      const { filters, sortMode, processedBoxList, hasActiveFilters } = useBoxFilters(box);
      sortMode.value = 'none';

      filters.value.evHP = 200;
      expect(hasActiveFilters.value).toBe(true);

      const filtered = processedBoxList.value.map((item) => item.p?.name);
      expect(filtered).toEqual(['Eevee', 'Chansey']);
    });

    it('filters by multiple EV stats simultaneously (evHP + evDEF)', () => {
      const { filters, sortMode, processedBoxList } = useBoxFilters(box);
      sortMode.value = 'none';

      filters.value.evHP = 252;
      filters.value.evDEF = 252;

      const filtered = processedBoxList.value.map((item) => item.p?.name);
      expect(filtered).toEqual(['Chansey']);
    });

    it('resets all EV filters on resetFilters()', () => {
      const { filters, resetFilters, hasActiveFilters } = useBoxFilters(box);

      filters.value.evHP = 252;
      filters.value.evATK = 252;
      filters.value.evDEF = 120;
      expect(hasActiveFilters.value).toBe(true);

      resetFilters();

      expect(filters.value.evHP).toBe(0);
      expect(filters.value.evATK).toBe(0);
      expect(filters.value.evDEF).toBe(0);
      expect(filters.value.evSPA).toBe(0);
      expect(filters.value.evSPD).toBe(0);
      expect(filters.value.evSPE).toBe(0);
      expect(hasActiveFilters.value).toBe(false);
    });
  });

  describe('Box Friendship Range Filter (AMI. MÍN & AMI. MÁX)', () => {
    const p1 = createMockPokemon('pikachu', 'Pikachu', 30, 'uid-1');
    const p2 = createMockPokemon('eevee', 'Eevee', 70, 'uid-2');
    const p3 = createMockPokemon('chansey', 'Chansey', 160, 'uid-3');
    const p4 = createMockPokemon('snorlax', 'Snorlax', 220, 'uid-4');
    const p5 = createMockPokemon('lapras', 'Lapras', 255, 'uid-5');

    const box = ref<(Pokemon | null)[]>([p1, p2, p3, p4, p5]);

    it('filters by friendshipMin correctly', () => {
      const { filters, sortMode, processedBoxList, hasActiveFilters } = useBoxFilters(box);
      sortMode.value = 'none';

      expect(processedBoxList.value.length).toBe(5);
      expect(hasActiveFilters.value).toBe(false);

      filters.value.friendshipMin = 160;
      expect(hasActiveFilters.value).toBe(true);

      const filtered = processedBoxList.value.map((item) => item.p?.name);
      expect(filtered).toEqual(['Chansey', 'Snorlax', 'Lapras']);
    });

    it('filters by friendshipMax correctly', () => {
      const { filters, sortMode, processedBoxList, hasActiveFilters } = useBoxFilters(box);
      sortMode.value = 'none';

      filters.value.friendshipMax = 70;
      expect(hasActiveFilters.value).toBe(true);

      const filtered = processedBoxList.value.map((item) => item.p?.name);
      expect(filtered).toEqual(['Pikachu', 'Eevee']);
    });

    it('filters by bounded friendship range (min and max)', () => {
      const { filters, sortMode, processedBoxList } = useBoxFilters(box);
      sortMode.value = 'none';

      filters.value.friendshipMin = 70;
      filters.value.friendshipMax = 200;

      const filtered = processedBoxList.value.map((item) => item.p?.name);
      expect(filtered).toEqual(['Eevee', 'Chansey']);
    });

    it('resets friendship range filters on resetFilters()', () => {
      const { filters, resetFilters, hasActiveFilters } = useBoxFilters(box);

      filters.value.friendshipMin = 100;
      filters.value.friendshipMax = 200;
      expect(hasActiveFilters.value).toBe(true);

      resetFilters();

      expect(filters.value.friendshipMin).toBe(0);
      expect(filters.value.friendshipMax).toBe(255);
      expect(hasActiveFilters.value).toBe(false);
    });
  });
});
