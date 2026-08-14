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
import { isWeatherTableRouteId, ROUTE_WEATHER_TABLES, WEATHER_CYCLE_IDS, WEATHER_SEASON_IDS, type WeatherSeasonId, type WeatherTableRouteId } from '@/data/world/weather-tables'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { getMechanicalWeather, requireWeatherId, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY, type WeatherId } from '@/logic/weather/weatherRegistry'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { MapRouteId } from '@/data/world/map-assets'
import type { PokemonType } from '@/data/battle/types'
import type { DayPhase } from '@/logic/utils/timeUtils'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const cycleLabels: Record<DayPhase, string> = {
  morning: '🌅 Amanecer',
  day: '☀️ Día',
  dusk: '🌇 Ocaso',
  night: '🌙 Noche'
}

const seasonLabels: Record<WeatherSeasonId, string> = {
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno'
}

const getWeatherMetadata = (weather: WeatherId) => {
  const visual = WEATHER_VISUAL_METADATA[weather]
  if (visual) return visual
  const mech = getMechanicalWeather(weather)
  return WEATHER_UI_METADATA[mech] || { icon: '❓', label: weather.toUpperCase() }
}

type RegionId = 'kanto' | 'johto' | 'hoenn' | 'sinnoh'

interface Region {
  id: RegionId
  name: string
  maps: readonly WeatherTableRouteId[]
}

const REGIONS: Region[] = [
  { id: 'kanto', name: 'Kanto', maps: FIRE_RED_MAPS.map(m => m.id).filter(isWeatherTableRouteId) },
  { id: 'johto', name: 'Johto', maps: [] },
  { id: 'hoenn', name: 'Hoenn', maps: [] },
  { id: 'sinnoh', name: 'Sinnoh', maps: [] }
]

interface PrecomputedRouteData {
  routeId: WeatherTableRouteId
  name: string
  seasons: {
    seasonId: WeatherSeasonId
    label: string
    cycles: {
      cycleId: DayPhase
      label: string
      probs: {
        weather: WeatherId
        chance: number
        icon: string
        label: string
        visitors: { name: string; sprite: string }[]
        exclusive: { name: string; sprite: string }[]
        modifiers: { boost: readonly PokemonType[]; debuff: readonly PokemonType[]; block: readonly PokemonType[] } | null
        hasSpawns: boolean
      }[]
    }[]
  }[]
}

// Pre-calculate the entire structure statically once at import time
const PRECOMPUTED_WEATHER_DATA = (() => {
  const result: Record<RegionId, PrecomputedRouteData[]> = {
    kanto: [],
    johto: [],
    hoenn: [],
    sinnoh: [],
  }
  
  for (const region of REGIONS) {
    const mapsData = region.maps
      .map(routeId => {
        const rawRouteData = ROUTE_WEATHER_TABLES[routeId]
        const map = FIRE_RED_MAPS.find(m => m.id === routeId)
        if (!map) throw new Error(`[DebugWeatherTablesModal] Missing map data for weather route: ${routeId}`)
        
        const seasons = WEATHER_SEASON_IDS.map(seasonId => {
          const cycles = WEATHER_CYCLE_IDS.map(cycleId => {
            const rawProbs = rawRouteData[seasonId][cycleId]
            const probs = Object.entries(rawProbs)
              .filter((entry): entry is [string, number] => entry[1] !== undefined)
              .map(([rawWeather, chance]) => {
              const weather = requireWeatherId(rawWeather)
              const metadata = getWeatherMetadata(weather)
              
              let visitors: { name: string; sprite: string }[] = []
              let exclusive: { name: string; sprite: string }[] = []
              
              if (map && map.weather) {
                const weatherData = Object.entries(map.weather).find(([id]) => id === weather)?.[1]
                if (weatherData) {
                  const rawVis = weatherData.visitors || {}
                  const rawExc = weatherData.exclusive || {}
                  const visList = Object.keys(rawVis)
                  const excList = Object.keys(rawExc)
                  
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
              label: cycleLabels[cycleId],
              probs
            }
          })
          
          return {
            seasonId,
            label: seasonLabels[seasonId],
            cycles
          }
        })
        
        return {
          routeId,
          name: map.name,
          seasons
        }
      })
    
    result[region.id] = mapsData
  }
  
  return result
})()

const activeRegion = ref<RegionId>('kanto')

const regionTableData = computed(() => {
  return PRECOMPUTED_WEATHER_DATA[activeRegion.value] || []
})

const hasWeatherTables = (regionId: RegionId) => {
  const data = PRECOMPUTED_WEATHER_DATA[regionId]
  return data && data.length > 0
}

// Collapsible Route State to avoid rendering 5000+ DOM nodes at the same time
const expandedRoutes = ref<Partial<Record<MapRouteId, boolean>>>({})

function toggleRoute(routeId: MapRouteId) {
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

<style scoped lang="scss" src="@/styles/components/_debug-weather-tables.scss"></style>

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
