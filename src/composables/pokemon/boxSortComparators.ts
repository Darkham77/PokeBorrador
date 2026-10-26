import type { DisplayText } from '@francogp/auditor';

import { getPokedexOrderIndex, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import {
  getPokemonPhysicalWeight,
  getPokemonPhysicalHeight
} from '@/logic/pokemon/physicalDimensionsMath';
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';

export interface BoxSortItem {
  p: Pokemon | null;
  index: number;
}

const FALLBACK_FRIENDSHIP = 70 as const;
const FALLBACK_POKEDEX_INDEX = 9999 as const;

function compareByPokedex(a: BoxSortItem, b: BoxSortItem): number {
  const pA = a.p as Pokemon;
  const pB = b.p as Pokemon;
  const indexA = getPokedexOrderIndex(requirePokemonSpeciesId(pA.id));
  const indexB = getPokedexOrderIndex(requirePokemonSpeciesId(pB.id));
  const idxA = indexA === -1 ? FALLBACK_POKEDEX_INDEX : indexA;
  const idxB = indexB === -1 ? FALLBACK_POKEDEX_INDEX : indexB;
  return idxB - idxA;
}

function compareByHatched(a: BoxSortItem, b: BoxSortItem): number {
  const pA = a.p as Pokemon;
  const pB = b.p as Pokemon;
  const hA = pA.obtainedMethod === 'egg' ? 1 : 0;
  const hB = pB.obtainedMethod === 'egg' ? 1 : 0;
  return hB - hA;
}

function compareByRecent(a: BoxSortItem, b: BoxSortItem): number {
  const pA = a.p as Pokemon;
  const pB = b.p as Pokemon;
  const tA = pA.obtainedAt || a.index || 0;
  const tB = pB.obtainedAt || b.index || 0;
  return tB - tA;
}

type SortComparator = (a: BoxSortItem, b: BoxSortItem) => number;

const SORT_COMPARATORS: Readonly<Record<DisplayText, SortComparator>> = {
  // open-record: Box sort key comparator dispatch table
  level: (a, b) => (b.p as Pokemon).level - (a.p as Pokemon).level,
  tier: (a, b) => getPokemonTier(b.p).total - getPokemonTier(a.p).total,
  ivs: (a, b) => getPokemonTier(b.p).total - getPokemonTier(a.p).total,
  friendship: (a, b) =>
    ((b.p as Pokemon).friendship ?? FALLBACK_FRIENDSHIP) -
    ((a.p as Pokemon).friendship ?? FALLBACK_FRIENDSHIP),
  bst: (a, b) => calculateTotalPower(b.p as Pokemon) - calculateTotalPower(a.p as Pokemon),
  tot: (a, b) => calculateTotalPower(b.p as Pokemon) - calculateTotalPower(a.p as Pokemon),
  TOT: (a, b) => calculateTotalPower(b.p as Pokemon) - calculateTotalPower(a.p as Pokemon),
  type: (a, b) => (a.p as Pokemon).type.localeCompare((b.p as Pokemon).type),
  recent: compareByRecent,
  pokedex: compareByPokedex,
  pdex: compareByPokedex,
  hatched: compareByHatched,
  egg: compareByHatched,
  weight: (a, b) =>
    getPokemonPhysicalWeight(b.p as Pokemon) - getPokemonPhysicalWeight(a.p as Pokemon),
  height: (a, b) =>
    getPokemonPhysicalHeight(b.p as Pokemon) - getPokemonPhysicalHeight(a.p as Pokemon)
};

export function sortBoxItems(
  items: BoxSortItem[],
  sortMode: string,
  sortDirection: string
): BoxSortItem[] {
  const comparator = SORT_COMPARATORS[sortMode];
  if (!comparator) return items;

  return items.sort((a, b) => {
    const result = comparator(a, b);
    return sortDirection === 'asc' ? -result : result;
  });
}
