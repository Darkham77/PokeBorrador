import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import { hasPokemonTag, isPokemonTagId, type PokemonFilterTagId } from '@/logic/constants/tags'
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils'
import { getPokemonPhysicalWeight, getPokemonPhysicalHeight } from '@/logic/pokemon/physicalDimensionsMath'
import { isReadyForFriendshipEvolution } from '@/logic/pokemon/friendshipLogic'
import { FRIENDSHIP_BOUNDS } from '@/types/pokemon/friendship'
import { getPokedexOrderIndex, requirePokemonSpeciesId } from '@/data/pokemon/pokedex'

export interface PokemonFilterCriteria {
  searchQuery: string
  sortBy: string
  sortOrder: string
  activeTags: PokemonFilterTagId[]
  excludeUids?: string[]
  allowedIds?: string[] | null
  allowedSpecies?: string[] | null
  isBattleSwitch?: boolean
  activePokemonUid?: string | null
  allowDead?: boolean
}

export function getPokemonTotalPower(p: Pokemon): number {
  return calculateTotalPower(p)
}

type FilterablePokemonItem = { pokemon: Pokemon; _source: PokemonSelectionSource; index: number };

const POKEDEX_UNKNOWN_INDEX = 9999;
const BOX_SORT_INDEX_OFFSET = 1000;

function computeIvsTotal(ivs: Pokemon['ivs']): number {
  if (!ivs) return 0;
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
}

function getPokemonSortMetric(item: FilterablePokemonItem, sortBy?: string): number {
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
      return getPokemonTotalPower(p);
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

function isBlockedByBattleSwitch(p: Pokemon, criteria: PokemonFilterCriteria): boolean {
  if (!criteria.isBattleSwitch) return false;
  if (criteria.activePokemonUid === p.uid) return true;
  if (p.hp <= 0 && !criteria.allowDead) return true;
  return false;
}

function matchesSearchQuery(p: Pokemon, query?: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase(); // text-ok: UI text display localization string
  const matchName = p.name?.toLowerCase().includes(q);
  const matchNick = p.nickname?.toLowerCase().includes(q);
  const matchId = String(p.id).includes(q);
  return Boolean(matchName || matchNick || matchId);
}

function matchesActiveTag(item: FilterablePokemonItem, p: Pokemon, tag: string): boolean {
  if (tag === 'shiny') return Boolean(p.isShiny);
  if (tag === 'team') return item._source === 'team';
  if (tag === 'box') return item._source === 'box';
  if (tag === 'friendship-evo') return isReadyForFriendshipEvolution(p);
  if (tag === 'friendship-max') {
    return (p.friendship ?? FRIENDSHIP_BOUNDS.DEFAULT_BASE) >= FRIENDSHIP_BOUNDS.AFFINITY_PERK_THRESHOLD;
  }
  return (isPokemonTagId(tag) || tag === 'favorite' || tag === 'comp') ? hasPokemonTag(p, tag) : false;
}

function matchesPokemonCriteria(item: FilterablePokemonItem, criteria: PokemonFilterCriteria): boolean {
  const p = item.pokemon;
  if (!p) return false;
  if (isBlockedByBattleSwitch(p, criteria)) return false;
  if (criteria.allowedIds && !criteria.allowedIds.includes(p.uid)) return false;
  if (criteria.allowedSpecies && criteria.allowedSpecies.length > 0 && !criteria.allowedSpecies.includes(p.id)) return false;
  if (criteria.excludeUids && criteria.excludeUids.includes(p.uid)) return false;
  if (!matchesSearchQuery(p, criteria.searchQuery)) return false;
  if (criteria.activeTags && criteria.activeTags.length > 0) {
    if (!criteria.activeTags.every(tag => matchesActiveTag(item, p, tag))) return false;
  }
  return true;
}

export function filterAndSortPokemon(
  sourceList: FilterablePokemonItem[],
  criteria: PokemonFilterCriteria
) {
  const filtered = sourceList.filter(item => matchesPokemonCriteria(item, criteria));

  if (criteria.isBattleSwitch && (!criteria.sortBy || criteria.sortBy === 'index' || criteria.sortBy === 'recent')) {
    return filtered.sort((a, b) => a.index - b.index)
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
  })
}
