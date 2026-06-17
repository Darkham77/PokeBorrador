/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLivePvPStore } from '@/stores/livePvP'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/data/battle/moves', () => ({
  MOVE_DATA: {
    'Tackle': { power: 40, type: 'normal', cat: 'physical', acc: 100, priority: 0 }
  }
}))

describe('LivePvPStore (Combat Engine)', () => {
  const dbMock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'inv_1' }, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn(),
      unsubscribe: vi.fn()
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    const game = useGameStore()
    
    auth.user = { id: 'user_1', user_metadata: { username: 'Player 1' } } as unknown as NonNullable<typeof auth.user>
    
    // Setup insert chain
    dbMock.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'inv_1' }, error: null })
      })
    })

    ;(game as unknown as { db: unknown }).db = dbMock
    
    game.state = {
      team: [
        { name: 'Pikachu', hp: 100, maxHp: 100, atk: 55, def: 40, spa: 50, spd: 50, spe: 90, level: 50, type: 'electric', moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon
      ]
    } as unknown as typeof game.state
  })

  it('should send battle invite correctly', async () => {
    const pvp = useLivePvPStore()
    
    await pvp.sendInvite('user_2', 'Player 2')
    
    expect(dbMock.from).toHaveBeenCalledWith('battle_invites')
    expect(dbMock.insert).toHaveBeenCalledWith({
      challenger_id: 'user_1',
      opponent_id: 'user_2',
      status: 'pending'
    })
  })

  it('should resolve turn correctly when both players move', async () => {
    const pvp = useLivePvPStore()
    
    // Setup Battle
    pvp.startBattle({ id: 'inv_1', challenger_id: 'user_1', opponent_id: 'user_2' } as unknown as Parameters<typeof pvp.startBattle>[0], true, false)
    pvp.battleState.enemyTeam = [
      { name: 'Rattata', hp: 80, maxHp: 80, atk: 56, def: 35, spa: 25, spd: 35, spe: 72, level: 50, type: 'normal', moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }] } as unknown as Pokemon
    ]
    pvp.battleState.enemyHp = [80]
    pvp.battleState.phase = 'choosing'
    
    // Commit my pick
    pvp._commitPick({ type: 'move', moveIndex: 0 })
    
    // Simulate opponent pick (via handleOpponentPick)
    pvp.handleOpponentPick({ payload: { type: 'move', moveIndex: 0 } })
    
    // Host (me) should have resolved turn
    expect(pvp.battleState.phase).toBe('animating')
    // Damage should have been applied (Pikachu is faster)
    expect(pvp.battleState.enemyHp[0]).toBeLessThan(80)
  })

  it('should end battle when enemy team is defeated', async () => {
    const pvp = useLivePvPStore()
    
    pvp.startBattle({ id: 'inv_1', challenger_id: 'user_1', opponent_id: 'user_2' } as unknown as Parameters<typeof pvp.startBattle>[0], true, false)
    pvp.battleState.enemyHp = [0]
    pvp.battleState.enemyActiveIdx = 0
    
    // Trigger post-turn check
    pvp._checkPostTurn()
    
    expect(pvp.battleState.phase).toBe('over')
    expect(pvp.battleState.active).toBe(false)
  })
})
