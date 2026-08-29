import { ref, watch, computed, type Ref } from 'vue'
import { getItemById } from '@/data/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { InventoryItem } from './useMarketPublishInventory.ts'
import type { useGTSStore } from '@/stores/gts'

const DEFAULT_MARKET_LISTING_PRICE = 1000;
const MARKET_SUGGESTED_PRICE_RATIO = 0.5;

export function useMarketPublishActions(
  gtsStore: ReturnType<typeof useGTSStore>,
  activeMode: Ref<'pokemon' | 'item'>
) {
  const selection = ref<Pokemon | InventoryItem | null>(null)
  const price = ref(DEFAULT_MARKET_LISTING_PRICE)
  const itemQty = ref(1)

  function updateSuggestedPrice() {
    if (activeMode.value === 'item' && selection.value && 'qty' in selection.value) {
      const nameStr = selection.value.id
      const shopItem = getItemById(nameStr)
      if (shopItem && shopItem.price > 0) {
        price.value = Math.floor(shopItem.price * MARKET_SUGGESTED_PRICE_RATIO) * itemQty.value
      } else {
        price.value = DEFAULT_MARKET_LISTING_PRICE
      }
    } else {
      price.value = DEFAULT_MARKET_LISTING_PRICE
    }
  }

  watch(itemQty, () => {
    updateSuggestedPrice()
  })

  function selectItem(item: Pokemon | InventoryItem) {
    selection.value = item
    if ('qty' in item) {
      itemQty.value = 1
    }
    updateSuggestedPrice()
  }

  async function handlePublish() {
    if (!selection.value || price.value < 1) return

    const publishData = activeMode.value === 'item' && 'qty' in selection.value
      ? { name: selection.value.id, qty: itemQty.value }
      : selection.value

    const success = await gtsStore.publishListing(activeMode.value, publishData, price.value)
    if (success) {
      selection.value = null
      price.value = DEFAULT_MARKET_LISTING_PRICE
      itemQty.value = 1
    }
  }

  const fee = computed(() => Math.floor(price.value * gtsStore.MARKET_FEE))
  const net = computed(() => price.value - fee.value)

  return {
    selection,
    price,
    itemQty,
    selectItem,
    handlePublish,
    fee,
    net
  }
}
