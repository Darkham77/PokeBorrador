<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables'
import { FIRE_RED_MAPS } from '@/data/maps'
import { getMechanicalWeather, WEATHER_UI_METADATA, WEATHER_VISUAL_METADATA } from '@/logic/battle/weatherMapper'
import { WEATHER_TYPE_MODIFIERS } from '@/logic/weatherUtils'
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

interface MapWeatherConfig {
  visitors?: Record<string, number> | string[]
  exclusive?: Record<string, number> | string[]
}

const getAffectedPokemon = (routeId: string, weather: string) => {
  const map = FIRE_RED_MAPS.find(m => m.id === routeId)
  if (!map || !map.weather) return null
  
  // Try direct match first (e.g. 'heatwave')
  let weatherData = (map.weather as Record<string, unknown>)[weather] as MapWeatherConfig | undefined
  
  // Fallback to mechanical match (e.g. 'heatwave' -> 'sun')
  if (!weatherData) {
    const mech = getMechanicalWeather(weather)
    weatherData = (map.weather as Record<string, unknown>)[mech] as MapWeatherConfig | undefined
  }
  
  if (!weatherData) return null
  
  const visitors = weatherData.visitors || {}
  const exclusive = weatherData.exclusive || {}
  
  return {
    visitors: Array.isArray(visitors) ? visitors : Object.keys(visitors),
    exclusive: Array.isArray(exclusive) ? exclusive : Object.keys(exclusive)
  }
}

// Region definitions
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

const activeRegion = ref('kanto')

const filteredRoutes = computed(() => {
  const region = REGIONS.find(r => r.id === activeRegion.value)
  if (!region) return []
  
  // Only return routes that are in the region AND have weather tables
  return region.maps.filter(id => ROUTE_WEATHER_TABLES[id])
})

const hasWeatherTables = (regionId: string) => {
  const region = REGIONS.find(r => r.id === regionId)
  if (!region) return false
  return region.maps.some(id => ROUTE_WEATHER_TABLES[id])
}

function formatRouteName(id: string) {
  const map = FIRE_RED_MAPS.find(m => m.id === id)
  if (map) return map.name
  return id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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
          v-if="filteredRoutes.length === 0"
          class="empty-state"
        >
          <div class="pixel-icon">
            🚫
          </div>
          <p>No hay datos de clima para la región de {{ activeRegion.toUpperCase() }} aún.</p>
        </div>

        <div
          v-for="routeId in filteredRoutes"
          :key="routeId"
          class="route-section"
        >
          <h2 class="route-title">
            {{ formatRouteName(routeId) }} <span class="id-tag">#{{ routeId }}</span>
          </h2>
          
          <div class="seasons-grid">
            <div
              v-for="(cycles, seasonId) in ROUTE_WEATHER_TABLES[routeId]"
              :key="seasonId"
              class="season-card"
            >
              <h3 class="season-title">
                {{ seasonLabels[seasonId as string] || seasonId }}
              </h3>
              
              <div class="cycles-list">
                <div
                  v-for="(probs, cycleId) in cycles"
                  :key="cycleId"
                  class="cycle-row"
                >
                  <div class="cycle-name">
                    {{ cycleLabels[cycleId as string] || cycleId }}
                  </div>
                  <div class="probs-tags">
                    <div 
                      v-for="(chance, weather) in (probs as Record<string, number>)" 
                      :key="String(weather)" 
                      class="prob-tag"
                      :class="String(weather)"
                    >
                      <div class="prob-header">
                        <span class="icon">{{ getWeatherMetadata(weather as string).icon }}</span>
                        <span class="label">{{ getWeatherMetadata(weather as string).label }}</span>
                        <span class="chance">{{ chance }}%</span>
                      </div>

                      <div
                        v-if="WEATHER_TYPE_MODIFIERS[weather as string]"
                        class="type-modifiers"
                      >
                        <div
                          v-if="WEATHER_TYPE_MODIFIERS[weather as string]?.boost"
                          class="mod-group boost"
                        >
                          <span class="mod-icon">▲</span>
                          <PokemonTypeTag
                            v-for="t in WEATHER_TYPE_MODIFIERS[weather as string]?.boost"
                            :key="t"
                            :type="t"
                            size="ssm"
                          />
                        </div>
                        <div
                          v-if="WEATHER_TYPE_MODIFIERS[weather as string]?.debuff"
                          class="mod-group debuff"
                        >
                          <span class="mod-icon">▼</span>
                          <PokemonTypeTag
                            v-for="t in WEATHER_TYPE_MODIFIERS[weather as string]?.debuff"
                            :key="t"
                            :type="t"
                            size="ssm"
                          />
                        </div>
                        <div
                          v-if="WEATHER_TYPE_MODIFIERS[weather as string]?.block"
                          class="mod-group block"
                        >
                          <span class="mod-icon">🚫</span>
                          <PokemonTypeTag
                            v-for="t in WEATHER_TYPE_MODIFIERS[weather as string]?.block"
                            :key="t"
                            :type="t"
                            size="ssm"
                          />
                        </div>
                      </div>
                      
                      <!-- Pokémon afectados por este clima -->
                      <div 
                        v-if="getAffectedPokemon(routeId, weather as string)"
                        class="weather-spawns"
                      >
                        <div 
                          v-if="getAffectedPokemon(routeId, weather as string)?.visitors.length" 
                          class="spawn-group visitors"
                        >
                          <span class="group-label">Visitantes:</span>
                          <div class="spawn-icons">
                            <img 
                              v-for="p in getAffectedPokemon(routeId, weather as string)?.visitors" 
                              :key="p"
                              :src="getAssetUrl(ASSET_TYPES.POKEMON, p)"
                              class="mini-sprite"
                              :title="p.toUpperCase()"
                            >
                          </div>
                        </div>
                        <div 
                          v-if="getAffectedPokemon(routeId, weather as string)?.exclusive.length" 
                          class="spawn-group exclusive"
                        >
                          <span class="group-label">Exclusivos:</span>
                          <div class="spawn-icons">
                            <img 
                              v-for="p in getAffectedPokemon(routeId, weather as string)?.exclusive" 
                              :key="p"
                              :src="getAssetUrl(ASSET_TYPES.POKEMON, p)"
                              class="mini-sprite"
                              :title="p.toUpperCase()"
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
  padding-bottom: 15px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  overflow-x: auto;
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
  transition: all 0.2s ease;
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

    .region-dot { opacity: 1; background: $white; box-shadow: 0 0 5px $white; }
  }

  &.empty {
    opacity: 0.4;
    cursor: not-allowed;
    will-change: transform, filter, opacity;
  filter: Grayscale(1);
  }
}

