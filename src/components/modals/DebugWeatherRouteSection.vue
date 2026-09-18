<script setup lang="ts">
import DebugWeatherSeasonCard from './debug-weather/DebugWeatherSeasonCard.vue'
import type { PrecomputedRouteData } from './debugWeatherTypes.ts'
import type { WeatherTableRouteId } from '@/data/world/weather-tables'

defineProps<{
  route: PrecomputedRouteData
  isExpanded: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', routeId: WeatherTableRouteId): void
}>()
</script>

<template>
  <div class="route-section">
    <h2
      class="route-title"
      @click.stop="emit('toggle', route.routeId)"
    >
      <span class="emoji arrow">{{ isExpanded ? '▼' : '▶' }}</span>
      {{ route.name }} 
      <span class="id-tag">#{{ route.routeId }}</span>
    </h2>
    
    <div
      v-if="isExpanded"
      class="seasons-grid"
    >
      <DebugWeatherSeasonCard
        v-for="season in route.seasons"
        :key="season.seasonId"
        :season="season"
      />
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-weather-tables.scss"></style>
