import { describe, expect, it } from 'vitest'
import { nextBattleReadyEventKey } from '@/logic/battle/helpers/battleReadyEventKey.ts'

describe('battle ready event deduplication', () => {
  it('suppresses a repeated availability event in the same input state', () => {
    expect(nextBattleReadyEventKey('WAIT_INPUT_move_0', true, 'WAIT_INPUT_move_0')).toBeNull()
  })

  it('clears the key when battle leaves an input state so the next real input transition emits again', () => {
    const afterTurnStarts = nextBattleReadyEventKey('WAIT_INPUT_move_0', false, '')
    expect(afterTurnStarts).toBe('')
    if (afterTurnStarts === null) throw new Error('Non-input transition must clear the deduplication key.')
    expect(nextBattleReadyEventKey(afterTurnStarts, true, 'WAIT_INPUT_move_0')).toBe('WAIT_INPUT_move_0')
  })
})
