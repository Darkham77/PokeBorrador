import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkSpecialEncounters } from '@/logic/encounters/encounterHelpers'
import { useAdventureSimulation } from '@/composables/adventure/useAdventureSimulation'

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

// Mock other stores needed by useAdventureSimulation
vi.mock('@/stores/inventory/shop', () => ({
  useShopStore: vi.fn(() => ({}))
}))
vi.mock('@/stores/inventory/inventory', () => ({
  useInventoryStore: vi.fn(() => ({
    addItem: vi.fn()
  }))
}))
vi.mock('@/stores/game', () => ({
  useGameStore: vi.fn(() => ({
    state: { team: [] }
  }))
}))
vi.mock('@/stores/battle/battle', () => ({
  useBattleStore: vi.fn(() => ({
    state: { locationId: 'route1' }
  }))
}))

// Mock getRouteWeather
vi.mock('@/logic/weather/weatherUtils', () => ({
  getRouteWeather: vi.fn(() => 'clear'),
  getWeatherMultiplier: vi.fn(() => 1.0)
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

  it('debe priorizar globalWeather en getWeatherForMap dentro de useAdventureSimulation', () => {
    const { getWeatherForMap } = useAdventureSimulation()
    const weather = getWeatherForMap('route1')
    
    // Debería retornar 'rain' porque mapStore.globalWeather está mockeado como 'rain'
    expect(weather).toBe('rain')
  })
})
