import { describe, it, expect, vi, beforeEach } from 'vitest'
import { terminateBattle } from '@/logic/battle/resolution'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'

interface MockFSM {
  currentState: { value: string };
  transition: (s: string, _sub?: string) => Promise<void>;
}

interface MockCtx {
  activeBattle: {
    value: {
      enemy: { id: number; name: string } | null;
      _initialEnemy: { id: number; name: string } | null;
      over: boolean;
      locationId: string;
    } | null;
  };
  fsm: MockFSM;
  faintedSides: {
    value: {
      clear: () => void;
    };
  };
  gs: {
    state: { activeBattle: unknown };
    save: () => Promise<void>;
  };
  BATTLE_STATES: typeof BATTLE_STATES;
  BATTLE_SUBSTATES: typeof BATTLE_SUBSTATES;
  waitForLogs: () => Promise<void>;
  completeBattleFlow: () => Promise<void>;
}

describe('resolution.js - terminateBattle', () => {
  let mockCtx: MockCtx

  beforeEach(() => {
    mockCtx = {
      activeBattle: {
        value: {
          enemy: { id: 19, name: 'Rattata' },
          _initialEnemy: { id: 19, name: 'Rattata' },
          over: false,
          locationId: 'route1'
        }
      },
      fsm: {
        currentState: { value: BATTLE_STATES.ACTIVE_BATTLE },
        transition: vi.fn(async (s: string, _sub?: string) => {
          mockCtx.fsm.currentState.value = s
        })
      },
      faintedSides: {
        value: {
          clear: vi.fn()
        }
      },
      gs: {
        state: { activeBattle: {} },
        save: vi.fn(async () => {})
      },
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      waitForLogs: vi.fn(async () => {}),
      completeBattleFlow: vi.fn(async () => {})
    }
  })

  it('should cleanup _initialEnemy when terminating battle', async () => {
    await terminateBattle(mockCtx as unknown as Parameters<typeof terminateBattle>[0], true, true) // Fled = true for short path
    
    expect(mockCtx.activeBattle.value!._initialEnemy).toBeNull()
    expect(mockCtx.activeBattle.value!.enemy).toBeNull()
  })

  it('should handle missing activeBattle gracefully', async () => {
    mockCtx.activeBattle.value = null
    
    await terminateBattle(mockCtx as unknown as Parameters<typeof terminateBattle>[0], true)
    
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.EXIT_BATTLE)
  })
})
