import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { SHOP_ITEMS, ITEM_CATEGORIES, CATEGORY_LABELS } from '@/data/items'

export const useShopStore = defineStore('shop', () => {
  const gameStore = useGameStore()
  
  const marketCategory = ref('todos')
  const searchQuery = ref('')
  const quantities = ref({})

  const TRAINER_RANKS = [
    { lv: 1, title: 'Novato' },
    { lv: 2, title: 'Principiante' },
    { lv: 3, title: 'Aprendiz' },
    { lv: 4, title: 'Explorador' },
    { lv: 5, title: 'Aventurero' },
    { lv: 6, title: 'Veterano' },
    { lv: 7, title: 'Experto' },
    { lv: 8, title: 'Maestro' },
    { lv: 9, title: 'Gran Maestro' },
    { lv: 10, title: 'Campeón' },
    { lv: 11, title: 'As de la Liga' },
    { lv: 12, title: 'Entrenador de Elite' },
    { lv: 13, title: 'Gran Campeón' },
    { lv: 14, title: 'Leyenda Viviente' },
    { lv: 15, title: 'Maestro Pokémon' },
    { lv: 16, title: 'Regional Hero' },
    { lv: 17, title: 'Vencedor Supremo' },
    { lv: 18, title: 'Estratega Maestro' },
    { lv: 19, title: 'Guardián de Kanto' },
    { lv: 20, title: 'Elegido de los Dioses' }
  ]

  const getTrainerRank = computed(() => {
    const lv = gameStore.state.level
    return TRAINER_RANKS.findLast(r => r.lv <= lv) || TRAINER_RANKS[0]
  })

  function getQuantity(itemId) {
    return quantities.value[itemId] || 1
  }

  function setQuantity(itemId, val) {
    let q = parseInt(val)
    if (isNaN(q) || q < 1) q = 1
    if (q > 999) q = 999
    quantities.value[itemId] = q
  }

  function buyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return
    
    if (gameStore.state.level < item.unlockLv) {
      const uiStore = useUIStore()
      uiStore.notify('¡Item bloqueado!', '🔒')
      return
    }

    const qty = getQuantity(itemId)
    let unitPrice = item.price
    if (gameStore.state.playerClass === 'rocket') {
      unitPrice = Math.floor(unitPrice * 1.20)
    }
    const total = unitPrice * qty

    if (gameStore.state.money < total) {
      const uiStore = useUIStore()
      uiStore.notify('¡No tenés suficiente dinero!', '💸')
      return
    }

    // Process purchase
    gameStore.state.money -= total
    gameStore.state.inventory[item.name] = (gameStore.state.inventory[item.name] || 0) + qty
    
    // Process special category effects (like balls count)
    if (item.cat === 'pokeballs') {
       // Legacy balls counter logic
       const mult = item.id === 'great_ball' ? 1.5 : (item.id === 'ultra_ball' ? 2 : 1)
       gameStore.state.balls = (gameStore.state.balls || 0) + Math.floor(qty * mult)
    }

    if (window.updateHud) window.updateHud()
    const uiStore = useUIStore()
    uiStore.notify(`¡Compraste x${qty} ${item.name}!`, item.icon)
    if (window.saveGame) window.saveGame(false)
  }

  function buyItemBC(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item || !item.trainerShop) return

    if (gameStore.state.level < item.unlockLv) {
      const uiStore = useUIStore()
      uiStore.notify('¡Ítem bloqueado!', '🔒')
      return
    }

    if ((gameStore.state.battleCoins || 0) < item.bcPrice) {
      const uiStore = useUIStore()
      uiStore.notify('¡No tenés suficientes Battle Coins!', '💰')
      return
    }

    gameStore.state.battleCoins -= item.bcPrice
    gameStore.state.inventory[item.name] = (gameStore.state.inventory[item.name] || 0) + 1
    
    if (item.cat === 'pokeballs') {
       const mult = item.id === 'great_ball' ? 1.5 : (item.id === 'ultra_ball' ? 2 : 1)
       gameStore.state.balls = (gameStore.state.balls || 0) + Math.floor(1 * mult)
    }

    if (window.updateHud) window.updateHud()
    const uiStore = useUIStore()
    uiStore.notify(`¡Compraste ${item.name}!`, '🏅')
    if (window.saveGame) window.saveGame(false)
  }

  return {
    marketCategory,
    searchQuery,
    ITEM_CATEGORIES,
    CATEGORY_LABELS,
    SHOP_ITEMS,
    getTrainerRank,
    getQuantity,
    setQuantity,
    buyItem,
    buyItemBC
  }
})

