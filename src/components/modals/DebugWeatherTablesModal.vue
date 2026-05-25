<script setup lang="ts">
/**
 * src/components/modals/DebugWeatherTablesModal.vue
 * 
 * Modal to display static weather probabilities and spawns for routes.
 * Performance optimized: pre-computes data once on load and uses collapsible route sections
 * to maintain 60 FPS rendering.
 */
import { ref, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables'
import { FIRE_RED_MAPS } from '@/data/maps'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY } from '@/logic/weather/weatherRegistry'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const cycleLabels: Record<string, string> = {
  morning: '🌅 Amanecer',
  day: '☀️ Día',
  dusk: '🌇 Ocaso',
  night: '🌙 Noche'
}

const seasonLabels: Record<string, string> = {
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno'
}

const getWeatherMetadata = (weather: string) => {
  const visual = WEATHER_VISUAL_METADATA[weather]
  if (visual) return visual
  const mech = getMechanicalWeather(weather)
  return WEATHER_UI_METADATA[mech] || { icon: '❓', label: weather.toUpperCase() }
}

interface Region {
  id: string
  name: string
  maps: string[]
}

const REGIONS: Region[] = [
  { id: 'kanto', name: 'Kanto', maps: FIRE_RED_MAPS.map(m => m.id) },
  { id: 'johto', name: 'Johto', maps: [] },
  { id: 'hoenn', name: 'Hoenn', maps: [] },
  { id: 'sinnoh', name: 'Sinnoh', maps: [] }
]

interface MapWeatherConfig {
  visitors?: Record<string, number> | string[]
  exclusive?: Record<string, number> | string[]
}

interface PrecomputedRouteData {
  routeId: string
  name: string
  seasons: {
    seasonId: string
    label: string
    cycles: {
      cycleId: string
      label: string
      probs: {
        weather: string
        chance: number
        icon: string
        label: string
        visitors: { name: string; sprite: string }[]
        exclusive: { name: string; sprite: string }[]
        modifiers: { boost: string[]; debuff: string[]; block: string[] } | null
        hasSpawns: boolean
      }[]
    }[]
  }[]
}

// Pre-calculate the entire structure statically once at import time
const PRECOMPUTED_WEATHER_DATA = (() => {
  const result: Record<string, PrecomputedRouteData[]> = {}
  
  for (const region of REGIONS) {
    const mapsData = region.maps
      .map(routeId => {
        const rawRouteData = ROUTE_WEATHER_TABLES[routeId]
        if (!rawRouteData) return null
        
        const seasons = Object.entries(rawRouteData).map(([seasonId, rawCycles]) => {
          const cycles = Object.entries(rawCycles).map(([cycleId, rawProbs]) => {
            const probs = Object.entries(rawProbs).map(([weather, chance]) => {
              const metadata = getWeatherMetadata(weather)
              
              let visitors: { name: string; sprite: string }[] = []
              let exclusive: { name: string; sprite: string }[] = []
              
              const map = FIRE_RED_MAPS.find(m => m.id === routeId)
              if (map && map.weather) {
                let weatherData = (map.weather as unknown as Record<string, MapWeatherConfig>)[weather]
                if (!weatherData) {
                  const mech = getMechanicalWeather(weather)
                  weatherData = (map.weather as unknown as Record<string, MapWeatherConfig>)[mech]
                }
                if (weatherData) {
                  const rawVis = weatherData.visitors || {}
                  const rawExc = weatherData.exclusive || {}
                  const visList = Array.isArray(rawVis) ? rawVis : Object.keys(rawVis)
                  const excList = Array.isArray(rawExc) ? rawExc : Object.keys(rawExc)
                  
                  visitors = visList.map(p => ({
                    name: p.toUpperCase(),
                    sprite: getAssetUrl(ASSET_TYPES.POKEMON, p)
                  }))
                  exclusive = excList.map(p => ({
                    name: p.toUpperCase(),
                    sprite: getAssetUrl(ASSET_TYPES.POKEMON, p)
                  }))
                }
              }
              
              const registryEntry = WEATHER_REGISTRY[weather]
              const modifiers = registryEntry?.modifiers ? {
                boost: registryEntry.modifiers.boost || [],
                debuff: registryEntry.modifiers.debuff || [],
                block: registryEntry.modifiers.block || []
              } : null
              
              return {
                weather,
                chance,
                icon: metadata.icon,
                label: metadata.label,
                visitors,
                exclusive,
                modifiers,
                hasSpawns: visitors.length > 0 || exclusive.length > 0
              }
            })
            
            return {
              cycleId,
              label: cycleLabels[cycleId] || cycleId,
              probs
            }
          })
          
          return {
            seasonId,
            label: seasonLabels[seasonId] || seasonId,
            cycles
          }
        })
        
        const mapObj = FIRE_RED_MAPS.find(m => m.id === routeId)
        const name = mapObj ? mapObj.name : routeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        
        return {
          routeId,
          name,
          seasons
        }
      })
      .filter((r): r is PrecomputedRouteData => r !== null)
    
    result[region.id] = mapsData
  }
  
  return result
})()

