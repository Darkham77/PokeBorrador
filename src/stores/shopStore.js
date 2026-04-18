import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { SHOP_ITEMS, ITEM_CATEGORIES, CATEGORY_LABELS } from '@/data/items'
import { PLAYER_CLASSES } from '@/logic/playerClasses'
import { TRAINER_RANKS } from '@/data/trainer'

export const useShopStore = defineStore('shop', () => {
  const gameStore = useGameStore()
  
  const marketCategory = ref('todos')
  const searchQuery = ref('')
  const quantities = ref({})

  const getTrainerRank = computed(() => {
    const lv = gameStore.state.trainerLevel || 1
    const idx = Math.min(lv - 1, TRAINER_RANKS.length - 1)
    return TRAINER_RANKS[idx]
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

  /**
   * Calculates the price modifier based on player class.
   */
  function getPriceModifier() {
    const playerClass = gameStore.state.playerClass
    if (!playerClass) return 1.0
    
    const classDef = PLAYER_CLASSES[playerClass]
    if (!classDef || !classDef.modifiers) return 1.0
    
    // For regular shop, we use the recargo penalty if member of Rocket
    if (playerClass === 'rocket') return 1.20 
    return 1.0
  }

  function buyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return
    
    if (gameStore.state.trainerLevel < (item.unlockLv || 1)) {
      const uiStore = useUIStore()
      uiStore.notify('¡Item bloqueado!', '🔒')
      return
    }

    const qty = getQuantity(itemId)
    let unitPrice = item.price
    unitPrice = Math.floor(unitPrice * getPriceModifier())
    
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
       const mult = item.id === 'great_ball' ? 1.5 : (item.id === 'ultra_ball' ? 2 : 1)
       gameStore.state.balls = (gameStore.state.balls || 0) + Math.floor(qty * mult)
    }

    const uiStore = useUIStore()
    uiStore.notify(`¡Compraste x${qty} ${item.name}!`, item.icon)
    gameStore.scheduleSave()
    if (window.updateHud) window.updateHud()
  }

  function buyItemBC(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item || !item.trainerShop) return

    if (gameStore.state.trainerLevel < (item.unlockLv || 1)) {
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

    const uiStore = useUIStore()
    uiStore.notify(`¡Compraste ${item.name}!`, '🏅')
    gameStore.scheduleSave()
    if (window.updateHud) window.updateHud()
  }

  // ── POKÉMON CENTER HEALING ─────────────────────────────────────────────────

  function getHealCost() {
    const team = gameStore.state.team || []
    const damagedCount = team.filter(p => p.hp < p.maxHp || p.status || p.moves.some(m => m.pp < (m.maxPP || 0))).length
    if (damagedCount === 0) return 0

    const playerClass = gameStore.state.playerClass
    let mult = 1.0
    
    if (playerClass && PLAYER_CLASSES[playerClass]) {
      mult = PLAYER_CLASSES[playerClass].modifiers.healCostMult || 1.0
      
      // Criador specific logic: cost 0 if there's a foreign pokemon? 
      // (Simplified: if criador, mult is 1.0 anyway in playerClasses.js)
    }

    if (mult <= 1.0) return 0
    return Math.floor(50 * damagedCount * (mult - 1.0))
  }

  function healAllPokemon() {
    const cost = getHealCost()
    if (gameStore.state.money < cost) {
      useUIStore().notify('No tenés suficiente dinero para la enfermería.', '💸')
      return false
    }

    gameStore.state.money -= cost
    
    // Restore all pokemon in team
    gameStore.state.team.forEach(p => {
      p.hp = p.maxHp
      p.status = null
      if (p.moves) {
        p.moves.forEach(m => {
          m.pp = m.maxPP || 20
        })
      }
    })

    useUIStore().notify('¡Tus Pokémon están totalmente recuperados!', '🏥')
    gameStore.scheduleSave()
    if (window.updateHud) window.updateHud()
    return true
  }

  // ── BLACK MARKET (TEAM ROCKET) ─────────────────────────────────────────────

  function getBlackMarketItems() {
    if (gameStore.state.playerClass !== 'rocket') return []
    
    if (!gameStore.state.classData) gameStore.state.classData = {}
    if (!gameStore.state.classData.blackMarketDaily) {
      gameStore.state.classData.blackMarketDaily = { date: '', items: [], purchased: [] }
    }

    const today = new Date().toISOString().split('T')[0]
    const daily = gameStore.state.classData.blackMarketDaily

    if (daily.date !== today) {
      const possibleItems = SHOP_ITEMS.filter(i => i.trainerShop === true && (i.bcPrice || 0) > 0)
      const shuffled = [...possibleItems].sort(() => 0.5 - Math.random())
      daily.items = shuffled.slice(0, 3).map(i => i.id)
      daily.date = today
      daily.purchased = []
      gameStore.scheduleSave()
    }
    
    return daily.items.map(id => SHOP_ITEMS.find(i => i.id === id)).filter(Boolean)
  }

  function buyBlackMarketItem(itemId) {
    if (gameStore.state.playerClass !== 'rocket') return
    const daily = gameStore.state.classData.blackMarketDaily
    if (!daily || !daily.items.includes(itemId)) return
    
    if (daily.purchased.includes(itemId)) {
      useUIStore().notify('Ya compraste este objeto hoy.', '🚫')
      return
    }

    const item = SHOP_ITEMS.find(i => i.id === itemId)
    if (!item) return

    const discount = PLAYER_CLASSES.rocket.modifiers.shopDiscount || 0.20
    const priceInMoney = Math.floor((item.bcPrice * 50) * (1 - discount))
    
    if (gameStore.state.money < priceInMoney) {
      useUIStore().notify('No tenés suficiente dinero (₽).', '❌')
      return
    }

    gameStore.state.money -= priceInMoney
    daily.purchased.push(itemId)
    
    // Add to inventory
    gameStore.state.inventory[item.name] = (gameStore.state.inventory[item.name] || 0) + 1
    
    useUIStore().notify(`¡Compraste ${item.name} en el Mercado Negro! 🚀`, '💰')
    gameStore.scheduleSave()
    if (window.updateHud) window.updateHud()
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
    buyItemBC,
    healAllPokemon,
    getHealCost,
    getBlackMarketItems,
    buyBlackMarketItem
  }
})
