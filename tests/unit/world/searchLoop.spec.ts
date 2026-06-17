import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleBattleFlowCompletion } from '@/logic/battle/searchLoop'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battle/battleContext'

vi.mock('@/logic/encounters/encounters', () => ({
  generateEncounter: vi.fn(async () => ({ type: 'wild', pokemon: { id: 16, name: 'Pidgey' } }))
}))

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn(() => ({ activeTab: 'battle' }))
}))

vi.mock('@/stores/map', () => ({
  useMapStore: vi.fn(() => ({ activeEvents: [], mapWinners: {} }))
}))

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({ 
    globalMultipliers: { shiny: 1 },
    getSpeciesBonuses: vi.fn()
  }))
}))

vi.mock('@/stores/war', () => ({
  useWarStore: vi.fn(() => ({ 
    mapDominance: {} 
  }))
}))

describe('searchLoop.js - handleBattleFlowCompletion (Flujo Directo)', () => {
  let mockCtx: BattleContext

  beforeEach(() => {
    mockCtx = {
      activeBattle: {
        value: {
          locationId: 'route1',
          _initialEnemy: null,
          enemy: null,
          isFishing: false,
          isArchaeology: false,
          fled: true,
          playerFled: true
        }
      },
      debugLoopPokemon: { value: null },
      isProcessing: { value: false },
      gs: { state: {} },
      fsm: {
        currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
        transition: vi.fn(async (s, _sub) => {
          mockCtx.fsm.currentState.value = s
        })
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      clearLogs: vi.fn()
    } as unknown as BattleContext
  })

  it('should generate active encounter directly during search loop', async () => {
    await handleBattleFlowCompletion(mockCtx, 'search')
    
    // El encuentro activo se genera directamente y se asigna a _initialEnemy y enemy
    expect(mockCtx.activeBattle.value!._initialEnemy).toEqual(expect.objectContaining({ name: 'Pidgey' }))
    expect(mockCtx.activeBattle.value!.enemy).toEqual(expect.objectContaining({ name: 'Pidgey' }))
    
    // Debe transicionar a INITIALIZING y luego a SEARCH_PHASE / PREPARATION
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.INITIALIZING)
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION)
  })

  it('should clear escape flags before returning to the search loop', async () => {
    await handleBattleFlowCompletion(mockCtx, 'search')

    expect(mockCtx.activeBattle.value!.fled).toBe(false)
    expect(mockCtx.activeBattle.value!.playerFled).toBe(false)
  })
})
