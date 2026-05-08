
/**
 * Core business logic for the Online Market (GTS).
 */

export interface MarketListing {
  id: string;
  listing_type: 'pokemon' | 'item';
  price: number;
  data: any;
  seller_id: string;
  created_at: string;
}

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

export function ensureMarketSoldSeenState(state: any): string[] {
  if (!Array.isArray(state.marketSoldSeenIds)) state.marketSoldSeenIds = [];
  state.marketSoldSeenIds = [...new Set(
    (state.marketSoldSeenIds as string[])
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
  )].slice(-250);
  return state.marketSoldSeenIds;
}

export function isMarketSoldSeen(listingId: string, state: any): boolean {
  if (!listingId) return true;
  return ensureMarketSoldSeenState(state).includes(listingId);
}

export function markMarketSoldSeen(listingId: string, state: any): void {
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
  const qty = Math.max(1, parseInt(listing.data?.qty, 10) || 1);
  const itemName = listing.data?.name || 'objeto';
  return `tu objeto ${itemName} x${qty}`;
}

/**
 * Filter market listings based on search, tier, type, etc.
 */
export function applyMarketFilters(list: MarketListing[], filters: MarketFilters, context: 'explore' | 'my-listings', options: any = {}): MarketListing[] {
  const { getPokemonTier, SHOP_ITEMS } = options;
  
  return list.filter(item => {
    const offer = item.data || item;
    const listingType = item.listing_type || (filters.mode || 'pokemon');
    const price = item.price || 0;

    // filter: Mode (Pokemon vs Items)
    if (context === 'explore' && listingType !== filters.mode) return false;

    // Price
    if (context === 'explore') {
      if (price < filters.priceMin || price > filters.priceMax) return false;
    }

    // Search
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const nameMatch = offer.name?.toLowerCase().includes(query);
      const nickMatch = offer.nickname?.toLowerCase().includes(query);
      if (!nameMatch && !nickMatch) return false;
    }

    if (listingType === 'pokemon') {
      // Tier
      if (filters.tier !== 'all') {
        const { tier } = typeof getPokemonTier === 'function' ? getPokemonTier(offer) : { tier: '?' };
        if (tier !== filters.tier) return false;
      }
      // Type
      if (filters.type !== 'all' && offer.type !== filters.type) return false;
      // Level
      if ((offer.level||1) < filters.levelMin || (offer.level||1) > filters.levelMax) return false;
      // IVs
      const ivs = offer.ivs || {};
      const total = (Number(ivs.hp)||0)+(Number(ivs.atk)||0)+(Number(ivs.def)||0)+(Number(ivs.spa)||0)+(Number(ivs.spd)||0)+(Number(ivs.spe)||0);
      if (total < filters.ivTotalMin || total > filters.ivTotalMax) return false;
      if (filters.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false;
    } else {
      // Item Category
      if (filters.itemCat !== 'all') {
        const shopItem = (SHOP_ITEMS as any[])?.find(x => x.name === offer.name);
        if (shopItem?.cat !== filters.itemCat) return false;
      }
    }

    return true;
  });
}
