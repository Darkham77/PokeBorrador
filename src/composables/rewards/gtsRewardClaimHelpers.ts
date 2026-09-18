/**
 * src/composables/rewards/gtsRewardClaimHelpers.ts
 *
 * Helpers for resolving and building GTS and direct trade claim reward items.
 */

import { ref } from 'vue'
import type { useGTSStore } from '@/stores/gts'
import type { useGameStore } from '@/stores/game'
import { logger } from '@/logic/utils/logger'
import { buildRewardPills } from './rewardsPillExtractor.ts'
import type { UnifiedRewardItem } from '@/types/rewards/rewards'
import type { MarketListing } from '@/logic/economy/market'
import type { ClaimItem } from '@/types/system/game'

const DEFAULT_ITEM_QTY = 1 as const

const gtsListingsCache = ref<Map<string, MarketListing>>(new Map())

interface ListingRecord {
  id: unknown
  listing_type?: string
  data?: unknown
}

interface SoldItemData {
  name?: string
  qty?: number
}

interface SoldPokemonData {
  name?: string
  level?: number
  isShiny?: boolean
}

interface GtsClaimDetails {
  prizeObj: Record<string, unknown>
  assetTitle: string
  assetSubtitle: string
  categoryBadge?: { icon: string; name: string }
}

async function fetchMissingGtsListing(sourceId: string, gameStore: ReturnType<typeof useGameStore>): Promise<void> {
  if (!gameStore.db || gtsListingsCache.value.has(sourceId)) return
  try {
    const numId = Number(sourceId)
    const { data } = await gameStore.db
      .from('market_listings')
      .select('*')
      .eq('id', isNaN(numId) ? sourceId : numId)
      .maybeSingle()
    if (data) {
      const nextMap = new Map(gtsListingsCache.value)
      nextMap.set(sourceId, data as MarketListing)
      gtsListingsCache.value = nextMap
    }
  } catch (err) {
    logger.warn('[gtsRewardClaimHelpers] Error cargando market_listing en cache:', err)
  }
}

function findMatchingListing(
  sourceId: string,
  salesHistory: readonly ListingRecord[],
  myListings: readonly ListingRecord[]
): ListingRecord | MarketListing | undefined {
  if (!sourceId) return undefined
  return (
    (salesHistory || []).find(s => String(s.id) === sourceId) ||
    (myListings || []).find(s => String(s.id) === sourceId) ||
    gtsListingsCache.value.get(sourceId)
  )
}

function extractSoldAssets(
  asset: ClaimItem['asset_data'],
  matchingSale?: ListingRecord | MarketListing
): { soldItem?: SoldItemData; soldPokemon?: SoldPokemonData } {
  const soldItem =
    asset.sold_item ||
    (matchingSale?.listing_type === 'item' ? (matchingSale.data as SoldItemData) : undefined)
  const soldPokemon =
    asset.sold_pokemon ||
    (matchingSale?.listing_type === 'pokemon' ? (matchingSale.data as SoldPokemonData) : undefined)
  return { soldItem, soldPokemon }
}

function buildGtsMoneyPresentation(
  isGts: boolean,
  soldItem?: SoldItemData,
  soldPokemon?: SoldPokemonData
): { assetTitle: string; assetSubtitle: string; categoryBadge: { icon: string; name: string } } {
  if (soldItem?.name) {
    return {
      assetTitle: isGts ? 'Venta de Ítems por GTS' : 'Venta de Ítems por Intercambio',
      assetSubtitle: isGts ? 'Transacción en el Mercado Global' : 'Intercambio directo entre entrenadores',
      categoryBadge: { icon: '📦', name: 'Objeto' }
    }
  }
  if (soldPokemon?.name) {
    return {
      assetTitle: isGts ? 'Venta de Pokémon por GTS' : 'Venta de Pokémon por Intercambio',
      assetSubtitle: isGts ? 'Transacción en el Mercado Global' : 'Intercambio directo entre entrenadores',
      categoryBadge: { icon: '🐣', name: 'Pokémon' }
    }
  }
  if (isGts) {
    return {
      assetTitle: 'Venta por GTS',
      assetSubtitle: 'Transacción en el Mercado Global',
      categoryBadge: { icon: '💰', name: 'Ganancia' }
    }
  }
  return {
    assetTitle: 'Cobro de Intercambio',
    assetSubtitle: 'Intercambio directo entre entrenadores',
    categoryBadge: { icon: '🤝', name: 'Intercambio' }
  }
}

