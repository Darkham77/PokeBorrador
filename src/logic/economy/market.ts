import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import { hasMaxIV } from '@/logic/pokemon/statsMath.ts';
import { getItemById } from '@/data/inventory/items.ts';

export const GTS_ITEMS_PER_PAGE = 50 as const;
export const GTS_MAX_ACTIVE_LISTINGS = 10 as const;
export const GTS_MARKET_FEE = 0.05 as const;
export const GTS_EXPLORE_LISTINGS_LIMIT = 100 as const;
export const GTS_SALES_HISTORY_LIMIT = 50 as const;

export interface MarketItemData {
  id?: string | number;
  name?: string;
  qty?: number;
}

export const MARKET_LISTING_STATUSES = ['active', 'sold', 'cancelled', 'expired'] as const;
export type MarketListingStatus = (typeof MARKET_LISTING_STATUSES)[number];

export const MARKET_LISTING_TYPES = ['pokemon', 'item'] as const;
export type MarketListingType = (typeof MARKET_LISTING_TYPES)[number];

export const MARKET_ASSET_TYPES = ['pokemon', 'item', 'money'] as const;
export type MarketAssetType = (typeof MARKET_ASSET_TYPES)[number];

const _MARKET_VIEW_CONTEXTS = ['explore', 'my-listings'] as const;
export type MarketViewContext = (typeof _MARKET_VIEW_CONTEXTS)[number];

interface MarketListingBase {
  id: string | number;
  seller_name?: string;
  price: number;
  status: MarketListingStatus;
  seller_id: string;
  buyer_id?: string;
  created_at: string;
}

export type MarketListing =
  | (MarketListingBase & { listing_type: 'pokemon'; data: Pokemon })
  | (MarketListingBase & { listing_type: 'item'; data: MarketItemData });


export interface MarketFilters {
  mode: MarketListingType;
  search: string;
  priceMin: number;
  priceMax: number;
  tier: string;
  type: string;
  levelMin: number;
  levelMax: number;
  ivTotalMin: number;
  ivTotalMax: number;
  ivAny31: boolean;
  itemCat: string;
}

const MAX_MARKET_SOLD_SEEN_HISTORY = 250;
const MARKET_SOLD_SEEN_CACHE = new WeakMap<GameState, Set<string>>();

export function ensureMarketSoldSeenState(state: GameState): string[] {
  if (!Array.isArray(state.marketSoldSeenIds)) state.marketSoldSeenIds = [];
  state.marketSoldSeenIds = [...new Set(
    (state.marketSoldSeenIds as (string | number)[])
      .map((id) => (id !== null && id !== undefined ? String(id).trim() : ''))
      .filter((id: string) => id.length > 0 && !id.includes('invalid'))
  )].slice(-MAX_MARKET_SOLD_SEEN_HISTORY);
  return state.marketSoldSeenIds;
}

function getMarketSoldSeenSet(state: GameState): Set<string> {
  let cached = MARKET_SOLD_SEEN_CACHE.get(state);
  if (!cached) {
    const ids = ensureMarketSoldSeenState(state);
    cached = new Set<string>(ids); // runtime-set: Fast O(1) membership lookup set
    MARKET_SOLD_SEEN_CACHE.set(state, cached);
  }
  return cached;
}

export function isMarketSoldSeen(listingId: string | number | undefined | null, state: GameState): boolean {
  if (listingId === null || listingId === undefined || listingId === '') return true;
  return getMarketSoldSeenSet(state).has(String(listingId));
}

export function markMarketSoldSeen(listingId: string | number | undefined | null, state: GameState): void {
  if (listingId === null || listingId === undefined || listingId === '') return;
  const idStr = String(listingId).trim();
  if (!idStr) return;
  const set = getMarketSoldSeenSet(state);
  if (set.has(idStr)) return;
  set.add(idStr);
  const seen = ensureMarketSoldSeenState(state);
  seen.push(idStr);
  state.marketSoldSeenIds = seen.slice(-MAX_MARKET_SOLD_SEEN_HISTORY);
}

export function buildMarketSaleLabel(listing: MarketListing): string {
  if (!listing) return 'una publicación';
  if (listing.listing_type === 'pokemon') {
    return `tu Pokémon ${listing.data?.name || ''}`.trim();
  }
  const qty = Math.max(1, parseInt(String(listing.data?.qty || 1), 10));
  const itemName = listing.data?.name || 'objeto';
  return `tu objeto ${itemName} x${qty}`;
}

/**
 * Filter market listings based on search, tier, type, etc.
 */
function matchesExploreListingTypeAndPrice(
  item: MarketListing,
  filters: MarketFilters,
  context: MarketViewContext
): boolean {
  if (context !== 'explore') return true
  if (item.listing_type !== filters.mode) return false
  const price = item.price || 0
  return price >= filters.priceMin && price <= filters.priceMax
}

function matchesPokemonSearch(poke: Pokemon, search: string): boolean {
  if (!search) return true
  const query = search.toLowerCase() // text-ok: UI text display localization string
  const nameMatch = poke.name?.toLowerCase().includes(query)
  const nickMatch = poke.nickname?.toLowerCase().includes(query)
  return Boolean(nameMatch || nickMatch)
}

function matchesPokemonIVs(ivs: Pokemon['ivs'], totalMin: number, totalMax: number, any31: boolean): boolean {
  const total = (Number(ivs?.hp) || 0) + (Number(ivs?.atk) || 0) + (Number(ivs?.def) || 0) +
    (Number(ivs?.spa) || 0) + (Number(ivs?.spd) || 0) + (Number(ivs?.spe) || 0)
  if (total < totalMin || total > totalMax) return false
  if (any31 && !hasMaxIV(ivs)) return false
  return true
}

function matchesPokemonFilters(
  poke: Pokemon,
  filters: MarketFilters,
  getPokemonTier?: (offer: Pokemon) => { tier: string }
): boolean {
  if (!matchesPokemonSearch(poke, filters.search)) return false

  if (filters.tier !== 'all') {
    const { tier } = typeof getPokemonTier === 'function' ? getPokemonTier(poke) : { tier: '?' }
    if (tier !== filters.tier) return false
  }

  if (filters.type !== 'all' && poke.type !== filters.type) return false

  const level = poke.level || 1
  if (level < filters.levelMin || level > filters.levelMax) return false

  return matchesPokemonIVs(poke.ivs, filters.ivTotalMin, filters.ivTotalMax, filters.ivAny31)
}

function matchesItemFilters(
  itemData: { id?: string | number; name?: string },
  filters: MarketFilters
): boolean {
  if (filters.search) {
    const query = filters.search.toLowerCase() // text-ok: UI text display localization string
    if (!itemData.name?.toLowerCase().includes(query)) return false
  }

  if (filters.itemCat !== 'all') {
    const key = itemData.id ? String(itemData.id) : (itemData.name || null) // domain-ok: Open dynamic text or non-domain string payload
    try {
      const shopItem = key ? getItemById(key) : null
      if (shopItem?.cat !== filters.itemCat) return false
    } catch {
      return false
    }
  }

  return true
}

export function applyMarketFilters(
  list: MarketListing[], 
  filters: MarketFilters, 
  context: MarketViewContext, 
  options: { getPokemonTier?: (offer: Pokemon) => { tier: string } } = {}
): MarketListing[] {
  const { getPokemonTier } = options

  return list.filter(item => {
    if (!matchesExploreListingTypeAndPrice(item, filters, context)) return false

    if (item.listing_type === 'pokemon') {
      return matchesPokemonFilters(item.data, filters, getPokemonTier)
    }

    return matchesItemFilters(item.data, filters)
  })
}
