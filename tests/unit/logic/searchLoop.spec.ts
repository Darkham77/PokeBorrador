
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleBattleFlowCompletion } from '@/logic/battle/searchLoop'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battleContext'

vi.mock('@/logic/encounters', () => ({
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

describe('searchLoop.js - handleBattleFlowCompletion', () => {
  let mockCtx: BattleContext

  beforeEach(() => {
    mockCtx = {
      activeBattle: {
        value: {
          locationId: 'route1',
          _initialEnemy: null,
          enemy: null
        }
      },
      upcomingPokemon: { value: null },
      debugBinoculars: { value: false },
      isProcessing: { value: false },
      gs: { state: {} },
      fsm: {
        currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
        transition: vi.fn(async (s, sub) => {
          mockCtx.fsm.currentState.value = s
        })
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      clearLogs: vi.fn()
    } as unknown as BattleContext
  })

  it('should promote upcomingPokemon to _initialEnemy during search loop', async () => {
    mockCtx.upcomingPokemon.value = { id: 19, name: 'Rattata' }
    
    await handleBattleFlowCompletion(mockCtx, 'search')
    
    expect(mockCtx.activeBattle.value._initialEnemy).toEqual(expect.objectContaining({ name: 'Rattata' }))
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.INITIALIZING)
  })

  it('should generate new upcomingPokemon if slot is empty', async () => {
    mockCtx.upcomingPokemon.value = null
    
    await handleBattleFlowCompletion(mockCtx, 'search')
    expect(mockCtx.upcomingPokemon.value).toEqual(expect.objectContaining({ name: 'Pidgey' }))
    // Note: handleBattleFlowCompletion with 'search' does NOT set activeBattle to null
    expect(mockCtx.activeBattle.value._initialEnemy).toEqual(expect.objectContaining({ name: 'Pidgey' }))
  })
})
