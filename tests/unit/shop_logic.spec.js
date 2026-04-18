// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useShopStore } from '@/stores/shopStore'
import { useUIStore } from '@/stores/ui'

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
      expect(gameStore.state.inventory['Pokéball']).toBe(11) // Starts at 10 in INITIAL_STATE
    })

    it('blocks items below required trainer level', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      const uiStore = useUIStore()
      
      gameStore.state.trainerLevel = 1
      // Ultra Ball unlock level is 8
      shopStore.buyItem('ultra_ball')
      
      expect(uiStore.notify).toHaveBeenCalledWith(expect.stringContaining('bloqueado'), '🔒')
      expect(gameStore.state.inventory['Ultra Ball']).toBeUndefined()
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
        moves: [{ id: 'thunderbolt', pp: 0, maxPP: 15 }]
      }]
      
      shopStore.healAllPokemon()
      
      const p = gameStore.state.team[0]
      expect(p.hp).toBe(50)
      expect(p.status).toBeNull()
      expect(p.moves[0].pp).toBe(15)
    })

    it('calculates 2x cost for Team Rocket', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      gameStore.state.team = [{ hp: 10, maxHp: 50, moves: [] }]
      
      // Damaged count = 1. Base is 50 * 1 * (2.0 - 1.0) = 50.
      // Wait, let's check formula: Math.floor(50 * damagedCount * (mult - 1.0))
      // mult is 2.0 for Rocket. 50 * 1 * (2.0 - 1.0) = 50.
      expect(shopStore.getHealCost()).toBe(50)
    })
  })

  describe('Black Market', () => {
    it('rotates items daily', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      const items = shopStore.getBlackMarketItems()
      
      expect(items.length).toBe(3)
      expect(gameStore.state.classData.blackMarketDaily.date).toBe(new Date().toISOString().split('T')[0])
    })

    it('allows purchasing with money (₽) and applies discount', () => {
      const gameStore = useGameStore()
      const shopStore = useShopStore()
      
      gameStore.state.playerClass = 'rocket'
      gameStore.state.money = 100000
      
      const items = shopStore.getBlackMarketItems()
      const item = items[0]
      
      // Formula: (bcPrice * 50) * (1 - 0.20)
      const expectedPrice = Math.floor((item.bcPrice * 50) * (1 - 0.20))
      const expectedMoney = 100000 - expectedPrice
      
      shopStore.buyBlackMarketItem(item.id)
      
      expect(gameStore.state.money).toBe(expectedMoney)
      expect(gameStore.state.inventory[item.name]).toBe(1)
      expect(gameStore.state.classData.blackMarketDaily.purchased).toContain(item.id)
    })
  })
})
