import { describe, it, expect } from 'vitest'
import { calculateDamagePure } from '../../../src/logic/battle/battleMath.ts'

describe('BUG-041 to BUG-060: Showdown 1:1 Parity Batch 3 Suite', () => {
  it('BUG-042: Grassy Terrain reduces earthquake damage appropriately', () => {
    const attacker = { id: 'rhyhorn', level: 50, type: 'ground' }
    const defender = { id: 'pikachu', level: 50, type: 'electric', hp: 100, maxHp: 100 }
    const move = { id: 'earthquake', type: 'ground', power: 100, cat: 'physical' as const }
    const ctxNormal = { weather: null }
    const ctxGrassy = { weather: { type: 'grassyterrain', turns: 5 } }
    
    const dmgNormal = calculateDamagePure(attacker, defender, move, ctxNormal)
    const dmgGrassy = calculateDamagePure(attacker, defender, move, ctxGrassy)
    
    expect(dmgGrassy.damage!).toBeLessThan(dmgNormal.damage!)
  })
})
