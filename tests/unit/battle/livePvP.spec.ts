/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLivePvPStore } from '@/stores/livePvP'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'

vi.mock('@/logic/battle/showdownWorkerClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/logic/battle/showdownWorkerClient')>();
  return {
    ...actual,
    executeTurnInWorker: vi.fn().mockResolvedValue({
      logs: ['|move|p1a: Pikachu|Tackle|p2a: Rattata', '|-damage|p2a: Rattata|50/80'],
      isOver: false,
      winner: null,
      p1Request: { active: [{ moves: [] }] },
      p2Request: { active: [{ moves: [] }] }
    }),
    syncTeamsFromLastWorkerState: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('@/logic/battle/helpers/turnActionResolver', () => ({
  parseLogsWithSkip: vi.fn().mockResolvedValue(undefined),
  resolvePostTurnSwitchesAndFaints: vi.fn().mockResolvedValue(undefined)
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
    
    const pika = makePokemon('pikachu', 50)!
    pika.uid = 'pika_1'
    Object.assign(game.state, {
      starterChosen: true,
      team: [pika],
      pvpTeam: ['pika_1'],
      box: []
    })
  })

  it('should send battle invite correctly', async () => {
    const pvp = useLivePvPStore()
    
    await pvp.sendInvite('user_2', 'Player 2')
    
    expect(dbMock.from).toHaveBeenCalledWith('battle_invites')
    expect(dbMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      challenger_id: 'user_1',
      opponent_id: 'user_2',
      status: 'pending'
    }))
  })

  it('should resolve turn correctly when both players move', async () => {
    const pvp = useLivePvPStore()
    const { executeTurnInWorker } = await import('@/logic/battle/showdownWorkerClient')

    // Setup Battle
    pvp.startBattle({ id: 'inv_1', challenger_id: 'user_1', opponent_id: 'user_2' } as unknown as Parameters<typeof pvp.startBattle>[0], true, false)
    const rat = makePokemon('rattata', 50)!
    pvp.battleState.enemyTeam = [rat]
    pvp.battleState.enemyHp = [80]
    pvp.battleState.phase = 'choosing'
    
    // Commit my pick
    pvp._commitPick({ type: 'move', moveIndex: 0 })
    expect(pvp.battleState.phase).toBe('waiting')
    
    // Simulate opponent pick (via handleOpponentPick)
    pvp.handleOpponentPick({ payload: { type: 'move', moveIndex: 0 } })
    
    // Allow async resolveTurn to finish
    await vi.waitFor(() => {
      expect(executeTurnInWorker).toHaveBeenCalled()
      expect(pvp.battleState.phase).toBe('choosing')
    })
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
