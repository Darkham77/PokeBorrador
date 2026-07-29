<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWarStore } from '@/stores/war'
import { useMapStore } from '@/stores/map'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { MAP_ROUTE_MAPPING, requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const warStore = useWarStore()
const mapStore = useMapStore()
const currentRegion = ref('kanto')

const regions = [
  { id: 'kanto', name: 'KANTO', active: true },
  { id: 'johto', name: 'JOHTO', active: false },
  { id: 'hoenn', name: 'HOENN', active: false }
]

interface MapData {
  id: string
  name: string
}

const getMapImage = (mapId: MapRouteId) => {
  const fileName = MAP_ROUTE_MAPPING[mapId]
  return getAssetUrl(ASSET_TYPES.MAP, fileName, { cycle: mapStore.currentCycle || 'day' })
}

const allMaps = computed(() => {
  const maps = pokemonDataProvider.getMaps() as MapData[]
  return maps.map(m => {
    const mapId = requireMapRouteId(m.id)
    const data = warStore.mapDominance[mapId] || { union: 0, poder: 0, winner: null }
    const total = (Number(data.union ?? 0)) + (Number(data.poder ?? 0))
    const unionPct = total > 0 ? ((data.union ?? 0) / total) * 100 : 50
    const winner = data.winner || ((data.union ?? 0) > (data.poder ?? 0) ? 'union' : (data.poder ?? 0) > (data.union ?? 0) ? 'poder' : null) as 'union' | 'poder' | null
    
    return {
      id: mapId,
      name: m.name,
      union: data.union ?? 0,
      poder: data.poder ?? 0,
      unionPct,
      winner
    }
  })
})

const filteredMaps = computed(() => {
  if (currentRegion.value !== 'kanto') return []
  return allMaps.value
})
</script>

<template>
  <div class="map-control-list">
    <h3 class="wc-section-title">
      CONTROL TERRITORIAL
    </h3>

    <!-- Region Selector Tabs -->
    <div class="region-tabs">
      <button
        v-for="region in regions"
        :key="region.id"
        class="region-tab-btn"
        :class="{ active: currentRegion === region.id, disabled: !region.active }"
        :disabled="!region.active"
        @click="currentRegion = region.id"
      >
        <span class="region-name">{{ region.name }}</span>
        <span
          v-if="!region.active"
          class="coming-soon"
        >PROXIMAMENTE</span>
      </button>
    </div>
    
    <div class="grid">
      <div
        v-for="map in filteredMaps"
        :key="map.id"
        class="map-row"
        :class="map.winner"
      >
        <div class="map-row-content">
          <div
            class="map-thumbnail"
            :style="{ backgroundImage: `url(${getMapImage(map.id)})` }"
          />

          <div class="map-details">
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
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.map-control-list {
  margin-top: 20px;
}

.wc-section-title {
  @include pixelated;
  font-size: 10px;
  color: Rgba(85, 85, 85, 1);
  margin-bottom: 16px;
  text-align: center;
}

/* REGION TABS */
.region-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 8px;
}

.region-tab-btn {
  @include pixelated;
  font-size: 9px;
  padding: 6px 12px;
  background: Rgba(255, 255, 255, 0.02);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  color: var(--gray);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  

  &:hover:not(.disabled) {
    background: Rgba(255, 255, 255, 0.08);
    color: var(--white);
  }

  &.active {
    background: Rgba(255, 255, 255, 0.1);
    border-color: var(--yellow);
    color: var(--yellow);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .coming-soon {
    font-size: 6px;
    color: var(--gray);
    margin-top: 2px;
    opacity: 0.7;
  }
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-row {
  background: Rgba(255, 255, 255, 0.03);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
  }

  &.union { border-left: 4px solid Rgba(59, 130, 246, 1); }
  &.poder { border-left: 4px solid Rgba(239, 68, 68, 1); }
}

.map-row-content {
  display: flex;
  gap: 12px;
  align-items: center;
}

.map-thumbnail {
  width: 88px;
  height: 88px;
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 6px Rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
  image-rendering: pixelated;
}

.map-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.map-info {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .map-name {
    font-size: 11px;
    font-weight: 600;
    color: Rgba(204, 204, 204, 1);
  }

  .winner-badge {
    font-size: 8px;
    @include pixelated;
    padding: 2px 6px;
    border-radius: 4px;
    
    .union & { background: Rgba(59, 130, 246, 1); color: var(--white); }
    .poder & { background: Rgba(239, 68, 68, 1); color: var(--white); }
  }
}

.dominance-bar {
  height: 8px;
  background: $black;
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
    

    &.union { background: Rgba(59, 130, 246, 1); box-shadow: inset 0 0 10px Rgba(0, 0, 0, 0.3); }
    &.poder { background: Rgba(239, 68, 68, 1); box-shadow: inset 0 0 10px Rgba(0, 0, 0, 0.3); }
  }
}
</style>
