import { computed, type Ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import { requireWeatherSeasonId, isWeatherTableRouteId } from '@/data/world/weather-tables'
import { isMapRouteId, requireMapRouteId, getAvailableCyclesForMap } from '@/data/world/map-assets'
import { requireDayPhase, type DayPhase } from '@/logic/utils/timeUtils'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { GYMS_BY_ID, isGymId, type Gym } from '@/data/world/gyms'
import type { BattleState } from '@/types/battle/battle'
import {
  isNaturalWeatherAllowedInLocation,
  resolveEffectiveCycleForLocation
} from '@/logic/battle/battleTeamCoordinator'

export function useBattleAtmosphere(battle: Ref<BattleState | null | undefined>) {
  const mapStore = useMapStore()

  const gymConfig = computed<Gym | null>(() => {
    const gymId = battle.value?.gymId
    if (!gymId || !isGymId(gymId)) return null
    return GYMS_BY_ID[gymId] || null
  })

  const mapLocationConfig = computed(() => {
    const locId = battle.value?.locationId
    if (!locId || !isMapRouteId(locId)) return null
    return MAPS_BY_ROUTE_ID[locId] || null
  })

  const isNaturalWeatherAllowed = computed<boolean>(() => {
    return isNaturalWeatherAllowedInLocation(
      battle.value?.locationId,
      mapLocationConfig.value,
      gymConfig.value,
      battle.value
    )
  })

  const isGymOrPvP = computed<boolean>(() => !isNaturalWeatherAllowed.value)

  const supportedCycles = computed<readonly DayPhase[]>(() => {
    // 1. Explicit Gym or Battle fixed cycle
    if (battle.value?.fixedCycle) return [battle.value.fixedCycle]
    if (gymConfig.value?.fixedCycle) return [gymConfig.value.fixedCycle]

    // 2. Physical gym location is locked to day
    if (battle.value?.isGym || Boolean(gymConfig.value) || battle.value?.locationId === 'gym') {
      return ['day']
    }

    // 3. Explicit Map Location Config
    const explicit = mapLocationConfig.value?.supportedCycles
    if (explicit && explicit.length > 0) {
      return explicit
    }

    // 4. Sprite-derived cycles (e.g. outdoor routes, or multi-cycle interiors like mansion)
    const locId = battle.value?.locationId || 'route1'
    const available = isMapRouteId(locId) ? getAvailableCyclesForMap(locId) : []
    if (available.length > 1) {
      return available
    }

    // 5. Single-sprite cave or indoor fallbacks
    if (battle.value?.isCave || battle.value?.isCrystalCave || mapLocationConfig.value?.isCave || mapLocationConfig.value?.isCrystalCave) {
      return ['night']
    }
    if (battle.value?.isIndoors || mapLocationConfig.value?.isIndoors) {
      return ['day']
    }

    return available.length > 0 ? available : ['day']
  })

  const effectiveCycle = computed<DayPhase>(() => {
    return resolveEffectiveCycleForLocation(
      battle.value?.locationId,
      mapLocationConfig.value,
      gymConfig.value,
      battle.value,
      requireDayPhase(mapStore.currentCycle)
    )
  })

  const effectiveBattleVisual = computed<string>(() => {
    // 1. Terrenos y efectos de campo activos en combate (máxima prioridad visual para iluminación de arena)
    if (battle.value?.fieldConditions) {
      const terrain = (['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain', 'trickroom', 'gravity'] as const).find(k => battle.value?.fieldConditions?.[k]) // o1-ok: O(1) data structure exception
      if (terrain) return terrain
    }

    // 2. Efectos de bando activos como neblina (mist), stealthrock, toxicspikes
    const sideConds = { ...battle.value?.enemySideConditions, ...battle.value?.playerSideConditions }
    const sideField = (['mist', 'stealthrock', 'toxicspikes'] as const).find(k => sideConds[k]) // o1-ok: O(1) data structure exception
    if (sideField) return sideField

    // 3. Si hay un clima temporal activo en el combate (invocado por movimiento o habilidad)
    if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
      return battle.value.weather.visual || battle.value.weather.type
    }

    // 4. Clima configurado explícitamente en el combate o gimnasio
    if (battle.value?.fixedWeather) return battle.value.fixedWeather
    if (gymConfig.value?.fixedWeather) return gymConfig.value.fixedWeather

    // 5. Bloquear clima natural si no está permitido en el escenario físico o no tiene tabla
    const locId = battle.value?.locationId || 'route1'
    const isWeatherExplicitlyDisabled = mapLocationConfig.value?.weatherEnabled === false || gymConfig.value?.weatherEnabled === false
    if (!isNaturalWeatherAllowed.value || isWeatherExplicitlyDisabled || !isMapRouteId(locId) || !isWeatherTableRouteId(locId)) {
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

    // 3. Bloquear clima natural si no está permitido en el escenario físico o no tiene tabla
    const locId = battle.value?.locationId || 'route1'
    const isWeatherExplicitlyDisabled = mapLocationConfig.value?.weatherEnabled === false || gymConfig.value?.weatherEnabled === false
    if (!isNaturalWeatherAllowed.value || isWeatherExplicitlyDisabled || !isMapRouteId(locId) || !isWeatherTableRouteId(locId)) {
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
    if (!isNaturalWeatherAllowed.value || isWeatherExplicitlyDisabled) {
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

    if (!isNaturalWeatherAllowed.value && !hasActiveBattleWeather && !hasExplicitWeather) {
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
