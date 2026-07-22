<script setup lang="ts">
import { computed } from 'vue'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { useWeatherVisuals } from '@/composables/effects/useWeatherVisuals'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'

const props = defineProps<{
  battle: {
    weather?: { type: string; visual?: string }
    isGym?: boolean
    locationId?: string
  } | null
  mapStore: {
    globalWeather: string
    currentSeason: { id: string }
    currentEpochHour: number
    currentCycle: string
  }
  uiStore: {
    isPerformanceMode: boolean
  }
  cameraStyles: Record<string, string | number>
}>()

const computedWeather = computed(() => {
  if (props.battle?.weather && props.battle.weather.type !== 'clear' && props.battle.weather.type !== 'none') {
    return props.battle.weather.visual || props.battle.weather.type
  }
  if (props.battle?.isGym) return 'clear'
  if (props.mapStore.globalWeather) return props.mapStore.globalWeather
  return getRouteWeather(props.battle?.locationId || 'route1', props.mapStore.currentSeason.id, props.mapStore.currentEpochHour, props.mapStore.currentCycle)
})

const atmosphereSeed = computed(() => {
  return getWeatherAnimSeed(props.battle?.locationId || 'route1')
})

const { atmosphereFilter, weatherOnlyFilter } = useWeatherVisuals({
  weather: computedWeather,
  cycle: computed(() => props.battle?.isGym ? 'neutral' : props.mapStore.currentCycle)
})

const arenaContentStyles = computed(() => {
  const isCave = !!(props.battle as { isCave?: boolean; isCrystalCave?: boolean } | null)?.isCave || !!(props.battle as { isCave?: boolean; isCrystalCave?: boolean } | null)?.isCrystalCave
  return {
    ...props.cameraStyles,
    '--atmosphere-filter': isCave ? 'none' : atmosphereFilter.value,
    '--weather-filter': isCave ? 'none' : weatherOnlyFilter.value
  }
})

defineExpose({
  arenaContentStyles,
  computedWeather,
  atmosphereSeed
})
</script>

<template>
  <AtmosphereLayer
    :weather="computedWeather"
    :cycle="mapStore.currentCycle"
    :season="mapStore.currentSeason.id"
    :is-performance-mode="uiStore.isPerformanceMode"
    :z-index="'calc(var(--z-base) + 20)'"
    :anim-seed="atmosphereSeed"
    :is-visible="true"
  />
</template>
