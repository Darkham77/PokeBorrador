import { describe, it, expect, vi, beforeEach } from 'vitest'
import { terminateBattle } from '@/logic/battle/resolution'
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine'

describe('resolution.js - terminateBattle', () => {
  let mockCtx

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
        transition: vi.fn(async (s, sub) => {
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
    await terminateBattle(mockCtx, true, true) // Fled = true for short path
    
    expect(mockCtx.activeBattle.value._initialEnemy).toBeNull()
    expect(mockCtx.activeBattle.value.enemy).toBeNull()
  })

  it('should handle missing activeBattle gracefully', async () => {
    mockCtx.activeBattle.value = null
    
    await terminateBattle(mockCtx, true)
    
    expect(mockCtx.fsm.transition).toHaveBeenCalledWith(BATTLE_STATES.EXIT_BATTLE)
  })
})
