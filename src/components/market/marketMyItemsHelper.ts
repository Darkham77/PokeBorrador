/**
 * src/components/market/marketMyItemsHelper.ts
 *
 * Helpers and data transformations for Market My Items view.
 */

import type { MarketListingType } from '@/logic/economy/market'
import type { ClaimItem } from '@/types/system/game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemById } from '@/data/inventory/items'

export interface MarketHistoryRow {
  id: string | number
  seller_id: string
  seller_name?: string
  listing_type: MarketListingType
  data: unknown
  price: number
  status: string
  created_at: string
}

export function parseSaleData(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown> // open-record: Generic key-value data dictionary container
    } catch {
      return {}
    }
  }
  return typeof data === 'object' ? (data as Record<string, unknown>) : {} // open-record: Generic key-value data dictionary container
}

export function getSoldItemName(sale: MarketHistoryRow): string {
  const data = parseSaleData(sale.data)
  if (sale.listing_type === 'pokemon') {
    const pokeName = (data.name as string) || (data.id as string) || 'Pokémon'
    const isShiny = Boolean(data.shiny || data.isShiny)
    const level = data.level ? ` (Nv. ${data.level})` : ''
    return `${pokeName}${level}${isShiny ? ' ✨' : ''}`
  }
  const itemName = (data.name as string) || 'Objeto'
  const found = getItemById(itemName)
  const qty = typeof data.qty === 'number' && data.qty > 1 ? ` x${data.qty}` : ''
  return `${found?.name || itemName}${qty}`
}

export function getSaleVisual(sale: MarketHistoryRow): {
  type: MarketListingType
  url: string
  fallbackUrl: string
} {
  const data = parseSaleData(sale.data)
  if (sale.listing_type === 'pokemon') {
    const species = (data.id as string) || (data.name as string) || 'pikachu'
    const isShiny = Boolean(data.shiny || data.isShiny)
    return {
      type: 'pokemon',
      url: getAssetUrl(ASSET_TYPES.POKEMON, species, { isShiny }),
      fallbackUrl: getAssetUrl(ASSET_TYPES.POKEMON, 'pikachu')
    }
  }
  const rawName = (data.name as string) || 'potion'
  const found = getItemById(rawName)
  const spriteId = found?.sprite || found?.id || rawName
  return {
    type: 'item',
    url: getAssetUrl(ASSET_TYPES.ITEM, spriteId),
    fallbackUrl: getAssetUrl(ASSET_TYPES.ITEM, 'potion')
  }
}

export function isPurchaseRow(sale: MarketHistoryRow, claim?: ClaimItem): boolean {
  if (claim && claim.asset_data?.type !== 'money') return true
  return sale.status === 'purchased'
}

export function getSaleAmount(sale: MarketHistoryRow, claim: ClaimItem | undefined, marketFee: number): number {
  if (claim && typeof claim.asset_data?.data === 'number') {
    return claim.asset_data.data
  }
  return Math.floor(sale.price * (1 - marketFee))
}

const ZERO_PRICE = 0 as const;
const ZERO_AMOUNT = 0 as const;

function createSoldClaimHistoryRow(claim: ClaimItem, marketFee: number): MarketHistoryRow {
  const soldItem = claim.asset_data?.sold_item;
  const soldPoke = claim.asset_data?.sold_pokemon;
  const listingType: MarketListingType = soldPoke ? 'pokemon' : 'item';
  const data = soldPoke || soldItem || { name: 'Venta GTS' };
  const amount = typeof claim.asset_data?.data === 'number' ? claim.asset_data.data : ZERO_AMOUNT;
  return {
    id: claim.source_id || claim.id,
    seller_id: (claim as { user_id?: string }).user_id || '',
    seller_name: '',
    listing_type: listingType,
    data,
    price: Math.round(amount / (1 - marketFee)),
    status: 'sold',
    created_at: claim.created_at || Temporal.Now.instant().toString(),
  };
}

function createPurchasedClaimHistoryRow(claim: ClaimItem): MarketHistoryRow {
  const isPokemon = claim.asset_data?.type === 'pokemon';
  const listingType: MarketListingType = isPokemon ? 'pokemon' : 'item';
  const data = claim.asset_data?.data || { name: isPokemon ? 'Pokémon' : 'Objeto' };
  return {
    id: claim.source_id || claim.id,
    seller_id: (claim as { user_id?: string }).user_id || '',
    seller_name: '',
    listing_type: listingType,
    data,
    price: ZERO_PRICE,
    status: 'purchased',
    created_at: claim.created_at || Temporal.Now.instant().toString(),
  };
}

export function buildDisplayHistory(
  history: readonly MarketHistoryRow[],
  allPendingGtsClaims: readonly ClaimItem[],
  claimsBySaleId: Map<string, ClaimItem>,
  marketFee: number,
): MarketHistoryRow[] {
  const list: MarketHistoryRow[] = [...history];
  const matchedClaimIds = new Set<string | number>();

  for (const sale of list) {
    const claim = claimsBySaleId.get(String(sale.id));
    if (claim) {
      matchedClaimIds.add(claim.id);
    }
  }

  for (const claim of allPendingGtsClaims) {
    if (matchedClaimIds.has(claim.id)) continue;
    const isMoney = claim.asset_data?.type === 'money';
    const item = isMoney
      ? createSoldClaimHistoryRow(claim, marketFee)
      : createPurchasedClaimHistoryRow(claim);
    list.unshift(item);
  }

  return list;
}
