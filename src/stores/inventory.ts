import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { useUIStore } from './ui'
import { safeStorage } from '@/logic/utils/storage'
import { SHOP_ITEMS } from '@/data/items'
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects'
import { isGlobalItem } from '../logic/providers/itemProvider'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon } from '@/types/pokemon'

export interface Item {
  name: string;
  qty: number;
  id?: string;
  cat?: string;
  type?: string;
  sprite?: string;
  desc?: string;
  price?: number;
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

  // We no longer force "utilizables" category on target change 
  // to respect the user's last selected tab as requested.

  // --- GETTERS ---
  const bagItems = computed(() => {
    const inventory = gameStore.state.inventory || {}
    let items: Item[] = Object.entries(inventory)
      .map(([name, qty]) => {
        const item = SHOP_ITEMS.find(i => i.name === name)
        if (!item) return { name, qty, id: name, cat: 'otros', sprite: '', desc: 'Objeto desconocido' } as Item
        return { ...item, qty } as Item
      })

    if (activeCategory.value === 'utilizables') {
      const target = uiStore.inventoryTarget
      if (target) {
        const list = target.context === 'team' ? gameStore.state.team : gameStore.state.box
        const pokemon = list[target.index]
        if (pokemon) {
          items = items.filter(item => isItemUsableOn(item.name, pokemon))
        }
      }
    }

    return items.filter(item => {
      if (activeCategory.value !== 'todos' && activeCategory.value !== 'utilizables' && item.cat !== activeCategory.value) return false
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
    
    selectedEntries.forEach(([name, qty]) => {
      const inv = gameStore.state.inventory
      if (!inv) return
      inv[name] = (inv[name] || 0) - qty
      if (inv[name] <= 0) delete inv[name]
      gameStore.state.inventory = { ...inv }
    })

    gameStore.state.money += totalGain
    toggleBagSellMode()
    gameStore.save()
    return totalGain
  }

  function removeItem(itemName: string, qty: number = 1) {
    if (!gameStore.state.inventory || !gameStore.state.inventory[itemName]) return
    
    if (qty === 999) {
      delete gameStore.state.inventory[itemName]
    } else {
      gameStore.state.inventory[itemName] -= qty
      if (gameStore.state.inventory[itemName] <= 0) delete gameStore.state.inventory[itemName]
    }
    
    // Force reactivity for inventory object
    gameStore.state.inventory = { ...gameStore.state.inventory }
    gameStore.save(false)
  }

  function addItem(itemName: string, qty: number = 1) {
    if (!itemName) return
    const inventory = gameStore.state.inventory || {}
    inventory[itemName] = (inventory[itemName] || 0) + qty
    gameStore.state.inventory = { ...inventory } // Force reactivity
    gameStore.save(false)
  }

  function sellItem(itemName: string, qty: number = 1) {
    const itemInfo = SHOP_ITEMS.find(i => i.name === itemName || i.id === itemName)
    if (!itemInfo) return
    
    const actualName = itemInfo.name
    if (!gameStore.state.inventory || !gameStore.state.inventory[actualName]) return
    
    const inventoryQty = gameStore.state.inventory[actualName]
    const sellQty = qty === 999 ? inventoryQty : Math.min(qty, inventoryQty)
    
    const gain = Math.floor((itemInfo.price || 0) * 0.5) * sellQty
    
    removeItem(actualName, sellQty)
    gameStore.state.money += gain
    gameStore.save(false)
  }

  /**
   * Processes multiple actions in a single save cycle to ensure reactivity and performance.
   * @param {Map<string, number>} itemMap - name -> quantity
   * @param {string} mode - 'sell' | 'release'
   */
  async function processBatchAction(itemMap: Map<string, number>, mode: 'sell' | 'release') {
    let totalGain = 0
    const inventory = gameStore.state.inventory || {}

    for (const [name, qty] of itemMap.entries()) {
      if (!inventory[name]) continue
      
      const actualQty = Math.min(qty, inventory[name])
      
      if (mode === 'sell') {
        const itemInfo = SHOP_ITEMS.find(i => i.name === name)
        if (itemInfo) totalGain += Math.floor((itemInfo.price || 0) * 0.5) * actualQty
      }

      inventory[name] -= actualQty
      if (inventory[name] <= 0) delete inventory[name]
    }

    gameStore.state.inventory = { ...inventory }
    if (mode === 'sell') gameStore.state.money += totalGain
    
    await gameStore.save(false)
    return totalGain
  }

  // --- ITEM ACTIONS ---
  function useItem(itemName: string, context: 'team' | 'box' | null = null, index: number | null = null) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = index !== null ? list[index] : null
    
    // --- INTEGRACIÓN CON COMBATE (Prioridad Absoluta) ---
    // Si estamos en combate, delegamos toda la lógica (aplicación, consumo y logs) 
    // al battleStore para mantener la sincronía del turno.
    const battleStore = useBattleStore()
    if (battleStore.isBattleActive && !battleStore.isProcessing) {
      (battleStore as any).useItemInBattle(itemName, context === 'team' ? index : null)
      return { success: true, msg: 'Usando objeto en combate...' }
    }

    // --- LÓGICA FUERA DE COMBATE ---
    // Global items (Repels, etc.)
    if (isGlobalItem(itemName)) {
      const effectFn = (ITEM_EFFECTS as Record<string, any>)[itemName]
      if (!effectFn) return { success: false, msg: 'Efecto global no implementado.' }
      
      const result = effectFn(gameStore.state)
      consumeItem(itemName)
      return { success: true, msg: result }
    }

    if (!pokemon) return { success: false, msg: 'Seleccioná un Pokémon.' }

    const effectFn = (ITEM_EFFECTS as Record<string, any>)[itemName]
    let result: any;

    if (effectFn) {
      result = effectFn(pokemon)
    } else {
      // Check dynamic effects (TMs, etc)
      result = getDynamicItemEffect(itemName, pokemon)
    }

    if (!result || !result.success) return { success: false, msg: result?.message || 'Efecto no implementado.' }

    // --- DEFERRED LOGIC (Modals) ---
    if (result.resultType === 'relearner') {
      uiStore.activePokemonForRelearner = pokemon
      uiStore.isMoveRelearnerOpen = true
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'evolution') {
      uiStore.startEvolution(pokemon, result.targetId, itemName)
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'levelup') {
      gameStore.checkLevelUp(pokemon)
      consumeItem(itemName)
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'learn_move') {
      const moveData = pokemonDataProvider.getMoveData(result.moveName)
      const moveObj = { 
        name: result.moveName, 
        pp: moveData?.pp || 35, 
        maxPP: moveData?.pp || 35 
      }

      if (pokemon.moves.length < 4) {
        pokemon.moves.push(moveObj)
        uiStore.notify(`¡${pokemon.name} aprendió ${result.moveName}!`, '📖')
      } else {
        uiStore.addToLearnQueue({ pokemon, move: moveObj })
      }
      consumeItem(itemName)
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'nature_patch') {
      uiStore.activePokemonForNature = pokemon
      uiStore.isNaturePatchOpen = true
      consumeItem(itemName)
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'pp_up') {
      uiStore.activePokemonForPPUp = pokemon
      uiStore.isPPUpOpen = true
      consumeItem(itemName)
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'ability_pill') {
      uiStore.activePokemonForAbility = pokemon
      uiStore.isAbilityPillOpen = true
      consumeItem(itemName)
      return { success: true, msg: result.message }
    }

    // --- LÓGICA DE PERSISTENCIA (Fuera de Combate) ---
    consumeItem(itemName)
    gameStore.save()

    return { success: true, msg: result.message }
  }

  function consumeItem(itemName: string) {
    const inv = gameStore.state.inventory
    if (inv && inv[itemName]) {
      inv[itemName]--
      if (inv[itemName] <= 0) {
        delete inv[itemName]
      }
    }
  }

  function isItemUsableOn(itemName: string, pokemon: Pokemon) {
    if (!pokemon) return false
    if (isGlobalItem(itemName)) return false

    // Check if it's a held item (always equippable)
    const item = SHOP_ITEMS.find(i => i.name === itemName)
    if (item && (item.cat === 'held' || item.type === 'held')) return true

    // Deep clone to avoid side effects during check
    const p = JSON.parse(JSON.stringify(pokemon))

    // Check main effects
    const effectFn = (ITEM_EFFECTS as Record<string, any>)[itemName]
    if (effectFn) {
      const res = effectFn(p)
      return res && res.success
    }

    // Check dynamic effects (TMs, stones)
    const dynamicRes = getDynamicItemEffect(itemName, p)
    return dynamicRes && dynamicRes.success
  }

  function equipItem(itemName: string, context: 'team' | 'box', index: number) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon) return false

    // If already has an item, return it to inventory
    if (pokemon.heldItem) {
      const oldItem = pokemon.heldItem
      gameStore.state.inventory[oldItem] = (gameStore.state.inventory[oldItem] || 0) + 1
    }

    pokemon.heldItem = itemName
    const inv = gameStore.state.inventory
    if (inv) {
      inv[itemName] = (inv[itemName] || 0) - 1
      if (inv[itemName] <= 0) delete inv[itemName]
      gameStore.state.inventory = { ...inv }
    }

    gameStore.save()
    return true
  }

  function unequipItem(context: 'team' | 'box', index: number) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon || !pokemon.heldItem) return false

    const item = pokemon.heldItem
    gameStore.state.inventory[item] = (gameStore.state.inventory[item] || 0) + 1;
    pokemon.heldItem = null

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

