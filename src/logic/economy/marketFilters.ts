import type { Pokemon } from '@/types/pokemon/pokemon';
import { hasMaxIV } from '@/logic/pokemon/statsMath.ts';
import { getItemById } from '@/data/inventory/items.ts';
import type {
  MarketListing,
  MarketFilters,
  MarketViewContext
} from './market.ts';

function matchesExploreListingTypeAndPrice(
  item: MarketListing,
  filters: MarketFilters,
  context: MarketViewContext
): boolean {
  if (context !== 'explore') return true;
  if (item.listing_type !== filters.mode) return false;
  const price = item.price || 0;
  return price >= filters.priceMin && price <= filters.priceMax;
}

function matchesPokemonSearch(poke: Pokemon, search: string): boolean {
  if (!search) return true;
  const query = search.toLowerCase(); // text-ok: UI text display localization string
  const nameMatch = poke.name?.toLowerCase().includes(query);
  const nickMatch = poke.nickname?.toLowerCase().includes(query);
  return Boolean(nameMatch || nickMatch);
}

function matchesPokemonIVs(ivs: Pokemon['ivs'], totalMin: number, totalMax: number, any31: boolean): boolean {
  const total = (Number(ivs?.hp) || 0) + (Number(ivs?.atk) || 0) + (Number(ivs?.def) || 0) +
    (Number(ivs?.spa) || 0) + (Number(ivs?.spd) || 0) + (Number(ivs?.spe) || 0);
  if (total < totalMin || total > totalMax) return false;
  if (any31 && !hasMaxIV(ivs)) return false;
  return true;
}

function matchesPokemonFilters(
  poke: Pokemon,
  filters: MarketFilters,
  getPokemonTier?: (offer: Pokemon) => { tier: string }
): boolean {
  if (!matchesPokemonSearch(poke, filters.search)) return false;

  if (filters.tier !== 'all') {
    const { tier } = typeof getPokemonTier === 'function' ? getPokemonTier(poke) : { tier: '?' };
    if (tier !== filters.tier) return false;
  }

  if (filters.type !== 'all' && poke.type !== filters.type) return false;

  const level = poke.level || 1;
  if (level < filters.levelMin || level > filters.levelMax) return false;

  return matchesPokemonIVs(poke.ivs, filters.ivTotalMin, filters.ivTotalMax, filters.ivAny31);
}

function matchesItemFilters(
  itemData: { id?: string | number; name?: string },
  filters: MarketFilters
): boolean {
  if (filters.search) {
    const query = filters.search.toLowerCase(); // text-ok: UI text display localization string
    if (!itemData.name?.toLowerCase().includes(query)) return false;
  }

  if (filters.itemCat !== 'all') {
    const key = itemData.id ? String(itemData.id) : (itemData.name || null); // domain-ok: Open dynamic text or non-domain string payload
    try {
      const shopItem = key ? getItemById(key) : null;
      if (shopItem?.cat !== filters.itemCat) return false;
    } catch {
      return false;
    }
  }

  return true;
}

export function applyMarketFilters(
  list: MarketListing[], 
  filters: MarketFilters, 
  context: MarketViewContext, 
  options: { getPokemonTier?: (offer: Pokemon) => { tier: string } } = {}
): MarketListing[] {
  const { getPokemonTier } = options;

  return list.filter(item => {
    if (!matchesExploreListingTypeAndPrice(item, filters, context)) return false;

    if (item.listing_type === 'pokemon') {
      return matchesPokemonFilters(item.data, filters, getPokemonTier);
    }

    return matchesItemFilters(item.data, filters);
  });
}
