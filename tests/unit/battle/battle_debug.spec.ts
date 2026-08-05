import { describe, it, expect } from 'vitest'
import { canExecuteScriptedReplayAction } from '@/logic/battle/helpers/scriptedReplayReadiness'

describe('battleDebug - Scripted Replay Readiness', () => {
  it('should return true when in WAIT_INPUT subState and ready', () => {
    const ready = canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'WAIT_INPUT',
      isProcessing: false,
      isIntroAnimating: false,
      hasPendingSwitch: false,
    })
    expect(ready).toBe(true)
  })

  it('should return true when in SWITCH_MENU even during intro or pending switch', () => {
    const ready = canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'SWITCH_MENU',
      isProcessing: false,
      isIntroAnimating: true,
      hasPendingSwitch: true,
    })
    expect(ready).toBe(true)
  })

  it('should return false when isProcessing is true', () => {
    const ready = canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'WAIT_INPUT',
      isProcessing: true,
      isIntroAnimating: false,
      hasPendingSwitch: false,
    })
    expect(ready).toBe(false)
  })

  it('should return false when subState is invalid or intro animating during WAIT_INPUT', () => {
    const notReadySubState = canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'FIRST_INTRO',
      isProcessing: false,
      isIntroAnimating: false,
      hasPendingSwitch: false,
    })
    expect(notReadySubState).toBe(false)

    const notReadyIntro = canExecuteScriptedReplayAction({
      isActiveBattle: true,
      subState: 'WAIT_INPUT',
      isProcessing: false,
      isIntroAnimating: true,
      hasPendingSwitch: false,
    })
    expect(notReadyIntro).toBe(false)
  })
})
