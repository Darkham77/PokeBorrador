
import { describe, it, expect, vi } from 'vitest'
import { getRouteWeather, getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { mulberry32 } from '@/logic/utils/math'

// Mock the weather tables
vi.mock('@/data/world/weather-tables', () => ({
  isWeatherTableRouteId: (id: string) => id === 'test_route' || id === 'bad_route',
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
    it('should throw Error if route has no registered weather table', () => {
      expect(() => getRouteWeather('unknown_route' as any, 'spring', 100)).toThrow()
    })

    it('should throw Error if season has no data', () => {
      expect(() => getRouteWeather('test_route' as any, 'winter' as any, 100)).toThrow()
    })

    it('should be deterministic for the same epoch hour and route', () => {
      const weather1 = getRouteWeather('test_route' as any, 'spring', 5000)
      const weather2 = getRouteWeather('test_route' as any, 'spring', 5000)
      expect(weather1).toBe(weather2)
    })

    it('should select different weather for different day cycles', () => {
      const morningWeather = getRouteWeather('test_route' as any, 'spring', 0)
      const dayWeather = getRouteWeather('test_route' as any, 'spring', 2)
      const duskWeather = getRouteWeather('test_route' as any, 'spring', 4)
      const nightWeather = getRouteWeather('test_route' as any, 'spring', 6)
      
      expect(morningWeather).toBe('fog')
      expect(dayWeather).toBe('clear')
      expect(duskWeather).toBe('storm')
      expect(nightWeather).toBe('clear')
    })

    it('should return 100% probability correctly', () => {
      const weather = getRouteWeather('test_route' as any, 'summer', 2)
      expect(weather).toBe('heatwave')
    })

    it('should throw Error on invalid probability tables', () => {
      expect(() => getRouteWeather('bad_route' as any, 'spring', 0)).toThrow()
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
