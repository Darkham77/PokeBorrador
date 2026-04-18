/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerClassStore } from '@/stores/playerClass'
import { useGameStore } from '@/stores/game'

vi.mock('@/logic/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ 
        eq: vi.fn(() => ({ 
          single: vi.fn(() => Promise.resolve({ data: { db_version: 2 }, error: null })),
          order: vi.fn(() => ({ single: vi.fn() }))
        }))
      }))
    })),
    getServerTime: vi.fn(() => Promise.resolve(Date.now()))
  }
}))

vi.mock('@/logic/db/dbRouter', () => ({
  DBRouter: {
    getInstance: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) }))
      }))
    }))
  }
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', db_version: 2 },
    sessionMode: 'offline'
  })
}))

vi.mock('@/logic/auth/saveService', () => ({
  saveGame: vi.fn(() => Promise.resolve({ success: true }))
}))

const inventoryMock = {
  addItem: vi.fn()
}
vi.mock('@/stores/inventoryStore', () => ({
  useInventoryStore: vi.fn(() => inventoryMock)
}))

describe('Player Class Logic (V3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('debe permitir seleccionar una clase inicial gratuitamente', async () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    const result = await classStore.selectClass('rocket')
    
    expect(result.success).toBe(true)
    expect(gameStore.state.playerClass).toBe('rocket')
    expect(gameStore.state.classLevel).toBe(1)
  })

  it('debe cobrar Battle Coins al cambiar de clase', async () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    gameStore.state.playerClass = 'rocket'
    gameStore.state.battleCoins = 15000

    const result = await classStore.selectClass('cazabichos')
    
    expect(result.success).toBe(true)
    expect(gameStore.state.playerClass).toBe('cazabichos')
    expect(gameStore.state.battleCoins).toBe(5000)
  })

  it('debe manejar el nivel de criminalidad correctamente (Rocket)', () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    gameStore.state.playerClass = 'rocket'
    classStore.addCriminality(20)
    
    expect(gameStore.state.classData.criminality).toBe(20)
    
    classStore.addCriminality(90) // Total 110 -> Caps at 100
    expect(gameStore.state.classData.criminality).toBe(100)
  })

  it('debe sacrificar al Pokémon y devolver el item en misiones Rocket', async () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    gameStore.state.playerClass = 'rocket'
    gameStore.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, heldItem: 'Piedra Fuego', onMission: true }
    ]
    
    gameStore.state.classData.activeMission = {
      id: 'rocket_patrol',
      endsAt: Date.now() - 1000,
      targetPokemonIdx: 0,
      projectedReward: 500
    }

    await classStore.collectMission()

    expect(gameStore.state.box.length).toBe(0)
    expect(gameStore.state.battleCoins).toBe(500)
    expect(inventoryMock.addItem).toHaveBeenCalledWith('Piedra Fuego', 1)
  })

  it('debe calcular modificadores correctamente (PvP Balance)', () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    gameStore.state.playerClass = 'entrenador'
    expect(classStore.getModifier('expMult')).toBe(1.1)

    // Activar PvP
    gameStore.state.activeBattle = { isPvP: true }
    expect(classStore.getModifier('expMult')).toBe(1.0)
  })
})
