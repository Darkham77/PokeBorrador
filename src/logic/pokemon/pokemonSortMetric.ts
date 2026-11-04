import { getPokedexOrderIndex, requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import {
  getPokemonPhysicalWeight,
  getPokemonPhysicalHeight
} from '@/logic/pokemon/physicalDimensionsMath';
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils';
import { FRIENDSHIP_BOUNDS } from '@/types/pokemon/friendship';
import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon';

export type FilterablePokemonItem = {
  pokemon: Pokemon;
  _source: PokemonSelectionSource;
  index: number;
};

const POKEDEX_UNKNOWN_INDEX = 9999;
const BOX_SORT_INDEX_OFFSET = 1000;

function computeIvsTotal(ivs: Pokemon['ivs']): number {
  if (!ivs) return 0;
  return (
    (ivs.hp || 0) +
    (ivs.atk || 0) +
    (ivs.def || 0) +
    (ivs.spa || 0) +
    (ivs.spd || 0) +
    (ivs.spe || 0)
  );
}

type MetricExtractor = (p: FilterablePokemonItem['pokemon']) => number;

const POKEMON_SORT_BY_KEYS = [
  'level',
  'ivs',
  'tier',
  'TOT',
  'tot',
  'bst',
  'hatched',
  'egg',
  'pokedex',
  'pdex',
  'weight',
  'height',
  'friendship'
] as const;
export type PokemonSortByKey = (typeof POKEMON_SORT_BY_KEYS)[number];

const SORT_METRIC_STRATEGIES: Record<PokemonSortByKey, MetricExtractor> = {
  level: (p) => p.level || 0,
  ivs: (p) => computeIvsTotal(p.ivs),
  tier: (p) => computeIvsTotal(p.ivs),
  TOT: (p) => calculateTotalPower(p),
  tot: (p) => calculateTotalPower(p),
  bst: (p) => calculateTotalPower(p),
  hatched: (p) => (p.obtainedMethod === 'egg' ? 1 : 0),
  egg: (p) => (p.obtainedMethod === 'egg' ? 1 : 0),
  pokedex: (p) => {
    const idx = getPokedexOrderIndex(requirePokemonSpeciesId(p.id));
    return idx === -1 ? POKEDEX_UNKNOWN_INDEX : idx;
  },
  pdex: (p) => {
    const idx = getPokedexOrderIndex(requirePokemonSpeciesId(p.id));
    return idx === -1 ? POKEDEX_UNKNOWN_INDEX : idx;
  },
  weight: (p) => getPokemonPhysicalWeight(p),
  height: (p) => getPokemonPhysicalHeight(p),
  friendship: (p) => p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE
};

export function getPokemonSortMetric(item: FilterablePokemonItem, sortBy?: string): number {
  const p = item.pokemon;
  if (sortBy && sortBy in SORT_METRIC_STRATEGIES) {
    return SORT_METRIC_STRATEGIES[sortBy as PokemonSortByKey](p);
  }
  return p.obtainedAt || (item._source === 'box' ? BOX_SORT_INDEX_OFFSET : 0) + item.index;
}
