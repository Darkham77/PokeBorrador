import { describe, it, expect } from 'vitest'
import { calculateEscapeChancePure } from '../../../src/logic/battle/battleCatchMath.ts'

describe('BUG-021 to BUG-040: Showdown 1:1 Parity Batch 2 Suite', () => {
  it('BUG-031: Escape chance calculation evaluates correctly for fast pokemon', () => {
    const player = { id: 'pikachu', level: 50, speed: 100, type: 'electric' }
    const wild = { id: 'pidgey', level: 50, speed: 50, type: 'normal' }
    const canEscape = calculateEscapeChancePure(player, wild, 1, null)
    expect(canEscape).toBe(true)
  })
})
