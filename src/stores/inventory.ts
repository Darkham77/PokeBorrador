import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { safeStorage } from '@/logic/utils/storage'
import { getItemById, getItemByName } from '@/data/items'
import { isGlobalItem } from '../logic/providers/itemProvider.ts'
import type { Pokemon } from '@/types/pokemon'
import type { ItemEffectResult } from '@/types/items'
import { executeUseItem } from './inventoryUseAction.ts'
import {
  resolveNormalizedName,
  findInventoryKey as helperFindInventoryKey,
  isItemUsableOn as helperIsItemUsableOn,
  getItemTier,
  isItemProduct,
  getAdjustedProductCategory
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
  craftingTier?: number;
  tier?: 'common' | 'rare' | 'epic' | 'legend';
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
    cat === 'potions' ||
    cat === 'stones' || type === 'stone' ||
    cat === 'combat_held' || cat === 'breeding_held' || type === 'held' ||
    cat === 'tools' || type === 'booster' || type === 'usable'
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
  const activeMainTab = ref<'productos' | 'materiales'>('productos')
  const activeCategory = ref(safeStorage.getItem('inventory_last_tab') || 'todos')
  const searchQuery = ref('')
  const currentSort = ref<'name' | 'price' | 'rarity'>('name')
  const currentSortOrder = ref<'asc' | 'desc'>('asc')

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
      .map(([id, qty]) => {
        const item = getItemById(id) || (id === 'bicycle' ? { id: 'bicycle', name: 'Bicicleta', sprite: 'tools/bicycle', desc: 'Bicicleta para moverte rápido.', cat: 'tools' } : null)
        if (!item) return { name: id, qty, id, cat: 'otros', sprite: id, desc: 'Objeto desconocido' } as Item
        return { ...item, qty, name: item.name } as Item
      })

    // Filter by main tab
    if (activeMainTab.value === 'materiales') {
      items = items
        .filter(item => getItemTier(item) < 3)
        .map(item => {
          const tier = getItemTier(item)
          let cat = item.cat
          if (tier === 0) cat = 'raw_material'
          else if (tier === 1) cat = 'refined_material'
          else if (tier === 2) cat = 'component'
          return { ...item, cat }
        })
    } else {
      // Tab is productos
      items = items
        .filter(item => getItemTier(item) === 3 || isItemProduct(item))
        .map(item => ({
          ...item,
          cat: getAdjustedProductCategory(item)
        }))
    }

    if (activeCategory.value === 'utilizables') {
      const target = uiStore.inventoryTarget
      if (target) {
        const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
        const pokemon = list[target.index]
        if (pokemon) {
          items = items.filter(item => helperIsItemUsableOn(item.id, pokemon))
        }
      } else {
        items = items.filter(item => {
          if (!isItemUsableOutsideCombat(item)) return false
          
          const officialName = resolveNormalizedName(item.name)
          if (isGlobalItem(officialName)) return true

          const isHeld = item.cat === 'combat_held' || item.cat === 'breeding_held' || item.type === 'held'
          if (isHeld) return (gameStore.state.team || []).length > 0

          return (gameStore.state.team || []).some((pokemon: Pokemon) => helperIsItemUsableOn(item.id, pokemon))
        })
      }
    }

    // Filter items first
    const result = items.filter(item => {
      if (item.qty <= 0) return false
      const resolvedCat = item.cat || 'otros'
      if (activeCategory.value !== 'todos' && activeCategory.value !== 'utilizables' && resolvedCat !== activeCategory.value) return false
      if (searchQuery.value && !item.name.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
      return true
    })

    // Sort items
    result.sort((a, b) => {
      let comp = 0
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

  const CATEGORY_LABELS = {
    utilizables: 'Utilizables',
    todos: 'Todos',
    // Materiales
    raw_material: 'Materia Prima',
    refined_material: 'Materia Refinada',
    component: 'Componentes',
    // Productos
    pokeballs: 'Pokéballs',
    potions: 'Curativos',
    stones: 'Piedras',
    combat_held: 'Equipables',
    breeding_held: 'Crianza',
    machinery: 'Maquinaria',
    tools: 'Herramientas',
    tms: 'Discos MT',
    otros: 'Otros'
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
      const itemInfo = getItemByName(name)
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
    const itemInfo = getItemByName(officialName) || getItemById(officialName)
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
        const itemInfo = getItemByName(officialName)
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
    activeMainTab,
    activeCategory,
    searchQuery,
    currentSort,
    currentSortOrder,
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