const activeRegion = ref('kanto')

const regionTableData = computed(() => {
  return PRECOMPUTED_WEATHER_DATA[activeRegion.value] || []
})

const hasWeatherTables = (regionId: string) => {
  const data = PRECOMPUTED_WEATHER_DATA[regionId]
  return data && data.length > 0
}

// Collapsible Route State to avoid rendering 5000+ DOM nodes at the same time
const expandedRoutes = ref<Record<string, boolean>>({})

function toggleRoute(routeId: string) {
  expandedRoutes.value[routeId] = !expandedRoutes.value[routeId]
}
</script>

<template>
  <BaseModal
    :show="true"
    title="TABLAS DE PROBABILIDAD DE CLIMA"
    max-width="900px"
    type="center"
    @close="emit('close')"
  >
    <div class="debug-weather-container">
      <!-- Region Tabs -->
      <div class="region-tabs">
        <button 
          v-for="region in REGIONS" 
          :key="region.id"
          class="tab-btn"
          :class="{ active: activeRegion === region.id, empty: !hasWeatherTables(region.id) }"
          @click.stop="activeRegion = region.id"
        >
          <span class="region-dot" />
          {{ region.name.toUpperCase() }}
        </button>
      </div>

      <!-- Content -->
      <div class="weather-tables-scroll">
        <div
          v-if="regionTableData.length === 0"
          class="empty-state"
        >
          <div class="pixel-icon">
            🚫
          </div>
          <p>No hay datos de clima para la región de {{ activeRegion.toUpperCase() }} aún.</p>
        </div>

        <div
          v-for="route in regionTableData"
          :key="route.routeId"
          class="route-section"
        >
          <h2
            class="route-title"
            @click.stop="toggleRoute(route.routeId)"
          >
            <span class="arrow">{{ expandedRoutes[route.routeId] ? '▼' : '▶' }}</span>
            {{ route.name }} 
            <span class="id-tag">#{{ route.routeId }}</span>
          </h2>
          
          <div
            v-if="expandedRoutes[route.routeId]"
            class="seasons-grid"
          >
            <div
              v-for="season in route.seasons"
              :key="season.seasonId"
              class="season-card"
            >
              <h3 class="season-title">
                {{ season.label }}
              </h3>
              
              <div class="cycles-list">
                <div
                  v-for="cycle in season.cycles"
                  :key="cycle.cycleId"
                  class="cycle-row"
                >
                  <div class="cycle-name">
                    {{ cycle.label }}
                  </div>
                  <div class="probs-tags">
                    <div 
                      v-for="prob in cycle.probs" 
                      :key="prob.weather" 
                      class="prob-tag"
                      :class="prob.weather"
                    >
                      <div class="prob-header">
                        <span class="icon">{{ prob.icon }}</span>
                        <span class="label">{{ prob.label }}</span>
                        <span class="chance">{{ prob.chance }}%</span>
                      </div>

                      <div
                        v-if="prob.modifiers"
                        class="type-modifiers"
                      >
                        <div
                          v-if="prob.modifiers.boost.length"
                          class="mod-group boost"
                        >
                          <span class="mod-icon">▲</span>
                          <PokemonTypeTag
                            v-for="t in prob.modifiers.boost"
                            :key="t"
                            :type="t"
                            size="ssm"
                          />
                        </div>
                        <div
                          v-if="prob.modifiers.debuff.length"
                          class="mod-group debuff"
                        >
                          <span class="mod-icon">▼</span>
                          <PokemonTypeTag
                            v-for="t in prob.modifiers.debuff"
                            :key="t"
                            :type="t"
                            size="ssm"
                          />
                        </div>
                        <div
                          v-if="prob.modifiers.block.length"
                          class="mod-group block"
                        >
                          <span class="mod-icon">🚫</span>
                          <PokemonTypeTag
                            v-for="t in prob.modifiers.block"
                            :key="t"
                            :type="t"
                            size="ssm"
                          />
                        </div>
                      </div>
                      
                      <!-- Pokémon afectados por este clima -->
                      <div 
                        v-if="prob.hasSpawns"
                        class="weather-spawns"
                      >
                        <div 
                          v-if="prob.visitors.length" 
                          class="spawn-group visitors"
                        >
                          <span class="group-label">Visitantes:</span>
                          <div class="spawn-icons">
                            <img 
                              v-for="p in prob.visitors" 
                              :key="p.name"
                              :src="p.sprite"
                              class="mini-sprite"
                              :title="p.name"
                            >
                          </div>
                        </div>
                        <div 
                          v-if="prob.exclusive.length" 
                          class="spawn-group exclusive"
                        >
                          <span class="group-label">Exclusivos:</span>
                          <div class="spawn-icons">
                            <img 
                              v-for="p in prob.exclusive" 
                              :key="p.name"
                              :src="p.sprite"
                              class="mini-sprite"
                              :title="p.name"
                            >
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.debug-weather-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 75dvh;
  min-height: 0;
}

.region-tabs {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
}

