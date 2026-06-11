

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useShopStore } from '@/stores/shop'
import { useUIStore } from '@/stores/ui'
import type { Pokemon } from '@/types/pokemon'

describe('Shop & Healing Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    const uiStore = useUIStore()
    uiStore.notify = vi.fn()
  })

  describe('Shop Purchases', () => {
    it('applies 20% markup for Team Rocket members', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      gameStore.state.money = 1000
      
      // Pokeball price is 200. With 20% markup = 240.
      shopStore.buyItem('pokeball')
      
      expect(gameStore.state.money).toBe(1000 - 240)
      expect(gameStore.state.inventory['pokeball']).toBe(11) // Starts at 10 in INITIAL_STATE
    })

    it('blocks items below required trainer level', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const uiStore = useUIStore()
      
      gameStore.state.trainerLevel = 1
      // Ultra Ball unlock level is 8
      shopStore.buyItem('ultra_ball')
      
      expect(uiStore.notify).toHaveBeenCalledWith(expect.stringContaining('bloqueado'), '🔒')
      expect(gameStore.state.inventory['ultra_ball']).toBeUndefined()
    })
  })

  describe('BC Shop Purchases', () => {
    it('allows purchasing special items with Battle Coins', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const uiStore = useUIStore()

      gameStore.state.trainerLevel = 15
      gameStore.state.battleCoins = 5000
      
      // Leftovers (Restos) price is 4500 BC, unlock level is 10
      shopStore.buyItemBC('leftovers')

      expect(gameStore.state.battleCoins).toBe(5000 - 4500)
      expect(gameStore.state.inventory['leftovers']).toBe(1)
      expect(uiStore.notify).toHaveBeenCalledWith('¡Compraste Restos!', '🏅')
    })

    it('blocks BC items below required trainer level', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const uiStore = useUIStore()

      gameStore.state.trainerLevel = 5
      gameStore.state.battleCoins = 5000
      
      // Leftovers (Restos) price is 4500 BC, unlock level is 10
      shopStore.buyItemBC('leftovers')

      expect(gameStore.state.battleCoins).toBe(5000)
      expect(gameStore.state.inventory['leftovers']).toBeUndefined()
      expect(uiStore.notify).toHaveBeenCalledWith('¡Ítem bloqueado!', '🔒')
    })

    it('blocks BC items if player has insufficient Battle Coins', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const uiStore = useUIStore()

      gameStore.state.trainerLevel = 15
      gameStore.state.battleCoins = 1000
      
      // Leftovers (Restos) price is 4500 BC, unlock level is 10
      shopStore.buyItemBC('leftovers')

      expect(gameStore.state.battleCoins).toBe(1000)
      expect(gameStore.state.inventory['leftovers']).toBeUndefined()
      expect(uiStore.notify).toHaveBeenCalledWith('¡No tenés suficientes Battle Coins!', '💰')
    })
  })

  describe('Healing Logic', () => {
    it('restores HP, PP and Status', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.team = [{
        id: 'pikachu',
        hp: 10,
        maxHp: 50,
        status: 'paralysis',
        moves: [{ id: 'thunderbolt', name: 'Thunderbolt', pp: 0, maxPP: 15 }]
      }] as unknown as Pokemon[]
      
      shopStore.healAllPokemon()
      
      const p = gameStore.state.team[0]!
      expect(p.hp).toBe(50)
      expect(p.status).toBeNull()
      expect(p.moves[0]!.pp).toBe(15)
    })

    it('calculates 2x cost for Team Rocket', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      gameStore.state.trainerLevel = 1
      gameStore.state.team = [{ 
        hp: 10, 
        maxHp: 50, 
        moves: [],
        ivs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 } // Tier F / 1x
      }] as unknown as Pokemon[]
      
      // New Formula: 20 + (trainerLevel * 3) = 20 + 3 = 23.
      expect(shopStore.getHealCost()).toBe(23)
    })
  })

  describe('Black Market', () => {
    it('rotates items daily', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      const items = shopStore.getBlackMarketItems()
      
      expect(items.length).toBe(3)
      expect(gameStore.state.classData.blackMarketDaily.date).toBe(Temporal.Now.instant().toString().split('T')[0])
    })

    it('allows purchasing with money (₽) and applies discount', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      gameStore.state.money = 1000000
      
      const items = shopStore.getBlackMarketItems()
      const item = items[0]!
      
      // Formula: (bcPrice * 50) * (1 - 0.20)
      const expectedPrice = Math.floor(((item.bcPrice || 0) * 50) * (1 - 0.20))
      const expectedMoney = 1000000 - expectedPrice
      
      shopStore.buyBlackMarketItem(item.id)
      
      expect(gameStore.state.money).toBe(expectedMoney)
      expect(gameStore.state.inventory[item.id]).toBe(1)
      expect(gameStore.state.classData.blackMarketDaily.purchased).toContain(item.id)
    })
  })
})
