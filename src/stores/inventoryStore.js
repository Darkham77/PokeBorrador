import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { useUIStore } from './ui'
import { SHOP_ITEMS } from '@/data/items'
import { itemEffects as ITEM_EFFECTS } from '@/logic/items/itemEffects'
import { useItemOnPokemon, isGlobalItem } from '../logic/providers/itemProvider'

export const useInventoryStore = defineStore('inventory', () => {
  const gameStore = useGameStore()

  // --- BAG STATE ---
  const bagSellMode = ref(false)
  const bagSellSelected = ref({}) // { itemName: quantity }
  const isItemTargetModalOpen = ref(false)
  const activeItemToUse = ref(null)

  // --- BOX STATE ---
  const currentBoxIndex = ref(0)
  const boxSortMode = ref('none')
  const boxReleaseMode = ref(false)
  const boxReleaseSelected = ref([]) // Indices
  const boxRocketMode = ref(false)
  const boxRocketSelected = ref([]) // Indices

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

  // --- BOX ACTIONS ---
  function switchBox(index) {
    currentBoxIndex.value = index
  }

  function setBoxSort(mode) {
    boxSortMode.value = mode
  }

  function toggleBoxReleaseMode() {
    boxReleaseMode.value = !boxReleaseMode.value
    boxReleaseSelected.value = []
    if (boxReleaseMode.value) {
      boxRocketMode.value = false
      boxRocketSelected.value = []
    }
  }

  function toggleBoxReleaseSelect(index) {
    const idx = boxReleaseSelected.value.indexOf(index)
    if (idx > -1) {
      boxReleaseSelected.value.splice(idx, 1)
    } else {
      boxReleaseSelected.value.push(index)
    }
  }

  function doBoxRelease() {
    const indices = [...boxReleaseSelected.value].sort((a, b) => b - a)
    const releasedNames = []
    
    indices.forEach(i => {
      const p = gameStore.state.box[i]
      if (p) {
        releasedNames.push(p.name)
        returnHeldItem(p)
        gameStore.state.box.splice(i, 1)
      }
    })

    boxReleaseMode.value = false
    boxReleaseSelected.value = []
    gameStore.save()
    return releasedNames
  }

  function toggleBoxRocketMode() {
    if (gameStore.state.playerClass !== 'rocket') return
    boxRocketMode.value = !boxRocketMode.value
    boxRocketSelected.value = []
    if (boxRocketMode.value) {
      boxReleaseMode.value = false
      boxReleaseSelected.value = []
    }
  }

  function toggleBoxRocketSelect(index) {
    const idx = boxRocketSelected.value.indexOf(index)
    if (idx > -1) {
      boxRocketSelected.value.splice(idx, 1)
    } else {
      boxRocketSelected.value.push(index)
    }
  }

  function getRocketSellValue() {
    let total = 0
    boxRocketSelected.value.forEach(i => {
      const p = gameStore.state.box[i]
      if (!p) return
      const ivs = p.ivs || {}
      const totalIv = Object.values(ivs).reduce((s, v) => s + (v || 0), 0)
      const price = Math.floor((p.level * 100 + (totalIv / 186) * 1000) * 1.5)
      total += price
    })
    return total
  }

  function doBoxRocketSell() {
    const value = getRocketSellValue()
    const count = boxRocketSelected.value.length
    const indices = [...boxRocketSelected.value].sort((a, b) => b - a)

    indices.forEach(i => {
      const p = gameStore.state.box[i]
      if (p) {
        returnHeldItem(p)
        gameStore.state.box.splice(i, 1)
      }
    })

    gameStore.state.money += value
    gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + count
    
    // Actions that should trigger global notifications/calls
    const results = { value, count }
    
    boxRocketMode.value = false
    boxRocketSelected.value = []
    gameStore.save()
    return results
  }

  // Define helpers that were causing lint errors (stubs or actual logic if needed)
  function returnHeldItem(pokemon) {
    if (!pokemon || !pokemon.heldItem) return
    const item = pokemon.heldItem
    gameStore.state.inventory[item] = (gameStore.state.inventory[item] || 0) + 1
    pokemon.heldItem = null
    gameStore.save()
  }

  function getBoxBuyCost() {
    return 1000 // Default or dynamic if logic known
  }

  function buyNewBox() {
    // Logic to expand box count
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

    const effectFn = ITEM_EFFECTS[itemName]
    if (!effectFn) return { success: false, msg: 'Efecto no implementado.' }

    const result = effectFn(pokemon)
    if (!result.success) return { success: false, msg: result.message }

    // --- DEFERRED LOGIC (Modals) ---
    const uiStore = useUIStore()
    
    if (result.resultType === 'relearner') {
      uiStore.activePokemonForRelearner = pokemon
      uiStore.isMoveRelearnerOpen = true
      return { success: true, msg: result.message }
    }

    if (result.resultType === 'evolution') {
      uiStore.startEvolution(pokemon, result.targetId, itemName)
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
    toggleBagSellMode,
    toggleBagSellSelect,
    updateBagSellQty,
    getBagSellTotalGain,
    confirmBagSell,
    // Box
    currentBoxIndex,
    boxSortMode,
    boxReleaseMode,
    boxReleaseSelected,
    boxRocketMode,
    boxRocketSelected,
    switchBox,
    setBoxSort,
    toggleBoxReleaseMode,
    toggleBoxReleaseSelect,
    doBoxRelease,
    toggleBoxRocketMode,
    toggleBoxRocketSelect,
    getRocketSellValue,
    doBoxRocketSell,
    // Items
    useItem,
    equipItem,
    unequipItem,
    openStoneMenu,
    openItemMenu,
    closeItemTargetModal,
    isItemTargetModalOpen,
    activeItemToUse,
    // Utils
    returnHeldItem,
    getBoxBuyCost,
    buyNewBox
  }
})

