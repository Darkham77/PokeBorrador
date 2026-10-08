import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { safeStorage } from '@/logic/utils/storage'
import { getItemById, type ItemId } from '@/data/inventory/items'
import { isGlobalItem } from '@/logic/providers/itemProvider.ts'
import type { Pokemon, PokemonStorageLocation } from '@/types/pokemon/pokemon'
import type { ItemEffectResult, BagMainTab, ItemDiscardAction } from '@/types/inventory/items'
import type { SortOrder, ItemSortKey } from '@/types/system/game'
import { executeUseItem } from '@/stores/inventory/inventoryUseAction.ts'
import {
  isEquippableHeldItem,
  isItemUsableOn as helperIsItemUsableOn,
  mapInventoryToItems,
  isItemUsableOutsideCombat,
  type Item
} from '@/stores/inventory/inventoryHelpers.ts'
import {
  calculateBagSellTotalGain,
  confirmBagSellAction,
  removeItemAction,
  addItemAction,
  sellItemAction,
  processBatchActionHandler,
  equipItemAction,
  unequipItemAction
} from '@/stores/inventory/inventoryActionHelpers.ts'

export type { Item }
export { isItemUsableOutsideCombat }

export const useInventoryStore = defineStore('inventory', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  // --- BAG STATE ---
  const bagSellMode = ref(false)
  const bagSellSelected = ref<Record<string, number>>({}) // { itemName: quantity }
  const activeMainTab = ref<BagMainTab>('productos')
  const activeCategory = ref(safeStorage.getItem('inventory_last_tab') || 'todos')
  const searchQuery = ref('')
  const currentSort = ref<ItemSortKey>('name')
  const currentSortOrder = ref<SortOrder>('asc')

  watch(activeCategory, (newVal) => {
    safeStorage.setItem('inventory_last_tab', newVal)
  })

  // --- GETTERS ---
  const bagItems = computed<Item[]>(() => {
    const inventory = gameStore.state.inventory || {}
    const isBattleActive = uiStore.isBattleActive
    let items = mapInventoryToItems(inventory, isBattleActive, activeMainTab.value)

    if (activeCategory.value === 'utilizables') {
      const target = uiStore.inventoryTarget
      if (target) {
        const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
        const pokemon = list[target.index]
        if (pokemon) {
          items = items.filter(item => {
            const dbItem = getItemById(item.id)
            if (isBattleActive && dbItem?.nonCombat) return false
            return helperIsItemUsableOn(item.id, pokemon)
          })
        }
      } else {
        items = items.filter(item => {
          if (!isItemUsableOutsideCombat(item)) return false
          if (isGlobalItem(item.id)) return true

          const isHeld = isEquippableHeldItem(item)
          if (isHeld) return (gameStore.state.team || []).length > 0

          const dbItem = getItemById(item.id)
          if (isBattleActive && dbItem?.nonCombat) return false

          return (gameStore.state.team || []).some((pokemon: Pokemon) => helperIsItemUsableOn(item.id, pokemon))
        })
      }
    }

    // Filter items first
    const result = items.filter(item => {
      if (item.qty <= 0) return false
      const resolvedCat = item.cat || 'otros'
      if (activeCategory.value !== 'todos' && activeCategory.value !== 'utilizables' && resolvedCat !== activeCategory.value) return false
      // Do not apply the global store searchQuery if a battle is active (to avoid sharing the filter with the battle modal)
      if (!isBattleActive && searchQuery.value && !item.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
      return true
    })

    // Sort items
    result.sort((a, b) => {
      let comp: number
      if (currentSort.value === 'price') {
        comp = (a.price || 0) - (b.price || 0)
      } else if (currentSort.value === 'rarity') {
        const tiers: Record<string, number> = { common: 0, rare: 1, epic: 2, legend: 3 }
        const aVal = tiers[a.tier || 'common'] ?? 0
        const bVal = tiers[b.tier || 'common'] ?? 0
        comp = bVal - aVal
      } else {
        comp = a.name.localeCompare(b.name)
      }
      return currentSortOrder.value === 'asc' ? comp : -comp
    })

    return result
  })

  // --- BAG ACTIONS ---
  function toggleBagSellMode() {
    bagSellMode.value = !bagSellMode.value
    bagSellSelected.value = {}
  }

  function toggleBagSellItem(itemId: ItemId, maxQty: number) {
    if (bagSellSelected.value[itemId]) {
      delete bagSellSelected.value[itemId]
    } else {
      bagSellSelected.value[itemId] = maxQty
    }
  }

  function updateBagSellQty(itemId: ItemId, qty: number | string, maxQty: number) {
    let q = typeof qty === 'string' ? parseInt(qty) : qty
    if (isNaN(q) || q < 1) q = 1
    if (q > maxQty) q = maxQty
    bagSellSelected.value[itemId] = q
  }

  function getBagSellTotalGain() {
    return calculateBagSellTotalGain(bagSellSelected.value)
  }

  function confirmBagSell() {
    const result = confirmBagSellAction(gameStore, bagSellSelected.value)
    if (result !== false) {
      toggleBagSellMode()
    }
    return result
  }

  function removeItem(itemId: ItemId, qty: number = 1) {
    removeItemAction(gameStore, itemId, qty)
  }

  function addItem(itemId: ItemId, qty: number = 1) {
    addItemAction(gameStore, itemId, qty)
  }

  function sellItem(itemId: ItemId, qty: number = 1) {
    sellItemAction(gameStore, itemId, qty)
  }

  async function processBatchAction(itemMap: Map<ItemId, number>, mode: ItemDiscardAction) {
    return processBatchActionHandler(gameStore, itemMap, mode)
  }

  // --- ITEM ACTIONS ---
  function useItem(itemId: ItemId, context: PokemonStorageLocation | null = null, index: number | null = null): ItemEffectResult {
    return executeUseItem(itemId, context, index)
  }

  function equipItem(itemId: ItemId, context: PokemonStorageLocation, index: number) {
    return equipItemAction(gameStore, itemId, context, index)
  }

  function unequipItem(context: PokemonStorageLocation, index: number) {
    return unequipItemAction(gameStore, context, index)
  }

  return {
    // Bag
    bagSellMode,
    bagSellSelected,
    activeMainTab,
    activeCategory,
    searchQuery,
    currentSort,
    currentSortOrder,
    bagItems,
    toggleBagSellMode,
    toggleBagSellItem,
    toggleBagSellSelect: toggleBagSellItem,
    updateBagSellQty,
    getBagSellTotalGain,
    confirmBagSell,
    // Items
    useItem,
    equipItem,
    unequipItem,
    addItem,
    removeItem,
    sellItem,
    processBatchAction
  }
})
