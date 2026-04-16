<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import MapEventCarousel from '@/components/map/MapEventCarousel.vue'
import MapStatusSummary from '@/components/map/MapStatusSummary.vue'
import MapGrid from '@/components/map/MapGrid.vue'

const gameStore = useGameStore()
const mapStore = useMapStore()

const gs = computed(() => gameStore.state)
const ms = computed(() => mapStore)

const navigateToMap = (mapId) => mapStore.navigate(mapId)

const openTab = (tab) => {
  if (typeof window.showTab === 'function') window.showTab(tab)
}

const openCenter = () => {
  if (typeof window.openPokemonCenter === 'function') window.openPokemonCenter()
}

// Mapeo de misiones para los sprites
const missionSprites = computed(() => {
  const missions = gs.value.daycare_missions || []
  return Array.from(new Set(missions.map(m => m?.trainerSprite).filter(Boolean))).slice(0, 2)
})

const gymSprites = computed(() => {
  // En el futuro esto vendrá de un store de gimnasios
  return []
})
</script>

<template>
  <div class="map-view-container">
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
    <div class="section-divider">
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
  padding: 20px 0;
  width: 100%;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 24px;
  margin: 48px 0 32px;
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent);
}

.divider-text {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #555;
  letter-spacing: 3px;
  text-shadow: 0 0 10px rgba(0,0,0,0.5);
}

@media (max-width: 768px) {
  .map-view-container {
    padding: 16px;
  }
}
</style>
