import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { canExecuteScriptedReplayAction, isReplaySwitchRequired } from '../../../src/logic/battle/helpers/scriptedReplayReadiness.ts'

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

  it('detects replay switch requirement when in SWITCH_MENU, on forced switch, or vacated seat', () => {
    assert.equal(isReplaySwitchRequired({ subState: 'SWITCH_MENU' }), true)
    assert.equal(isReplaySwitchRequired({ hasPendingForceSwitch: true }), true)
    assert.equal(isReplaySwitchRequired({ isBattleActive: true, isOver: false, hasPlayer: false, hasEnemy: true }), true)
    assert.equal(isReplaySwitchRequired({ isBattleActive: true, isOver: false, hasPlayer: true, hasEnemy: true, subState: 'WAIT_INPUT' }), false)
    assert.equal(isReplaySwitchRequired({ isOver: true, subState: 'SWITCH_MENU' }), false)
  })
})
