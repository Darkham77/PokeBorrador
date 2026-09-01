import { describe, it, expect } from 'vitest'
import {
  calculateStabMultiplier,
  calculateWeatherAndCyclePowerMultiplier,
  calculateAbilityPowerMultiplier,
  calculateItemPowerMultiplier,
} from '@/logic/battle/movePowerMultipliers'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { WEATHER_MECHANICAL } from '@/logic/weather/weatherRegistry'

describe('movePowerMultipliers', () => {
  it('calculates STAB multiplier correctly', () => {
    const fireAttacker = { type: 'fire', type2: 'flying', ability: 'blaze' } as unknown as Pokemon
    expect(calculateStabMultiplier('fire', fireAttacker)).toBe(1.5)
    expect(calculateStabMultiplier('water', fireAttacker)).toBe(1)

    const adaptabilityAttacker = { type: 'normal', type2: null, ability: 'adaptability' } as unknown as Pokemon
    expect(calculateStabMultiplier('normal', adaptabilityAttacker)).toBe(2)
  })

  it('calculates weather power boost for sun and rain', () => {
    const sunMult = calculateWeatherAndCyclePowerMultiplier(
      'fire',
      'flamethrower',
      { type: 'sunny', turns: 5 },
      WEATHER_MECHANICAL.SUN,
      'day'
    )
    expect(sunMult).toBe(1.5)

    const rainWaterMult = calculateWeatherAndCyclePowerMultiplier(
      'water',
      'surf',
      { type: 'rain', turns: 5 },
      WEATHER_MECHANICAL.RAIN,
      'day'
    )
    expect(rainWaterMult).toBe(1.5)
  })

  it('calculates pinch ability multiplier at low HP', () => {
    const lowHpCharizard = {
      hp: 10,
      maxHp: 100,
      ability: 'blaze',
    } as unknown as Pokemon

    expect(calculateAbilityPowerMultiplier('fire', 90, lowHpCharizard, null, null, WEATHER_MECHANICAL.CLEAR)).toBe(1.5)
    expect(calculateAbilityPowerMultiplier('water', 90, lowHpCharizard, null, null, WEATHER_MECHANICAL.CLEAR)).toBe(1)
  })

  it('calculates item power multiplier for held items', () => {
    expect(calculateItemPowerMultiplier('fire', 'special', 'charcoal')).toBe(1.2)
    expect(calculateItemPowerMultiplier('normal', 'physical', 'choiceband')).toBe(1.5)
    expect(calculateItemPowerMultiplier('normal', 'special', 'choiceband')).toBe(1)
  })
})
