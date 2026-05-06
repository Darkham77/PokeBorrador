<script setup lang="ts">
import { getCombatantPosition, WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'

interface Props {
  showGuides?: boolean
  worldStyles: any
}

const props = withDefaults(defineProps<Props>(), {
  showGuides: false
})

const { 
  ENTITY_SIZE_PLAYER, ENTITY_SIZE_ENEMY, 
  SAFE_ZONE_WIDTH, SAFE_ZONE_HEIGHT, 
  SAFE_ZONE_X, SAFE_ZONE_Y 
} = WORLD_CONSTANTS as any

const p1Anchor = getCombatantPosition('player')
const p2Anchor = getCombatantPosition('enemy')
</script>

<template>
  <div
    class="map-virtual-world"
    :class="{ 'debug-mode': showGuides }"
    :style="worldStyles"
  >
    <!-- Standard Content Layer -->
    <div class="virtual-content">
      <slot />
    </div>

    <!-- Centralized Debug Guides Layer -->
    <div
      v-if="showGuides"
      class="camera-debug-guides"
    >
      <div class="map-border" />
      <div 
        class="safe-zone-box" 
        :data-label="`SAFE ZONE (${SAFE_ZONE_WIDTH}x${SAFE_ZONE_HEIGHT}u)`"
        :style="{ 
          left: SAFE_ZONE_X + 'px', 
          top: SAFE_ZONE_Y + 'px', 
          width: SAFE_ZONE_WIDTH + 'px', 
          height: SAFE_ZONE_HEIGHT + 'px' 
        }"
      />
      
      <!-- Entity Anchors -->
      <div 
        class="entity-anchor p1" 
        :style="{ 
          left: p1Anchor.x + 'px', 
          top: p1Anchor.y + 'px', 
          width: ENTITY_SIZE_PLAYER + 'px', 
          height: ENTITY_SIZE_PLAYER + 'px' 
        }"
      />
      <div 
        class="entity-anchor p2" 
        :style="{ 
          left: p2Anchor.x + 'px', 
          top: p2Anchor.y + 'px', 
          width: ENTITY_SIZE_ENEMY + 'px', 
          height: ENTITY_SIZE_ENEMY + 'px' 
        }"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.map-virtual-world {
  position: absolute;
  top: 0;
  left: 0;
  width: 3000px;
  height: 3000px;
  pointer-events: none;

  &.debug-mode {
    background-color: Rgba(255, 0, 0, 0.05);
    outline: 4px solid Rgba(255, 0, 0, 0.3);
  }
}

.virtual-content {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Reusing global debug styles from _battle.scss but scoped here if needed */
/* Actually, most debug styles are in _battle.scss, we just need the structure */
</style>
