<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import MapEventCarousel from '@/components/map/MapEventCarousel.vue'
import MapStatusSummary from '@/components/map/MapStatusSummary.vue'
import MapGrid from '@/components/map/MapGrid.vue'
import { useUIStore } from '@/stores/ui'

const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()

const gs = computed(() => gameStore.state)
const ms = computed(() => mapStore)

const navigateToMap = (mapId) => mapStore.navigate(mapId)

const openTab = (tab) => {
  uiStore.activeTab = tab
}

const openCenter = () => {
  uiStore.isPokemonCenterOpen = true
}

// Mapeo de misiones para los sprites
const missionSprites = computed(() => {
  const missions = gs.value.daycare_missions || []
  return Array.from(new Set(missions.map(m => m?.trainerSprite).filter(Boolean))).slice(0, 2)
})

const gymSprites = computed(() => {
  return []
})
</script>

<template>
  <div class="map-view-container legacy-ui">
    <!-- Header de Eventos -->
    <MapEventCarousel
      v-if="ms.activeEvents.length > 0 || ms.pendingAwards.length > 0"
      :events="ms.activeEvents"
      :awards="ms.pendingAwards"
      @open-event="navigateToMap"
      @open-award="navigateToMap"
    />

    <!-- Estatus Superior (PC, Guardería, etc) -->
    <MapStatusSummary
      :missions-remaining="gs.daycare_missions?.length || 0"
      :mission-sprites="missionSprites"
      :gym-rematches="gs.gym_rematches_count || 0" 
      :egg-count="gs.eggs_count || 0"
      @open-tab="openTab"
      @open-center="openCenter"
    />

    <!-- Localizaciones (Grilla de Mapas) -->
    <div class="legacy-divider">
      <span class="divider-text">REGIÓN DE KANTO</span>
    </div>

    <MapGrid
      :maps="ms.maps"
      :badge-count="gs.badges || 0"
      :cycle="ms.currentCycle"
      :player-class="gs.playerClass"
      :class-data="gs.classData"
      :safari-ticket-secs="gs.safariTicketSecs || 0"
      :cerulean-ticket-secs="gs.ceruleanTicketSecs || 0"
      :dominance-data="ms.mapWinners"
      :daily-guardian-captures="ms.dailyGuardianCaptures"
      @navigate="navigateToMap"
    />
  </div>
</template>

<style scoped>
.map-view-container {
  padding: 10px 0;
  width: 100%;
}

.legacy-divider {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 40px 0 20px;
}

.legacy-divider::before,
.legacy-divider::after {
  content: '';
  flex: 1;
  height: 4px;
  background: #333;
}

.divider-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #666;
  letter-spacing: 2px;
}

@media (max-width: 768px) {
  .map-view-container {
    padding: 10px;
  }
}
</style>
