import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { executeSwitch } from '@/logic/battle/actions/switchAction'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import { setActivePinia, createPinia } from 'pinia'

// Usar vi.hoisted para poder usar la variable dentro de vi.mock que es auto-hoisted
const mockWorker = vi.hoisted(() => ({
  postMessage: vi.fn(),
  onmessage: null as ((ev: MessageEvent) => void) | null
}))

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: mockWorker,
  executeTurnInWorker: vi.fn(async (p1Choice: string, p2Choice?: string) => {
    mockWorker.postMessage({ type: 'EXECUTE_TURN', payload: { p1Choice, p2Choice } })
    return { logs: [], isOver: false, winner: null }
  }),
  isPlayerTrappedInWorker: vi.fn(async () => false)
}))

// Mock de typeEngine para getCombinedEffectiveness
vi.mock('@/logic/pokemon/typeEngine', () => ({
  getCombinedEffectiveness: vi.fn(() => 1.0)
}))

// Mock de provider de pokemon
vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMoveData: vi.fn((id: string) => {
      if (id === 'bubble') return { name: 'Burbuja', type: 'water', cat: 'special', power: 20, acc: 100 }
      return { name: 'Placaje', type: 'normal', cat: 'physical', power: 35, acc: 95 }
    })
  }
}))

describe('Switch Sync & Move Tooltip Stat Modifiers', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockWorker.postMessage.mockClear()
    mockWorker.postMessage.mockImplementation(() => {
      // Simular respuesta inmediata de forma asíncrona pero determinista
      Promise.resolve().then(() => {
        if (mockWorker.onmessage) {
          mockWorker.onmessage({
            data: {
              type: 'TURN_SUCCESS',
              payload: { logs: [], isOver: false, winner: null }
            }
          } as unknown as MessageEvent)
        }
      })
    })
  })

  function createMockContext() {
    const p1 = { uid: 'p1', name: 'Charmeleon', hp: 50, maxHp: 100, atk: 15, spa: 12, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 }] } as unknown as Pokemon
    const p2 = { uid: 'p2', name: 'Charizard', hp: 100, maxHp: 100, atk: 25, spa: 22, moves: [{ id: 'wingattack', name: 'Ala de Acero', pp: 35, maxPP: 35 }] } as unknown as Pokemon
    const enemy = { uid: 'e1', name: 'Pidgey', hp: 40, maxHp: 40, def: 10, spd: 10, moves: [{ id: 'peck', name: 'Picotazo', pp: 35, maxPP: 35 }] } as unknown as Pokemon

    const activeBattle = ref({
      player: p1,
      enemy,
      playerTeamIndex: 0,
      participants: ['p1'],
      isTrainer: false,
      weather: { type: 'clear', visual: 'clear', turns: -1 }
    })

    const playerStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })
    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })

    const ctx = {
      gs: {
        state: {
          team: [p1, p2]
        }
      },
      activeBattle,
      fsm: {
        transition: vi.fn(async () => {})
      },
      BATTLE_STATES: {
        REORDER_TEAM: 'REORDER_TEAM',
        ACTIVE_BATTLE: 'ACTIVE_BATTLE'
      },
      BATTLE_SUBSTATES: {
        FIND_HEALTHY: 'FIND_HEALTHY',
        CHECK_ACTIVE_SEAT: 'CHECK_ACTIVE_SEAT',
        SWITCHING: 'SWITCHING',
        POKEMON_CALL: 'POKEMON_CALL',
        BUILD_QUEUE: 'BUILD_QUEUE',
        POP_ACTION: 'POP_ACTION',
        APPLY_MOVE: 'APPLY_MOVE',
        EVAL_HP: 'EVAL_HP'
      },
      addLog: vi.fn(),
      exitingPlayer: ref(null),
      playerStages,
      enemyStages,
      persistBattle: vi.fn(),
      handleFaint: vi.fn(),
      endBattle: vi.fn()
    } as unknown as BattleContext

    return { ctx, p1, p2, playerStages, enemyStages }
  }

  it('should post EXECUTE_TURN with switch command to worker on voluntary switch', async () => {
    const { ctx } = createMockContext()

    await executeSwitch(ctx, 1, false)

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'EXECUTE_TURN',
      payload: {
        p1Choice: 'switch 2',
        p2Choice: expect.stringContaining('move')
      }
    })
  })

  it('should post EXECUTE_TURN with switch command and NO p2Choice on forced switch', async () => {
    const { ctx } = createMockContext()

    await executeSwitch(ctx, 1, true)

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'EXECUTE_TURN',
      payload: {
        p1Choice: 'switch 2'
      }
    })
  })

  it('should restore player active pokemon and index if worker throws error during switch', async () => {
    const { ctx, p1 } = createMockContext()
    
    const { executeTurnInWorker } = await import('@/logic/battle/orchestrator')
    vi.mocked(executeTurnInWorker).mockRejectedValueOnce(new Error('INVALID_CHOICE'))

    await expect(executeSwitch(ctx, 1, false)).rejects.toThrow('INVALID_CHOICE')

    expect(ctx.activeBattle.value?.player.uid).toBe(p1.uid)
    expect(ctx.activeBattle.value?.playerTeamIndex).toBe(0)
  })

  it('should abort switch early and notify player if trapped by Arena Trap/Shadow Tag', async () => {
    const { ctx, p1 } = createMockContext()
    
    const { isPlayerTrappedInWorker } = await import('@/logic/battle/orchestrator')
    vi.mocked(isPlayerTrappedInWorker).mockResolvedValueOnce(true)

    const transitionSpy = vi.spyOn(ctx.fsm, 'transition')

    await executeSwitch(ctx, 1, false)

    // Verify it did not transition to REORDER_TEAM
    expect(transitionSpy).not.toHaveBeenCalledWith('REORDER_TEAM')
    // Active player is still p1
    expect(ctx.activeBattle.value?.player.uid).toBe(p1.uid)
  })
})
