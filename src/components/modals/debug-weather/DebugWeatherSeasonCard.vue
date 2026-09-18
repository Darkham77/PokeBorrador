<script setup lang="ts">
/**
 * src/components/modals/debug-weather/DebugWeatherSeasonCard.vue
 * 
 * Renders a season card and iterates its daily cycle rows.
 */

import DebugWeatherProbTag from './DebugWeatherProbTag.vue';
import type { WeatherSeasonData } from '../debugWeatherTypes';

defineProps<{
  season: WeatherSeasonData;
}>();
</script>

<template>
  <div class="season-card">
    <h3 class="season-title">
      {{ season.label }}
    </h3>
    
    <div class="cycles-list">
      <div
        v-for="cycle in season.cycles"
        :key="cycle.cycleId"
        class="cycle-row"
      >
        <div class="cycle-name">
          {{ cycle.label }}
        </div>
        <div class="probs-tags">
          <DebugWeatherProbTag
            v-for="prob in cycle.probs"
            :key="prob.weather"
            :prob="prob"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/components/_debug-weather-tables.scss"></style>
