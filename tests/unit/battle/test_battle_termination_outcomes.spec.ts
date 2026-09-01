import { describe, it, expect, vi } from 'vitest'
import {
  handleBattleDefeatFlow,
  handleBattleFleeFlow,
} from '@/logic/battle/battleTerminationOutcomes'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState } from '@/types/battle/battle'

describe('battleTerminationOutcomes', () => {
  it('triggers defeat audio and transitions to DEFEAT_SCREEN in defeat flow', async () => {
    const transitions: string[] = []
    const mockAudio = {
      play: vi.fn(),
    }
    const mockFsm = {
      currentState: { value: 'REWARDS_PHASE' },
      transition: vi.fn(async (state: string, substate?: string) => {
        transitions.push(`${state}:${substate || ''}`)
      }),
    }
    const mockActive = {
      id: 'b1',
      player: {},
      enemy: {},
      over: false,
    } as unknown as BattleState

    const mockCtx = {
      activeBattle: { value: mockActive },
      fsm: mockFsm,
      audio: mockAudio,
      gs: { save: vi.fn() },
      BATTLE_STATES: { REWARDS_PHASE: 'REWARDS_PHASE', EXIT_BATTLE: 'EXIT_BATTLE' },
      BATTLE_SUBSTATES: {
        EMPTY_WAIT: 'EMPTY_WAIT',
        ENTRY_CHECK: 'ENTRY_CHECK',
        DEFEAT_SCREEN: 'DEFEAT_SCREEN',
        DEFEAT_WAIT: 'DEFEAT_WAIT',
      },
    } as unknown as BattleContext

    await handleBattleDefeatFlow(mockCtx, mockActive)

    expect(mockAudio.play).toHaveBeenCalledWith('defeat')
    expect(transitions).toContain('EXIT_BATTLE:DEFEAT_SCREEN')
  })

  it('handles flee flow and transitions to map for single battle', async () => {
    const transitions: string[] = []
    const mockFsm = {
      currentState: { value: 'ACTIVE_BATTLE' },
      transition: vi.fn(async (state: string, substate?: string) => {
        transitions.push(`${state}:${substate || ''}`)
      }),
    }
    const mockActive = {
      id: 'b2',
      playerFled: true,
      over: true,
    } as unknown as BattleState

    const completeBattleFlow = vi.fn()
    const mockCtx = {
      activeBattle: { value: mockActive },
      fsm: mockFsm,
      clearLogs: vi.fn(),
      waitForLogs: vi.fn(),
      completeBattleFlow,
      BATTLE_STATES: { REWARDS_PHASE: 'REWARDS_PHASE', EXIT_BATTLE: 'EXIT_BATTLE' },
      BATTLE_SUBSTATES: {
        WAIT_LOG_QUEUE_ONLY: 'WAIT_LOG_QUEUE_ONLY',
        ENTRY_CHECK: 'ENTRY_CHECK',
        EXECUTE_CLEANUP: 'EXECUTE_CLEANUP',
        CLEAR_UI: 'CLEAR_UI',
        TRIGGER_CLOSE: 'TRIGGER_CLOSE',
        RESET_FLAGS: 'RESET_FLAGS',
        EMPTY_WAIT: 'EMPTY_WAIT',
      },
    } as unknown as BattleContext

    await handleBattleFleeFlow(mockCtx, mockActive, true)

    expect(completeBattleFlow).toHaveBeenCalledWith('map')
    expect(transitions).toContain('EXIT_BATTLE:TRIGGER_CLOSE')
  })
})
