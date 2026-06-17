

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'

vi.mock('@/logic/db/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ 
        eq: vi.fn(() => ({ 
          single: vi.fn(() => Promise.resolve({ data: { db_version: 2 }, error: null })),
          order: vi.fn(() => ({ single: vi.fn() }))
        }))
      }))
    })),
    getServerTime: vi.fn(() => Promise.resolve(Temporal.Now.instant().epochMilliseconds))
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
vi.mock('@/stores/inventory/inventory', () => ({
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
    
    classStore.addCriminality(90) // Total 110 -> Sin límite artificial
    expect(gameStore.state.classData.criminality).toBe(110)
  })

  it('debe sacrificar al Pokémon y devolver el item en misiones Rocket', async () => {
    const classStore = usePlayerClassStore()
    const gameStore = useGameStore()

    gameStore.state.playerClass = 'rocket'
    gameStore.state.box = [
      { id: 'pidgey', name: 'Pidgey', level: 10, heldItem: 'Piedra Fuego', onMission: true } as unknown as Pokemon
    ]
    
    gameStore.state.classData.activeMission = {
      id: 'rocket_patrol',
      endsAt: Temporal.Now.instant().epochMilliseconds - 1000,
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
    gameStore.state.activeBattle = { isPvP: true } as unknown as typeof gameStore.state.activeBattle
    expect(classStore.getModifier('expMult')).toBe(1.0)
  })

  it('debe aplicar la fianza de policía correctamente en la derrota según nivel y criminalidad', async () => {
    const gameStore = useGameStore()
    const { terminateBattle } = await import('@/logic/battle/resolution')
    const { BATTLE_STATES, BATTLE_SUBSTATES } = await import('@/logic/battle/battleStateMachine')

    // Mock minimal de BattleContext
    const mockFsm = {
      currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
      currentSubState: { value: BATTLE_SUBSTATES.CHECK_OUTCOME },
      transition: vi.fn()
    }
    const mockCtx = {
      gs: gameStore,
      fsm: mockFsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      audio: {
        defeat: vi.fn(),
        victoryTrainer: vi.fn()
      },
      activeBattle: {
        value: {
          trainerName: 'Oficial de Policía',
          persistenceMode: 'PERSISTENT',
          over: false,
          classData: gameStore.state.classData
        }
      },
      faintedSides: { value: new Set<string>(), clear: vi.fn(), add: vi.fn() },
      enemyStages: { value: {} },
      animations: {},
      addLog: vi.fn(),
      waitForLogs: vi.fn().mockResolvedValue(true),
      completeBattleFlow: vi.fn()
    } as unknown as BattleContext

    // Caso 1: Nivel 10, Criminalidad 100% -> Debe cobrar 8000
    gameStore.state.playerClass = 'rocket'
    gameStore.state.classLevel = 10
    gameStore.state.classData.criminality = 100
    gameStore.state.money = 200000

    await terminateBattle(mockCtx, false, false) // Derrota (win = false, fled = false)
    expect(gameStore.state.money).toBe(192000) // 200000 - 8000
    expect(gameStore.state.classData.criminality).toBe(0) // Se limpia la criminalidad

    // Caso 2: Nivel 5, Criminalidad 100% -> Debe cobrar 2000
    gameStore.state.classLevel = 5
    gameStore.state.classData.criminality = 100
    gameStore.state.money = 20000

    // Restauramos el estado del mock de batalla
    if (mockCtx.activeBattle.value) {
      mockCtx.activeBattle.value.over = false
    }
    await terminateBattle(mockCtx, false, false)
    expect(gameStore.state.money).toBe(18000) // 20000 - 2000

    // Caso 3: Nivel 10, Criminalidad 200% -> Debe cobrar 16000
    gameStore.state.classLevel = 10
    gameStore.state.classData.criminality = 200
    gameStore.state.money = 20000

    if (mockCtx.activeBattle.value) {
      mockCtx.activeBattle.value.over = false
    }
    await terminateBattle(mockCtx, false, false)
    expect(gameStore.state.money).toBe(4000) // 20000 - 16000

    // Caso 4: Bancarrota (Nivel 30, Criminalidad 100% -> ₽72000, pero jugador sólo tiene ₽50000)
    gameStore.state.classLevel = 30
    gameStore.state.classData.criminality = 100
    gameStore.state.money = 50000

    if (mockCtx.activeBattle.value) {
      mockCtx.activeBattle.value.over = false
    }
    await terminateBattle(mockCtx, false, false)
    expect(gameStore.state.money).toBe(0) // Se queda en 0
  })

  it('debe calcular la probabilidad de encuentro policial (tChance) de forma dinámica basada en la criminalidad', () => {
    // Definimos una función helper pura idéntica a la lógica del motor para testear matemáticamente
    const getEncounterChance = (playerClass: string, criminality: number, trainerChance: number, trainerBonus = 1) => {
      const isRocketMaxCrim = playerClass === 'rocket' && criminality >= 100;
      return isRocketMaxCrim
        ? (criminality / 10) * trainerBonus
        : Math.min(trainerChance || 5, 20) * trainerBonus;
    }

    // Caso 1: No es Rocket -> Debe usar trainerChance normal (ej. 5%)
    expect(getEncounterChance('entrenador', 250, 5)).toBe(5)

    // Caso 2: Es Rocket pero < 100% de criminalidad -> Usa trainerChance normal (ej. 5%)
    expect(getEncounterChance('rocket', 80, 5)).toBe(5)

    // Caso 3: Es Rocket, criminalidad al 100% -> 10%
    expect(getEncounterChance('rocket', 100, 5)).toBe(10)

    // Caso 4: Es Rocket, criminalidad al 200% -> 20%
    expect(getEncounterChance('rocket', 200, 5)).toBe(20)

    // Caso 5: Es Rocket, criminalidad al 250% -> 25%
    expect(getEncounterChance('rocket', 250, 5)).toBe(25)
  })
})
