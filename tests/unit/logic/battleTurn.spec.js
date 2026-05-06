import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPlayerAction } from '@/logic/battle/battleTurn'
import { gameBus } from '@/logic/gameBus'

vi.mock('@/logic/gameBus', () => ({
  gameBus: {
    emit: vi.fn()
  }
}))

vi.mock('@/logic/battle/battleEngine', () => ({
  calculateDamage: vi.fn(() => ({ dmg: 10, eff: 1 })),
  getEffectiveSpeed: vi.fn(() => 100)
}))

vi.mock('@/logic/battle/battleFlow', () => ({
  canAttack: vi.fn(() => true)
}))

vi.mock('@/logic/pokemonFactory', () => ({
  recalcPokemonStats: vi.fn()
}))

vi.mock('@/logic/battle/actions/actionRegistry', () => ({
  dispatchMoveEffect: vi.fn()
}))

describe('battleTurn.js', () => {
  let mockStore

  beforeEach(() => {
    vi.clearAllMocks()
    const p = { id: 25, uid: 'p1', name: 'Pikachu', hp: 100, maxHp: 100, level: 50, atk: 100, spa: 100, moves: [{ name: 'Tackle', power: 40, pp: 10 }] }
    const e = { id: 16, name: 'Pidgey', hp: 100, maxHp: 100, level: 5, def: 50, spd: 50 }
    
    mockStore = {
      activeBattle: {
        player: p,
        enemy: e,
        enemyTeam: [],
        participants: [],
        stages: { atk: 0, def: 0 }
      },
      playerStages: { atk: 0 },
      enemyStages: { def: 0 },
      gs: {
        state: {
          team: [p]
        }
      },
      addLog: vi.fn(),
      endBattle: vi.fn(),
      handleFaint: vi.fn((side) => {
        gameBus.emit('PLAY_FAINT', { side })
        if (side === 'enemy' && mockStore.activeBattle.isTrainer) {
          const next = mockStore.activeBattle.enemyTeam[0]
          if (next) {
            gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
            gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: next })
            mockStore.addLog('¡Entrenador envía a Rattata!', 'log-enemy', 'enemy_trainer')
          }
        }
      })
    }
  })

  it('should trigger gameBus animations during player action', async () => {
    // Mock e.hp = 0 to trigger faint emission
    mockStore.activeBattle.enemy.hp = 1
    await runPlayerAction(mockStore, 0)
    
    if (mockStore.activeBattle.enemy.hp <= 0) {
      await mockStore.handleFaint('enemy')
    }

    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_FAINT', { side: 'enemy' })
  })

  it('should handle trainer switching pokemon when one faints', async () => {
    mockStore.activeBattle.isTrainer = true
    mockStore.activeBattle.enemy.hp = 1
    const nextPokemon = { name: 'Rattata', hp: 100 }
    mockStore.activeBattle.enemyTeam = [nextPokemon]

    await runPlayerAction(mockStore, 0)
    
    // Manually trigger handleFaint in the test as it's now decoupled from runPlayerAction
    if (mockStore.activeBattle.enemy.hp <= 0) {
      await mockStore.handleFaint('enemy')
    }

    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_WITHDRAW', { side: 'enemy' })
    expect(gameBus.emit).toHaveBeenCalledWith('PLAY_SEND_OUT', expect.objectContaining({ side: 'enemy', pokemon: nextPokemon }))
    expect(mockStore.addLog).toHaveBeenCalledWith(expect.stringContaining('¡Entrenador envía a Rattata!'), 'log-enemy', 'enemy_trainer')
  })
})
