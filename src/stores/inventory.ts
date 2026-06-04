import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { safeStorage } from '@/logic/utils/storage'
import { SHOP_ITEMS } from '@/data/items'
import { isGlobalItem, getItemVirtualCategory } from '../logic/providers/itemProvider.ts'
import type { Pokemon } from '@/types/pokemon'
import type { ItemEffectResult } from '@/types/items'
import { executeUseItem } from './inventoryUseAction.ts'
import {
  resolveNormalizedName,
  findInventoryKey as helperFindInventoryKey,
  isItemUsableOn as helperIsItemUsableOn
} from './inventoryHelpers.ts'

export interface Item {
  name: string;
  qty: number;
  id: string;
  cat?: string;
  type?: string;
  sprite?: string;
  desc?: string;
  price?: number;
}

export function isItemUsableOutsideCombat(item: { id: string; cat?: string; type?: string } | null | undefined): boolean {
  if (!item) return false
  const cat = item.cat
  const type = item.type
  const id = item.id

  const valuables = ['nugget', 'pearl', 'big_pearl', 'stardust', 'star_piece']
  if (valuables.includes(id)) return false

  if (cat === 'pokeballs') return false

  if (id && id.toLowerCase().startsWith('tm')) return true

  if (
    cat === 'pociones' ||
    cat === 'stones' || type === 'stone' ||
    cat === 'held' || type === 'held' ||
    cat === 'booster' || type === 'booster' ||
    cat === 'utility' || type === 'usable' ||
    cat === 'breeding'
  ) {
    return true
  }

  return false
}

