import { describe, it, expect } from 'vitest'
import { getEffectiveStatPure } from '../../../src/logic/battle/battleMath.ts'

describe('BUG-121 to BUG-140: Showdown 1:1 Parity Batch 7 Suite', () => {
  it('BUG-121: Paralyze status applies 0.5x speed multiplier in Gen 7+', () => {
    const pokeNormal = { id: 'zapdos', level: 50, spe: 100, status: '', type: 'electric' }
    const pokePar = { id: 'zapdos', level: 50, spe: 100, status: 'par', type: 'electric' }
    
    const speNormal = getEffectiveStatPure(pokeNormal, 'spe', {}, null, undefined)
    const spePar = getEffectiveStatPure(pokePar, 'spe', {}, null, undefined)
    
    expect(spePar).toBe(Math.floor(speNormal * 0.5))
  })
})
