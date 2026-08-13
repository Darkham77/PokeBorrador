import { describe, expect, it } from 'vitest'
import { BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine.ts'
import { BATTLE_UI_EVENTS, isBattleReadyForInputDetail } from '@/types/battle/battleEvents.ts'

describe('battle UI event contract', () => {
  it('exposes the canonical readiness event and accepts its typed detail', () => {
    expect(BATTLE_UI_EVENTS.READY_FOR_INPUT).toBe('battle-ready-for-input')
    expect(isBattleReadyForInputDetail({
      subState: BATTLE_SUBSTATES.WAIT_INPUT,
      p1ChoiceIdx: 0,
      p2ChoiceIdx: 0,
      over: false,
      playerSwitchSlots: [],
    })).toBe(true)
  })

  it('rejects a non-canonical battle substate at the browser event boundary', () => {
    expect(isBattleReadyForInputDetail({
      subState: 'UNSAFE_TEST_STATE',
      p1ChoiceIdx: 0,
      p2ChoiceIdx: 0,
      over: false,
    })).toBe(false)
  })

  it('rejects readiness without the public Showdown switch-slot projection', () => {
    expect(isBattleReadyForInputDetail({
      subState: BATTLE_SUBSTATES.WAIT_INPUT,
      p1ChoiceIdx: 0,
      p2ChoiceIdx: 0,
      over: false,
    })).toBe(false)
  })
})
