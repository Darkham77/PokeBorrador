<script setup lang="ts">

import { computed } from 'vue'
import { useWarStore } from '@/stores/war'

interface Props {
  mapId: string
}

const props = defineProps<Props>()

const warStore = useWarStore()

const mapData = computed(() => warStore.mapDominance[props.mapId] || { union: 0, poder: 0, winner: null })

const dominancePercent = computed(() => {
  const total = (mapData.value.union ?? 0) + (mapData.value.poder ?? 0)
  if (total === 0) return 50
  return ((mapData.value.union ?? 0) / total) * 100
})

const leadingFaction = computed(() => {
  if (mapData.value.winner) return mapData.value.winner
  if ((mapData.value.union ?? 0) > (mapData.value.poder ?? 0)) return 'union'
  if ((mapData.value.poder ?? 0) > (mapData.value.union ?? 0)) return 'poder'
  return null
})

const factionLabel = computed(() => {
  if (leadingFaction.value === 'union') return 'UNIÓN'
  if (leadingFaction.value === 'poder') return 'PODER'
  return 'DISPUTA'
})
</script>

<template>
  <div
    class="map-dominance-overlay"
    :class="leadingFaction"
  >
    <div class="content">
      <div class="header">
        <span class="status-dot" />
        <span class="label">{{ factionLabel }}</span>
      </div>
      
      <div class="progress-track">
        <div
          class="fill"
          :style="{ width: dominancePercent + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.map-dominance-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: Rgba(0, 0, 0, 0.8);
  -webkit-will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  backdrop-filter: Blur(8px);
  backdrop-filter: Blur(8px);
  @include gpu-layer;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  min-width: 120px;
  z-index: var(--z-base);
  pointer-events: none;

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--gray);
    }
    
    .label {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--gray);
    }
  }

  .progress-track {
    height: 4px;
    background: var(--red);
    border-radius: 2px;
    overflow: hidden;
    
    .fill {
      height: 100%;
      background: var(--blue);
      transition: width 0.3s ease;
    }
  }

  // State modifiers
  &.union {
    border-color: Rgba(10, 132, 255, 0.4);
    .status-dot { background: var(--blue); box-shadow: 0 0 5px var(--blue); }
    .label { color: var(--blue); }
  }
  
  &.poder {
    border-color: Rgba(255, 69, 58, 0.4);
    .status-dot { background: var(--red); box-shadow: 0 0 5px var(--red); }
    .label { color: var(--red); }
  }
}
</style>