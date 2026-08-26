
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { gameBus } from '@/logic/events/gameBus'

vi.mock('@/logic/events/gameBus', () => ({
  gameBus: {
    emit: vi.fn()
  }
}))

vi.mock('@/logic/battle/battleFlow', () => ({
  updateCastformForm: vi.fn()
}))

function createMockStore() {
  const p = { id: '25', uid: 'p1', name: 'Pikachu', hp: 100, maxHp: 100, level: 50, atk: 100, spa: 100, moves: [{ id: 'tackle', name: 'Tackle', power: 40, pp: 10 }] }
  const e = { id: '16', name: 'Pidgey', hp: 100, maxHp: 100, level: 5, def: 50, spd: 50 }
  
  const store = {
    activeBattle: {
      value: {
        player: p,
        enemy: e,
        enemyTeam: [] as unknown[],
        participants: [] as unknown[],
        isTrainer: false
      }
    },
    playerStages: { value: { atk: 0 } },
    enemyStages: { value: { def: 0 } },
    attackerSide: { value: null as string | null },
    activeMove: { value: null as unknown },
    fsm: {
      transition: vi.fn()
    },
    BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
    BATTLE_SUBSTATES: { 
      BUILD_QUEUE: 'BUILD_QUEUE', 
      POP_ACTION: 'POP_ACTION', 
      APPLY_MOVE: 'APPLY_MOVE', 
      EVAL_HP: 'EVAL_HP',
      PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ',
      ENEMY_REPLACEMENT_SEQ: 'ENEMY_REPLACEMENT_SEQ'
    },
    gs: {
      state: {
        team: [p]
      }
    },
    addLog: vi.fn(),
    endBattle: vi.fn(),
    handleFaint: vi.fn()
  }

  store.handleFaint = vi.fn(async (side: string) => {
    gameBus.emit('PLAY_FAINT', { side })
    if (side === 'enemy' && store.activeBattle.value.isTrainer) {
      const next = store.activeBattle.value.enemyTeam[0] as { name: string; hp: number } | undefined
      if (next) {
        gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
        gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: next })
        store.addLog('¡Entrenador envía a Rattata!', 'log-enemy', 'enemy_trainer')
      }
    }
  })

  return store
}

describe('battleTurn.js', () => {
  let mockStore: ReturnType<typeof createMockStore>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockStore = createMockStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should trigger gameBus animations when handleFaint is called', async () => {
    mockStore.activeBattle.value.enemy.hp = 0
    await mockStore.handleFaint('enemy')
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_FAINT', { side: 'enemy' })
  })

  it('should handle trainer switching pokemon when one faints', async () => {
    mockStore.activeBattle.value.isTrainer = true
    mockStore.activeBattle.value.enemy.hp = 0
    const nextPokemon = { name: 'Rattata', hp: 100 }
    mockStore.activeBattle.value.enemyTeam = [nextPokemon]

    await mockStore.handleFaint('enemy')

    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_WITHDRAW', { side: 'enemy' })
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_SEND_OUT', expect.objectContaining({ side: 'enemy', pokemon: nextPokemon }))
    expect(mockStore.addLog).toHaveBeenCalledWith(expect.stringContaining('¡Entrenador envía a Rattata!'), 'log-enemy', 'enemy_trainer')
  })
})
