import type { Pokemon } from '@/types/pokemon/pokemon';
import { hasPokemonTag, isPokemonTagId } from '@/logic/constants/tags';
import { isReadyForFriendshipEvolution } from '@/logic/pokemon/friendshipLogic';
import { FRIENDSHIP_BOUNDS } from '@/types/pokemon/friendship';
import type { PokemonFilterCriteria } from './pokemonSelectionFilter.ts';
import type { FilterablePokemonItem } from './pokemonSortMetric.ts';

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

export function matchesPokemonCriteria(item: FilterablePokemonItem, criteria: PokemonFilterCriteria): boolean {
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
