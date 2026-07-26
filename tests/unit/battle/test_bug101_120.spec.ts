import { describe, it, expect } from 'vitest'
import { calculateDamagePure } from '../../../src/logic/battle/battleMath.ts'

describe('BUG-101 to BUG-120: Showdown 1:1 Parity Batch 6 Suite', () => {
  it('BUG-110: Burn status applies 0.5x attack penalty on physical moves', () => {
    const attackerNormal = { id: 'machamp', level: 50, type: 'fighting', status: '', atk: 100 }
    const attackerBurned = { id: 'machamp', level: 50, type: 'fighting', status: 'brn', atk: 100 }
    const defender = { id: 'snorlax', level: 50, type: 'normal', hp: 200, maxHp: 200 }
    const move = { id: 'crosschop', type: 'fighting', power: 100, cat: 'physical' as const }
    
    const dmgNormal = calculateDamagePure(attackerNormal, defender, move, { weather: null })
    const dmgBurned = calculateDamagePure(attackerBurned, defender, move, { weather: null })
    
    expect(dmgBurned.damage!).toBeLessThan(dmgNormal.damage!)
  })
})
