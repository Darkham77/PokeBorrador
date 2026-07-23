import { describe, it, expect } from 'vitest'
import { isFlying } from '@/composables/battle/useBattleShadows'

describe('useBattleCombatantAnims helpers', () => {
  it('correctly detects floating status for shadows and idle animations', () => {
    expect(isFlying({ id: 'butterfree' } as any)).toBe(true)
    expect(isFlying({ id: 'pikachu' } as any)).toBe(false)
  })
})
