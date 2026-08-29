import { computed, type Ref } from 'vue'
import { getItemById } from '@/data/inventory/items'
import type { useGameStore } from '@/stores/game'
import type { useGTSStore } from '@/stores/gts'
import type { MarketListing } from '@/logic/economy/market'
import type { SortOrder, ItemSortKey } from '@/types/system/game'
import type { ItemTier } from '@/types/inventory/items'

export interface InventoryItem {
  id: string
  name: string
  qty: number
  desc: string
  price: number
  tier: ItemTier
}

export function useMarketPublishInventory(
  game: ReturnType<typeof useGameStore>,
  gtsStore: ReturnType<typeof useGTSStore>,
  itemSearchQuery: Ref<string>,
  itemSortKey: Ref<ItemSortKey>,
  itemSortOrder: Ref<SortOrder>
) {
  const inventory = computed<InventoryItem[]>(() => {
    return Object.entries(game.state.inventory as Record<string, number>) // open-record
      .filter(([_name, qty]) => qty > 0)
      .map(([name, qty]) => {
        const dbItem = getItemById(name)
        return {
          id: dbItem?.id ?? name.toLowerCase().replace(/\s+/g, '_'),
          name: dbItem?.name ?? name,
          qty,
          desc: dbItem?.desc ?? 'Objeto sin descripción.',
          price: dbItem?.price || 0,
          tier: (dbItem?.tier as ItemTier) || 'common'
        }
      })
  })

  const gtsStatsMap = computed(() => {
    const map: Record<string, { min: number; max: number; avg: number }> = {}
    type ItemListing = Extract<MarketListing, { listing_type: 'item' }>
    const itemListings = gtsStore.listings.filter((l): l is ItemListing => l.listing_type === 'item')

    const grouped: Record<string, number[]> = {}
    for (const listing of itemListings) {
      const nameStr = listing.data.name || listing.data.id
      if (!nameStr) continue
      const itemId = String(nameStr)
      const qty = Number(listing.data.qty) || 1
      const unitPrice = listing.price / qty

      if (!grouped[itemId]) {
        grouped[itemId] = []
      }
      grouped[itemId].push(unitPrice)
    }

    for (const [itemId, prices] of Object.entries(grouped)) {
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
      map[itemId] = { min, max, avg }
    }

    return map
  })

  const filteredAndSortedInventory = computed(() => {
    let list = [...inventory.value]

    if (itemSearchQuery.value.trim()) {
      const q = itemSearchQuery.value.toLowerCase().trim()
      list = list.filter(item => item.name.toLowerCase().includes(q))
    }

    list.sort((a, b) => {
      let comparison = 0
      if (itemSortKey.value === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (itemSortKey.value === 'price') {
        comparison = (a.price || 0) - (b.price || 0)
      } else if (itemSortKey.value === 'rarity') {
        const tierMap = { common: 0, rare: 1, epic: 2, legend: 3 }
        comparison = (tierMap[a.tier || 'common'] || 0) - (tierMap[b.tier || 'common'] || 0)
      }

      return itemSortOrder.value === 'asc' ? comparison : -comparison
    })

    return list
  })

  return {
    inventory,
    gtsStatsMap,
    filteredAndSortedInventory
  }
}
