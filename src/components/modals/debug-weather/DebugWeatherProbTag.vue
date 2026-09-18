<script setup lang="ts">
/**
 * src/components/modals/debug-weather/DebugWeatherProbTag.vue
 * 
 * Weather probability tag with modifiers and encounter spawns.
 */

import type { WeatherProbData } from '../debugWeatherTypes'
import DebugWeatherModifiers from './DebugWeatherModifiers.vue'
import DebugWeatherSpawns from './DebugWeatherSpawns.vue'

defineProps<{
  prob: WeatherProbData
}>()
</script>

<template>
  <div 
    class="prob-tag"
    :class="prob.weather"
  >
    <div class="prob-header">
      <span class="emoji">{{ prob.icon }}</span>
      <span class="label">{{ prob.label }}</span>
      <span class="chance">{{ prob.chance }}%</span>
    </div>

    <DebugWeatherModifiers :modifiers="prob.modifiers" />
    
    <DebugWeatherSpawns
      :has-spawns="prob.hasSpawns"
      :visitors="prob.visitors"
      :exclusive="prob.exclusive"
    />
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-weather-tables.scss"></style>
