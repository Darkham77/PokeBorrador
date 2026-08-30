import { describe, it, expect, vi } from 'vitest'

vi.mock('@/logic/battle/showdownWorkerClient.ts', () => ({
  showdownWorker: {},
  getShowdownWorker: vi.fn().mockReturnValue({}),
  executeTurnInWorker: vi.fn().mockResolvedValue({
    logs: ['|faint|p1a: Rattata'],
    isOver: false,
    winner: null,
    p1Request: { active: [{ moves: [] }] }
  }),
  syncTeamsFromLastWorkerState: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/logic/battle/showdownBridge.ts', () => ({
  filterShowdownLogs: vi.fn().mockReturnValue([]),
  parseShowdownLogLine: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('@/logic/battle/ai/battleAI.ts', () => ({
  shouldEnemySwitch: vi.fn().mockReturnValue(false),
  findBestSwitchIndex: vi.fn().mockReturnValue(0),
  decideEnemyMove: vi.fn().mockReturnValue({ id: 'submission' })
}))

vi.mock('@/logic/battle/resolution.ts', () => ({
  processFaint: vi.fn().mockResolvedValue(undefined)
}))

import { processNonForcedSwitchWorkerTurn } from '@/logic/battle/actions/switchWorkerTurn'

describe('processNonForcedSwitchWorkerTurn faint handling', () => {
  it('triggers processFaint when player HP drops to 0 after switch turn', async () => {
    const transitions: string[] = []
    const mockCtx: any = {
      gs: { state: { team: [{ uid: 'p1', name: 'Rattata', hp: 0 }] } },
      activeBattle: {
        value: {
          player: { uid: 'p1', name: 'Rattata', hp: 0 },
          enemy: { uid: 'e1', name: 'Mankey', hp: 10 },
          participants: ['p1'],
          playerRequest: {
            active: [{ moves: [] }],
            side: { pokemon: [{ uid: 'p1' }] }
          }
        }
      },
      fsm: {
        transition: vi.fn((state, subState) => {
          transitions.push(`${state}:${subState || ''}`)
          return Promise.resolve()
        })
      },
      BATTLE_STATES: { ACTIVE_BATTLE: 'ACTIVE_BATTLE' },
      BATTLE_SUBSTATES: {
        BUILD_QUEUE: 'BUILD_QUEUE',
        POP_ACTION: 'POP_ACTION',
        APPLY_MOVE: 'APPLY_MOVE',
        EVAL_HP: 'EVAL_HP',
        PLAYER_FAINT_SEQ: 'PLAYER_FAINT_SEQ'
      },
      enemyStages: { value: {} }
    }

    await processNonForcedSwitchWorkerTurn(mockCtx, { uid: 'p1', hp: 0, name: 'Rattata' } as any, null)

    expect(transitions).toContain('ACTIVE_BATTLE:PLAYER_FAINT_SEQ')
  })
})
