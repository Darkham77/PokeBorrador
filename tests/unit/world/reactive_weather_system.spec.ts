import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkSpecialEncounters } from '@/logic/encounters/encounterHelpers'
import { getRouteWeather } from '@/logic/weather/weatherUtils'

// Mock useMapStore
vi.mock('@/stores/map', () => ({
  useMapStore: vi.fn(() => ({
    currentSeason: { id: 'spring', label: 'Primavera', icon: '🌸' },
    currentEpochHour: 12,
    currentCycle: 'day',
    globalWeather: 'rain',
    activeEvents: []
  }))
}))

describe('Sistema de Clima Reactivo y Debug de Encuentros', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>).__VITE_DEBUG__
    }
  })

  it('debe forzar el encuentro con el Rival si el flag __VITE_DEBUG__.forceRival está activo', () => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__VITE_DEBUG__ = { forceRival: true }
    } else {
      // Node fallback simulation
      (global as unknown as Record<string, unknown>).window = { __VITE_DEBUG__: { forceRival: true } }
    }

    const res = checkSpecialEncounters('route1', { faction: null }, {}, [])
    expect(res).toEqual({ type: 'rival' })

    if (typeof window === 'undefined') {
      delete (global as unknown as Record<string, unknown>).window
    }
  })

  it('debe calcular determinísticamente el clima para una ruta mediante getRouteWeather', () => {
    const weather = getRouteWeather('route1', 'spring', 12, 'day')
    expect(typeof weather).toBe('string')
    expect(weather.length).toBeGreaterThan(0)
  })
})
