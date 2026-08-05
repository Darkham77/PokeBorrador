import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';

export const GTS_ITEMS_PER_PAGE = 50 as const;
export const GTS_MAX_ACTIVE_LISTINGS = 10 as const;

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

export type MarketListing =
  | (MarketListingBase & { listing_type: 'pokemon'; data: Pokemon })
  | (MarketListingBase & { listing_type: 'item'; data: MarketItemData });


export interface MarketFilters {
  mode: 'pokemon' | 'item';
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

export function ensureMarketSoldSeenState(state: GameState): string[] {
  if (!Array.isArray(state.marketSoldSeenIds)) state.marketSoldSeenIds = [];
  state.marketSoldSeenIds = [...new Set(
    (state.marketSoldSeenIds)
      .filter((id: string) => typeof id === 'string' && id.trim().length > 0 && !id.includes('invalid'))
  )].slice(-250);
  return state.marketSoldSeenIds;
}

export function isMarketSoldSeen(listingId: string, state: GameState): boolean {
  if (!listingId) return true;
  return ensureMarketSoldSeenState(state).includes(listingId);
}

export function markMarketSoldSeen(listingId: string, state: GameState): void {
  if (!listingId) return;
  const seen = ensureMarketSoldSeenState(state);
  if (seen.includes(listingId)) return;
  seen.push(listingId);
  state.marketSoldSeenIds = seen.slice(-250);
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
  options: { getPokemonTier?: (offer: Pokemon) => { tier: string }, SHOP_ITEMS?: { name: string; cat: string }[] } = {}
): MarketListing[] {
  const { getPokemonTier, SHOP_ITEMS } = options;
  
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
      if (filters.ivAny31 && !Object.values(ivs ?? {}).some(v => v === 31)) return false;
    } else {
      const itemData = item.data;

      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase(); // text-ok
        if (!itemData.name?.toLowerCase().includes(query)) return false;
      }

      // Item Category
      if (filters.itemCat !== 'all') {
        const shopItem = SHOP_ITEMS?.find(x => x.name === itemData.name);
        if (shopItem?.cat !== filters.itemCat) return false;
      }
    }

    return true;
  });
}