export const useInventoryStore = defineStore('inventory', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  // --- BAG STATE ---
  const bagSellMode = ref(false)
  const bagSellSelected = ref<Record<string, number>>({}) // { itemName: quantity }
  const activeCategory = ref(safeStorage.getItem('inventory_last_tab') || 'todos')
  const searchQuery = ref('')

  watch(activeCategory, (newVal) => {
    safeStorage.setItem('inventory_last_tab', newVal)
  })

  function findInventoryKey(name: string): string | null {
    return helperFindInventoryKey(gameStore, name)
  }

  // --- GETTERS ---
  const bagItems = computed(() => {
    const inventory = gameStore.state.inventory || {}
    let items: Item[] = Object.entries(inventory)
      .map(([name, qty]) => {
        const officialName = resolveNormalizedName(name)
        const item = SHOP_ITEMS.find(i => i.name === officialName)
        if (!item) return { name, qty, id: name, cat: 'otros', sprite: name, desc: 'Objeto desconocido' } as Item
        return { ...item, qty, name } as Item
      })

    if (activeCategory.value === 'utilizables') {
      const target = uiStore.inventoryTarget
      if (target) {
        const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
        const pokemon = list[target.index]
        if (pokemon) {
          items = items.filter(item => helperIsItemUsableOn(item.name, pokemon))
        }
      } else {
        items = items.filter(item => {
          if (!isItemUsableOutsideCombat(item)) return false
          
          const officialName = resolveNormalizedName(item.name)
          if (isGlobalItem(officialName)) return true

          const isHeld = item.cat === 'held' || item.type === 'held' || (item.cat === 'breeding' && item.id !== 'vigor_restorer' && !item.id.includes('berry'))
          if (isHeld) return (gameStore.state.team || []).length > 0

          return (gameStore.state.team || []).some((pokemon: Pokemon) => helperIsItemUsableOn(item.name, pokemon))
        })
      }
    }

    return items.filter(item => {
      if (item.qty <= 0) return false
      const resolvedCat = getItemVirtualCategory(item)
      if (activeCategory.value !== 'todos' && activeCategory.value !== 'utilizables' && resolvedCat !== activeCategory.value) return false
      if (searchQuery.value && !item.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
      return true
    })
  })

  const CATEGORY_LABELS = {
    utilizables: 'Utilizables',
    todos: 'Todos',
    pokeballs: 'Balls',
    pociones: 'Cura',
    stones: 'Piedras',
    minerals: 'Minerales y Fósiles',
    purified: 'Materiales Purificados',
    tools: 'Herramientas',
    held: 'Equipo',
    breeding: 'Crianza',
    especial: 'Otros'
  }

  // --- BAG ACTIONS ---
  function toggleBagSellMode() {
    bagSellMode.value = !bagSellMode.value
    bagSellSelected.value = {}
  }

  function toggleBagSellSelect(itemName: string, maxQty: number) {
    if (bagSellSelected.value[itemName]) {
      delete bagSellSelected.value[itemName]
    } else {
      bagSellSelected.value[itemName] = maxQty
    }
  }

  function updateBagSellQty(itemName: string, qty: string | number, maxQty: number) {
    let q = typeof qty === 'string' ? parseInt(qty) : qty
    if (isNaN(q) || q < 1) q = 1
    if (q > maxQty) q = maxQty
    bagSellSelected.value[itemName] = q
  }

  function getBagSellTotalGain() {
    let total = 0
    Object.entries(bagSellSelected.value).forEach(([name, q]) => {
      const itemInfo = SHOP_ITEMS.find(i => i.name === name)
      if (itemInfo) total += Math.floor((itemInfo.price || 0) * 0.5) * q
    })
    return total
  }

  function confirmBagSell() {
    const selectedEntries = Object.entries(bagSellSelected.value)
    if (selectedEntries.length === 0) return false

    const totalGain = getBagSellTotalGain()
    const inv = gameStore.state.inventory || {}
    
    selectedEntries.forEach(([name, qty]) => {
      const actualKey = findInventoryKey(name)
      if (!actualKey) return
      inv[actualKey] = (inv[actualKey] || 0) - qty
      if (inv[actualKey] <= 0) delete inv[actualKey]
    })

    gameStore.state.inventory = { ...inv }
    gameStore.state.money += totalGain
    toggleBagSellMode()
    gameStore.save()
    return totalGain
  }

  function removeItem(itemName: string, qty: number = 1) {
    const inv = gameStore.state.inventory
    if (!inv) return

    const actualKey = findInventoryKey(itemName)
    if (!actualKey || !inv[actualKey]) return
    
    if (qty === 999) {
      delete inv[actualKey]
    } else {
      inv[actualKey] -= qty
      if (inv[actualKey] <= 0) delete inv[actualKey]
    }
    
    // Force reactivity for inventory object
    gameStore.state.inventory = { ...inv }
    gameStore.save(false)
  }

  function addItem(itemName: string, qty: number = 1) {
    if (!itemName) return
    const inventory = gameStore.state.inventory || {}
    
    const actualKey = findInventoryKey(itemName) || itemName
    inventory[actualKey] = (inventory[actualKey] || 0) + qty
    gameStore.state.inventory = { ...inventory } // Force reactivity
    gameStore.save(false)
  }

  function sellItem(itemName: string, qty: number = 1) {
    const officialName = resolveNormalizedName(itemName)
    const itemInfo = SHOP_ITEMS.find(i => i.name === officialName || i.id === officialName)
    if (!itemInfo) return
    
    const actualKey = findInventoryKey(itemName) || itemName
    const inventoryQty = gameStore.state.inventory[actualKey] || 0
    const sellQty = qty === 999 ? inventoryQty : Math.min(qty, inventoryQty)
    
    const gain = Math.floor((itemInfo.price || 0) * 0.5) * sellQty
    
    removeItem(actualKey, sellQty)
    gameStore.state.money += gain
    gameStore.save(false)
  }

  async function processBatchAction(itemMap: Map<string, number>, mode: 'sell' | 'release') {
    let totalGain = 0
    const inventory = gameStore.state.inventory || {}

    for (const [name, qty] of itemMap.entries()) {
      const actualKey = findInventoryKey(name)
      if (!actualKey || !inventory[actualKey]) continue
      
      const actualQty = Math.min(qty, inventory[actualKey])
      
      if (mode === 'sell') {
        const officialName = resolveNormalizedName(name)
        const itemInfo = SHOP_ITEMS.find(i => i.name === officialName)
        if (itemInfo) totalGain += Math.floor((itemInfo.price || 0) * 0.5) * actualQty
      }

      inventory[actualKey] -= actualQty
      if (inventory[actualKey] <= 0) delete inventory[actualKey]
    }

    gameStore.state.inventory = { ...inventory }
    if (mode === 'sell') gameStore.state.money += totalGain
    
    await gameStore.save(false)
    return totalGain
  }

  // --- ITEM ACTIONS ---
  function useItem(itemName: string, context: 'team' | 'box' | null = null, index: number | null = null): ItemEffectResult {
    return executeUseItem(itemName, context, index)
  }

  function equipItem(itemName: string, context: 'team' | 'box', index: number) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon) return false

    const inv = gameStore.state.inventory || {}

    // If already has an item, return it to inventory
    if (pokemon.heldItem) {
      const oldItem = pokemon.heldItem
      const oldItemKey = findInventoryKey(oldItem) || oldItem
      inv[oldItemKey] = (inv[oldItemKey] || 0) + 1
    }

    pokemon.heldItem = itemName
    const actualKey = findInventoryKey(itemName)
    if (actualKey && inv[actualKey] !== undefined) {
      inv[actualKey] = (inv[actualKey] || 0) - 1
      if (inv[actualKey] <= 0) delete inv[actualKey]
    }

    gameStore.state.inventory = { ...inv }
    gameStore.save()
    return true
  }

  function unequipItem(context: 'team' | 'box', index: number) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon || !pokemon.heldItem) return false

    const item = pokemon.heldItem
    const inv = gameStore.state.inventory || {}
    const actualKey = findInventoryKey(item) || item

    inv[actualKey] = (inv[actualKey] || 0) + 1;
    pokemon.heldItem = null

    gameStore.state.inventory = { ...inv }
    gameStore.save()
    return item
  }

  return {
    // Bag
    bagSellMode,
    bagSellSelected,
    activeCategory,
    searchQuery,
    bagItems,
    CATEGORY_LABELS,
    toggleBagSellMode,
    toggleBagSellSelect,
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
