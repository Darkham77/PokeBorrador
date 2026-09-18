import { describe, it, expect, vi } from 'vitest'
import { executeCanonicalTurn } from '@/logic/battle/helpers/canonicalTurnRunner'
import { createBattleSession } from '@/logic/battle/session/battleSessionFactory'
import { SpectatorBattleSession } from '@/logic/battle/session/spectatorBattleSession'
import { ReplayBattleSession } from '@/logic/battle/session/replayBattleSession'
import type { BattleContext } from '@/types/battle/battleContext'
import type { ITacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine'

vi.mock('@/logic/battle/showdownWorkerClient.ts', () => ({
  showdownWorker: {},
  executeTurnInWorker: vi.fn(async (_p1Choice: string, _p2Choice: string) => ({
    logs: [
      '|turn|1',
      '|move|p1a: Pikachu|Thunderbolt|p2a: Pidgey',
      '|-damage|p2a: Pidgey|20/100',
      '|move|p2a: Pidgey|Tackle|p1a: Pikachu',
      '|-damage|p1a: Pikachu|80/100'
    ],
    isOver: false,
    winner: null,
    p1Request: { active: [{ moves: [{ id: 'thunderbolt' }] }] },
    p2Request: { active: [{ moves: [{ id: 'tackle' }] }] }
  })),
  syncTeamsFromLastWorkerState: vi.fn(async () => {})
}))

vi.mock('@/logic/battle/showdownBridge.ts', () => ({
  filterShowdownLogs: vi.fn((logs: string[]) => logs)
}))

vi.mock('@/logic/battle/helpers/turnActionResolver.ts', () => ({
  parseLogsWithSkip: vi.fn(async () => {}),
  resolvePostTurnSwitchesAndFaints: vi.fn(async () => false)
}))

function createMockBattleContext(): BattleContext {
  const p = { id: '25', uid: 'p1', name: 'Pikachu', hp: 100, maxHp: 100, level: 50, moves: [] }
  const e = { id: '16', uid: 'e1', name: 'Pidgey', hp: 100, maxHp: 100, level: 5, moves: [] }
  return {
    activeBattle: {
      value: {
        player: p,
        enemy: e,
        playerTeam: [p],
        enemyTeam: [e],
        participants: ['p1', 'e1'],
        turnCount: 0,
        over: false
      }
    },
    fsm: {
      transition: vi.fn().mockResolvedValue(true)
    },
    BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
    BATTLE_SUBSTATES: {
      BUILD_QUEUE: 'BUILD_QUEUE',
      POP_ACTION: 'POP_ACTION',
      APPLY_MOVE: 'APPLY_MOVE',
      EVAL_HP: 'EVAL_HP'
    },
    addLog: vi.fn(),
    endBattle: vi.fn().mockResolvedValue(undefined),
    persistBattle: vi.fn()
  } as unknown as BattleContext
}

describe('Unified Battle Engine Parity', () => {
  it('executes turn through canonical turn runner identically for both PvE and PvP', async () => {
    const ctx = createMockBattleContext()
    const onTurnResult = vi.fn()

    const result = await executeCanonicalTurn(
      ctx,
      'move 1',
      'move 1',
      false,
      false,
      onTurnResult
    )

    expect(result.logs.length).toBeGreaterThan(0)
    expect(result.isOver).toBe(false)
    expect(ctx.activeBattle.value?.turnCount).toBe(1)
    expect(onTurnResult).toHaveBeenCalledWith(result)
    expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'BUILD_QUEUE')
    expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'POP_ACTION')
    expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'APPLY_MOVE')
    expect(ctx.fsm.transition).toHaveBeenCalledWith('ACTIVE_BATTLE', 'EVAL_HP')
  })

  it('runs replay step-by-step through ReplayBattleSession using the exact same parseLogs pipeline', async () => {
    const ctx = createMockBattleContext()
    const mockEngine = {
      nextTurn: vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false),
      getLogsForCurrentTurn: vi.fn().mockReturnValue(['|move|p1a: Pikachu|Thunderbolt|p2a: Pidgey']),
      isOver: vi.fn().mockReturnValue(false),
      getWinnerSide: vi.fn().mockReturnValue('p1'),
      getCurrentTurn: vi.fn().mockReturnValue(1),
      getTotalTurns: vi.fn().mockReturnValue(5)
    } as unknown as ITacticalReplayEngine

    const session = createBattleSession('replay', ctx, { engine: mockEngine }) as ReplayBattleSession
    expect(session.uiConfig.showReplayControls).toBe(true)
    expect(session.uiConfig.showActionButtons).toBe(false)

    const stepped = await session.stepNext()
    expect(stepped).toBe(true)
    expect(mockEngine.nextTurn).toHaveBeenCalled()

    const { parseLogsWithSkip } = await import('@/logic/battle/helpers/turnActionResolver')
    expect(parseLogsWithSkip).toHaveBeenCalled()
  })

  it('handles live spectator stream lines through SpectatorBattleSession with identical visual sync', async () => {
    const ctx = createMockBattleContext()
    const session = createBattleSession('pvp_spectator', ctx, { matchId: 'live-4821' }) as SpectatorBattleSession

    expect(session.uiConfig.showSpectatorBadge).toBe(true)
    expect(session.uiConfig.showTurnTimer).toBe(true)
    expect(session.uiConfig.showActionButtons).toBe(false)

    await session.onStreamTurn({
      streamLines: ['|-damage|p1a: Pikachu|50/100'],
      turnNumber: 2,
      turn: 2,
      over: false,
      winnerSide: undefined
    })

    const { parseLogsWithSkip } = await import('@/logic/battle/helpers/turnActionResolver')
    expect(parseLogsWithSkip).toHaveBeenCalled()
  })
})
