<script setup lang="ts">
/**
 * src/components/map/MapCardLeftPills.vue
 * 
 * Renders the bottom-left action pills: fishing, archaeology, faction dominance, and winner crown.
 */

import PVTooltip from '@/components/common/PVTooltip.vue';
import { computed } from 'vue';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { DominanceInfo } from '@/types/system/stores';

const props = defineProps<{
  map: MapLocation;
  isFastMode?: boolean;
  isPerformanceMode?: boolean;
  isCardLocked: boolean;
  isSafariLocked: boolean;
  isVisible: boolean;
  isLowPower: boolean;
  dominance?: DominanceInfo | null;
  isPlayerWinner: boolean;
}>();

const isFast = computed(() => props.isFastMode ?? props.isPerformanceMode ?? false);
</script>

<template>
  <div class="map-left-pills-container">
    <!-- Fishing Icon -->
    <PVTooltip
      v-if="map.fishing && !isFast && !isCardLocked && !isSafariLocked && isVisible"
      class="fishing-pill-standalone"
      title="PESCA"
      description="¡Esta zona tiene agua! Puedes pescar Pokémon aquí."
      position="top"
    >
      <div 
        :class="['interactive-pill fishing-pill map-pill', { 'is-low-power': isLowPower }]"
      >
        <span class="emoji pill-icon">🎣</span>
      </div>
    </PVTooltip>

    <!-- Archaeology Icon -->
    <PVTooltip
      v-if="map.archaeology && !isFast && !isCardLocked && !isSafariLocked && isVisible"
      class="archaeology-pill-standalone"
      title="ARQUEOLOGÍA"
      description="¡Esta zona tiene rocas antiguas! Puedes excavar fósiles y minerales aquí."
      position="top"
    >
      <div 
        :class="['interactive-pill archaeology-pill map-pill', { 'is-low-power': isLowPower }]"
      >
        <span class="emoji pill-icon">⛏️</span>
      </div>
    </PVTooltip>

    <!-- Faction Status Pill -->
    <PVTooltip
      v-if="dominance?.winner && !isFast && !isCardLocked && !isSafariLocked && isVisible"
      class="faction-status-pill"
      title="DOMINIO FACCIÓN"
      :description="`Controlado por ${dominance.winner === 'union' ? 'Unión' : 'Poder'}`"
      position="top"
    >
      <div class="pill-content">
        <span class="emoji faction-emoji">
          {{ dominance.winner === 'union' ? '⭐' : '✊' }}
        </span>
      </div>
    </PVTooltip>

    <!-- Winner Crown -->
    <PVTooltip
      v-if="isPlayerWinner && !isFast && !isCardLocked && !isSafariLocked"
      class="dom-badge winning"
      title="DOMINADO"
      description="¡Bonus de captura activo por dominio de facción!"
      position="top"
    >
      <div class="crown-glow-wrapper">
        <div 
          v-if="!isLowPower" 
          class="crown-shine-aura" 
        />
        <span class="emoji pill-content icon">👑</span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped src="./MapCard.styles.scss" lang="scss"></style>
