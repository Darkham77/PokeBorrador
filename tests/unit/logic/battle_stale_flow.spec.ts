import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleBattleFlowCompletion } from '@/logic/battle/searchLoop'
import { processFaint } from '@/logic/battle/resolution'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'
import type { BattleContext } from '@/types/battleContext'
import type { Pokemon } from '@/types/pokemon'

vi.mock('@/logic/encounters', () => ({
  generateEncounter: vi.fn(async () => ({ type: 'wild', pokemon: { id: 16, name: 'Pidgey', hp: 50, maxHp: 50 } }))
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

describe('Battle Stale Flow Safety Tests', () => {
  let mockCtx: BattleContext

  beforeEach(() => {
    mockCtx = {
      activeBattle: {
        value: {
          locationId: 'route1',
          _initialEnemy: null,
          enemy: null,
          player: { uid: 'vaporeon', name: 'Vaporeon', hp: 0, maxHp: 100 } as unknown as Pokemon, // Debilitado
          isFishing: false,
          isArchaeology: false,
          over: false,
          rewardsProcessed: false,
          _rewardCombatants: []
        }
      },
      debugLoopPokemon: { value: null },
      isProcessing: { value: false },
      faintedSides: { value: new Set<string>() },
      gs: { state: {} },
      fsm: {
        currentState: { value: BATTLE_STATES.SEARCH_PHASE }, // La batalla ya terminó y estamos buscando
        currentSubState: { value: BATTLE_SUBSTATES.BUSH_IDLE },
        transition: vi.fn(async (s, sub) => {
          mockCtx.fsm.currentState.value = s;
          if (sub) (mockCtx.fsm.currentSubState as { value: string | null }).value = sub;
        })
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      clearLogs: vi.fn(),
      addLog: vi.fn(),
      clearVolatileStatus: vi.fn()
    } as unknown as BattleContext
  })

  it('should ignore processFaint if FSM has already moved to SEARCH_PHASE', async () => {
    // Intentar ejecutar un faint diferido (ej. daño de Ola Frío asíncrono)
    await processFaint(mockCtx, 'player')

    // No debe transicionar a sub-estados de debilitamiento ya que la batalla ya terminó y estamos en búsqueda
    expect(mockCtx.fsm.transition).not.toHaveBeenCalledWith(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
    expect(mockCtx.faintedSides.value.has('player')).toBe(false)
  })

  it('should ignore applyEndTurnEffects if FSM state is not ACTIVE_BATTLE', async () => {
    const { applyEndTurnEffects } = await import('@/logic/battle/battleFlow')
    
    // Set a new enemy that should theoretically get damaged by weather (sandstorm)
    mockCtx.activeBattle.value!.enemy = { uid: 'zubat', name: 'Zubat', hp: 50, maxHp: 50, type: 'poison' } as unknown as Pokemon
    mockCtx.activeBattle.value!.weather = { type: 'sandstorm', visual: 'sandstorm', turns: 5 }
    mockCtx.playerStages = { value: {} } as unknown as import('vue').Ref<import('@/types/battle').BattleStages>
    mockCtx.enemyStages = { value: {} } as unknown as import('vue').Ref<import('@/types/battle').BattleStages>

    await applyEndTurnEffects(mockCtx)

    // El HP de Zubat debe seguir intacto (50) porque la guarda detiene el flujo al estar en SEARCH_PHASE
    expect(mockCtx.activeBattle.value!.enemy.hp).toBe(50)
  })

  it('should transition to BUSH_IDLE when entering search phase and keep logs intact', async () => {
    // Configurar estado en ACTIVE_BATTLE
    mockCtx.fsm.currentState.value = BATTLE_STATES.ACTIVE_BATTLE
    
    await handleBattleFlowCompletion(mockCtx, 'search')

    // No debe vaciar los logs para que permanezcan legibles durante la fase de búsqueda
    expect(mockCtx.clearLogs).not.toHaveBeenCalled()
    
    // Debe transicionar a BUSH_IDLE al final del flujo de búsqueda
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.BUSH_IDLE)
  })
})
