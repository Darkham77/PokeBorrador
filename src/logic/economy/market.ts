import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import { hasMaxIV } from '@/logic/pokemon/statsMath.ts';
import { getItemById } from '@/data/inventory/items.ts';

export const GTS_ITEMS_PER_PAGE = 50 as const;
export const GTS_MAX_ACTIVE_LISTINGS = 10 as const;
export const GTS_MARKET_FEE = 0.05 as const;
export const GTS_EXPLORE_LISTINGS_LIMIT = 100 as const;
export const GTS_SALES_HISTORY_LIMIT = 20 as const;

export interface MarketItemData {
  id?: string | number;
  name?: string;
  qty?: number;
}

interface MarketListingBase {
  id: string;
  seller_name?: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled' | 'expired';
  seller_id: string;
  created_at: string;
}

export type MarketListingType = 'pokemon' | 'item';
export type MarketAssetType = 'pokemon' | 'item' | 'money';

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
    (state.marketSoldSeenIds)
      .filter((id: string) => typeof id === 'string' && id.trim().length > 0 && !id.includes('invalid'))
  )].slice(-MAX_MARKET_SOLD_SEEN_HISTORY);
  return state.marketSoldSeenIds;
}

function getMarketSoldSeenSet(state: GameState): Set<string> {
  let cached = MARKET_SOLD_SEEN_CACHE.get(state);
  if (!cached) {
    const ids = ensureMarketSoldSeenState(state);
    cached = new Set<string>(ids); // runtime-set
    MARKET_SOLD_SEEN_CACHE.set(state, cached);
  }
  return cached;
}

export function isMarketSoldSeen(listingId: string, state: GameState): boolean {
  if (!listingId) return true;
  return getMarketSoldSeenSet(state).has(listingId);
}

export function markMarketSoldSeen(listingId: string, state: GameState): void {
  if (!listingId) return;
  const set = getMarketSoldSeenSet(state);
  if (set.has(listingId)) return;
  set.add(listingId);
  const seen = ensureMarketSoldSeenState(state);
  seen.push(listingId);
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
export function applyMarketFilters(
  list: MarketListing[], 
  filters: MarketFilters, 
  context: 'explore' | 'my-listings', 
  options: { getPokemonTier?: (offer: Pokemon) => { tier: string } } = {}
): MarketListing[] {
  const { getPokemonTier } = options;
  
  return list.filter(item => {
    const price = item.price || 0;

    // filter: Mode (Pokemon vs Items)
    if (context === 'explore' && item.listing_type !== filters.mode) return false;

    // Price
    if (context === 'explore') {
      if (price < filters.priceMin || price > filters.priceMax) return false;
    }

    if (item.listing_type === 'pokemon') {
      const poke = item.data;

      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase(); // text-ok
        const nameMatch = poke.name?.toLowerCase().includes(query);
        const nickMatch = poke.nickname?.toLowerCase().includes(query);
        if (!nameMatch && !nickMatch) return false;
      }

      // Tier
      if (filters.tier !== 'all') {
        const { tier } = typeof getPokemonTier === 'function' ? getPokemonTier(poke) : { tier: '?' };
        if (tier !== filters.tier) return false;
      }
      // Type
      if (filters.type !== 'all' && poke.type !== filters.type) return false;
      // Level
      if ((poke.level||1) < filters.levelMin || (poke.level||1) > filters.levelMax) return false;
      // IVs
      const ivs = poke.ivs;
      const total = (Number(ivs?.hp)||0)+(Number(ivs?.atk)||0)+(Number(ivs?.def)||0)+(Number(ivs?.spa)||0)+(Number(ivs?.spd)||0)+(Number(ivs?.spe)||0);
      if (total < filters.ivTotalMin || total > filters.ivTotalMax) return false;
      if (filters.ivAny31 && !hasMaxIV(ivs)) return false;
    } else {
      const itemData = item.data;

      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase(); // text-ok
        if (!itemData.name?.toLowerCase().includes(query)) return false;
      }

      // Item Category
      if (filters.itemCat !== 'all') {
        const key = itemData.name || (itemData.id ? String(itemData.id) : null);
        try {
          const shopItem = key ? getItemById(key) : null;
          if (shopItem?.cat !== filters.itemCat) return false;
        } catch {
          return false;
        }
      }
    }

    return true;
  });
}
