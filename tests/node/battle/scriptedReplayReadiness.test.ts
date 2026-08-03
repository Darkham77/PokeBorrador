import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { canExecuteScriptedReplayAction } from '../../../src/logic/battle/helpers/scriptedReplayReadiness.ts'

describe('scriptedReplayReadiness', () => {
  it('a certified replacement remains actionable while SWITCH_MENU records its pending switch', () => {
    assert.equal(canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'SWITCH_MENU',
      isProcessing: false,
      isIntroAnimating: false,
      hasPendingSwitch: true,
    }), true)
  })

  it('pending switches remain blocked outside the switch-selection state', () => {
    assert.equal(canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'WAIT_INPUT',
      isProcessing: false,
      isIntroAnimating: false,
      hasPendingSwitch: true,
    }), false)
  })

  it('a switch-selection state remains actionable when an unrelated intro marker is stale', () => {
    assert.equal(canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'SWITCH_MENU',
      isProcessing: false,
      isIntroAnimating: true,
      hasPendingSwitch: false,
    }), true)
  })
})
