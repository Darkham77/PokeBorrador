import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { useUIStore } from './ui'
import { SHOP_ITEMS } from '@/data/items'
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects'
import { isGlobalItem } from '../logic/providers/itemProvider'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

export const useInventoryStore = defineStore('inventory', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  // --- BAG STATE ---
  const bagSellMode = ref(false)
  const bagSellSelected = ref({}) // { itemName: quantity }
  const isItemTargetModalOpen = ref(false)
  const activeItemToUse = ref(null)
  const bagCategory = ref('todos')
  const bagSearch = ref('')

  // --- GETTERS ---
  const bagItems = computed(() => {
    const inventory = gameStore.state.inventory || {}
    return Object.entries(inventory)
      .map(([name, qty]) => {
        const item = SHOP_ITEMS.find(i => i.name === name)
        if (!item) return { name, qty, id: name, cat: 'otros', sprite: '', desc: 'Objeto desconocido' }
        return { ...item, qty }
      })
      .filter(item => {
        if (bagCategory.value !== 'todos' && item.cat !== bagCategory.value) return false
        if (bagSearch.value && !item.name.toLowerCase().includes(bagSearch.value.toLowerCase())) return false
        return true
      })
  })

  const CATEGORY_LABELS = {
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

  function toggleBagSellSelect(itemName, maxQty) {
    if (bagSellSelected.value[itemName]) {
      delete bagSellSelected.value[itemName]
    } else {
      bagSellSelected.value[itemName] = maxQty
    }
  }

  function updateBagSellQty(itemName, qty, maxQty) {
    let q = parseInt(qty)
    if (isNaN(q) || q < 1) q = 1
    if (q > maxQty) q = maxQty
    bagSellSelected.value[itemName] = q
  }

  function getBagSellTotalGain() {
    let total = 0
    Object.entries(bagSellSelected.value).forEach(([name, q]) => {
      const itemInfo = SHOP_ITEMS.find(i => i.name === name)
      if (itemInfo) total += Math.floor(itemInfo.price * 0.5) * q
    })
    return total
  }

  function confirmBagSell() {
    const selectedEntries = Object.entries(bagSellSelected.value)
    if (selectedEntries.length === 0) return false

    const totalGain = getBagSellTotalGain()
    
    selectedEntries.forEach(([name, qty]) => {
      gameStore.state.inventory[name] -= qty
      if (gameStore.state.inventory[name] <= 0) delete gameStore.state.inventory[name]
    })

    gameStore.state.money += totalGain
    toggleBagSellMode()
    gameStore.save()
    return totalGain
  }

  function removeItem(itemName, qty = 1) {
    if (!gameStore.state.inventory[itemName]) return
    if (qty === 999) {
      delete gameStore.state.inventory[itemName]
    } else {
      gameStore.state.inventory[itemName] -= qty
      if (gameStore.state.inventory[itemName] <= 0) delete gameStore.state.inventory[itemName]
    }
    gameStore.save(false)
  }

  function addItem(itemName, qty = 1) {
    if (!itemName) return
    const inventory = gameStore.state.inventory || {}
    inventory[itemName] = (inventory[itemName] || 0) + qty
    gameStore.state.inventory = inventory
    gameStore.save(false)
  }

  function sellItem(itemName, qty = 1) {
    const itemInfo = SHOP_ITEMS.find(i => i.name === itemName || i.id === itemName)
    if (!itemInfo || !gameStore.state.inventory[itemInfo.name]) return
    
    const actualQty = qty === 999 ? gameStore.state.inventory[itemInfo.name] : qty
    const gain = Math.floor(itemInfo.price * 0.5) * actualQty
    
    removeItem(itemInfo.name, actualQty)
    gameStore.state.money += gain
    gameStore.save(false)
  }

  // --- ITEM ACTIONS ---
  function useItem(itemName, context, index) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    
    // Global items (Repels, etc.)
    if (isGlobalItem(itemName)) {
      const effectFn = ITEM_EFFECTS[itemName]
      if (!effectFn) return { success: false, msg: 'Efecto global no implementado.' }
      
      const result = effectFn(gameStore.state)
      consumeItem(itemName)
      return { success: true, msg: result }
    }

    if (!pokemon) return { success: false, msg: 'Seleccioná un Pokémon.' }

    let effectFn = ITEM_EFFECTS[itemName]
    let result = null

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
      const moveData = pokemonDataProvider.getMoveData(result.moveName) || {}
      const moveObj = { 
        name: result.moveName, 
        pp: moveData.pp || 35, 
        maxPP: moveData.pp || 35 
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
      // Item consumed AFTER selection in modal or here? 
      // Legacy usually consumes it when opening the menu to avoid dupes?
      // Actually, it's safer to consume it now or when confirmed.
      // I'll follow the "consume on use" pattern.
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

    // --- INSTANT LOGIC ---
    consumeItem(itemName)
    gameStore.save()

    // --- BATTLE INTEGRATION ---
    const battleStore = useBattleStore()
    if (battleStore.isBattleActive && !battleStore.isProcessing) {
      battleStore.addLog(`¡${pokemon.name} ${result.message}!`, 'log-player')
      battleStore.useItemInBattle(itemName) 
    }

    return { success: true, msg: result.message }
  }

  function consumeItem(itemName) {
    if (gameStore.state.inventory[itemName]) {
      gameStore.state.inventory[itemName]--
      if (gameStore.state.inventory[itemName] <= 0) {
        delete gameStore.state.inventory[itemName]
      }
    }
  }

  function equipItem(itemName, context, index) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon) return false

    // If already has an item, return it to inventory
    if (pokemon.heldItem) {
      const oldItem = pokemon.heldItem
      gameStore.state.inventory[oldItem] = (gameStore.state.inventory[oldItem] || 0) + 1
    }

    pokemon.heldItem = itemName
    gameStore.state.inventory[itemName]--
    if (gameStore.state.inventory[itemName] <= 0) delete gameStore.state.inventory[itemName]

    gameStore.save()
    return true
  }

  function unequipItem(context, index) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon || !pokemon.heldItem) return false

    const item = pokemon.heldItem
    gameStore.state.inventory[item] = (gameStore.state.inventory[item] || 0) + 1
    pokemon.heldItem = null

    gameStore.save()
    return item
  }

  function openStoneMenu(stoneName) {
    activeItemToUse.value = stoneName
    isItemTargetModalOpen.value = true
  }

  function openItemMenu(itemName) {
    activeItemToUse.value = itemName
    isItemTargetModalOpen.value = true
  }

  function closeItemTargetModal() {
    isItemTargetModalOpen.value = false
    activeItemToUse.value = null
  }

  return {
    // Bag
    bagSellMode,
    bagSellSelected,
    bagCategory,
    bagSearch,
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
    openStoneMenu,
    openItemMenu,
    closeItemTargetModal,
    isItemTargetModalOpen,
    activeItemToUse,
    addItem,
    removeItem,
    sellItem
  }
})

