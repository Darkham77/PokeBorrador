import { computed, type Ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import { requireWeatherSeasonId } from '@/data/world/weather-tables'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireDayPhase, type DayPhase } from '@/logic/utils/timeUtils'
import type { BattleState } from '@/types/battle/battle'

export function useBattleAtmosphere(battle: Ref<BattleState | null | undefined>) {
  const mapStore = useMapStore()

  const isInteriorCombat = computed<boolean>(() => {
    const b = battle.value
    return !!(
      b?.isGym ||
      b?.isIndoors ||
      b?.isCave ||
      b?.isCrystalCave ||
      b?.locationId === 'gym' ||
      b?.locationId === 'pvp'
    )
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

    // 4. Bloquear clima natural en gimnasios, PvP o recintos interiores
    if (isInteriorCombat.value) return 'clear'

    // 5. De lo contrario, cae en el clima global o del mapa exterior
    if (mapStore.globalWeather) return mapStore.globalWeather
    return getRouteWeather(
      requireMapRouteId(battle.value?.locationId || 'route1'),
      requireWeatherSeasonId(mapStore.currentSeason.id),
      mapStore.currentEpochHour,
      requireDayPhase(mapStore.currentCycle)
    )
  })

  const computedWeather = computed<WeatherId>(() => {
    // Si hay un clima temporal activo en el combate (invocado por movimiento o habilidad)
    if (battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none') {
      return requireWeatherId(battle.value.weather.visual || battle.value.weather.type)
    }
    // Bloquear clima natural en gimnasios, PvP o recintos interiores
    if (isInteriorCombat.value) return 'clear'
    // De lo contrario, cae en el clima global o del mapa exterior
    if (mapStore.globalWeather) return requireWeatherId(mapStore.globalWeather)
    return requireWeatherId(
      getRouteWeather(
        requireMapRouteId(battle.value?.locationId || 'route1'),
        requireWeatherSeasonId(mapStore.currentSeason.id),
        mapStore.currentEpochHour,
        requireDayPhase(mapStore.currentCycle)
      )
    )
  })

  const effectiveCycle = computed<DayPhase>(() => {
    if (isInteriorCombat.value) {
      return 'day'
    }
    return requireDayPhase(mapStore.currentCycle)
  })

  const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
    weather: effectiveBattleVisual,
    cycle: effectiveCycle
  })

  const isAtmosphereLayerVisible = computed<boolean>(() => {
    return !isInteriorCombat.value || computedWeather.value !== 'clear'
  })

  const arenaAtmosphereStyles = computed(() => {
    const isCave = !!(battle.value?.isCave || battle.value?.isCrystalCave)
    const isInterior = isInteriorCombat.value
    const hasActiveBattleWeather = Boolean(
      battle.value?.weather && battle.value.weather.type !== 'clear' && battle.value.weather.type !== 'none'
    )

    return {
      '--atmosphere-filter': isCave || (isInterior && !hasActiveBattleWeather) ? 'none' : atmosphereFilter.value,
      '--weather-filter': isCave || (isInterior && !hasActiveBattleWeather) ? 'none' : weatherOnlyFilter.value
    }
  })

  return {
    isInteriorCombat,
    effectiveBattleVisual,
    computedWeather,
    effectiveCycle,
    atmosphereFilter,
    weatherOnlyFilter,
    isAtmosphereLayerVisible,
    arenaAtmosphereStyles
  }
}
