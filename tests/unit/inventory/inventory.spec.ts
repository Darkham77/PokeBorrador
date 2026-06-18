
/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { isItemUsableOutsideCombat, useInventoryStore } from '@/stores/inventory/inventory'
import { useGameStore } from '@/stores/game'
import { getItemById } from '@/data/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'

// Mock components and external logic
vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(() => 'test-url'),
  ASSET_TYPES: { ITEM: 'item' }
}))

describe('Inventory Store', () => {
  beforeEach(() => {
    // Mock localStorage
    const storage: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => storage[key] || null),
      setItem: vi.fn((key, val) => storage[key] = val),
      clear: vi.fn(() => {})
    })

    setActivePinia(createPinia())
    const gameStore = useGameStore()
    gameStore.state = {
      inventory: {
        'pokeball': 10,
        'potion': 5
      },
      money: 1000,
      eggs: []
    } as unknown as typeof gameStore.state
  })

  it('calculates bagItems correctly', () => {
    const store = useInventoryStore()
    expect(store.bagItems.length).toBeGreaterThan(0)
    const pokeball = store.bagItems.find(i => i.name === 'Pokéball')
    expect(pokeball).toBeDefined()
    expect(pokeball!.qty).toBe(10)
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
    expect(gameStore.state.inventory['pokeball']).toBe(15)
  })

  it('removes items correctly', () => {
    const store = useInventoryStore()
    store.removeItem('Poción', 2)
    const gameStore = useGameStore()
    expect(gameStore.state.inventory['potion']).toBe(3)
  })

  it('sells items correctly', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()
    const initialMoney = gameStore.state.money
    
    // Pokéball price is usually 200, sell price 100
    store.sellItem('Pokéball', 1)
    expect(gameStore.state.inventory['pokeball']).toBe(9)
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
    expect(useGameStore().state.inventory['pokeball']).toBeUndefined()
  })

  it('consumes items on use', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()
    
    // Setup a mock pokemon
    gameStore.state.team = [{ name: 'Pikachu', hp: 50, maxHp: 100 } as unknown as Pokemon]
    
    // Pokéball usually fails if not in battle context, but let's check consumption
    // Actually useItem logic handles many cases.
    
    store.addItem('potion', 1)
    store.useItem('potion', 'team', 0)
    expect(gameStore.state.inventory['potion']).toBe(5) // Had 5 + 1 - 1 = 5
  })

  it('sells specific quantity correctly', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()
    gameStore.state.inventory['pokeball'] = 50
    const initialMoney = gameStore.state.money
    
    // Pokéball price 200 -> sell 100
    store.sellItem('Pokéball', 10)
    
    expect(gameStore.state.inventory['pokeball']).toBe(40)
    expect(gameStore.state.money).toBe(initialMoney + 1000)
  })

  it('correctly maps inventory keys using normalizations and aliases', () => {
    const store = useInventoryStore()
    const gameStore = useGameStore()

    // Setup mismatched keys
    gameStore.state.inventory = {
      'pp_up': 2,
      'tm06': 1,
      'magnet': 3,
      'elixir_item': 5
    }

    // Try adding "Subida de PP" (which is official name for Subida PP)
    store.addItem('Subida de PP', 1)
    expect(gameStore.state.inventory['pp_up']).toBe(3)

    // Try removing "MT06 Tóxico" (which is official name for MT Tóxico)
    store.removeItem('MT06 Tóxico', 1)
    expect(gameStore.state.inventory['tm06']).toBeUndefined()

    // Try selling "Imán" using alias "iman"
    store.sellItem('iman', 1)
    expect(gameStore.state.inventory['magnet']).toBe(2)

    // Check bagItems calculated properties are mapped to official SHOP_ITEMS definitions
    const bagItems = store.bagItems
    const magnetItem = bagItems.find(i => i.name === 'Imán')
    expect(magnetItem).toBeDefined()
    expect(magnetItem?.id).toBe('magnet')
    expect(magnetItem?.qty).toBe(2)
  })

  it('treats PP Up as usable in the bag filters', () => {
    const ppUp = getItemById('pp_up')

    expect(ppUp).toBeDefined()
    expect(isItemUsableOutsideCombat(ppUp)).toBe(true)
  })
})
