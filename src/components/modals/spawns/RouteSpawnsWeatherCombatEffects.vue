<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsWeatherCombatEffects.vue
 * 
 * Modular sub-panel rendering combat weather effects and type spawn modifiers.
 */
import type { PokemonType } from '@/data/battle/types';
import RouteSpawnsWeatherDescLine from './RouteSpawnsWeatherDescLine.vue';
import RouteSpawnsWeatherModifiers from './RouteSpawnsWeatherModifiers.vue';

interface ParsedDescriptionSegment {
  text: string;
  isType: boolean;
  type: string;
}

interface ParsedDescriptionLine {
  segments: ParsedDescriptionSegment[];
  typeClass: string;
  icon: string;
  label: string;
}

interface WeatherModifiersData {
  boost?: readonly PokemonType[];
  debuff?: readonly PokemonType[];
  block?: readonly PokemonType[];
}

interface WeatherDetailsData {
  modifiers?: WeatherModifiersData;
  description?: string;
}

defineProps<{
  weatherEmoji: string;
  parsedDescriptionLines: ParsedDescriptionLine[];
  weatherDetails: WeatherDetailsData | null;
}>();
</script>

<template>
  <div class="weather-panel-details">
    <div class="weather-header-line">
      <span class="weather-title-badge"><span class="emoji">{{ weatherEmoji }}</span> EFECTOS EN COMBATE</span>
      <div
        v-if="parsedDescriptionLines.length"
        class="weather-desc-lines"
      >
        <RouteSpawnsWeatherDescLine
          v-for="(line, lineIdx) in parsedDescriptionLines"
          :key="lineIdx"
          :line="line"
        />
      </div>
      <span
        v-else
        class="weather-desc-line"
      >
        Sin efectos climáticos especiales en combate.
      </span>
    </div>

    <!-- Type modifiers tags lists (Map Spawns) -->
    <RouteSpawnsWeatherModifiers
      v-if="weatherDetails?.modifiers"
      :modifiers="weatherDetails.modifiers"
    />
  </div>
</template>

<style src="../RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
<style src="@/styles/components/_route-spawns-tables.scss" scoped lang="scss"></style>
