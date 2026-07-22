import { ref, watch, computed, type Ref } from 'vue'
import { SHOP_ITEMS } from '@/data/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { InventoryItem } from './useMarketPublishInventory'
import type { useGTSStore } from '@/stores/gts'

export function useMarketPublishActions(
  gtsStore: ReturnType<typeof useGTSStore>,
  activeMode: Ref<'pokemon' | 'item'>
) {
  const selection = ref<Pokemon | InventoryItem | null>(null)
  const price = ref(1000)
  const itemQty = ref(1)

  function updateSuggestedPrice() {
    if (activeMode.value === 'item' && selection.value && 'qty' in selection.value) {
      const nameStr = selection.value.id
      const shopItem = SHOP_ITEMS.find(i => i.id === nameStr || i.name === nameStr)
      if (shopItem && shopItem.price > 0) {
        price.value = Math.floor(shopItem.price * 0.5) * itemQty.value
      } else {
        price.value = 1000
      }
    } else {
      price.value = 1000
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
      price.value = 1000
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
