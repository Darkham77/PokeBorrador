import { describe, it, expect, vi } from 'vitest'
import { getRouteWeather, mulberry32 } from '@/logic/weatherUtils'

// Mock the weather tables
vi.mock('@/data/weather-tables', () => ({
  ROUTE_WEATHER_TABLES: {
    test_route: {
      spring: { clear: 50, rain: 50 },
      summer: { heatwave: 100 }
    },
    bad_route: {
      spring: { clear: 10, rain: 10 } // doesn't sum to 100, logic handles it by falling back
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

    it('should return 100% probability correctly', () => {
      const weather = getRouteWeather('test_route', 'summer', 123)
      expect(weather).toBe('heatwave')
    })

    it('should handle bad probability tables safely by returning a string', () => {
      const weather = getRouteWeather('bad_route', 'spring', 42)
      expect(typeof weather).toBe('string')
    })
  })
})
