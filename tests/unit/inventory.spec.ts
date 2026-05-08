
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '@/stores/inventory'
import { useGameStore } from '@/stores/game'

// Mock components and external logic
vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(() => 'test-url'),
  ASSET_TYPES: { ITEM: 'item' }
}))

describe('Inventory Store', () => {
  beforeEach(() => {
    // Mock localStorage
    const storage = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => storage[key] || null),
      setItem: vi.fn((key, val) => storage[key] = val),
      clear: vi.fn(() => {})
    })

    setActivePinia(createPinia())
    const gameStore = useGameStore()
    gameStore.state = {
      inventory: {
        'Pokéball': 10,
        'Poción': 5
      },
      money: 1000,
      eggs: []
    }
  })

  it('calculates bagItems correctly', () => {
    const store = useInventoryStore()
    expect(store.bagItems.length).toBeGreaterThan(0)
    const pokeball = store.bagItems.find(i => i.name === 'Pokéball')
    expect(pokeball).toBeDefined()
    expect(pokeball.qty).toBe(10)
  })

  it('filters items by category', () => {
    const store = useInventoryStore()
    store.activeCategory = 'pokeballs'
    const balls = store.bagItems
    expect(balls.every(i => i.cat === 'pokeballs')).toBe(true)
  })

  it('filters items by search query', () => {
    const store = useInventoryStore()
    store.searchQuery = 'Poc'
    expect(store.bagItems.every(i => i.name.includes('Poc'))).toBe(true)
  })

  it('adds items correctly', () => {
    const store = useInventoryStore()
    store.addItem('Pokéball', 5)
    const gameStore = useGameStore()
    expect(gameStore.state.inventory['Pokéball']).toBe(15)
  })

  it('removes items correctly', () => {
    const store = useInventoryStore()
    store.removeItem('Poción', 2)
    const gameStore = useGameStore()
    expect(gameStore.state.inventory['Poción']).toBe(3)
  })

  it('sells items correctly', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()
    const initialMoney = gameStore.state.money
    
    // Pokéball price is usually 200, sell price 100
    store.sellItem('Pokéball', 1)
    expect(gameStore.state.inventory['Pokéball']).toBe(9)
    expect(gameStore.state.money).toBeGreaterThan(initialMoney)
  })

  it('handles multi-sell mode', () => {
    const store = useInventoryStore()
    store.toggleBagSellMode()
    expect(store.bagSellMode).toBe(true)
    
    store.toggleBagSellSelect('Pokéball', 10)
    expect(store.bagSellSelected['Pokéball']).toBe(10)
    
    const gain = store.getBagSellTotalGain()
    expect(gain).toBeGreaterThan(0)
    
    store.confirmBagSell()
    expect(store.bagSellMode).toBe(false)
    expect(useGameStore().state.inventory['Pokéball']).toBeUndefined()
  })

  it('consumes items on use', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()
    
    // Setup a mock pokemon
    gameStore.state.team = [{ name: 'Pikachu', hp: 50, maxHp: 100 }]
    
    // Pokéball usually fails if not in battle context, but let's check consumption
    // Actually useItem logic handles many cases.
    
    store.addItem('Poción', 1)
    store.useItem('Poción', 'team', 0)
    expect(gameStore.state.inventory['Poción']).toBe(5) // Had 5 + 1 - 1 = 5
  })

  it('sells specific quantity correctly', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()
    gameStore.state.inventory['Pokéball'] = 50
    const initialMoney = gameStore.state.money
    
    // Pokéball price 200 -> sell 100
    store.sellItem('Pokéball', 10)
    
    expect(gameStore.state.inventory['Pokéball']).toBe(40)
    expect(gameStore.state.money).toBe(initialMoney + 1000)
  })
})
