
import { describe, it, expect, vi } from 'vitest'
import { calculateCatchRate } from '@/logic/battle/battleEngine'

describe('Rattata Capture Verification', () => {
  const rattata = {
    name: 'Rattata',
    id: 'rattata',
    hp: 1,
    maxHp: 20,
    catchRate: 255, // Official Gen 1-2 rate
    type: 'normal',
    status: null
  }

  const lowRatePoke = {
    name: 'Snorlax',
    id: 'snorlax',
    hp: 1,
    maxHp: 100,
    catchRate: 25, // Official Gen 1-2 rate
    type: 'normal',
    status: null
  }

  it('should be extremely easy to catch a 1HP Rattata with a Poke Ball', () => {
    // With 1HP and 255 catch rate, the final rate should be near 255
    // HP factor = (3*20 - 2*1) / (3*20) = 58/60 = 0.966
    // a = 255 * 1 * 0.966 * 1 = 246
    // b = 65535 * (246/255)^0.25 = 65535 * 0.991 = 64955
    // Probability per shake = 64955 / 65535 = 99.1%
    // Total probability = (0.991)^4 = 96.4%
    
    // Let's force a random value that would fail with the old fallback (45)
    // If catchRate was 45:
    // a = 45 * 1 * 0.966 * 1 = 43
    // b = 65535 * (43/255)^0.25 = 65535 * 0.64 = 42000
    // Probability per shake = 64%
    // Total probability = (0.64)^4 = 16.7%
    
    // We'll mock Math.random to return 0.8 (which is > 0.64 but < 0.99)
    // 0.8 * 65535 = 52428. 
    // 52428 > 42000 (Fail with fallback)
    // 52428 < 64955 (Success with real rate)
    
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.8)
    
    const result = calculateCatchRate(rattata, 'Poke Ball')
    expect(result.caught).toBe(true)
    
    spy.mockRestore()
  })

  it('should be difficult to catch a 1HP Snorlax with a Poke Ball', () => {
    // Snorlax catchRate = 25
    // a = 25 * 1 * 0.99 * 1 = 24.75 -> 24
    // b = 65535 * (24/255)^0.25 = 65535 * 0.55 = 36000
    // Probability per shake = 55%
    
    // With Math.random = 0.6, 0.6 * 65535 = 39321.
    // 39321 > 36000 (Fail)
    
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.6)
    
    const result = calculateCatchRate(lowRatePoke, 'Poke Ball')
    expect(result.caught).toBe(false)
    
    spy.mockRestore()
  })
})
