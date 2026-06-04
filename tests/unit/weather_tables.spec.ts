import { describe, it, expect } from 'vitest'
import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables'
import { WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import { FIRE_RED_MAPS } from '@/data/maps'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { MapLocation } from '@/types/encounters'

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

describe('Weather visitor and exclusive type compatibility', () => {
  it('should ensure all weather fishing pool encounters (exclusives and visitors) have at least one Water type', () => {
    FIRE_RED_MAPS.forEach((map: MapLocation) => {
      // Weather fishing exclusives and visitors
      const weather = map.weather
      if (weather) {
        Object.keys(weather).forEach(wKey => {
          const wCfg = weather[wKey]
          if (!wCfg) return

          if (wCfg.fishingExclusive) {
            const list = Array.isArray(wCfg.fishingExclusive)
              ? wCfg.fishingExclusive
              : Object.keys(wCfg.fishingExclusive)
            list.forEach((id: string) => {
              const data = pokemonDataProvider.getPokemonData(id)
              expect(data, `Pokémon ${id} no está registrado`).toBeDefined()
              if (!data) return
              const types = [data.type, data.type2].filter(Boolean) as string[]
              expect(
                types.includes('water'),
                `El exclusivo de pesca ${id} en clima ${wKey} de ${map.name} debe tener tipo agua (water)`
              ).toBe(true)
            })
          }

          if (wCfg.fishingVisitors) {
            const list = Array.isArray(wCfg.fishingVisitors)
              ? wCfg.fishingVisitors
              : Object.keys(wCfg.fishingVisitors)
            list.forEach((id: string) => {
              const data = pokemonDataProvider.getPokemonData(id)
              expect(data, `Pokémon ${id} no está registrado`).toBeDefined()
              if (!data) return
              const types = [data.type, data.type2].filter(Boolean) as string[]
              expect(
                types.includes('water'),
                `El visitante de pesca ${id} en clima ${wKey} de ${map.name} debe tener tipo agua (water)`
              ).toBe(true)
            })
          }
        })
      }
    })
  })

  it('should ensure all terrestrial weather encounters (visitors and exclusives) do not have Water type, unless they are dual-type with a non-Water type', () => {
    FIRE_RED_MAPS.forEach((map: MapLocation) => {
      // Helper to validate a terrestrial pokemon
      const validateTerrestrial = (id: string, context: string) => {
        const data = pokemonDataProvider.getPokemonData(id)
        expect(data, `Pokémon ${id} no está registrado`).toBeDefined()
        if (!data) return

        const types = [data.type, data.type2].filter(Boolean) as string[]
        
        // Flying types and explicit rain-loving exceptions (like Poliwag) are allowed
        if (types.includes('flying') || id === 'poliwag') {
          return
        }

        const hasWater = types.includes('water')
        if (hasWater) {
          // If it has Water type, it MUST have a second type that is compatible with land (not Water)
          expect(
            types.length,
            `El Pokémon terrestre ${id} en ${context} tiene tipo agua pero no es de doble tipo`
          ).toBe(2)
          const nonWaterType = types.find((t: string) => t !== 'water')
          expect(
            nonWaterType,
            `El Pokémon terrestre ${id} en ${context} es tipo agua pero no tiene otro tipo compatible con tierra`
          ).toBeDefined()
        }
      }

      // Weather visitors and exclusives (terrestrial)
      const weather = map.weather
      if (weather) {
        Object.keys(weather).forEach(wKey => {
          const wCfg = weather[wKey]
          if (!wCfg) return

          if (wCfg.exclusive) {
            const list = Array.isArray(wCfg.exclusive)
              ? wCfg.exclusive
              : Object.keys(wCfg.exclusive)
            list.forEach((id: string) => {
              validateTerrestrial(id, `exclusivo clima ${wKey} de ${map.name}`)
            })
          }

          if (wCfg.visitors) {
            const list = Array.isArray(wCfg.visitors)
              ? wCfg.visitors
              : Object.keys(wCfg.visitors)
            list.forEach((id: string) => {
              validateTerrestrial(id, `visitante clima ${wKey} de ${map.name}`)
            })
          }
        })
      }
    })
  })

  it('should ensure all weather conditions on a map (except clear/null) are not empty of visitors or exclusives', () => {
    FIRE_RED_MAPS.forEach((map: MapLocation) => {
      const weather = map.weather
      if (!weather) return

      Object.keys(weather).forEach(wKey => {
        const normalizedKey = wKey.toLowerCase().trim()
        // Skip clear/null/sin_clima as explicitly requested
        if (
          normalizedKey === 'clear' ||
          normalizedKey === 'null' ||
          normalizedKey === 'sin_clima' ||
          normalizedKey === 'sin_climar' ||
          normalizedKey === 'none'
        ) {
          return
        }

        const wCfg = weather[wKey]
        if (!wCfg) return

        const hasTerrestrialVisitors = wCfg.visitors && Object.keys(wCfg.visitors).length > 0
        const hasTerrestrialExclusives = wCfg.exclusive && Object.keys(wCfg.exclusive).length > 0
        const hasFishingVisitors = wCfg.fishingVisitors && Object.keys(wCfg.fishingVisitors).length > 0
        const hasFishingExclusives = wCfg.fishingExclusive && Object.keys(wCfg.fishingExclusive).length > 0

        const hasAnyEncounter =
          hasTerrestrialVisitors ||
          hasTerrestrialExclusives ||
          hasFishingVisitors ||
          hasFishingExclusives

        expect(
          hasAnyEncounter,
          `El clima ${wKey} en el mapa ${map.name} (${map.id}) no tiene ningún visitante ni exclusivo asignado`
        ).toBe(true)
      })
    })
  })

  it('should ensure all active weather conditions from seasonal weather tables have configured encounters on maps', () => {
    const mapById = new Map<string, MapLocation>()
    FIRE_RED_MAPS.forEach(map => {
      mapById.set(map.id, map)
    })

    const missingConfigs: string[] = []

    for (const routeId in ROUTE_WEATHER_TABLES) {
      const map = mapById.get(routeId)
      if (!map) continue

      const possibleWeathers = new Set<string>()
      const seasons = ROUTE_WEATHER_TABLES[routeId] || {}
      for (const season in seasons) {
        const phases = seasons[season] || {}
        for (const phase in phases) {
          const weatherProbs = phases[phase] || {}
          for (const wKey in weatherProbs) {
            const prob = weatherProbs[wKey]
            if (prob !== undefined && prob > 0) {
              const norm = wKey.toLowerCase().trim()
              if (norm !== 'clear' && norm !== 'null' && norm !== 'none') {
                possibleWeathers.add(wKey)
              }
            }
          }
        }
      }

      const weatherCfg = map.weather || {}
      possibleWeathers.forEach(wKey => {
        const cfg = weatherCfg[wKey]
        const hasTerrestrial = cfg?.visitors && Object.keys(cfg.visitors).length > 0
        const hasTerrestrialExcl = cfg?.exclusive && Object.keys(cfg.exclusive).length > 0
        const hasFishing = cfg?.fishingVisitors && Object.keys(cfg.fishingVisitors).length > 0
        const hasFishingExcl = cfg?.fishingExclusive && Object.keys(cfg.fishingExclusive).length > 0

        const hasAny = !!(hasTerrestrial || hasTerrestrialExcl || hasFishing || hasFishingExcl)

        if (!hasAny) {
          missingConfigs.push(`${map.name} (${routeId}) - Clima: ${wKey}`)
        }
      })
    }

    expect(
      missingConfigs,
      `Climas posibles sin visitantes/exclusivos configurados: \n${missingConfigs.join('\n')}`
    ).toEqual([])
  })
})



