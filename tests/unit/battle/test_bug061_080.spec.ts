import { describe, it, expect } from 'vitest'
import { calculateDamagePure } from '../../../src/logic/battle/battleMath.ts'

describe('BUG-061 to BUG-080: Showdown 1:1 Parity Batch 4 Suite', () => {
  it('BUG-064: Choice Specs applies 1.5x special attack multiplier appropriately', () => {
    const attackerNormal = { id: 'alakazam', level: 50, type: 'psychic', heldItem: '' }
    const attackerSpecs = { id: 'alakazam', level: 50, type: 'psychic', heldItem: 'choicespecs' }
    const defender = { id: 'snorlax', level: 50, type: 'normal', hp: 200, maxHp: 200 }
    const move = { id: 'psychic', type: 'psychic', power: 90, cat: 'special' as const }
    
    const dmgNormal = calculateDamagePure(attackerNormal, defender, move, { weather: null })
    const dmgSpecs = calculateDamagePure(attackerSpecs, defender, move, { weather: null })
    
    expect(dmgSpecs.damage!).toBeGreaterThan(dmgNormal.damage!)
  })
})
