<script setup>
import { useWarStore } from '@/stores/war'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { computed } from 'vue'

const warStore = useWarStore()

const allMaps = computed(() => {
  const maps = pokemonDataProvider.getMaps()
  return maps.map(m => {
    const data = warStore.mapDominance[m.id] || { union: 0, poder: 0, winner: null }
    const total = data.union + data.poder
    const unionPct = total > 0 ? (data.union / total) * 100 : 50
    const winner = data.winner || (data.union > data.poder ? 'union' : data.poder > data.union ? 'poder' : null)
    
    return {
      id: m.id,
      name: m.name,
      union: data.union,
      poder: data.poder,
      unionPct,
      winner
    }
  })
})
</script>

<template>
  <div class="map-control-list">
    <h3 class="section-title">
      CONTROL TERRITORIAL
    </h3>
    
    <div class="grid">
      <div
        v-for="map in allMaps"
        :key="map.id"
        class="map-row"
        :class="map.winner"
      >
        <div class="map-info">
          <span class="map-name">{{ map.name }}</span>
          <span
            v-if="map.winner"
            class="winner-badge"
          >
            {{ map.winner === 'union' ? 'UNION' : 'PODER' }}
          </span>
        </div>

        <div class="dominance-bar">
          <div
            class="bar-fill union"
            :style="{ width: map.unionPct + '%' }"
          >
            <span v-if="map.union > 0">{{ map.union }}</span>
          </div>
          <div
            class="bar-fill poder"
            :style="{ width: (100 - map.unionPct) + '%' }"
          >
            <span v-if="map.poder > 0">{{ map.poder }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.map-control-list {
  margin-top: 20px;
}

.section-title {
  font-family: 'Press Start 2P', cursive;
  font-size: 10px;
  color: #555;
  margin-bottom: 16px;
  text-align: center;
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-row {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    transform: translateX(4px);
  }

  &.union { border-left: 4px solid #3b82f6; }
  &.poder { border-left: 4px solid #ef4444; }
}

.map-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .map-name {
    font-size: 11px;
    font-weight: 600;
    color: #ccc;
  }

  .winner-badge {
    font-size: 8px;
    font-family: 'Press Start 2P', cursive;
    padding: 2px 6px;
    border-radius: 4px;
    
    .union & { background: #3b82f6; color: white; }
    .poder & { background: #ef4444; color: white; }
  }
}

.dominance-bar {
  height: 8px;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  
  .bar-fill {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7px;
    font-weight: bold;
    color: white;
    transition: width 0.5s ease;

    &.union { background: #3b82f6; box-shadow: inset 0 0 10px rgba(0,0,0,0.3); }
    &.poder { background: #ef4444; box-shadow: inset 0 0 10px rgba(0,0,0,0.3); }
  }
}
</style>
