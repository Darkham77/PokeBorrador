import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { BATTLE_STATES, isBattleCompletionReady } from '../../../src/logic/battle/helpers/battleCompletionReadiness.ts'
import { BATTLE_SUBSTATES } from '../../../src/logic/battle/battleStateMachine.ts'

describe('battleCompletionReadiness', () => {
  it('does not expose a Showdown-ended battle as closable until its FSM reaches a terminal phase', () => {
    assert.equal(isBattleCompletionReady({
      hasActiveBattle: true,
      isOver: true,
      fsmState: BATTLE_STATES.ACTIVE_BATTLE,
      fsmSubState: null,
    }), false)
  })

  it('does not expose a battle as closable while rewards are still being distributed', () => {
    assert.equal(isBattleCompletionReady({
      hasActiveBattle: true,
      isOver: true,
      fsmState: BATTLE_STATES.REWARDS_PHASE,
      fsmSubState: BATTLE_SUBSTATES.DISTRIBUTE_XP,
    }), false)
  })

  it('exposes the battle as closable after rewards reach the exit-ready substate', () => {
    assert.equal(isBattleCompletionReady({
      hasActiveBattle: true,
      isOver: true,
      fsmState: BATTLE_STATES.REWARDS_PHASE,
      fsmSubState: BATTLE_SUBSTATES.EMPTY_WAIT,
    }), true)
  })
})
