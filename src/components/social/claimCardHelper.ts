import { getItemById } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ClaimItem } from '@/types/system/game'
import type { MarketListing } from '@/logic/economy/market'

export interface PokemonAssetData {
  readonly id: number
  readonly name: string
  readonly level: number
}

export interface ItemAssetData {
  readonly name: string
  readonly qty: number
}

function formatDirectSoldAsset(assetData: ClaimItem['asset_data']): string | null {
  const soldItem = assetData.sold_item
  if (soldItem?.name) {
    const dbItem = getItemById(soldItem.name)
    const name = dbItem?.name || soldItem.name
    const qtySuffix = soldItem.qty && soldItem.qty > 1 ? ` x${soldItem.qty}` : ''
    return `Venta: ${name}${qtySuffix}`
  }

  const soldPoke = assetData.sold_pokemon
  if (soldPoke?.name) {
    const lvlSuffix = soldPoke.level ? ` (Nv. ${soldPoke.level})` : ''
    return `Venta: ${soldPoke.name}${lvlSuffix}`
  }

  return null
}

function formatHistorySale(sale: MarketListing): string | null {
  if (sale.listing_type === 'item') {
    const itemData = sale.data as { name?: string; qty?: number }
    const dbItem = getItemById(itemData.name || '')
    const name = dbItem?.name || itemData.name || 'Artículo'
    const qtySuffix = itemData.qty && itemData.qty > 1 ? ` x${itemData.qty}` : ''
    return `Venta: ${name}${qtySuffix}`
  }
  if (sale.listing_type === 'pokemon') {
    const pokeData = sale.data as { name?: string; level?: number }
    const lvlSuffix = pokeData.level ? ` (Nv. ${pokeData.level})` : ''
    return `Venta: ${pokeData.name || 'Pokémon'}${lvlSuffix}`
  }
  return null
}

export function formatSoldDetails(
  claim: ClaimItem,
  salesHistory?: readonly MarketListing[]
): string | null {
  if (claim.asset_data.type !== 'money') return null

  const direct = formatDirectSoldAsset(claim.asset_data)
  if (direct) return direct

  if (salesHistory && salesHistory.length > 0) {
    const matchingSale = salesHistory.find(s => String(s.id) === String(claim.source_id))
    if (matchingSale) {
      return formatHistorySale(matchingSale)
    }
  }

  return null
}

export function getFriendlySourceType(sourceType: string): string {
  switch (sourceType) {
    case 'trade':
      return 'Intercambio'
    case 'gts':
      return 'Mercado GTS'
    case 'gts_cancel':
      return 'Cancelación GTS'
    default:
      return sourceType
  }
}

export function getClaimAssetIcon(asset: ClaimItem['asset_data']): string {
  if (asset.type === 'money') {
    return getAssetUrl(ASSET_TYPES.ITEM, 'nugget')
  }
  if (asset.type === 'item') {
    const itemData = asset.data as ItemAssetData
    const dbItem = getItemById(itemData.name)
    const slug = dbItem ? (dbItem.sprite || dbItem.id) : itemData.name
    return getAssetUrl(ASSET_TYPES.ITEM, slug)
  }
  return getAssetUrl(ASSET_TYPES.ITEM, 'pokeball')
}

export function getClaimSpriteUrl(id: string | number): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, id)
}
