import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';

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

export { applyMarketFilters } from './marketFilters.ts';

