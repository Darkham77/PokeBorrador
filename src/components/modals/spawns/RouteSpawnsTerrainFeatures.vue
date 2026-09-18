<script setup lang="ts">
/**
 * src/components/modals/spawns/RouteSpawnsTerrainFeatures.vue
 * 
 * Modular sub-panel rendering terrain features, chances, and class-specific route actions.
 */

import { computed } from 'vue';
import { isMapExtortable } from '@/logic/map/mapCardHelper';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { MapRouteId } from '@/data/world/map-assets';
import {
  resolveActivityTerrainFeature,
  resolveSpecialRouteBonus,
  resolveClassRouteAction
} from './routeSpawnsTerrainHelper';

const props = defineProps<{
  map: MapLocation;
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
}>();

const emit = defineEmits<{
  (e: 'toggle-official-route'): void;
  (e: 'toggle-extortion'): void;
}>();

const specialBonus = computed(() =>
  resolveSpecialRouteBonus(props.isOfficialRouteActive, props.isExtortedRouteActive, props.timeRemainingText)
);

const fishingFeature = computed(() =>
  resolveActivityTerrainFeature(props.map.fishing, props.activeFishingChance, props.baseFishingChance, '🎣')
);

const archaeologyFeature = computed(() =>
  resolveActivityTerrainFeature(props.map.archaeology, props.activeArchaeologyChance, props.baseArchaeologyChance, '⛏️')
);

const canExtort = computed(() => isMapExtortable(props.map));

const classAction = computed(() =>
  resolveClassRouteAction({
    playerClass: props.playerClass,
    isOfficialActive: props.isOfficialRouteActive,
    isOfficialCooldown: props.isOfficialRouteOnCooldown,
    cooldownText: props.cooldownRemainingText,
    isExtortedActive: props.isExtortedRouteActive,
    extortedOtherRoute: Boolean(props.activeExtortedRouteId && props.activeExtortedRouteId !== props.map.id)
  })
);

function handleActionClick() {
  if (classAction.value?.kind === 'button-official') {
    emit('toggle-official-route');
  } else if (classAction.value?.kind === 'button-extort') {
    emit('toggle-extortion');
  }
}
</script>

<template>
  <div class="terrain-panel-details">
    <span class="terrain-title-badge"><span class="emoji">🗺️</span> CARACTERÍSTICAS</span>
    <div class="terrain-items">
      <div class="terrain-item">
        <span class="label">Entorno:</span>
        <span class="value">
          {{ terrainTags }}
        </span>
      </div>
      
      <!-- Active special route bonus indicators in route stats -->
      <div
        v-if="specialBonus"
        class="terrain-item benefit-active-item"
      >
        <span :class="['label', specialBonus.cssClass]">{{ specialBonus.label }}</span>
        <span :class="['value font-bold', specialBonus.cssClass]">
          {{ specialBonus.description }}
        </span>
      </div>

      <div class="terrain-item">
        <span class="label">Caminar:</span>
        <span class="value">
          <span class="emoji">🚶</span> Caminando —
          <b :class="getProbClass(activeTerrestrialChance, baseTerrestrialChance)">{{ activeTerrestrialChance }}%</b>
          <span
            style="font-size: 9px; margin-left: 4px;"
            :class="getProbClass(activeTerrestrialChance, baseTerrestrialChance) || 'gray-text'"
          >
            (Base: {{ baseTerrestrialChance }}%)
          </span>
        </span>
      </div>

      <div class="terrain-item">
        <span class="label">Pesca:</span>
        <span
          v-if="fishingFeature.isAvailable"
          class="value"
        >
          <span class="emoji">🎣</span> {{ fishingFeature.levelText }} —
          <b :class="getProbClass(activeFishingChance, baseFishingChance)">{{ activeFishingChance }}%</b>
          <span
            style="font-size: 9px; margin-left: 4px;"
            :class="getProbClass(activeFishingChance, baseFishingChance) || 'gray-text'"
          >
            (Base: {{ baseFishingChance }}%)
          </span>
        </span>
        <span
          v-else
          class="value gray-text"
        ><span class="emoji">❌</span> No disponible</span>
      </div>

      <div class="terrain-item">
        <span class="label">Arqueología:</span>
        <span
          v-if="archaeologyFeature.isAvailable"
          class="value"
        >
          <span class="emoji">⛏️</span> {{ archaeologyFeature.levelText }} —
          <b :class="getProbClass(activeArchaeologyChance, baseArchaeologyChance)">{{ activeArchaeologyChance }}%</b>
          <span
            style="font-size: 9px; margin-left: 4px;"
            :class="getProbClass(activeArchaeologyChance, baseArchaeologyChance) || 'gray-text'"
          >
            (Base: {{ baseArchaeologyChance }}%)
          </span>
        </span>
        <span
          v-else
          class="value gray-text"
        ><span class="emoji">❌</span> No disponible</span>
      </div>

      <!-- Class specific button actions in RouteSpawnsModal -->
      <div
        v-if="canExtort && classAction"
        class="class-actions-container"
      >
        <div
          v-if="classAction.kind === 'cooldown'"
          class="cooldown-tag"
        >
          {{ classAction.text }}
        </div>
        <button
          v-else
          :id="classAction.buttonId"
          :class="classAction.buttonClass"
          @click.stop="handleActionClick"
        >
          {{ classAction.text }}
        </button>
      </div>
    </div>
  </div>
</template>

<style src="../RouteSpawnsModal.styles.scss" scoped lang="scss"></style>
<style src="@/styles/components/_route-spawns-tables.scss" scoped lang="scss"></style>
