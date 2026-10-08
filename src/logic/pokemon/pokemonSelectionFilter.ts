import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PokemonFilterTagId } from '@/logic/constants/tags';
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils';
import { getPokemonSortMetric, type FilterablePokemonItem } from './pokemonSortMetric.ts';
import { matchesPokemonCriteria } from './pokemonFilterMatcher.ts';

export type { FilterablePokemonItem } from './pokemonSortMetric.ts';

export interface PokemonFilterCriteria {
  searchQuery: string;
  sortBy: string;
  sortOrder: string;
  activeTags: PokemonFilterTagId[];
  excludeUids?: string[];
  allowedIds?: string[] | null;
  allowedSpecies?: string[] | null;
  isBattleSwitch?: boolean;
  activePokemonUid?: string | null;
  allowDead?: boolean;
}

export function getPokemonTotalPower(p: Pokemon): number {
  return calculateTotalPower(p);
}

export function filterAndSortPokemon(
  sourceList: FilterablePokemonItem[],
  criteria: PokemonFilterCriteria
) {
  const filtered = sourceList.filter(item => matchesPokemonCriteria(item, criteria));

  if (criteria.isBattleSwitch && (!criteria.sortBy || criteria.sortBy === 'index' || criteria.sortBy === 'recent')) {
    return filtered.sort((a, b) => a.index - b.index);
  }

  return filtered.sort((a, b) => {
    const valA = getPokemonSortMetric(a, criteria.sortBy);
    const valB = getPokemonSortMetric(b, criteria.sortBy);

    if (valA === valB) {
      return criteria.sortOrder === 'desc' 
        ? b.pokemon.uid.localeCompare(a.pokemon.uid) 
        : a.pokemon.uid.localeCompare(b.pokemon.uid);
    }
    return criteria.sortOrder === 'desc' ? valB - valA : valA - valB;
  });
}
