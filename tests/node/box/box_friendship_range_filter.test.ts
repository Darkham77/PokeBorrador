/**
 * tests/node/box/box_friendship_range_filter.test.ts
 *
 * Tier 1 Unit Test Suite for Friendship Range Filters (Min & Max sliders) in useBoxFilters.
 */

import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useBoxFilters } from '@/composables/pokemon/useBoxFilters';
import type { Pokemon } from '@/types/pokemon/pokemon';

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

    // Filter friendship >= 160 (Ready for evolution)
    filters.value.friendshipMin = 160;
    expect(hasActiveFilters.value).toBe(true);

    const filtered = processedBoxList.value.map((item) => item.p?.name);
    expect(filtered).toEqual(['Chansey', 'Snorlax', 'Lapras']);
  });

  it('filters by friendshipMax correctly', () => {
    const { filters, sortMode, processedBoxList, hasActiveFilters } = useBoxFilters(box);
    sortMode.value = 'none';

    // Filter friendship <= 70
    filters.value.friendshipMax = 70;
    expect(hasActiveFilters.value).toBe(true);

    const filtered = processedBoxList.value.map((item) => item.p?.name);
    expect(filtered).toEqual(['Pikachu', 'Eevee']);
  });

  it('filters by bounded friendship range (min and max)', () => {
    const { filters, sortMode, processedBoxList } = useBoxFilters(box);
    sortMode.value = 'none';

    // Range: [70, 200]
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
