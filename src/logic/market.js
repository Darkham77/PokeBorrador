import { getPokemonTier } from '@/logic/pokemon/tierEngine.js';

/**
 * Core business logic for the Online Market (GTS).
 */

export function ensureMarketSoldSeenState(state) {
  if (!Array.isArray(state.marketSoldSeenIds)) state.marketSoldSeenIds = [];
  state.marketSoldSeenIds = [...new Set(
    state.marketSoldSeenIds
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
  )].slice(-250);
  return state.marketSoldSeenIds;
}

export function isMarketSoldSeen(listingId, state) {
  if (!listingId) return true;
  return ensureMarketSoldSeenState(state).includes(listingId);
}

export function markMarketSoldSeen(listingId, state) {
  if (!listingId) return;
  const seen = ensureMarketSoldSeenState(state);
  if (seen.includes(listingId)) return;
  seen.push(listingId);
  state.marketSoldSeenIds = seen.slice(-250);
}

export function buildMarketSaleLabel(listing) {
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
export function applyMarketFilters(list, filters, context, options = {}) {
  const { getPokemonTier, SHOP_ITEMS } = options;
  
  return list.filter(item => {
    const offer = item.data || item;
    const listingType = item.listing_type || (filters.mode || 'pokemon');
    const price = item.price || 0;

    // Base filter: Mode (Pokemon vs Items)
    if (context === 'explore' && listingType !== filters.mode) return false;

    // Price
    if (context === 'explore') {
      if (price < filters.priceMin || price > filters.priceMax) return false;
    }

    // Search
    if (filters.search && !offer.name.toLowerCase().includes(filters.search.toLowerCase())) return false;

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
      const total = (ivs.hp||0)+(ivs.atk||0)+(ivs.def||0)+(ivs.spa||0)+(ivs.spd||0)+(ivs.spe||0);
      if (total < filters.ivTotalMin || total > filters.ivTotalMax) return false;
      if (filters.ivAny31 && !Object.values(ivs).some(v => v === 31)) return false;
    } else {
      // Item Category
      if (filters.itemCat !== 'all') {
        const shopItem = SHOP_ITEMS?.find(x => x.name === offer.name);
        if (shopItem?.cat !== filters.itemCat) return false;
      }
    }

    return true;
  });
}

/**
 * Validates and executes a purchase.
 */
export async function buyFromMarket(sb, offerId, price, type, state, buyerId) {
  if (!sb || !buyerId || state.money < price) return { success: false, reason: 'Invalido' };
  
  try {
    const { data, error } = await sb
      .from('market_listings')
      .update({ status: 'sold', buyer_id: buyerId })
      .eq('id', offerId)
      .eq('status', 'active')
      .select();

    if (error || !data?.length) return { success: false, reason: 'No disponible' };

    state.money -= price;
    if (type === 'pokemon') {
      state.box.push(data[0].data);
    } else {
      const i = data[0].data;
      state.inventory[i.name] = (state.inventory[i.name] || 0) + i.qty;
    }
    
    return { success: true, data: data[0] };
  } catch (e) {
    console.error(e);
    return { success: false, reason: 'Error de servidor' };
  }
}
