import { computed, type Ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import { requireWeatherSeasonId, isWeatherTableRouteId } from '@/data/world/weather-tables'
import { isMapRouteId, requireMapRouteId, getAvailableCyclesForMap } from '@/data/world/map-assets'
import { requireDayPhase, type DayPhase } from '@/logic/utils/timeUtils'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { GYMS, type Gym } from '@/data/world/gyms'
import type { BattleState } from '@/types/battle/battle'

export function useBattleAtmosphere(battle: Ref<BattleState | null | undefined>) {
  const mapStore = useMapStore()

  const isGymOrPvP = computed<boolean>(() => {
    const b = battle.value
    return !!(b?.isGym || b?.isPvP || b?.locationId === 'gym' || b?.locationId === 'pvp')
  })

  const gymConfig = computed<Gym | null>(() => {
    const gymId = battle.value?.gymId
    if (!gymId) return null
    return (GYMS.find((g) => g.id === gymId) as Gym | undefined) || null
  })

  const mapLocationConfig = computed(() => {
    const locId = battle.value?.locationId
    if (!locId) return null
    return FIRE_RED_MAPS.find((m) => m.id === locId) || null
  })

  const supportedCycles = computed<readonly DayPhase[]>(() => {
    // 1. Explicit Gym or Battle fixed cycle
    if (battle.value?.fixedCycle) return [battle.value.fixedCycle]
    if (gymConfig.value?.fixedCycle) return [gymConfig.value.fixedCycle]
    if (isGymOrPvP.value) return ['day']

    // 2. Explicit Map Location Config
    const explicit = mapLocationConfig.value?.supportedCycles
    if (explicit && explicit.length > 0) {
      return explicit
    }

    // 3. Fallback to sprite-derived cycles
    const locId = battle.value?.locationId || 'route1'
    return getAvailableCyclesForMap(locId)
  })

  const effectiveCycle = computed<DayPhase>(() => {
    // 1. Explicit overrides
    if (battle.value?.fixedCycle) return battle.value.fixedCycle
    if (gymConfig.value?.fixedCycle) return gymConfig.value.fixedCycle

    const current = requireDayPhase(mapStore.currentCycle)
    if (supportedCycles.value.includes(current)) {
      return current
    }
    return supportedCycles.value[0] || 'day' // Default fallback when map background does not support requested cycle
  })

  const effectiveBattleVisual = computed<string>(() => {
    // 1. Terrenos y efectos de campo activos en combate (máxima prioridad visual para iluminación de arena)
    if (battle.value?.fieldConditions) {
      const fieldKeys = Object.keys(battle.value.fieldConditions)
      const terrain = fieldKeys.find((k) =>
        ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain', 'trickroom', 'gravity'].includes(k)
      )
      if (terrain) return terrain
    }

    // 2. Efectos de bando activos como neblina (mist), stealthrock, toxicspikes
    const sideConds = { ...battle.value?.enemySideConditions, ...battle.value?.playerSideConditions }
    const sideField = Object.keys(sideConds).find((k) => ['mist', 'stealthrock', 'toxicspikes'].includes(k))
    if (sideField) return sideField

    // 3. Si hay un clima temporal activo en el combate (invocado por movimiento o habilidad)
    if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
      return battle.value.weather.visual || battle.value.weather.type
    }

    // 4. Clima configurado explícitamente en el combate o gimnasio
    if (battle.value?.fixedWeather) return battle.value.fixedWeather
    if (gymConfig.value?.fixedWeather) return gymConfig.value.fixedWeather

    // 5. Bloquear clima natural si está deshabilitado en el mapa/gimnasio, es pvp o no tiene tabla
    const locId = battle.value?.locationId || 'route1'
    const isWeatherExplicitlyDisabled = mapLocationConfig.value?.weatherEnabled === false || gymConfig.value?.weatherEnabled === false
    if (isGymOrPvP.value || isWeatherExplicitlyDisabled || !isMapRouteId(locId) || !isWeatherTableRouteId(locId)) {
      return 'clear'
    }

    // 6. De lo contrario, cae en el clima global o del mapa exterior
    if (mapStore.globalWeather) return mapStore.globalWeather
    return getRouteWeather(
      requireMapRouteId(locId),
      requireWeatherSeasonId(mapStore.currentSeason.id),
      mapStore.currentEpochHour,
      effectiveCycle.value
    )
  })

  const computedWeather = computed<WeatherId>(() => {
    // 1. Si hay un clima temporal activo en el combate (invocado por movimiento o habilidad)
    if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
      return requireWeatherId(battle.value.weather.visual || battle.value.weather.type)
    }

    // 2. Clima configurado explícitamente en el combate o gimnasio
    if (battle.value?.fixedWeather) return requireWeatherId(battle.value.fixedWeather)
    if (gymConfig.value?.fixedWeather) return requireWeatherId(gymConfig.value.fixedWeather)

    // 3. Bloquear clima natural si está deshabilitado en el mapa/gimnasio, es pvp o no tiene tabla
    const locId = battle.value?.locationId || 'route1'
    const isWeatherExplicitlyDisabled = mapLocationConfig.value?.weatherEnabled === false || gymConfig.value?.weatherEnabled === false
    if (isGymOrPvP.value || isWeatherExplicitlyDisabled || !isMapRouteId(locId) || !isWeatherTableRouteId(locId)) {
      return 'clear'
    }

    // 4. De lo contrario, cae en el clima global o del mapa exterior
    if (mapStore.globalWeather) return requireWeatherId(mapStore.globalWeather)
    return requireWeatherId(
      getRouteWeather(
        requireMapRouteId(locId),
        requireWeatherSeasonId(mapStore.currentSeason.id),
        mapStore.currentEpochHour,
        effectiveCycle.value
      )
    )
  })

  const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
    weather: effectiveBattleVisual,
    cycle: effectiveCycle
  })

  const isAtmosphereLayerVisible = computed<boolean>(() => {
    const isWeatherExplicitlyDisabled = mapLocationConfig.value?.weatherEnabled === false || gymConfig.value?.weatherEnabled === false
    if (isGymOrPvP.value || isWeatherExplicitlyDisabled) {
      return computedWeather.value !== 'clear'
    }
    return true
  })

  const arenaAtmosphereStyles = computed(() => {
    const isCave = !!(battle.value?.isCave || battle.value?.isCrystalCave)
    const hasActiveBattleWeather = Boolean(
      battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none'
    )
    const hasExplicitWeather = Boolean(battle.value?.fixedWeather || gymConfig.value?.fixedWeather)

    if (isGymOrPvP.value && !hasActiveBattleWeather && !hasExplicitWeather) {
      return {
        '--atmosphere-filter': 'none',
        '--weather-filter': 'none'
      }
    }

    return {
      '--atmosphere-filter': isCave && !hasActiveBattleWeather ? 'none' : atmosphereFilter.value,
      '--weather-filter': isCave && !hasActiveBattleWeather ? 'none' : weatherOnlyFilter.value
    }
  })

  return {
    isGymOrPvP,
    gymConfig,
    mapLocationConfig,
    supportedCycles,
    mapSupportsCycles: computed(() => supportedCycles.value.length > 1),
    effectiveBattleVisual,
    computedWeather,
    effectiveCycle,
    atmosphereFilter,
    weatherOnlyFilter,
    isAtmosphereLayerVisible,
    arenaAtmosphereStyles
  }
}
