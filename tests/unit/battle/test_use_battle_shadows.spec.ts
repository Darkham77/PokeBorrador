import { describe, it, expect } from 'vitest'
import { isFlying, computeShadowCoords, computeShadowBodyRadius } from '@/composables/battle/useBattleShadows'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('useBattleShadows helpers', () => {
  it('correctly calculates isFlying for floating vs grounded species', () => {
    expect(isFlying({ id: 'butterfree' } as unknown as Pokemon)).toBe(true)
    expect(isFlying({ id: 'pikachu' } as unknown as Pokemon)).toBe(false)
  })

  it('correctly resolves shadow coordinates for form-based species without throwing', () => {
    const castformSunny = { id: 'castform', form: 'sunny' } as unknown as Pokemon
    const coords = computeShadowCoords(castformSunny, false)
    expect(coords).toBeDefined()
    expect(typeof coords.x).toBe('number')
    expect(typeof coords.y).toBe('number')

    const castformSunnyHyphen = { id: 'castform-sunny' } as unknown as Pokemon
    const coordsHyphen = computeShadowCoords(castformSunnyHyphen, false)
    expect(coordsHyphen).toBeDefined()
    expect(typeof coordsHyphen.x).toBe('number')
    expect(typeof coordsHyphen.y).toBe('number')

    const radius = computeShadowBodyRadius(castformSunny, false)
    expect(radius).toBeDefined()
    expect(typeof radius).toBe('string')
  })
})

