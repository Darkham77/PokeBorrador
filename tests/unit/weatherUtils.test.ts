
import { describe, it, expect, vi } from 'vitest'
import { getRouteWeather, getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { mulberry32 } from '@/logic/utils/math'

// Mock the weather tables
vi.mock('@/data/weather-tables', () => ({
  ROUTE_WEATHER_TABLES: {
    test_route: {
      spring: {
        morning: { fog: 100 },
        day: { clear: 100 },
        dusk: { storm: 100 },
        night: { clear: 100 }
      },
      summer: {
        morning: { clear: 100 },
        day: { heatwave: 100 },
        dusk: { clear: 100 },
        night: { clear: 100 }
      }
    },
    bad_route: {
      spring: {
        morning: { clear: 10, rain: 10 } // doesn't sum to 100, logic handles it by falling back
      }
    }
  }
}))

describe('weatherUtils', () => {
  describe('mulberry32', () => {
    it('should generate deterministic values from a seed', () => {
      const prng1 = mulberry32(12345)
      const prng2 = mulberry32(12345)
      
      expect(prng1()).toBe(prng2())
      expect(prng1()).toBe(prng2())
    })

    it('should generate values between 0 and 1', () => {
      const prng = mulberry32(9999)
      for (let i = 0; i < 100; i++) {
        const val = prng()
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThan(1)
      }
    })
  })

  describe('getRouteWeather', () => {
    it('should return clear fallback if route has no data', () => {
      const weather = getRouteWeather('unknown_route', 'spring', 100)
      expect(weather).toBe('clear')
    })

    it('should return clear fallback if season has no data', () => {
      const weather = getRouteWeather('test_route', 'winter', 100)
      expect(weather).toBe('clear')
    })

    it('should be deterministic for the same epoch hour and route', () => {
      const weather1 = getRouteWeather('test_route', 'spring', 5000)
      const weather2 = getRouteWeather('test_route', 'spring', 5000)
      expect(weather1).toBe(weather2)
    })

    it('should select different weather for different day cycles', () => {
      // 1 hour = 3600000ms
      // Cycle is based on totalHours % 8
      // phase 0,1: morning
      // phase 2,3: day
      // phase 4,5: dusk
      // phase 6,7: night
      
      const morningWeather = getRouteWeather('test_route', 'spring', 0) // phase 0
      const dayWeather = getRouteWeather('test_route', 'spring', 2)     // phase 2
      const duskWeather = getRouteWeather('test_route', 'spring', 4)    // phase 4
      const nightWeather = getRouteWeather('test_route', 'spring', 6)   // phase 6
      
      expect(morningWeather).toBe('fog')
      expect(dayWeather).toBe('clear')
      expect(duskWeather).toBe('storm')
      expect(nightWeather).toBe('clear')
    })

    it('should return 100% probability correctly', () => {
      // Summer Day phase (2) -> heatwave
      const weather = getRouteWeather('test_route', 'summer', 2)
      expect(weather).toBe('heatwave')
    })

    it('should handle bad probability tables safely by returning a string', () => {
      const weather = getRouteWeather('bad_route', 'spring', 0)
      expect(typeof weather).toBe('string')
    })
  })

  describe('getWeatherMultiplier', () => {
    it('should return 1.0 if species does not exist, or weather is invalid/clear', () => {
      expect(getWeatherMultiplier('unknown', 'storm')).toBe(1.0)
      expect(getWeatherMultiplier('pidgey', 'clear')).toBe(1.0)
    })

    it('should correctly block dual-type pokemon (Pidgey - normal/flying under storm)', () => {
      // storm blocks: fire, flying, bug
      // Pidgey is normal/flying
      expect(getWeatherMultiplier('pidgey', 'storm')).toBe(0)
    })

    it('should correctly block single-type pokemon (Charmander - fire under storm)', () => {
      expect(getWeatherMultiplier('charmander', 'storm')).toBe(0)
    })

    it('should boost pokemon with weather boosted type (Pikachu - electric under storm)', () => {
      // storm boosts: water, electric, dragon
      expect(getWeatherMultiplier('pikachu', 'storm')).toBe(1.5)
    })

    it('should debuff pokemon with weather debuffed type (Sandshrew - ground under storm)', () => {
      // storm debuffs: rock, ground
      expect(getWeatherMultiplier('sandshrew', 'storm')).toBe(0.4)
    })
  })
})
