/**
 * tests/unit/world/world_weather_and_atmosphere_suite.spec.ts
 * Cohesive domain suite consolidating weather tables integrity, visitor/exclusive type compatibility,
 * deterministic PRNG, weather multipliers, reactive weather simulation, and AtmosphereLayer rendering.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import { checkSpecialEncounters } from '@/logic/encounters/encounterHelpers'
import { useAdventureSimulation } from '@/composables/adventure/useAdventureSimulation'
import { getRouteWeather, getWeatherMultiplier } from '@/logic/weather/weatherUtils'
import { mulberry32 } from '@/logic/utils/math'
import {
  ROUTE_WEATHER_TABLES,
  requireWeatherSeasonId,
  requireWeatherTableRouteId,
  type RouteWeatherTable
} from '@/data/world/weather-tables'
import { requireDayPhase } from '@/logic/utils/timeUtils'
import { WEATHER_REGISTRY, getMechanicalWeather, isWeatherId } from '@/logic/weather/weatherRegistry'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { MapLocation } from '@/types/pokemon/encounters'
import { getWeatherFamily } from '@/data/system/weatherFamilies'

// Mock the logger for AtmosphereLayer
vi.mock('@/logic/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock useMapStore for useAdventureSimulation
vi.mock('@/stores/map', () => ({
  useMapStore: vi.fn(() => ({
    currentSeason: { id: 'spring', label: 'Primavera', icon: '🌸' },
    currentEpochHour: 12,
    currentCycle: 'day',
    globalWeather: 'rain',
    activeEvents: []
  }))
}))

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

describe('World Weather & Atmosphere Domain Suite', () => {
  describe('AtmosphereLayer Component', () => {
    it('should render leaf elements when weather is wind and is visible', async () => {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: 'wind',
          isVisible: true,
          isPerformanceMode: false
        }
      })

      await nextTick()
      await nextTick()

      const leaves = wrapper.findAll('.leaf-element')
      expect(leaves.length).toBe(8)
    })

    it('should render half the leaf elements when low power mode is active', async () => {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: 'wind',
          isVisible: true,
          isPerformanceMode: false,
          isLowPower: true
        }
      })

      await nextTick()
      await nextTick()

      const leaves = wrapper.findAll('.leaf-element')
      expect(leaves.length).toBe(4)
    })

    it('should render 15 leaves when weather is storm', async () => {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: 'storm',
          isVisible: true,
          isPerformanceMode: false
        }
      })

      await nextTick()
      await nextTick()

      const leaves = wrapper.findAll('.leaf-element')
      expect(leaves.length).toBe(15)
    })

    it('should react to weather changes', async () => {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: 'clear',
          isVisible: true,
          isPerformanceMode: false
        }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.findAll('.leaf-element').length).toBe(0)

      // Set weather to wind
      await wrapper.setProps({ weather: 'wind' } as Record<string, unknown>)

      await nextTick()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(wrapper.findAll('.leaf-element').length).toBe(8)
    })

    it('should cleanup animations when weather is clear', async () => {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: 'wind',
          isVisible: true,
          isPerformanceMode: false
        }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.findAll('.leaf-element').length).toBe(8)

      // Set weather to clear
      await wrapper.setProps({ weather: 'clear' } as Record<string, unknown>)

      await nextTick()
      await nextTick()
      await nextTick()
      await nextTick()

      expect(wrapper.findAll('.leaf-element').length).toBe(0)
    })

    it('should not render leaf elements when isFastMode is true', async () => {
      const wrapper = mount(AtmosphereLayer, {
        props: {
          weather: 'storm',
          isVisible: true,
          isFastMode: true
        }
      })

      await nextTick()
      await nextTick()

      expect(wrapper.findAll('.leaf-element').length).toBe(0)
    })
  })

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
      
      expect(weather).toBe('rain')
    })
  })

  describe('weatherUtils Logic & Math', () => {
    beforeEach(() => {
      (ROUTE_WEATHER_TABLES as Record<string, unknown>).test_route = {
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
      } as RouteWeatherTable;

      (ROUTE_WEATHER_TABLES as Record<string, unknown>).bad_route = {
        spring: {
          morning: { clear: 10, rain: 10 }
        }
      } as unknown as RouteWeatherTable
    })

    afterAll(() => {
      delete (ROUTE_WEATHER_TABLES as Record<string, unknown>).test_route
      delete (ROUTE_WEATHER_TABLES as Record<string, unknown>).bad_route
    })

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
        const morningWeather = getRouteWeather('test_route' as any, 'spring', 0, 'morning')
        const dayWeather = getRouteWeather('test_route' as any, 'spring', 2, 'day')
        const duskWeather = getRouteWeather('test_route' as any, 'spring', 4, 'dusk')
        const nightWeather = getRouteWeather('test_route' as any, 'spring', 6, 'night')
        
        expect(morningWeather).toBe('fog')
        expect(dayWeather).toBe('clear')
        expect(duskWeather).toBe('storm')
        expect(nightWeather).toBe('clear')
      })

      it('should return 100% probability correctly', () => {
        const weather = getRouteWeather('test_route' as any, 'summer', 2, 'day')
        expect(weather).toBe('heatwave')
      })

      it('should throw Error on invalid probability tables', () => {
        expect(() => getRouteWeather('bad_route' as any, 'spring', 0, 'morning')).toThrow()
      })
    })

    describe('getWeatherMultiplier', () => {
      it('should return 1.0 if species does not exist, or weather is invalid/clear', () => {
        expect(getWeatherMultiplier('unknown', 'storm')).toBe(1.0)
        expect(getWeatherMultiplier('pidgey', 'clear')).toBe(1.0)
      })

      it('should correctly block dual-type pokemon (Pidgey - normal/flying under storm)', () => {
        expect(getWeatherMultiplier('pidgey', 'storm')).toBe(0)
      })

      it('should correctly block single-type pokemon (Charmander - fire under storm)', () => {
        expect(getWeatherMultiplier('charmander', 'storm')).toBe(0)
      })

      it('should boost pokemon with weather boosted type (Pikachu - electric under storm)', () => {
        expect(getWeatherMultiplier('pikachu', 'storm')).toBe(1.5)
      })

      it('should debuff pokemon with weather debuffed type (Sandshrew - ground under storm)', () => {
        expect(getWeatherMultiplier('sandshrew', 'storm')).toBe(0.4)
      })
    })
  })

  describe('Weather tables coverage and integrity', () => {
    it('should ensure all registered weather conditions are used at least once in the map tables', () => {
      const usedWeatherKeys = new Set<string>()

      for (const rawRouteId in ROUTE_WEATHER_TABLES) {
        if (rawRouteId === 'test_route' || rawRouteId === 'bad_route') continue
        const routeId = requireWeatherTableRouteId(rawRouteId)
        const seasons = ROUTE_WEATHER_TABLES[routeId]
        for (const rawSeasonName in seasons) {
          const seasonName = requireWeatherSeasonId(rawSeasonName)
          const phases = seasons[seasonName]
          for (const rawPhaseName in phases) {
            const phaseName = requireDayPhase(rawPhaseName)
            const weatherProbs = phases[phaseName]
            for (const [weatherKey, probability] of Object.entries(weatherProbs)) {
              if (!isWeatherId(weatherKey)) {
                throw new Error(`[weather_tables] Invalid weather id in route table: ${weatherKey}`)
              }
              if (probability !== undefined && probability > 0) {
                usedWeatherKeys.add(weatherKey.toLowerCase())
              }
            }
          }
        }
      }

      const registeredWeatherKeys = Object.keys(WEATHER_REGISTRY).filter(
        key => key !== 'clear' && key !== 'null'
      )

      const missingWeatherKeys = registeredWeatherKeys.filter(
        key => !usedWeatherKeys.has(key)
      )

      expect(
        missingWeatherKeys,
        `Climas no utilizados en los mapas de Kanto: ${missingWeatherKeys.join(', ')}`
      ).toEqual([])
    })

    describe('Weather visitor and exclusive type compatibility', () => {
      const getAndValidatePokemon = (id: string) => {
        try {
          const data = pokemonDataProvider.getPokemonData(id)
          return data
        } catch (_e) {
          return null
        }
      }

      it('should ensure all weather fishing pool encounters (exclusives and visitors) have at least one Water type', () => {
        FIRE_RED_MAPS.forEach((map: MapLocation) => {
          const weather = map.weather as Record<string, any> | undefined
          if (weather) {
            Object.keys(weather).forEach(wKey => {
              const wCfg = weather[wKey]
              if (!wCfg) return

              if (wCfg.fishingExclusive) {
                const list = Array.isArray(wCfg.fishingExclusive)
                  ? wCfg.fishingExclusive
                  : Object.keys(wCfg.fishingExclusive)
                list.forEach((id: string) => {
                  const data = getAndValidatePokemon(id)
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
                  const data = getAndValidatePokemon(id)
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
          const validateTerrestrial = (id: string, context: string) => {
            const data = getAndValidatePokemon(id)
            if (!data) return

            const types = [data.type, data.type2].filter(Boolean) as string[]
            
            if (types.includes('flying') || id === 'poliwag') {
              return
            }

            const hasWater = types.includes('water')
            if (hasWater) {
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

          const weather = map.weather as Record<string, any> | undefined
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
            if (
              normalizedKey === 'clear' ||
              normalizedKey === 'null' ||
              normalizedKey === 'sin_clima' ||
              normalizedKey === 'sin_climar' ||
              normalizedKey === 'none'
            ) {
              return
            }

            const wCfg = (weather as Record<string, any>)[wKey]
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

        for (const rawRouteId in ROUTE_WEATHER_TABLES) {
          if (rawRouteId === 'test_route' || rawRouteId === 'bad_route') continue
          const routeId = requireWeatherTableRouteId(rawRouteId)
          const map = mapById.get(routeId)
          if (!map) continue

          const possibleWeathers = new Set<string>()
          const seasons = ROUTE_WEATHER_TABLES[routeId]
          for (const rawSeason in seasons) {
            const season = requireWeatherSeasonId(rawSeason)
            const phases = seasons[season]
            for (const rawPhase in phases) {
              const phase = requireDayPhase(rawPhase)
              const weatherProbs = phases[phase]
              for (const [wKey, prob] of Object.entries(weatherProbs)) {
                if (!isWeatherId(wKey)) {
                  throw new Error(`[weather_tables] Invalid weather id in route table: ${wKey}`)
                }
                if (prob !== undefined && prob > 0) {
                  const norm = wKey.toLowerCase().trim()
                  if (norm !== 'clear' && norm !== 'null' && norm !== 'none') {
                    possibleWeathers.add(wKey)
                  }
                }
              }
            }
          }

          const weatherCfg = (map.weather || {}) as Record<string, any>
          possibleWeathers.forEach(wKey => {
            const family = getWeatherFamily(wKey) || getMechanicalWeather(wKey)
            const cfg = weatherCfg[wKey] || (family ? weatherCfg[family] : undefined)
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
  })
})
