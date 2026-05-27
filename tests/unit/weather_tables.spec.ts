import { describe, it, expect } from 'vitest'
import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables'
import { WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'

describe('Weather tables coverage and integrity', () => {
  it('should ensure all registered weather conditions are used at least once in the map tables', () => {
    const usedWeatherKeys = new Set<string>()

    // Traverse all routes, seasons, cycles and collect weather keys with probability > 0
    for (const routeId in ROUTE_WEATHER_TABLES) {
      const seasons = ROUTE_WEATHER_TABLES[routeId] || {}
      for (const seasonName in seasons) {
        const phases = seasons[seasonName] || {}
        for (const phaseName in phases) {
          const weatherProbs = phases[phaseName] || {}
          for (const weatherKey in weatherProbs) {
            const probability = weatherProbs[weatherKey]
            if (probability !== undefined && probability > 0) {
              usedWeatherKeys.add(weatherKey.toLowerCase())
            }
          }
        }
      }
    }

    // Get all weather keys defined in the registry, ignoring clear/null fallbacks
    const registeredWeatherKeys = Object.keys(WEATHER_REGISTRY).filter(
      key => key !== 'clear' && key !== 'null'
    )

    // Check which ones are missing from the map tables
    const missingWeatherKeys = registeredWeatherKeys.filter(
      key => !usedWeatherKeys.has(key)
    )

    expect(
      missingWeatherKeys,
      `Climas no utilizados en los mapas de Kanto: ${missingWeatherKeys.join(', ')}`
    ).toEqual([])
  })
})
