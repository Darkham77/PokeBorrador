/**
 * tests/node/box/box_ev_filters.test.ts
 *
 * Tier 1 Unit Test Suite for Individual EV Stats Filters (HP, ATK, DEF, SPA, SPD, SPE) in useBoxFilters.
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

    // Filter by evATK >= 150
    filters.value.evATK = 150;
    expect(hasActiveFilters.value).toBe(true);

    const filtered = processedBoxList.value.map((item) => item.p?.name);
    expect(filtered).toEqual(['Pikachu']);
  });

  it('filters by evHP minimum', () => {
    const { filters, sortMode, processedBoxList, hasActiveFilters } = useBoxFilters(box);
    sortMode.value = 'none';

    // Filter by evHP >= 200
    filters.value.evHP = 200;
    expect(hasActiveFilters.value).toBe(true);

    const filtered = processedBoxList.value.map((item) => item.p?.name);
    expect(filtered).toEqual(['Eevee', 'Chansey']);
  });

  it('filters by multiple EV stats simultaneously (evHP + evDEF)', () => {
    const { filters, sortMode, processedBoxList } = useBoxFilters(box);
    sortMode.value = 'none';

    // Competitive wall build: 252 HP, 252 DEF
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
    filters.value.evSPA = 80;
    filters.value.evSPD = 60;
    filters.value.evSPE = 40;
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
