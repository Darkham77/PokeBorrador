<script setup>
import { computed } from 'vue'
import { useWarStore } from '@/stores/war'

const props = defineProps({
  map: { type: Object, required: true },
  imageName: { type: String, required: true }
})

const warStore = useWarStore()

const mapData = computed(() => {
  const data = warStore.mapDominance[props.map.id] || { union: 0, poder: 0, winner: null }
  const total = data.union + data.poder
  return {
    ...data,
    total,
    pctU: total > 0 ? (data.union / total) * 100 : 50,
    pctP: total > 0 ? (data.poder / total) * 100 : 50,
    leading: data.union > data.poder ? 'union' : (data.poder > data.union ? 'poder' : 'none')
  }
})

const getWinnerLabel = (winner) => {
  if (winner === 'union') return 'UNIÓN'
  if (winner === 'poder') return 'PODER'
  return 'SIN CONQUISTAR'
}
</script>

<template>
  <div 
    class="war-map-card"
    :style="{ backgroundImage: `url('/maps/${imageName || 'default.webp'}')` }"
    :class="[
      !warStore.isDisputePhase ? (mapData.winner === 'union' ? 'dom-union' : mapData.winner === 'poder' ? 'dom-poder' : '') : '',
      warStore.isDisputePhase ? (mapData.leading === 'union' ? 'glow-union' : mapData.leading === 'poder' ? 'glow-poder' : '') : ''
    ]"
  >
    <!-- DISPUTE PHASE OVERLAY -->
    <div
      v-if="warStore.isDisputePhase"
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
          <span>{{ mapData.union }} PT</span>
          <span>{{ mapData.poder }} PT</span>
        </div>
      </div>

      <div class="card-footer">
        {{ mapData.total > 0 ? (mapData.union > mapData.poder ? 'Lidera Unión' : (mapData.poder > mapData.union ? 'Lidera Poder' : 'En disputa')) : 'Sin actividad' }}
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
          @click="window.openSelectDefensePokeModal?.(map.id)"
        >
          🛡️ PROTEGER
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.war-map-card {
  position: relative;
  height: 140px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  background-size: cover;
  background-position: center;
  overflow: hidden;
  transition: transform 0.2s;

  &:hover { transform: #{'Scale(1.03)'}; z-index: 5; }
  
  &.glow-union { box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); border-color: #3b82f6; }
  &.glow-poder { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); border-color: #ef4444; }
}

.war-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  padding: 10px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    .map-name { font-family: 'Press Start 2P', monospace; font-size: 7px; color: #eee; }
    .war-tag { font-size: 7px; color: #fbbf24; font-weight: bold; }
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
  font-family: 'Press Start 2P', monospace;
  margin-bottom: 4px;

  &.pts { margin-top: 4px; opacity: 0.8; }
  .u-text { color: #3b82f6; }
  .p-text { color: #ef4444; }
}

.war-progress-bar {
  height: 8px;
  background: #222;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  border: 1px solid rgba(255,255,255,0.1);

  .bar-union { background: #3b82f6; }
  .bar-poder { background: #ef4444; }
}

.card-footer {
  text-align: center;
  font-size: 8px;
  color: #888;
  font-style: italic;
}

.dominance-color-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;

  &.union { background: linear-gradient(0deg, rgba(59, 130, 246, 0.6) 0%, rgba(255, 255, 255, 0.2) 100%); }
  &.poder { background: linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(80, 0, 0, 0.6) 100%); }
  &:not(.union):not(.poder) { background: rgba(0,0,0,0.6); }
}

.dom-content {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 10px;
}

.winner-label {
  font-family: 'Press Start 2P', monospace;
  font-size: 16px;
  letter-spacing: 2px;
  margin-bottom: 6px;

  &.union { color: #3b82f6; text-shadow: 0 0 10px #3b82f6, 0 2px 4px #000; }
  &.poder { color: #ef4444; text-shadow: 0 0 10px #ef4444, 0 2px 4px #000; }
  &:not(.union):not(.poder) { color: #555; font-size: 8px; }
}

.map-subname {
  font-family: 'Press Start 2P', monospace;
  font-size: 6px;
  color: rgba(255,255,255,0.6);
}

.protect-btn {
  margin-top: 15px;
  width: 90%;
  padding: 8px;
  background: rgba(74, 222, 128, 0.8);
  border: 2px solid #4ade80;
  border-radius: 8px;
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.4);

  &:hover { background: #4ade80; transform: translateY(-2px); }
}
</style>
