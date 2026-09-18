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
import { isWeatherTableRouteId, ROUTE_WEATHER_TABLES, WEATHER_SEASON_IDS, type WeatherSeasonId } from '@/data/world/weather-tables'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { getMechanicalWeather, requireWeatherId, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA, WEATHER_REGISTRY, type WeatherId } from '@/logic/weather/weatherRegistry'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { MapRouteId } from '@/data/world/map-assets'
import { DAY_PHASES, type DayPhase } from '@/types/system/time'
import DebugWeatherRouteSection from './DebugWeatherRouteSection.vue'
import type { PrecomputedRouteData, RegionId, Region } from './debugWeatherTypes.ts'

interface Props {
  id?: string
  show?: boolean
}

withDefaults(defineProps<Props>(), {
  id: 'debug-weather-tables-modal',
  show: true
})

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

const REGIONS: Region[] = [
  { id: 'kanto', name: 'Kanto', maps: (Object.keys(MAPS_BY_ROUTE_ID) as string[]).filter(isWeatherTableRouteId) }, // open-record: Generic key-value data dictionary container
  { id: 'johto', name: 'Johto', maps: [] },
  { id: 'hoenn', name: 'Hoenn', maps: [] },
  { id: 'sinnoh', name: 'Sinnoh', maps: [] }
]

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
        const map = (MAPS_BY_ROUTE_ID as Record<string, { name: string; weather?: Record<string, unknown>; isCave?: boolean }>)[routeId] // open-record: Generic key-value data dictionary container
        if (!map) throw new Error(`[DebugWeatherTablesModal] Missing map data for weather route: ${routeId}`)
        
        const seasons = WEATHER_SEASON_IDS.map(seasonId => {
          const cycles = DAY_PHASES.map(cycleId => {
            const rawProbs = rawRouteData[seasonId][cycleId]
            const probs = Object.entries(rawProbs)
              .filter((entry): entry is [string, number] => entry[1] !== undefined)
              .map(([rawWeather, chance]) => {
              const weather = requireWeatherId(rawWeather)
              const metadata = getWeatherMetadata(weather)
              
              let visitors: { name: string; sprite: string }[] = []
              let exclusive: { name: string; sprite: string }[] = []
              
              if (map && map.weather) {
                const weatherData = (map.weather as Record<string, unknown>)[weather] as { visitors?: Record<string, unknown>; exclusive?: Record<string, unknown> } | undefined // open-record: Generic key-value data dictionary container
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
    :id="id"
    :show="show"
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
          <div class="pixel-icon emoji">
            🚫
          </div>
          <p>No hay datos de clima para la región de {{ activeRegion.toUpperCase() }} aún.</p>
        </div>

        <DebugWeatherRouteSection
          v-for="route in regionTableData"
          :key="route.routeId"
          :route="route"
          :is-expanded="Boolean(expandedRoutes[route.routeId])"
          @toggle="toggleRoute"
        />
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
