import { describe, it, expect } from 'vitest'
import { calculateDamagePure } from '../../../src/logic/battle/battleMath.ts'

describe('BUG-141 to BUG-160: Showdown 1:1 Parity Batch 8 Suite', () => {
  it('BUG-141: Solar Power applies 1.5x special attack multiplier in Sun', () => {
    const attackerNormal = { id: 'charizard', level: 50, type: 'fire', ability: '', spa: 100 }
    const attackerSolar = { id: 'charizard', level: 50, type: 'fire', ability: 'solarpower', spa: 100 }
    const defender = { id: 'blastoise', level: 50, type: 'water', hp: 200, maxHp: 200 }
    const move = { id: 'flamethrower', type: 'fire', power: 90, cat: 'special' as const }
    const sunCtx = { weather: { type: 'sun', turns: 5 } }
    
    const dmgNormal = calculateDamagePure(attackerNormal, defender, move, sunCtx)
    const dmgSolar = calculateDamagePure(attackerSolar, defender, move, sunCtx)
    
    expect(dmgSolar.damage!).toBeGreaterThan(dmgNormal.damage!)
  })
})
