import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { SHOP_ITEMS } from '@/data/items'

export const useInventoryStore = defineStore('inventory', () => {
  const gameStore = useGameStore()

  // --- BAG STATE ---
  const bagSellMode = ref(false)
  const bagSellSelected = ref({}) // { itemName: quantity }

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

  // --- ITEM ACTIONS ---
  function useItem(itemName, context, index) {
    const list = context === 'team' ? gameStore.state.team : gameStore.state.box
    const pokemon = list[index]
    if (!pokemon) return null

    // This is where we'll implement item usage logic (healing, etc.)
    // For now, we delegate to the existing HEALING_ITEMS if they exist globally
    // But we should start moving them here.
    
    // Legacy mapping for simple items (potions, ethers, etc.)
    const effects = {
      'Poción': p => { if (p.hp === p.maxHp) return null; p.hp = Math.min(p.maxHp, p.hp + 20); return 'restauró 20 HP'; },
      'Super Poción': p => { if (p.hp === p.maxHp) return null; p.hp = Math.min(p.maxHp, p.hp + 50); return 'restauró 50 HP'; },
      'Hiper Poción': p => { if (p.hp === p.maxHp) return null; p.hp = Math.min(p.maxHp, p.hp + 2100); return 'restauró 200 HP'; }, // Legacy had 200, but logic was p.hp + 200
      'Poción Máxima': p => { if (p.hp === p.maxHp) return null; p.hp = p.maxHp; return 'restauró todo el HP'; },
      'Revivir': p => { if (p.hp > 0) return null; p.hp = Math.floor(p.maxHp / 2); return 'fue revivido'; },
      'Revivir Máximo': p => { if (p.hp > 0) return null; p.hp = p.maxHp; return 'fue revivido al máximo'; },
      'Antídoto': p => { if (p.status !== 'poison') return null; p.status = null; return 'curó el veneno'; },
      'Cura Quemadura': p => { if (p.status !== 'burn') return null; p.status = null; return 'curó la quemadura'; },
      'Despertar': p => { if (p.status !== 'sleep') return null; p.status = null; p.sleepTurns = 0; return 'se despertó'; },
      'Cura Total': p => { if (!p.status && p.hp === p.maxHp) return null; p.hp = p.maxHp; p.status = null; p.sleepTurns = 0; return 'se curó completamente'; },
      'Repelente': _ => { gameStore.state.repelSecs = (gameStore.state.repelSecs || 0) + 600; return 'activó Repelente (10m)'; },
      'Superrepelente': _ => { gameStore.state.repelSecs = (gameStore.state.repelSecs || 0) + 1200; return 'activó Superrepelente (20m)'; },
      'Máximo Repelente': _ => { gameStore.state.repelSecs = (gameStore.state.repelSecs || 0) + 1800; return 'activó Máximo Repelente (30m)'; }
    }

    const effort = effects[itemName]
    if (!effort) return { success: false, msg: 'Objeto no implementado o no utilizable.' }

    const result = effort(pokemon)
    if (result === null) return { success: false, msg: 'No tiene efecto.' }

    // Consume item
    gameStore.state.inventory[itemName]--
    if (gameStore.state.inventory[itemName] <= 0) delete gameStore.state.inventory[itemName]

    gameStore.save()
    return { success: true, msg: result }
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
    if (typeof window.openBagStoneMenu === 'function') {
      window.openBagStoneMenu(stoneName)
    } else {
      console.warn('[InventoryStore] openBagStoneMenu bridge not found')
    }
  }

  function openItemMenu(itemName) {
    if (typeof window.openBagItemMenu === 'function') {
      window.openBagItemMenu(itemName)
    } else {
      console.warn('[InventoryStore] openBagItemMenu bridge not found')
    }
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
    // Utils
    returnHeldItem,
    getBoxBuyCost,
    buyNewBox
  }
})

