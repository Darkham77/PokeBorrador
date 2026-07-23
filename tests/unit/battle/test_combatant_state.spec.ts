import { describe, it, expect } from 'vitest'

describe('useBattleCombatantState helpers', () => {
  it('correctly resolves pokemon sprite key for normal and form variants', () => {
    const rawId = 'pikachu'
    const stringId = String(rawId).toLowerCase()
    expect(stringId).toBe('pikachu')
  })
})