function resolveGtsMoneyDetails(
  claim: ClaimItem,
  rawAmount: unknown,
  salesHistory: readonly ListingRecord[],
  myListings: readonly ListingRecord[],
  gameStore: ReturnType<typeof useGameStore>
): GtsClaimDetails {
  const asset = claim.asset_data
  const amount =
    typeof asset.data === 'number'
      ? asset.data
      : typeof rawAmount === 'number'
        ? Number(rawAmount)
        : 0
  const prizeObj: Record<string, unknown> = { money: amount }

  const sourceId = claim.source_id ? String(claim.source_id) : ''
  const matchingSale = findMatchingListing(sourceId, salesHistory, myListings)

  if (!matchingSale && !asset.sold_item && !asset.sold_pokemon && sourceId && gameStore.db) {
    void fetchMissingGtsListing(sourceId, gameStore)
  }

  const { soldItem, soldPokemon } = extractSoldAssets(asset, matchingSale)
  if (soldItem?.name) prizeObj.sold_item = soldItem
  if (soldPokemon?.name) prizeObj.sold_pokemon = soldPokemon

  const isGts = claim.source_type === 'gts'
  const presentation = buildGtsMoneyPresentation(isGts, soldItem, soldPokemon)

  return {
    prizeObj,
    ...presentation
  }
}

function resolveGtsItemDetails(claim: ClaimItem): GtsClaimDetails {
  const asset = claim.asset_data
  const itemData = asset.data as SoldItemData | undefined
  const itemId = itemData?.name
  const qty = itemData?.qty && itemData.qty > 0 ? itemData.qty : DEFAULT_ITEM_QTY
  const prizeObj: Record<string, unknown> = itemId ? { [itemId]: qty } : {}

  if (claim.source_type === 'gts_cancel') {
    return {
      prizeObj,
      assetTitle: 'Devolución de Oferta GTS',
      assetSubtitle: 'Publicación retirada del Mercado Global',
      categoryBadge: { icon: '📦', name: 'Objeto' }
    }
  }
  if (claim.source_type === 'gts') {
    return {
      prizeObj,
      assetTitle: 'Compra de Ítems por GTS',
      assetSubtitle: 'Transacción en el Mercado Global',
      categoryBadge: { icon: '📦', name: 'Objeto' }
    }
  }
  return {
    prizeObj,
    assetTitle: 'Recepción por Intercambio',
    assetSubtitle: 'Intercambio directo entre entrenadores',
    categoryBadge: { icon: '🤝', name: 'Intercambio' }
  }
}

function resolveGtsPokemonDetails(claim: ClaimItem): GtsClaimDetails {
  const asset = claim.asset_data
  const pokeData = asset.data as { id?: number; name?: string; level?: number; isShiny?: boolean } | undefined
  const pokeName = pokeData?.name ? pokeData.name : 'Pokémon'
  const prizeObj: Record<string, unknown> = { pokemon: pokeName }

  if (claim.source_type === 'gts_cancel') {
    return {
      prizeObj,
      assetTitle: 'Devolución de Pokémon GTS',
      assetSubtitle: 'Publicación retirada del Mercado Global',
      categoryBadge: { icon: '🐣', name: 'Pokémon' }
    }
  }
  if (claim.source_type === 'gts') {
    return {
      prizeObj,
      assetTitle: 'Compra de Pokémon por GTS',
      assetSubtitle: 'Transacción en el Mercado Global',
      categoryBadge: { icon: '🐣', name: 'Pokémon' }
    }
  }
  return {
    prizeObj,
    assetTitle: 'Recepción por Intercambio',
    assetSubtitle: 'Intercambio directo entre entrenadores',
    categoryBadge: { icon: '🤝', name: 'Intercambio' }
  }
}

function resolveClaimDetails(
  claim: ClaimItem,
  gtsStore: ReturnType<typeof useGTSStore>,
  gameStore: ReturnType<typeof useGameStore>
): GtsClaimDetails {
  const asset = claim.asset_data
  const rawClaim = claim as { asset_type?: string }
  const assetType = asset.type || (typeof rawClaim.asset_type === 'string' ? rawClaim.asset_type : undefined)
  const rawAmount = (asset as { amount?: number }).amount

  if (assetType === 'money' || typeof rawAmount === 'number') {
    return resolveGtsMoneyDetails(claim, rawAmount, gtsStore.salesHistory, gtsStore.myListings, gameStore)
  }
  if (assetType === 'item') {
    return resolveGtsItemDetails(claim)
  }
  if (assetType === 'pokemon') {
    return resolveGtsPokemonDetails(claim)
  }
  return {
    prizeObj: {},
    assetTitle: 'Recompensa',
    assetSubtitle: 'Reclamo pendiente'
  }
}

export function buildGtsClaimRewardItems(
  claimQueue: readonly ClaimItem[],
  gtsStore: ReturnType<typeof useGTSStore>,
  gameStore: ReturnType<typeof useGameStore>
): UnifiedRewardItem[] {
  const items: UnifiedRewardItem[] = []
  for (const claim of claimQueue) {
    if (!claim.asset_data) continue

    const details = resolveClaimDetails(claim, gtsStore, gameStore)
    const pills = buildRewardPills(details.prizeObj, `gts-${claim.id}`)

    items.push({
      id: `gts-${claim.id}`,
      source: 'gts_claim',
      title: details.assetTitle,
      subtitle: details.assetSubtitle,
      categoryBadge: details.categoryBadge,
      isClaimable: true,
      prize: details.prizeObj,
      pills,
      rawData: claim.id
    })
  }
  return items
}