.weather-tables-scroll {
  display: flex;
  flex-direction: column;
  gap: 30px;
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

  .pixel-icon { font-size: 40px; margin-bottom: 15px; }
  p { @include pixelated; font-size: 10px; }
}

.route-section {
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 25px;
  
  &:last-child { border-bottom: none; }
}

.route-title {
  @include pixelated;
  font-size: 14px;
  color: var(--yellow);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;

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
    top: 0; left: 0; right: 0; height: 2px;
    background: Linear-Gradient(90deg, transparent, Rgba(255, 255, 255, 0.1), transparent);
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
  transition: all 0.3s ease;

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
    background: Linear-Gradient(90deg, Rgba(255, 255, 255, 0.1), transparent);
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

  .icon { font-size: 14px; }
  .label { opacity: 0.6; font-size: 7px; flex: 1; letter-spacing: 0.5px; }
  .chance { color: var(--yellow); font-weight: bold; font-size: 10px; }

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

    &.exclusive .group-label { color: var(--purple-light); }
  }

  &.clear { border-left: 3px solid $yellow; }
  &.rain { border-left: 3px solid $blue; }
  &.storm { border-left: 3px solid $purple; }
  &.fog { border-left: 3px solid $gray; }
  &.snow { border-left: 3px solid $white; }
  &.blizzard { border-left: 3px solid #99ffff; }
  &.sandstorm { border-left: 3px solid #ff9933; }
  &.heatwave { border-left: 3px solid $red; }
  &.sun { border-left: 3px solid #ffcc00; }
  &.cold { border-left: 3px solid #00ffff; }
  &.wind { border-left: 3px solid #99ff99; }

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
      
      &.boost .mod-icon { color: var(--green); }
      &.debuff .mod-icon { color: var(--orange); }
      &.block .mod-icon { color: var(--red); }
    }
  }
}
</style>

<style lang="scss">
/* Global Scrollbar overrides for this modal (Must not be scoped) */
.region-tabs {
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: Rgba(255, 255, 255, 0.1); border-radius: 10px; }
}

.weather-tables-scroll {
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: Rgba(0,0,0,0.1); }
  &::-webkit-scrollbar-thumb { background: var(--purple); border-radius: 10px; }
}
</style>
