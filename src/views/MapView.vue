<script setup lang="ts">
import { computed } from 'vue' // HMR Trigger
import { useGameStore } from '@/stores/game'
import { useMapStore } from '@/stores/map'
import MapEventCarousel from '@/components/map/MapEventCarousel.vue'
import MapStatusSummary from '@/components/map/MapStatusSummary.vue'
import MapGrid from '@/components/map/MapGrid.vue'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import { GYMS } from '@/data/gyms'
import { useModalStore } from '@/stores/modals'
import type { DaycareMission } from '@/types/breeding'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { MapLocation } from '@/types/encounters'

const gameStore = useGameStore()
const mapStore = useMapStore()
const uiStore = useUIStore()
const eventStore = useEventStore()
const modalStore = useModalStore()

const navigateToMap = (loc: MapLocation | string | number) => {
  const id = typeof loc === 'object' ? loc.id : String(loc)
  mapStore.navigate(id)
}

const openTab = (tab: string) => {
  uiStore.activeTab = tab
}

const openCenter = () => {
  modalStore.open('PokemonCenter')
}

// Mapeo de misiones para los sprites
const missionSprites = computed(() => {
  const missions = gameStore.state.daycare_missions || []
  return Array.from(new Set(missions.map((m: DaycareMission) => m?.trainerSprite).filter(Boolean))).slice(0, 4) as string[]
})

const gymSprites = computed(() => {
  const defeatedIds = gameStore.state.defeatedGyms || []
  return GYMS.filter(g => !defeatedIds.includes(g.id))
    .slice(0, 8)
    .map(g => g.sprite)
})

const activeEventData = computed(() => {
  const active = (eventStore.activeEvents as GameEvent[])?.[0]
  if (!active) return { active: false, text: 'No hay eventos activos en este momento', icon: '⚡' }
  return {
    active: true,
    text: `${active.name}: ${active.description}`,
    icon: active.icon || '⚡'
  }
})
</script>

<template>
  <div class="map-view-container legacy-ui">
    <!-- Header de Eventos -->
    <MapEventCarousel
      v-if="mapStore.activeEvents.length > 0 || mapStore.pendingAwards.length > 0"
      :events="mapStore.activeEvents"
      :awards="mapStore.pendingAwards"
      @open-event="navigateToMap"
      @open-award="navigateToMap"
    />

    <!-- Estatus Superior (PC, Guardería, etc) -->
    <MapStatusSummary
      :missions-remaining="gameStore.state.daycare_missions?.length || 0"
      :mission-sprites="missionSprites"
      :gym-rematches="8 - (gameStore.state.defeatedGyms?.length || 0)" 
      :gym-sprites="gymSprites"
      :egg-count="gameStore.state.eggs?.length || 0"
      :rival-event-active="activeEventData.active"
      :rival-event-text="activeEventData.text"
      :rival-event-icon="activeEventData.icon"
      @open-tab="openTab"
      @open-center="openCenter"
      @open-event="modalStore.open('EventDetail', { event: eventStore.activeEvents[0] })"
    />

    <!-- Localizaciones (Grilla de Mapas) -->
    <div class="legacy-divider">
      <span class="divider-text">REGIÓN DE KANTO</span>
    </div>

    <MapGrid
      :maps="mapStore.maps"
      :badge-count="gameStore.state.badges || 0"
      :cycle="mapStore.currentCycle"
      :weather="mapStore.globalWeather || undefined"
      :player-class="gameStore.state.playerClass || undefined"
      :class-data="gameStore.state.classData"
      :safari-ticket-secs="gameStore.state.safariTicketSecs || 0"
      :cerulean-ticket-secs="gameStore.state.ceruleanTicketSecs || 0"
      :dominance-data="mapStore.mapWinners"
      :daily-guardian-captures="mapStore.dailyGuardianCaptures"
      @navigate="navigateToMap"
    />
  </div>
</template>

<style scoped>
@use "@/styles/core/_mixins" as *;
.map-view-container {
  padding: 0 0 40px;
  width: 100%;
  box-sizing: border-box;
}

.legacy-divider {
  display: flex;
  align-items: center;
  gap: 20px;
  margin: 20px 0 20px;
}

.legacy-divider::before,
.legacy-divider::after {
  content: '';
  flex: 1;
  height: 4px;
  background: Rgba(255, 255, 255, 0.1);
}

.divider-text {
  @include pixelated;
  font-size: 10px;
  color: var(--gray);
  letter-spacing: 2px;
}

</style>
