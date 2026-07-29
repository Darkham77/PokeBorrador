import { vi } from 'vitest'

vi.mock('@/logic/encounters/encounters', () => ({
  generateEncounter: vi.fn(async () => ({ 
    type: 'wild', 
    pokemon: { id: 16, name: 'Pidgey', hp: 50, maxHp: 50 } 
  }))
}))

vi.mock('@/stores/ui', () => ({
  useUIStore: vi.fn(() => ({ activeTab: 'battle' }))
}))

vi.mock('@/stores/map', () => ({
  useMapStore: vi.fn(() => ({ activeEvents: [], mapWinners: {}, currentWeather: 'clear', currentCycle: 'day' }))
}))

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({ 
    globalMultipliers: { shiny: 1 },
    getSpeciesBonuses: vi.fn()
  }))
}))

vi.mock('@/stores/war', () => ({
  useWarStore: vi.fn(() => ({ 
    mapDominance: {} 
  }))
}))
