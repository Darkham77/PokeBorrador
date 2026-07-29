
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useItemOnPokemon } from '@/logic/providers/itemProvider'
import { itemEffects } from '@/logic/items/itemEffects'
import type { Pokemon } from '@/types/pokemon/pokemon'

// Mock de Pinia stores para evitar errores de inicialización
vi.mock('@/stores/game', () => ({
  useGameStore: () => ({
    addPokemon: vi.fn(() => ({ target: 'team' }))
  })
}))

vi.mock('@/stores/ui', () => ({
  useUIStore: () => ({})
}))

vi.mock('@/stores/battle/buffs', () => ({
  useBuffsStore: () => ({
    addBuff: vi.fn()
  })
}))

vi.mock('@/stores/player/playerClass', () => ({
  usePlayerClassStore: () => ({
    playerClass: 'none',
    getModifier: vi.fn()
  })
}))

vi.mock('@/stores/war', () => ({
  useWarStore: () => ({
    getGuardianForLocation: vi.fn()
  })
}))

vi.mock('@/stores/map', () => ({
  useMapStore: () => ({
    currentWeather: 'clear'
  })
}))

vi.mock('@/stores/events', () => ({
  useEventStore: () => ({
    globalMultipliers: {},
    getSpeciesBonuses: vi.fn()
  })
}))

describe('Item Reactivity & Integrity', () => {
  let mockPokemon: Pokemon

  beforeEach(() => {
    mockPokemon = {
      id: 'pikachu',
      name: 'Pikachu',
      hp: 10,
      maxHp: 100,
      status: 'psn',
      moves: [
        { name: 'Thunderbolt', pp: 5, maxPP: 15 }
      ]
    } as unknown as Pokemon
  })

  it('should heal HP and return the modified pokemon object', () => {
    const result = useItemOnPokemon('hyperpotion', mockPokemon)
    
    expect(result).toBeDefined()
    expect('success' in result!).toBe(false) // El proveedor devuelve { message, pokemon }
    expect(result!.message).toContain('restauró')
    expect(result!.pokemon.hp).toBe(100) // 10 + 200 clamped to 100
  })

  it('should clear status and return the modified pokemon object', () => {
    const result = useItemOnPokemon('antidote', mockPokemon)
    
    expect(result).toBeDefined()
    expect(result!.pokemon.status).toBe('')
    expect(result!.message).toContain('se curó')
  })

  it('should restore PP and return the modified pokemon object', () => {
    const result = useItemOnPokemon('elixir', mockPokemon)
    
    expect(result).toBeDefined()
    expect(result!.pokemon.moves[0]!.pp).toBe(15)
    expect(result!.message).toContain('recuperó PP')
  })

  it('all registered items should return the standard object format, never a string', () => {
    const itemsToTest = Object.keys(itemEffects)
    
    itemsToTest.forEach(itemName => {
      // Usamos el pokemon mock o un estado genérico
      const effect = itemEffects[itemName];
      if (effect) {
        const result = effect(mockPokemon)
        
        expect(typeof result).toBe('object')
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('message')
        expect(typeof result.message).toBe('string')
      }
    })
  })

  it('should fail gracefully if pokemon is already at full health', () => {
    mockPokemon.hp = 100
    const result = useItemOnPokemon('hyperpotion', mockPokemon)
    
    expect(result).toBeNull() // El proveedor devuelve null si result.success es falso
  })
})
