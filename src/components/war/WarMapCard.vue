<script setup lang="ts">

import { computed } from 'vue'
import { useWarStore } from '@/stores/war'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { MAP_ROUTE_MAPPING } from '@/data/map-assets'

interface Props {
  map: { id: string; name: string }
}

const props = defineProps<Props>()

const warStore = useWarStore()

const mapData = computed(() => {
  const data = warStore.mapDominance[props.map.id] || { union: 0, poder: 0, winner: null }
  const total = (Number(data.union ?? 0)) + (Number(data.poder ?? 0))
  return {
    ...data,
    total,
    pctU: total > 0 ? ((data.union ?? 0) / total) * 100 : 50,
    pctP: total > 0 ? ((data.poder ?? 0) / total) * 100 : 50,
    leading: (data.union ?? 0) > (data.poder ?? 0) ? 'union' : ((data.poder ?? 0) > (data.union ?? 0) ? 'poder' : 'none')
  }
})

const getWinnerLabel = (winner: string | null) => {
  if (winner === 'union') return 'UNIÓN'
  if (winner === 'poder') return 'PODER'
  return 'SIN CONQUISTAR'
}

const mapImageUrl = computed(() => {
  const fileName = (MAP_ROUTE_MAPPING as Record<string, string>)[props.map.id] || 'default'
  // En WarMapCard usamos la versión de día por defecto si el mapa soporta ciclos
  return getAssetUrl(ASSET_TYPES.MAP, fileName, { cycle: 'day' })
})
const openDefenseModal = (mapId: string) => {
  (window as unknown as { openSelectDefensePokeModal?: (id: string) => void }).openSelectDefensePokeModal?.(mapId)
}
</script>

<template>
  <div 
    class="war-map-card"
    :style="{ backgroundImage: `url('${mapImageUrl}')` }"
    :class="[
      !warStore.isDisputeActive ? (mapData.winner === 'union' ? 'dom-union' : mapData.winner === 'poder' ? 'dom-poder' : '') : '',
      warStore.isDisputeActive ? (mapData.leading === 'union' ? 'glow-union' : mapData.leading === 'poder' ? 'glow-poder' : '') : ''
    ]"
  >
    <!-- DISPUTE PHASE OVERLAY -->
    <div
      v-if="warStore.isDisputeActive"
      class="war-card-overlay dispute"
    >
      <div class="card-header">
        <span class="map-name">{{ map.name }}</span>
        <span
          v-if="mapData.total > 0"
          class="war-tag"
        >⚔️ GUERRA</span>
      </div>

      <div class="war-central-box">
        <div class="labels">
          <span class="u-text">UNIÓN</span>
          <span class="p-text">PODER</span>
        </div>
        <div class="war-progress-bar">
          <div
            class="bar-union"
            :style="{ width: mapData.pctU + '%' }"
          />
          <div
            class="bar-poder"
            :style="{ width: mapData.pctP + '%' }"
          />
        </div>
        <div class="labels pts">
          <span>{{ mapData.union ?? 0 }} PT</span>
          <span>{{ mapData.poder ?? 0 }} PT</span>
        </div>
      </div>

      <div class="card-footer">
        {{ mapData.total > 0 ? ((mapData.union ?? 0) > (mapData.poder ?? 0) ? 'Lidera Unión' : ((mapData.poder ?? 0) > (mapData.union ?? 0) ? 'Lidera Poder' : 'En disputa')) : 'Sin actividad' }}
      </div>
    </div>

    <!-- DOMINANCE PHASE OVERLAY -->
    <template v-else>
      <div 
        class="dominance-color-overlay" 
        :class="mapData.winner"
      />
      <div class="dom-content">
        <div
          class="winner-label"
          :class="mapData.winner"
        >
          {{ getWinnerLabel(mapData.winner) }}
        </div>
        <div class="map-subname">
          {{ map.name.toUpperCase() }}
        </div>
        
        <button 
          v-if="mapData.winner === warStore.faction"
          class="protect-btn"
          @click.stop="openDefenseModal(map.id)"
        >
          🛡️ PROTEGER
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.war-map-card {
  position: relative;
  height: 140px;
  border-radius: 12px;
  border: 1px solid Rgba(255,255,255,0.15);
  background-size: cover;
  background-position: center;
  @include pixelated;
  image-rendering: pixelated !important;
  image-rendering: crisp-edges !important;
  -ms-interpolation-mode: nearest-neighbor !important;



  &:hover { transform: #{'Scale(1.03)'}; z-index: var(--z-base); }
  
  &.glow-union { box-shadow: 0 0 15px Rgba(59, 130, 246, 0.4); border-color: Rgba(59, 130, 246, 1); }
  &.glow-poder { box-shadow: 0 0 15px Rgba(239, 68, 68, 0.4); border-color: Rgba(239, 68, 68, 1); }
}

.war-card-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  padding: 10px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    .map-name { @include pixelated; font-size: 7px; color: Rgba(238, 238, 238, 1); }
    .war-tag { font-size: 7px; color: Rgba(251, 191, 36, 1); font-weight: bold; }
  }
}

.war-central-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.labels {
  display: flex;
  justify-content: space-between;
  font-size: 7px;
  @include pixelated;
  margin-bottom: 4px;

  &.pts { margin-top: 4px; opacity: 0.8; }
  .u-text { color: Rgba(59, 130, 246, 1); }
  .p-text { color: Rgba(239, 68, 68, 1); }
}

.war-progress-bar {
  height: 8px;
  background: Rgba(34, 34, 34, 1);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  border: 1px solid Rgba(255,255,255,0.1);

  .bar-union { background: Rgba(59, 130, 246, 1); }
  .bar-poder { background: Rgba(239, 68, 68, 1); }
}

.card-footer {
  text-align: center;
  font-size: 8px;
  color: Rgba(136, 136, 136, 1);
  font-style: italic;
}

.dominance-color-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: var(--z-base);

  &.union { background: Linear-Gradient(0deg, Rgba(59, 130, 246, 0.6) 0%, Rgba(255, 255, 255, 0.2) 100%); }
  &.poder { background: Linear-Gradient(0deg, Rgba(0, 0, 0, 0.8) 0%, Rgba(80, 0, 0, 0.6) 100%); }
  &:not(.union):not(.poder) { background: Rgba(0,0,0,0.6); }
}

.dom-content {
  position: absolute;
  inset: 0;
  z-index: var(--z-base);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
}

.winner-label {
  @include pixelated;
  font-size: 16px;
  letter-spacing: 2px;
  margin-bottom: 6px;

  &.union { color: Rgba(59, 130, 246, 1); text-shadow: 0 0 10px Rgba(59, 130, 246, 1), 0 2px 4px var(--black); }
  &.poder { color: Rgba(239, 68, 68, 1); text-shadow: 0 0 10px Rgba(239, 68, 68, 1), 0 2px 4px var(--black); }
  &:not(.union):not(.poder) { color: Rgba(85, 85, 85, 1); font-size: 8px; }
}

.map-subname {
  @include pixelated;
  font-size: 6px;
  color: Rgba(255,255,255,0.6);
}

.protect-btn {
  margin-top: 15px;
  width: 90%;
  padding: 8px;
  background: Rgba(74, 222, 128, 0.8);
  border: 2px solid Rgba(74, 222, 128, 1);
  border-radius: 8px;
  color: $white;
  @include pixelated;
  font-size: 7px;
  cursor: pointer;
  box-shadow: 0 0 10px Rgba(74, 222, 128, 0.4);

  &:hover { background: Rgba(74, 222, 128, 1); transform: Translatey(-2px); }
}
</style>
