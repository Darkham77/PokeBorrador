import { computed, type Ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import { requireDayPhase, type DayPhase } from '@/logic/utils/timeUtils'
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry'
import type { BaseMapEnvironment } from '@/logic/environment/map/baseMapEnvironment'
import type { BattleState } from '@/types/battle/battle'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import {
  resolveActiveFieldCondition,
  resolveActiveSideCondition,
  resolveActiveCombatWeather,
  resolveAmbientWeather
} from './battleAtmosphereHelpers.ts'

export function useBattleAtmosphere(battle: Ref<BattleState | null | undefined>) {
  const mapStore = useMapStore()

  const environment = computed<BaseMapEnvironment | null>(() => {
    const locId = battle.value?.locationId
    if (!locId) return null
    return getMapEnvironment(locId, {
      isGym: battle.value?.isGym,
      gymId: battle.value?.gymId,
      isPvP: battle.value?.isPvP,
      isCave: battle.value?.isCave || battle.value?.isCrystalCave,
      isIndoors: battle.value?.isIndoors
    })
  })

  const isNaturalWeatherAllowed = computed<boolean>(() => {
    return environment.value ? environment.value.isWeatherAllowed() : false
  })

  const isGymOrPvP = computed<boolean>(() => !isNaturalWeatherAllowed.value)

  const supportedCycles = computed<readonly DayPhase[]>(() => {
    if (battle.value?.fixedCycle) return [battle.value.fixedCycle]
    return environment.value ? environment.value.getSupportedCycles() : ['day']
  })

  const effectiveCycle = computed<DayPhase>(() => {
    if (battle.value?.fixedCycle) return battle.value.fixedCycle
    const currentClockCycle = requireDayPhase(mapStore.currentCycle || 'day')
    return environment.value ? environment.value.resolveEffectiveLighting(currentClockCycle) : 'day'
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

    const activeRouteId = battle.value?.locationId
    if (!activeRouteId || !isNaturalWeatherAllowed.value) {
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

    const activeRouteId = battle.value?.locationId
    if (!activeRouteId || !isNaturalWeatherAllowed.value) {
      return requireWeatherId('clear')
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
    if (!isNaturalWeatherAllowed.value) {
      return computedWeather.value !== 'clear'
    }
    return true
  })

  const arenaAtmosphereStyles = computed(() => {
    const isCave = Boolean(environment.value?.isCave())
    const hasActiveBattleWeather = Boolean(
      battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none'
    )
    const hasExplicitWeather = Boolean(battle.value?.fixedWeather)

    if (!isNaturalWeatherAllowed.value && !hasActiveBattleWeather && !hasExplicitWeather) {
      return {
        '--atmosphere-filter': 'none',
        '--weather-filter': 'none'
      }
    }

    if (isCave) {
      return {
        '--atmosphere-filter': 'brightness(0.7) contrast(1.1) saturate(0.85)',
        '--weather-filter': weatherOnlyFilter.value
      }
    }

    return {
      '--atmosphere-filter': atmosphereFilter.value,
      '--weather-filter': weatherOnlyFilter.value
    }
  })

  return {
    effectiveBattleVisual,
    computedWeather,
    effectiveCycle,
    isAtmosphereLayerVisible,
    arenaAtmosphereStyles,
    isNaturalWeatherAllowed,
    isGymOrPvP,
    supportedCycles,
    mapSupportsCycles: computed(() => supportedCycles.value.length > 1)
  }
}
