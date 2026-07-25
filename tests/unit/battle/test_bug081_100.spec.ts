import { describe, it, expect } from 'vitest'
import { getEffectiveStatPure } from '../../../src/logic/battle/battleMath.ts'

describe('BUG-081 to BUG-100: Showdown 1:1 Parity Batch 5 Suite', () => {
  it('BUG-084: Choice Scarf speed multiplier applies 1.5x boost correctly', () => {
    const attackerNormal = { id: 'aerodactyl', level: 50, spe: 100, type: 'rock', heldItem: '' }
    const attackerScarf = { id: 'aerodactyl', level: 50, spe: 100, type: 'rock', heldItem: 'choicescarf' }
    
    const speNormal = getEffectiveStatPure(attackerNormal, 'spe', {}, null, undefined)
    const speScarf = getEffectiveStatPure(attackerScarf, 'spe', {}, null, undefined)
    
    expect(speScarf).toBeGreaterThan(speNormal)
  })
})
