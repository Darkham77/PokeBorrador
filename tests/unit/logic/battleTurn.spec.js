import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPlayerAction } from '@/logic/battle/battleTurn'
import { phaserBridge } from '@/logic/phaserBridge'

vi.mock('@/logic/phaserBridge', () => ({
  phaserBridge: {
    sendCommand: vi.fn(),
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
    const p = { id: 25, uid: 'p1', name: 'Pikachu', hp: 100, maxHP: 100, level: 50, atk: 100, spa: 100, moves: [{ name: 'Tackle', power: 40, pp: 10 }] }
    const e = { id: 16, name: 'Pidgey', hp: 100, maxHP: 100, level: 5, def: 50, spd: 50 }
    
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
      endBattle: vi.fn()
    }
  })

  it('should trigger phaser commands during player action', async () => {
    await runPlayerAction(mockStore, 0)
    expect(phaserBridge.sendCommand).toHaveBeenCalled()
  })
})
