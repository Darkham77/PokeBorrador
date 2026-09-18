<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsWeatherEffectsCard.vue
 * 
 * Modular card showing combat weather effects, type modifiers, terrain details, and class actions.
 */

import RouteSpawnsWeatherCombatEffects from './RouteSpawnsWeatherCombatEffects.vue';
import RouteSpawnsTerrainFeatures from './RouteSpawnsTerrainFeatures.vue';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { MapRouteId } from '@/data/world/map-assets';
import type { PokemonType } from '@/data/battle/types';

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

interface Props {
  map: MapLocation;
  weatherEmoji: string;
  parsedDescriptionLines: ParsedDescriptionLine[];
  weatherDetails: WeatherDetailsData | null;
  terrainTags: string;
  isOfficialRouteActive: boolean;
  isExtortedRouteActive: boolean;
  timeRemainingText: string;
  activeTerrestrialChance: number;
  baseTerrestrialChance: number;
  activeFishingChance: number;
  baseFishingChance: number;
  activeArchaeologyChance: number;
  baseArchaeologyChance: number;
  getProbClass: (active: number, base: number) => string;
  playerClass: string | null;
  isOfficialRouteOnCooldown: boolean;
  cooldownRemainingText: string;
  activeExtortedRouteId: MapRouteId | null;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'toggle-official-route'): void;
  (e: 'toggle-extortion'): void;
}>();
</script>

<template>
  <div class="weather-effects-card">
    <RouteSpawnsWeatherCombatEffects
      :weather-emoji="weatherEmoji"
      :parsed-description-lines="parsedDescriptionLines"
      :weather-details="weatherDetails"
    />

    <RouteSpawnsTerrainFeatures
      :map="map"
      :terrain-tags="terrainTags"
      :is-official-route-active="isOfficialRouteActive"
      :is-extorted-route-active="isExtortedRouteActive"
      :time-remaining-text="timeRemainingText"
      :active-terrestrial-chance="activeTerrestrialChance"
      :base-terrestrial-chance="baseTerrestrialChance"
      :active-fishing-chance="activeFishingChance"
      :base-fishing-chance="baseFishingChance"
      :active-archaeology-chance="activeArchaeologyChance"
      :base-archaeology-chance="baseArchaeologyChance"
      :get-prob-class="getProbClass"
      :player-class="playerClass"
      :is-official-route-on-cooldown="isOfficialRouteOnCooldown"
      :cooldown-remaining-text="cooldownRemainingText"
      :active-extorted-route-id="activeExtortedRouteId"
      @toggle-official-route="emit('toggle-official-route')"
      @toggle-extortion="emit('toggle-extortion')"
    />
  </div>
</template>

<style src="../RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
<style src="@/styles/components/_route-spawns-tables.scss" scoped lang="scss"></style>

