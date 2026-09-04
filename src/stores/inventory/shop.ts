
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useWarStore } from '@/stores/war.ts'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { getItemById, SHOP_ITEMS, BC_SHOP_ITEMS, type ItemId } from '@/data/inventory/items'
import { PLAYER_CLASSES } from '@/data/player/playerClasses'
import { calculateTotalHealCost } from '@/logic/economy/economyFormulas'
import { MAX_ITEM_PURCHASE_QTY, ROCKET_SHOP_PRICE_PENALTY_MULTIPLIER, GREAT_BALL_INVENTORY_COUNT_MULT, ULTRA_BALL_INVENTORY_COUNT_MULT, DEFAULT_MOVE_PP } from '@/logic/constants/gameplay.ts'

import { clearVolatileStatus } from '@/logic/battle/battleStatus'

export const useShopStore = defineStore('shop', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const warStore = useWarStore()
  
  
  const quantities = ref<Partial<Record<ItemId, number>>>({})

  function getQuantity(itemId: ItemId) {
    return quantities.value[itemId] || 1
  }

  function setQuantity(itemId: ItemId, val: string | number) {
    let q = parseInt(String(val))
    if (isNaN(q) || q < 1) q = 1
    if (q > MAX_ITEM_PURCHASE_QTY) q = MAX_ITEM_PURCHASE_QTY
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
    if (playerClass === 'rocket') return ROCKET_SHOP_PRICE_PENALTY_MULTIPLIER 
    return 1.0
  }

  function buyItem(itemId: ItemId) {
    const item = getItemById(itemId)
    if (!item) return
    
    if (gameStore.state.trainerLevel < (item.unlockLv || 1)) {
      uiStore.notify('¡Item bloqueado!', '🔒')
      return
    }

    const qty = getQuantity(itemId)
    let unitPrice = item.price
    unitPrice = Math.floor(unitPrice * getPriceModifier())
    
    const total = unitPrice * qty

    if (gameStore.state.money < total) {
      uiStore.notify('¡No tenés suficiente dinero!', '💸')
      return
    }

    // Process purchase
    gameStore.state.money -= total
    gameStore.state.inventory[item.id] = (gameStore.state.inventory[item.id] || 0) + qty
    
    // Process special category effects (like balls count)
    if (item.cat === 'pokeballs') {
       const mult = item.id === 'greatball' ? GREAT_BALL_INVENTORY_COUNT_MULT : (item.id === 'ultraball' ? ULTRA_BALL_INVENTORY_COUNT_MULT : 1)
       gameStore.state.balls = (gameStore.state.balls || 0) + Math.floor(qty * mult)
    }

    uiStore.notify(`¡Compraste x${qty} ${item.name}!`, item.icon)
    uiStore.notify(`Gastaste ₽${total.toLocaleString()}`, '💸')
    gameStore.scheduleSave()
  }

  function buyItemBC(itemId: ItemId) {
    const item = getItemById(itemId)
    if (!item || !item.showInBCShop) return

    const bcPrice = item.bcPrice || 0

    if (gameStore.state.trainerLevel < (item.unlockLv || 1)) {
      uiStore.notify('¡Ítem bloqueado!', '🔒')
      return
    }

    if ((gameStore.state.battleCoins || 0) < bcPrice) {
      uiStore.notify('¡No tenés suficientes Battle Coins!', '💰')
      return
    }

    gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) - bcPrice
    gameStore.state.inventory[item.id] = (gameStore.state.inventory[item.id] || 0) + 1
    
    if (item.cat === 'pokeballs') {
       const mult = item.id === 'greatball' ? 1.5 : (item.id === 'ultraball' ? 2 : 1)
       gameStore.state.balls = (gameStore.state.balls || 0) + Math.floor(1 * mult)
    }

    uiStore.notify(`¡Compraste ${item.name}!`, '🏅')
    uiStore.notify(`Gastaste ${bcPrice} BC`, '🪙')
    gameStore.scheduleSave()
  }

  function buyItemWar(itemId: ItemId) {
    const item = getItemById(itemId)
    if (!item || !item.showInWarShop) return

    const warPrice = item.warPrice || 0

    if (gameStore.state.trainerLevel < (item.unlockLv || 1)) {
      uiStore.notify('¡Ítem bloqueado!', '🔒')
      return
    }

    if ((warStore.warCoins || 0) < warPrice) {
      uiStore.notify('¡No tenés suficientes Monedas de Guerra!', '⚡')
      return
    }

    // Deduct coins
    warStore.warCoins -= warPrice
    gameStore.state.warCoins = warStore.warCoins
    
    // Add to inventory
    gameStore.state.inventory[item.id] = (gameStore.state.inventory[item.id] || 0) + 1
    
    uiStore.notify(`¡Compraste ${item.name}!`, '⚔️')
    uiStore.notify(`Gastaste ${warPrice} Monedas de Guerra`, '⚡')
    gameStore.scheduleSave()
  }

  // ── POKÉMON CENTER HEALING ─────────────────────────────────────────────────

  function getHealCost() {
    return calculateTotalHealCost(
      gameStore.state.team, 
      gameStore.state.trainerLevel || 1, 
      gameStore.state.playerClass || ''
    )
  }

  function healAllPokemon(manualCost: number | null = null) {
    const costToCharge = manualCost !== null ? manualCost : getHealCost()
    
    if (gameStore.state.money < costToCharge) {
      uiStore.notify('No tenés suficiente dinero para la enfermería.', '💸')
      return false
    }

    gameStore.state.money -= costToCharge
    gameStore.state.lastPokemonCenterHeal = Temporal.Now.instant().epochMilliseconds
    
    // Restore all pokemon in team
    gameStore.state.team.forEach((p: Pokemon | null) => {
      if (!p) return;
      p.hp = p.maxHp;
      p.status = '';
      clearVolatileStatus(p);
      if (p.moves) {
        p.moves.forEach((m: Move | null) => {
          if (m) m.pp = m.maxPP || DEFAULT_MOVE_PP;
        });
      }
    });

    if (costToCharge > 0) {
      uiStore.notify(`¡Sanación pagada! Gastaste ₽${costToCharge.toLocaleString()}`, '💰')
    } else {
      uiStore.notify('¡Tus Pokémon están totalmente recuperados!', '🏥')
    }

    gameStore.scheduleSave()
    return true
  }

  // ── BLACK MARKET (TEAM ROCKET) ─────────────────────────────────────────────

  function getBlackMarketItems() {
    if (gameStore.state.playerClass !== 'rocket') return []
    
    if (!gameStore.state.classData) {
      gameStore.state.classData = {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0,
        blackMarketDaily: { date: '', items: [], purchased: [] }
      }
    }
    if (!gameStore.state.classData.blackMarketDaily) {
      gameStore.state.classData.blackMarketDaily = { date: '', items: [], purchased: [] }
    }

    const today = Temporal.Now.instant().toString().split('T')[0] || ''
    const daily = gameStore.state.classData.blackMarketDaily

    if (daily.date !== today) {
      const possibleItems = BC_SHOP_ITEMS
      const shuffled = [...possibleItems].sort(() => 0.5 - Math.random())
      const bmd = gameStore.state.classData?.blackMarketDaily
      if (bmd) {
        bmd.items = shuffled.slice(0, 3).map(i => i.id)
        bmd.date = today
        bmd.purchased = []
      }
      gameStore.scheduleSave()
    }
    
    return daily.items.map((id: string) => getItemById(id)).filter(Boolean)
  }

  function buyBlackMarketItem(itemId: ItemId) {
    if (gameStore.state.playerClass !== 'rocket') return
    const daily = gameStore.state.classData.blackMarketDaily
    if (!daily || !daily.items.includes(itemId)) return
    
    if (daily.purchased.includes(itemId)) {
      useUIStore().notify('Ya compraste este objeto hoy.', '🚫')
      return
    }

    const item = getItemById(itemId)
    if (!item) return

    const discount = PLAYER_CLASSES.rocket.modifiers?.shopDiscount || 0.20
    const priceInMoney = Math.floor(((item.bcPrice || 0) * 50) * (1 - discount))
    
    if (gameStore.state.money < priceInMoney) {
      useUIStore().notify('No tenés suficiente dinero (₽).', '❌')
      return
    }

    gameStore.state.money -= priceInMoney
    daily.purchased.push(itemId)
    
    // Add to inventory
    gameStore.state.inventory[item.id] = (gameStore.state.inventory[item.id] || 0) + 1
    
    useUIStore().notify(`¡Compraste ${item.name} en el Mercado Negro! 🚀`, '💰')
    gameStore.scheduleSave()
  }

  return {
    SHOP_ITEMS,
    getQuantity,
    setQuantity,
    buyItem,
    buyItemBC,
    healAllPokemon,
    getHealCost,
    getBlackMarketItems,
    buyBlackMarketItem,
    buyItemWar
  }
})
