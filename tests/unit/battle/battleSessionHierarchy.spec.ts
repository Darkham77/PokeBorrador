import { describe, it, expect, vi } from 'vitest'
import { BaseBattleSession } from '@/logic/battle/session/baseBattleSession'
import { PvEBattleSession } from '@/logic/battle/session/pveBattleSession'
import { GymBattleSession } from '@/logic/battle/session/gymBattleSession'
import { PvPBattleSession } from '@/logic/battle/session/pvpBattleSession'
import { SpectatorBattleSession } from '@/logic/battle/session/spectatorBattleSession'
import { ReplayBattleSession } from '@/logic/battle/session/replayBattleSession'
import { createBattleSession } from '@/logic/battle/session/battleSessionFactory'
import type { BattleContext } from '@/types/battle/battleContext'
import type { ITacticalReplayEngine } from '@/logic/battle/replay/tacticalReplayEngine'

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

describe('BattleSession Hierarchy', () => {
  it('instantiates PvEBattleSession for wild encounters', () => {
    const ctx = createMockBattleContext()
    const session = createBattleSession('wild', ctx)

    expect(session).toBeInstanceOf(BaseBattleSession)
    expect(session).toBeInstanceOf(PvEBattleSession)
    expect(session.mode).toBe('wild')
    expect(session.uiConfig.allowCatch).toBe(true)
    expect(session.uiConfig.allowBag).toBe(true)
    expect(session.uiConfig.showTurnTimer).toBe(false)
  })

  it('instantiates GymBattleSession for gym battles inheriting from PvEBattleSession', () => {
    const ctx = createMockBattleContext()
    const session = createBattleSession('gym', ctx, { gymId: 'pewter' })

    expect(session).toBeInstanceOf(BaseBattleSession)
    expect(session).toBeInstanceOf(PvEBattleSession)
    expect(session).toBeInstanceOf(GymBattleSession)
    expect(session.mode).toBe('gym')
    expect(session.uiConfig.showLeaderDialogue).toBe(true)
    expect(session.uiConfig.allowCatch).toBe(false)
    expect(session.uiConfig.showTurnTimer).toBe(false)
  })

  it('instantiates PvPBattleSession for ranked and casual pvp duels inheriting from BaseBattleSession', () => {
    const ctx = createMockBattleContext()
    const session = createBattleSession('pvp_ranked', ctx, { isHost: true, ranked: true })

    expect(session).toBeInstanceOf(BaseBattleSession)
    expect(session).toBeInstanceOf(PvPBattleSession)
    expect(session).not.toBeInstanceOf(PvEBattleSession)
    expect(session.mode).toBe('pvp_ranked')
    expect(session.uiConfig.showTurnTimer).toBe(true)
    expect(session.uiConfig.allowBag).toBe(false)
    expect(session.uiConfig.allowCatch).toBe(false)
    expect(session.uiConfig.allowForfeit).toBe(true)
  })

  it('instantiates SpectatorBattleSession for live spectator mode inheriting from BaseBattleSession', () => {
    const ctx = createMockBattleContext()
    const session = createBattleSession('pvp_spectator', ctx, { matchId: 'match-123' })

    expect(session).toBeInstanceOf(BaseBattleSession)
    expect(session).toBeInstanceOf(SpectatorBattleSession)
    expect(session.mode).toBe('pvp_spectator')
    expect(session.uiConfig.showSpectatorBadge).toBe(true)
    expect(session.uiConfig.showActionButtons).toBe(false)
    expect(session.uiConfig.showTurnTimer).toBe(true)
    expect(session.uiConfig.allowBag).toBe(false)
  })

  it('instantiates ReplayBattleSession for tactical replay playback inheriting from BaseBattleSession', () => {
    const ctx = createMockBattleContext()
    const mockEngine = {
      nextTurn: vi.fn().mockReturnValue(true),
      getLogsForCurrentTurn: vi.fn().mockReturnValue(['|move|p1a: Pikachu|Thunderbolt']),
      isOver: vi.fn().mockReturnValue(false),
      getWinnerSide: vi.fn().mockReturnValue('p1')
    } as unknown as ITacticalReplayEngine

    const session = createBattleSession('replay', ctx, { engine: mockEngine })

    expect(session).toBeInstanceOf(BaseBattleSession)
    expect(session).toBeInstanceOf(ReplayBattleSession)
    expect(session.mode).toBe('replay')
    expect(session.uiConfig.showReplayControls).toBe(true)
    expect(session.uiConfig.showActionButtons).toBe(false)
    expect(session.uiConfig.showTurnTimer).toBe(false)
  })
})
