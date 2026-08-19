import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { executeSwitch } from '@/logic/battle/actions/switchAction'
import { clearVolatileStatus } from '@/logic/battle/battleStatus'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages } from '@/types/battle/battle'
import { setActivePinia, createPinia } from 'pinia'

// Mocking external modules to avoid side-effects
const mockWorker = vi.hoisted(() => ({
  postMessage: vi.fn(),
  onmessage: null as ((ev: MessageEvent) => void) | null
}))

vi.mock('@/logic/battle/orchestrator', () => ({
  showdownWorker: mockWorker,
  executeTurnInWorker: vi.fn(async () => ({ logs: [], isOver: false, winner: null })),
  isPlayerTrappedInWorker: vi.fn(async () => false)
}))

// switchAction uses dynamic import from showdownWorkerClient (not orchestrator)
vi.mock('@/logic/battle/showdownWorkerClient', () => ({
  showdownWorker: mockWorker,
  executeTurnInWorker: vi.fn(async () => ({ logs: [], isOver: false, winner: null })),
  isPlayerTrappedInWorker: vi.fn(async () => false),
  syncTeamsFromLastWorkerState: vi.fn(async () => {}),
  testResetShowdownWorker: vi.fn(async () => {})
}))

vi.mock('@/logic/battle/showdownBridge', () => ({
  filterShowdownLogs: vi.fn(() => []),
  parseShowdownLogLine: vi.fn(async () => {})
}))

vi.mock('@/logic/pokemon/typeEngine', () => ({
  getCombinedEffectiveness: vi.fn(() => 1.0)
}))

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMoveData: vi.fn(() => ({ name: 'Placaje', type: 'normal', cat: 'physical', power: 35, acc: 95 }))
  }
}))

describe('Battle Switch Out State Cleanup Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('clearVolatileStatus cleanses all temporary battle states from the pokemon object', () => {
    const mockPoke = {
      uid: 'p1',
      name: 'Bulbasaur',
      volatileCounters: { confused: 2, taunt: 1 },
      lastMove: { id: 'tackle', name: 'Placaje' },
      confused: 2,
      flinched: true,
      substitute: 50,
      seeded: true,
      attracted: true,
      cursed: true,
      protect: true,
      detect: true,
      destinyBond: true,
      perishSongCount: 3,
      tauntTurns: 2,
      disabledTurns: 2,
      disabledMove: 'tackle',
      encoreTurns: 2,
      encoreMove: 'tackle',
      focusEnergy: true
    } as unknown as Pokemon

    clearVolatileStatus(mockPoke)

    expect(mockPoke.volatileCounters).toEqual({})
    expect(mockPoke.lastMove).toBeNull()
    expect(mockPoke.confused).toBe(0)
    expect(mockPoke.flinched).toBe(false)
    expect(mockPoke.substitute).toBe(0)
    expect(mockPoke.seeded).toBe(false)
    expect(mockPoke.attracted).toBe(false)
    expect(mockPoke.cursed).toBe(false)
    expect(mockPoke.protect).toBe(false)
    expect(mockPoke.detect).toBe(false)
    expect(mockPoke.destinyBond).toBe(false)
    expect(mockPoke.perishSongCount).toBe(0)
    expect(mockPoke.tauntTurns).toBe(0)
    expect(mockPoke.disabledTurns).toBe(0)
    expect(mockPoke.disabledMove).toBeNull()
    expect(mockPoke.encoreTurns).toBe(0)
    expect(mockPoke.encoreMove).toBeNull()
    expect(mockPoke.focusEnergy).toBe(false)
  })

  it('executeSwitch cleanses volatile status and resets stages of the active pokemon to 0', async () => {
    const oldPoke = {
      uid: 'p1',
      name: 'Bulbasaur',
      hp: 100,
      maxHp: 100,
      volatileCounters: { confused: 2 },
      lastMove: { id: 'tackle', name: 'Placaje' },
      confused: 2
    } as unknown as Pokemon

    const newPoke = {
      uid: 'p2',
      name: 'Ivysaur',
      hp: 100,
      maxHp: 100,
      volatileCounters: {},
      lastMove: null
    } as unknown as Pokemon

    const activeBattle = ref({
      player: oldPoke,
      enemy: { uid: 'e1', name: 'Charmander', hp: 100, maxHp: 100, moves: [] } as unknown as Pokemon,
      playerTeamIndex: 0,
      participants: ['p1'],
      isTrainer: false,
      weather: { type: 'clear', visual: 'clear', turns: -1 },
      playerRequest: {
        side: {
          pokemon: [
            { uid: 'p1', condition: '100/100' },
            { uid: 'p2', condition: '100/100' }
          ]
        }
      }
    })

    const playerStages = ref<BattleStages>({
      atk: 2, def: -1, spa: 0, spd: 0, spe: 1, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })

    const enemyStages = ref<BattleStages>({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })

    const ctx: BattleContext = {
      gs: {
        state: {
          team: [oldPoke, newPoke]
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
        WAIT_INPUT: 'WAIT_INPUT'
      },
      playerStages,
      enemyStages,
      addLog: vi.fn(),
      exitingPlayer: ref(null),
      persistBattle: vi.fn(),
      handleFaint: vi.fn(),
      animations: {
        handleCatchRequest: vi.fn(async () => {}),
        handleReleaseRequest: vi.fn(async () => {})
      }
    } as unknown as BattleContext

    await executeSwitch(ctx, 1, false)

    // Old pokemon should have its volatiles cleared
    expect(oldPoke.volatileCounters).toEqual({})
    expect(oldPoke.lastMove).toBeNull()
    expect(oldPoke.confused).toBe(0)

    // Player stages must be reset to 0
    expect(playerStages.value.atk).toBe(0)
    expect(playerStages.value.def).toBe(0)
    expect(playerStages.value.spe).toBe(0)
  })
})
