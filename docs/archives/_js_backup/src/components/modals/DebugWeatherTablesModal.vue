<script setup>
import { ref, computed } from 'vue'
import BaseModal from '@/components/common/BaseModal.vue'
import { ROUTE_WEATHER_TABLES } from '@/data/weather-tables'
import { FIRE_RED_MAPS } from '@/data/maps'

const emit = defineEmits(['close'])

const weatherIcons = {
  clear: '☀️',
  rain: '🌧️',
  storm: '⚡',
  fog: '🌫️',
  snow: '🌨️',
  blizzard: '❄️',
  sandstorm: '🏜️',
  heatwave: '🔥'
}

const cycleLabels = {
  morning: '🌅 Amanecer',
  day: '☀️ Día',
  dusk: '🌇 Ocaso',
  night: '🌙 Noche'
}

const seasonLabels = {
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno'
}

// Region definitions
const REGIONS = [
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

const hasWeatherTables = (regionId) => {
  const region = REGIONS.find(r => r.id === regionId)
  if (!region) return false
  return region.maps.some(id => ROUTE_WEATHER_TABLES[id])
}

function formatRouteName(id) {
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
                {{ seasonLabels[seasonId] || seasonId }}
              </h3>
              
              <div class="cycles-list">
                <div
                  v-for="(probs, cycleId) in cycles"
                  :key="cycleId"
                  class="cycle-row"
                >
                  <div class="cycle-name">
                    {{ cycleLabels[cycleId] || cycleId }}
                  </div>
                  <div class="probs-tags">
                    <div 
                      v-for="(chance, weather) in probs" 
                      :key="weather" 
                      class="prob-tag"
                      :class="weather"
                    >
                      <span class="icon">{{ weatherIcons[weather] || '❓' }}</span>
                      <span class="label">{{ weather.toUpperCase() }}</span>
                      <span class="chance">{{ chance }}%</span>
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
  color: Var(--muted);
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

  &:hover:Not(.empty) {
    background: Rgba(255, 255, 255, 0.1);
    color: Var(--white);
  }

  &.active {
    background: Var(--purple-gradient);
    border-color: Var(--purple-light);
    color: Var(--white);
    box-shadow: 0 4px 12px Rgba(123, 63, 228, 0.3);

    .region-dot { opacity: 1; background: $white; box-shadow: 0 0 5px $white; }
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
  color: Var(--yellow);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;

  .id-tag {
    font-size: 8px;
    color: Var(--muted);
    background: Rgba(0, 0, 0, 0.3);
    padding: 2px 6px;
    border-radius: 4px;
  }
}

.seasons-grid {
  display: grid;
  grid-template-columns: Repeat(auto-fit, Minmax(280px, 1fr));
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
  color: Var(--white);
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
  gap: 6px;
}

.cycle-name {
  @include pixelated;
  font-size: 7px;
  color: Var(--muted);
  text-transform: uppercase;
}

.probs-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.prob-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: Rgba(0, 0, 0, 0.2);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 9px;
  border: 1px solid Rgba(255, 255, 255, 0.03);
  @include pixelated;

  .icon { font-size: 14px; }
  .label { opacity: 0.5; font-size: 7px; margin-right: 4px; }
  .chance { color: Var(--white); font-weight: bold; }

  &.clear { border-left: 3px solid $yellow; }
  &.rain { border-left: 3px solid $blue; }
  &.storm { border-left: 3px solid $purple; }
  &.fog { border-left: 3px solid $gray; }
  &.snow { border-left: 3px solid $white; }
  &.blizzard { border-left: 3px solid #99ffff; }
  &.sandstorm { border-left: 3px solid #ff9933; }
  &.heatwave { border-left: 3px solid $red; }
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
