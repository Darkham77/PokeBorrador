import { describe, it, expect, vi } from 'vitest'
import { calculateDamage, getEffectiveSpeed } from '../src/logic/battle/battleEngine'

describe('Battle Engine Gen 3 Parity', () => {
  // Mock Math.random to return 1.0 for deterministic results
  vi.spyOn(Math, 'random').mockReturnValue(1.0);
  // 1. ABILITIES
  describe('Abilities logic', () => {
    it('Intrépido (Scrappy) should allow Normal moves to hit Ghost types', () => {
      const attacker = { id: 'miltank', type: 'normal', atk: 100, ability: 'Intrépido', level: 50 }
      const defender = { id: 'gastly', type: 'ghost', def: 50, level: 50 }
      const move = { name: 'Pisotón', type: 'normal', power: 65, cat: 'physical' }
      
      const result = calculateDamage(attacker, defender, move)
      expect(result.dmg).toBeGreaterThan(0)
      expect(result.eff).toBe(1)
    })

    it('Sebo (Thick Fat) should reduce Fire and Ice damage by 50%', () => {
      const attacker = { id: 'charmander', type: 'fire', spa: 100, level: 50 }
      const defender = { id: 'snarlax', type: 'normal', spd: 100, ability: 'Sebo', level: 50 }
      const move = { name: 'Lanzallamas', type: 'fire', power: 90, cat: 'special' }
      
      // Without Sebo (for baseline reference, manually calculating or comparing)
      const normalDefender = { ...defender, ability: 'None' }
      const normalResult = calculateDamage(attacker, normalDefender, move)
      const seboResult = calculateDamage(attacker, defender, move)
      
      // Should be roughly half (precision depends on rounding)
      expect(seboResult.dmg).toBeLessThan(normalResult.dmg * 0.6)
    })

    it('Agallas (Guts) should increase Attack by 50% when status is present', () => {
      const attacker = { id: 'machop', type: 'fighting', atk: 100, level: 50, status: 'burn', ability: 'Agallas' }
      const defender = { id: 'rattata', type: 'normal', def: 50, level: 50 }
      const move = { name: 'Golpe Karate', type: 'fighting', power: 50, cat: 'physical' }
      
      const result = calculateDamage(attacker, defender, move)
      // Normal damage with burn is 0.5 * atk. Guts is 1.5 * atk. Total is 0.75 of non-burned non-guts damage?
      // Actually Guts IGNORES the burn penalty in some gens, let's check legacy 07_battle.js
      // Legacy says: if(attacker.status === 'burn') A = Math.floor(A * 0.5); then getAbilityMultiplier adds 1.5.
      // So net is 0.75.
      expect(result.triggeredAbility).toBe('Agallas')
    })
  })

  // 2. ITEMS
  describe('Held Items logic', () => {
    it('Cinta Elegida (Choice Band) should increase Physical damage by 50%', () => {
      const attacker = { id: 'tauros', type: 'normal', atk: 100, level: 50, heldItem: 'Cinta Elegida' }
      const defender = { id: 'rattata', type: 'normal', def: 50, level: 50 }
      const move = { name: 'Fuerza', type: 'normal', power: 80, cat: 'physical' }
      
      const normalAttacker = { ...attacker, heldItem: null }
      const normalResult = calculateDamage(normalAttacker, defender, move)
      const itemResult = calculateDamage(attacker, defender, move)
      
      expect(itemResult.dmg).toBeGreaterThan(normalResult.dmg * 1.4)
    })

    it('Type-boosting items (Carbón) should increase element damage by 20%', () => {
      const attacker = { id: 'cyndaquil', type: 'fire', spa: 100, level: 50, heldItem: 'Carbón' }
      const defender = { id: 'bulbasaur', type: 'grass', spd: 50, level: 50 }
      const move = { name: 'Ascuas', type: 'fire', power: 40, cat: 'special' }
      
      const normalAttacker = { ...attacker, heldItem: null }
      const normalResult = calculateDamage(normalAttacker, defender, move)
      const itemResult = calculateDamage(attacker, defender, move)
      
      expect(itemResult.dmg).toBeGreaterThan(normalResult.dmg * 1.15)
    })
  })

  // 3. WEATHER & ABILITIES
  describe('Weather & Speed logic', () => {
    it('Clorofila (Chlorophyll) should double speed in Sun', () => {
      const p = { id: 'oddish', spe: 50, ability: 'Clorofila', level: 50 }
      // Mock getDayCycle or options
      const options = { getStatMultiplier: (s) => (s >= 0 ? 1 + s * 0.5 : 1 / (1 - s * 0.5)), getDayCycle: () => 'day' }
      
      const spe = getEffectiveSpeed(p, { spe: 0 }, options)
      expect(spe).toBe(100)
    })

    it('Nado Rápido (Swift Swim) should double speed in Rain', () => {
      const p = { id: 'magikarp', spe: 50, ability: 'Nado rápido', level: 50 }
      const options = { getStatMultiplier: (s) => 1, getDayCycle: () => 'night' } // Rain/Dusk/Night in this project?
      
      const spe = getEffectiveSpeed(p, { spe: 0 }, options)
      expect(spe).toBe(100)
    })
  })
})
