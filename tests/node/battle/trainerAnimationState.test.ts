import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import { isTrainerTransitionActive } from '../../../src/composables/battle/useBattleTrainerAnimations.ts'

describe('trainerAnimationState', () => {
  it('only trainer entry and retreat block scripted battle input', () => {
    assert.equal(isTrainerTransitionActive('entering'), true)
    assert.equal(isTrainerTransitionActive('retreating'), true)
    assert.equal(isTrainerTransitionActive('idle'), false)
    assert.equal(isTrainerTransitionActive(null), false)
  })
})
