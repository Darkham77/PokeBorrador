/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerClassStore } from '@/stores/playerClassStore'
import { useGameStore } from '@/stores/game'
import { useClassModifiers } from '@/composables/useClassModifiers'

vi.mock('@/logic/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) }))
    }))
  }
}))

vi.mock('@/logic/db/dbRouter', () => {
  return {
    DBRouter: class {
      constructor() {}
      from() { return this }
      select() { return this }
      eq() { return this }
      single() { return Promise.resolve({ data: null, error: null }) }
      rpc() { return Promise.resolve({ data: null, error: null }) }
    }
  }
})

vi.mock('@/logic/db/sqliteEngine', () => ({
  initSQLite: vi.fn().mockResolvedValue(true)
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

const battleMock = { isBattleActive: false, isPvP: false }
vi.mock('@/stores/battle', () => ({
  useBattleStore: () => battleMock
}))

describe('Player Class Logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    battleMock.isBattleActive = false
    battleMock.isPvP = false
  })

  it('debe permitir seleccionar una clase inicial gratuitamente', async () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    const result = await classStore.selectClass('rocket')
    
    expect(result).toBe(true)
    expect(gameStore.state.playerClass).toBe('rocket')
    expect(gameStore.state.classLevel).toBe(1)
  })

  it('debe cobrar Battle Coins al cambiar de clase', async () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    gameStore.state.playerClass = 'rocket'
    gameStore.state.battleCoins = 15000

    const result = await classStore.selectClass('cazabichos')
    
    expect(result).toBe(true)
    expect(gameStore.state.playerClass).toBe('cazabichos')
    expect(gameStore.state.battleCoins).toBe(5000)
  })

  it('debe aplicar multiplicadores de experiencia correctamente', () => {
    const gameStore = useGameStore()
    const { expMultiplier } = useClassModifiers()

    gameStore.state.playerClass = 'entrenador'
    expect(expMultiplier.value()).toBe(1.10)

    gameStore.state.playerClass = 'criador'
    expect(expMultiplier.value()).toBe(0.90)

    gameStore.state.playerClass = 'cazabichos'
    expect(expMultiplier.value({ isTrainer: true })).toBe(0.80)
  })

  it('debe aplicar multiplicadores de dinero (BC) correctamente', () => {
    const gameStore = useGameStore()
    const { moneyMultiplier } = useClassModifiers()

    gameStore.state.playerClass = 'rocket'
    expect(moneyMultiplier.value()).toBe(0.90)

    gameStore.state.playerClass = 'entrenador'
    expect(moneyMultiplier.value({ isGym: true })).toBe(1.30)
  })

  it('debe deshabilitar bonos en batallas PvP por balanceo', () => {
    const gameStore = useGameStore()
    const { expMultiplier } = useClassModifiers()
    
    battleMock.isBattleActive = true
    battleMock.isPvP = true

    gameStore.state.playerClass = 'entrenador'
    expect(expMultiplier.value()).toBe(1.0)
  })
})
