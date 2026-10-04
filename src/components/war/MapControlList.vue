<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWarStore } from '@/stores/war'
import { useMapStore } from '@/stores/map'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { MAP_ROUTE_MAPPING, requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { isFactionId, type FactionId } from '@/types/system/game'

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

const NEUTRAL_DOMINANCE_PERCENT = 50 as const

const allMaps = computed(() => {
  const maps = pokemonDataProvider.getMaps() as MapData[]
  return maps.map(m => {
    const mapId = requireMapRouteId(m.id)
    const data = warStore.mapDominance[mapId] || { union: 0, poder: 0, winner: null }
    const total = (Number(data.union ?? 0)) + (Number(data.poder ?? 0))
    const unionPct = total > 0 ? ((data.union ?? 0) / total) * 100 : NEUTRAL_DOMINANCE_PERCENT
    const rawWinner = data.winner || ((data.union ?? 0) > (data.poder ?? 0) ? 'union' : (data.poder ?? 0) > (data.union ?? 0) ? 'poder' : null)
    const winner: FactionId | null = isFactionId(rawWinner) ? rawWinner : null
    
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

  color: rgb(85 85 85 / 100%);
  font-size: 10px;
  text-align: center;
  margin-bottom: 16px;
}

/* REGION TABS */
.region-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 1px solid rgb(255 255 255 / 5%);
  padding-bottom: 8px;
}

.region-tab-btn {
  @include pixelated;

  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 6px;
  background: rgb(255 255 255 / 2%);
  color: var(--gray);
  font-size: 9px;
  cursor: pointer;
  

  &:hover:not(.disabled) {
    background: rgb(255 255 255 / 8%);
    color: var(--white);
  }

  &.active {
    background: rgb(255 255 255 / 10%);
    color: var(--yellow);
    border-color: var(--yellow);
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .coming-soon {
    color: var(--gray);
    font-size: 6px;
    opacity: 0.7;
    margin-top: 2px;
  }
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-row {
  padding: 10px;
  border: 1px solid rgb(255 255 255 / 5%);
  border-radius: 12px;
  background: rgb(255 255 255 / 3%);
  

  &:hover {
    background: rgb(255 255 255 / 6%);
  }

  &.union { border-left: 4px solid rgb(59 130 246 / 100%); }
  &.poder { border-left: 4px solid rgb(239 68 68 / 100%); }
}

.map-row-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-thumbnail {
  width: 88px;
  height: 88px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 6px rgb(0 0 0 / 60%);
  flex-shrink: 0;
  image-rendering: pixelated;
}

.map-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.map-info {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .map-name {
    color: rgb(204 204 204 / 100%);
    font-size: 11px;
    font-weight: 600;
  }

  .winner-badge {
    @include pixelated;

    padding: 2px 6px;
    border-radius: 4px;
    font-size: 8px;
    
    .union & { background: rgb(59 130 246 / 100%); color: var(--white); }
    .poder & { background: rgb(239 68 68 / 100%); color: var(--white); }
  }
}

.dominance-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  background: $black;
  overflow: hidden;
  
  .bar-fill {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: white;
    font-size: 7px;
    font-weight: bold;
    

    &.union { background: rgb(59 130 246 / 100%); box-shadow: inset 0 0 10px rgb(0 0 0 / 30%); }
    &.poder { background: rgb(239 68 68 / 100%); box-shadow: inset 0 0 10px rgb(0 0 0 / 30%); }
  }
}
</style>
