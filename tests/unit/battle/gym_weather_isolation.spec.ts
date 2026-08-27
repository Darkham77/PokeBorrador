import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed } from 'vue'
import '../../helpers/battleMockSetup'
import { useMapStore } from '@/stores/map'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import { requireWeatherId } from '@/logic/weather/weatherRegistry'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import { requireDayPhase } from '@/logic/utils/timeUtils'
import { getRouteWeather } from '@/logic/weather/weatherUtils'

describe('Gym & Indoor Weather and Cycle Isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should strictly isolate gym battles from outdoor map weather and day/night transitions', () => {
    const mapStore = useMapStore()
    
    // Simulate outdoor map state (e.g. night, rain)
    mapStore.forcedCycle = 'night'
    mapStore.globalWeather = 'rain'

    const battle = ref({
      isGym: true,
      locationId: 'gym',
      isIndoors: true,
      isCave: false,
      isCrystalCave: false,
      weather: { type: 'none', visual: 'clear', turns: -1 },
      fieldConditions: {},
      enemySideConditions: {},
      playerSideConditions: {}
    })

    const isInteriorCombat = computed(() => {
      const b = battle.value
      return !!(b?.isGym || b?.isIndoors || b?.isCave || b?.isCrystalCave || b?.locationId === 'gym' || b?.locationId === 'pvp')
    })

    const effectiveCycle = computed(() => {
      if (isInteriorCombat.value) {
        return 'day'
      }
      return mapStore.currentCycle
    })

    const effectiveBattleVisual = computed<string>(() => {
      if (battle.value?.fieldConditions) {
        const fieldKeys = Object.keys(battle.value.fieldConditions)
        const terrain = fieldKeys.find(k => ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain', 'trickroom', 'gravity'].includes(k))
        if (terrain) return terrain
      }

      if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
        return battle.value.weather.visual || battle.value.weather.type
      }

      if (isInteriorCombat.value) return 'clear'

      if (mapStore.globalWeather) return mapStore.globalWeather
      return getRouteWeather(
        requireMapRouteId(battle.value?.locationId || 'route1'),
        requireWeatherSeasonId(mapStore.currentSeason.id),
        mapStore.currentEpochHour,
        requireDayPhase(mapStore.currentCycle)
      )
    })

    const computedWeather = computed<WeatherId>(() => {
      if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
        return requireWeatherId(battle.value.weather.visual || battle.value.weather.type)
      }
      if (isInteriorCombat.value) return 'clear'
      if (mapStore.globalWeather) return requireWeatherId(mapStore.globalWeather)
      return requireWeatherId(getRouteWeather(
        requireMapRouteId(battle.value?.locationId || 'route1'),
        requireWeatherSeasonId(mapStore.currentSeason.id),
        mapStore.currentEpochHour,
        requireDayPhase(mapStore.currentCycle)
      ))
    })

    // 1. In Gym battle, natural rain and night cycle are completely blocked
    expect(isInteriorCombat.value).toBe(true)
    expect(effectiveCycle.value).toBe('day')
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')

    // 2. When an in-combat move/ability casts Rain Dance inside the gym
    battle.value.weather = { type: 'rain', visual: 'rain', turns: 5 }
    expect(computedWeather.value).toBe('rain')
    expect(effectiveBattleVisual.value).toBe('rain')

    // 3. When in-combat weather expires, returns to clear indoor environment
    battle.value.weather = { type: 'clear', visual: 'clear', turns: -1 }
    expect(computedWeather.value).toBe('clear')
    expect(effectiveBattleVisual.value).toBe('clear')
    expect(effectiveCycle.value).toBe('day')
  })
})
