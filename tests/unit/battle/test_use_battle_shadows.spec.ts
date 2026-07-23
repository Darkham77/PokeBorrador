import { describe, it, expect } from 'vitest'
import { isFlying } from '@/composables/battle/useBattleShadows'

describe('useBattleShadows helpers', () => {
  it('correctly calculates isFlying for floating vs grounded species', () => {
    expect(isFlying({ id: 'butterfree' } as any)).toBe(true)
    expect(isFlying({ id: 'pikachu' } as any)).toBe(false)
  })
})
