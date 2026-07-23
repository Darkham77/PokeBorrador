import { describe, it, expect } from 'vitest'
import { checkLockedVolatiles, resetPlayerStages } from '@/logic/battle/actions/switchActionHelpers'

describe('switchActionHelpers', () => {
  it('correctly detects locked volatile moves on old pokemon', () => {
    expect(checkLockedVolatiles({ volatileCounters: { twoturnmove: 1 } })).toBe(true)
    expect(checkLockedVolatiles({ volatileCounters: { lockedmove: 1 } })).toBe(true)
    expect(checkLockedVolatiles({ volatileCounters: {} })).toBe(false)
    expect(checkLockedVolatiles(null)).toBe(false)
  })

  it('correctly resets player stat stages to 0', () => {
    const current = { atk: 2, def: -1, spa: 3, spd: 0, spe: -2, acc: 1, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 } as any
    expect(resetPlayerStages(current)).toEqual({
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    })
  })
})