.tab-btn {
  @include pixelated;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: var(--muted);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;

  .region-dot {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
    opacity: 0.3;
  }

  &:hover:not(.empty) {
    background: Rgba(255, 255, 255, 0.1);
    color: var(--white);
  }

  &.active {
    background: var(--purple-gradient);
    border-color: var(--purple-light);
    color: var(--white);
    box-shadow: 0 4px 12px Rgba(123, 63, 228, 0.3);

    .region-dot {
      opacity: 1;
      background: $white;
      box-shadow: 0 0 5px $white;
    }
  }

  &.empty {
    opacity: 0.4;
    cursor: not-allowed;
    filter: Grayscale(1);
  }
}

.weather-tables-scroll {
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 15px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  opacity: 0.5;

  .pixel-icon {
    font-size: 40px;
    margin-bottom: 15px;
  }
  p {
    @include pixelated;
    font-size: 10px;
  }
}

.route-section {
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 15px;
  
  &:last-child {
    border-bottom: none;
  }
}

.route-title {
  @include pixelated;
  font-size: 12px;
  color: var(--yellow);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  padding: 6px 8px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 6px;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
  }

  .arrow {
    font-size: 8px;
    color: var(--muted);
    width: 10px;
  }

  .id-tag {
    font-size: 8px;
    color: var(--muted);
    background: Rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
  }
}

.seasons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 10px;
  padding: 10px;
  background: Rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.season-card {
  background: Rgba(0, 0, 0, 0.25);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 15px;
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, Rgba(255, 255, 255, 0.1), transparent);
  }
}

.season-title {
  @include pixelated;
  font-size: 10px;
  color: var(--white);
  margin-bottom: 15px;
  letter-spacing: 1px;
}

.cycles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cycle-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: Rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px solid Rgba(255, 255, 255, 0.04);

  &:hover {
    background: Rgba(255, 255, 255, 0.05);
    border-color: Rgba(255, 255, 255, 0.08);
  }
}

.cycle-name {
  @include pixelated;
  font-size: 8px;
  color: var(--white);
  opacity: 0.8;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, Rgba(255, 255, 255, 0.1), transparent);
  }
}

.probs-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prob-tag {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: Rgba(0, 0, 0, 0.4);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 9px;
  border: 1px solid Rgba(255, 255, 255, 0.05);
  @include pixelated;
  min-width: 140px;

  .prob-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon {
    font-size: 14px;
  }
  .label {
    opacity: 0.6;
    font-size: 7px;
    flex: 1;
    letter-spacing: 0.5px;
  }
  .chance {
    color: var(--yellow);
    font-weight: bold;
    font-size: 10px;
  }

  .weather-spawns {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 6px;
    border-top: 1px dashed Rgba(255, 255, 255, 0.1);
  }

  .spawn-group {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .group-label {
      font-size: 6px;
      color: var(--muted);
      text-transform: uppercase;
    }

    .spawn-icons {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .mini-sprite {
      width: 20px;
      height: 20px;
      object-fit: contain;
      @include sprite-render;
      filter: Drop-Shadow(0 2px 4px Rgba(0,0,0,0.5));
    }

    &.exclusive .group-label {
      color: var(--purple-light);
    }
  }

  &.clear { border-left: 3px solid $yellow; }
  &.sun { border-left: 3px solid #ffcc00; }
  &.intense_sun { border-left: 3px solid #ffaa00; }
  &.heatwave { border-left: 3px solid $red; }
  
  &.rain { border-left: 3px solid $blue; }
  &.heavy_rain { border-left: 3px solid #0055ff; }
  &.storm { border-left: 3px solid $purple; }
  &.thunderstorm { border-left: 3px solid #cc33ff; }
  
  &.sandstorm { border-left: 3px solid #ff9933; }
  &.dust_storm { border-left: 3px solid #cc7722; }
  
  &.snow { border-left: 3px solid $white; }
  &.cold { border-left: 3px solid #00ffff; }
  &.hail { border-left: 3px solid #99ffff; }
  &.blizzard { border-left: 3px solid #55ffff; }
  &.coldwave { border-left: 3px solid #0088ff; }
  
  &.fog { border-left: 3px solid $gray; }
  &.mist { border-left: 3px solid #b0c4de; }
  
  &.wind { border-left: 3px solid #99ff99; }
  &.strong_winds { border-left: 3px solid #33cc33; }

  .type-modifiers {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 0;
    border-top: 1px solid Rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

    .mod-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      font-size: 6px;

      .mod-icon {
        width: 10px;
        font-size: 8px;
        line-height: 1;
      }
      
      &.boost .mod-icon { color: #4ade80; }
      &.debuff .mod-icon { color: #f87171; }
      &.block .mod-icon { color: var(--red); }
    }
  }
}
</style>

<style lang="scss">
/* Global Scrollbar overrides for this modal (Must not be scoped) */
.region-tabs {
  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.1);
    border-radius: 10px;
  }
}

.weather-tables-scroll {
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: Rgba(0, 0, 0, 0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: var(--purple);
    border-radius: 10px;
  }
}
</style>
