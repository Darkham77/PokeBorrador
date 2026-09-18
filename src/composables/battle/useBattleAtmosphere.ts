import { computed, type Ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import { isMapRouteId } from '@/data/world/map-assets'
import { requireDayPhase, type DayPhase } from '@/logic/utils/timeUtils'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { GYMS_BY_ID, isGymId, type Gym } from '@/data/world/gyms'
import type { BattleState } from '@/types/battle/battle'
import {
  isNaturalWeatherAllowedInLocation,
  resolveEffectiveCycleForLocation
} from '@/logic/battle/battleTeamCoordinator'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import {
  resolveBattleSupportedCycles,
  resolveActiveFieldCondition,
  resolveActiveSideCondition,
  resolveActiveCombatWeather,
  isNaturalWeatherBlocked,
  resolveAmbientWeather
} from './battleAtmosphereHelpers.ts'

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
    return resolveBattleSupportedCycles(battle.value, gymConfig.value, mapLocationConfig.value)
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
    const terrain = resolveActiveFieldCondition(battle.value?.fieldConditions)
    if (terrain) return terrain

    const sideField = resolveActiveSideCondition(
      battle.value?.enemySideConditions,
      battle.value?.playerSideConditions
    )
    if (sideField) return sideField

    const combatWeather = resolveActiveCombatWeather(battle.value?.weather)
    if (combatWeather) return combatWeather

    if (battle.value?.fixedWeather) return battle.value.fixedWeather
    if (gymConfig.value?.fixedWeather) return gymConfig.value.fixedWeather

    const activeRouteId = battle.value?.locationId || 'route1'
    if (isNaturalWeatherBlocked(isNaturalWeatherAllowed.value, mapLocationConfig.value, gymConfig.value, activeRouteId)) {
      return 'clear'
    }

    return resolveAmbientWeather(
      mapStore.globalWeather,
      activeRouteId,
      requireWeatherSeasonId(mapStore.currentSeason.id),
      mapStore.currentEpochHour,
      effectiveCycle.value
    )
  })

  const computedWeather = computed<WeatherId>(() => {
    const combatWeather = resolveActiveCombatWeather(battle.value?.weather)
    if (combatWeather) return requireWeatherId(combatWeather)

    if (battle.value?.fixedWeather) return requireWeatherId(battle.value.fixedWeather)
    if (gymConfig.value?.fixedWeather) return requireWeatherId(gymConfig.value.fixedWeather)

    const activeRouteId = battle.value?.locationId || 'route1'
    if (isNaturalWeatherBlocked(isNaturalWeatherAllowed.value, mapLocationConfig.value, gymConfig.value, activeRouteId)) {
      return 'clear'
    }

    return requireWeatherId(
      resolveAmbientWeather(
        mapStore.globalWeather,
        activeRouteId,
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
