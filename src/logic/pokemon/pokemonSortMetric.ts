import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon';
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils';
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight } from '@/logic/pokemon/physicalDimensionsMath';
import { FRIENDSHIP_BOUNDS } from '@/types/pokemon/friendship';
import { getPokedexOrderIndex, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

export type FilterablePokemonItem = { pokemon: Pokemon; _source: PokemonSelectionSource; index: number };

const POKEDEX_UNKNOWN_INDEX = 9999;
const BOX_SORT_INDEX_OFFSET = 1000;

function computeIvsTotal(ivs: Pokemon['ivs']): number {
  if (!ivs) return 0;
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
}

export function getPokemonSortMetric(item: FilterablePokemonItem, sortBy?: string): number {
  const p = item.pokemon;
  switch (sortBy) {
    case 'level':
      return p.level || 0;
    case 'ivs':
    case 'tier':
      return computeIvsTotal(p.ivs);
    case 'TOT':
    case 'tot':
    case 'bst':
      return calculateTotalPower(p);
    case 'hatched':
    case 'egg':
      return p.obtainedMethod === 'egg' ? 1 : 0;
    case 'pokedex':
    case 'pdex': {
      const idx = getPokedexOrderIndex(requirePokemonSpeciesId(p.id));
      return idx === -1 ? POKEDEX_UNKNOWN_INDEX : idx;
    }
    case 'weight':
      return getPokemonPhysicalWeight(p);
    case 'height':
      return getPokemonPhysicalHeight(p);
    case 'friendship':
      return p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE;
    default:
      return p.obtainedAt || ((item._source === 'box' ? BOX_SORT_INDEX_OFFSET : 0) + item.index);
  }
}
