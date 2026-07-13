<script setup lang="ts">

import MapCard from './MapCard.vue'
import { useEventStore } from '@/stores/events'
import { getGuardianData } from '@/logic/war/guardianEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { useMapStore } from '@/stores/map'


import type { MapLocation } from '@/types/pokemon/encounters'



interface Props {
  maps: MapLocation[]
  badgeCount?: number
  cycle?: 'morning' | 'day' | 'dusk' | 'night'
  weather?: string
  playerClass?: string
  classData?: { 
    extortedRouteId?: string | null; 
    extortedRouteTimestamp?: string | null;
    officialRouteId?: string | null;
    officialRouteTimestamp?: string | null;
  }
  safariTicketSecs?: number
  ceruleanTicketSecs?: number
  dominanceData?: Record<string, import('@/types/system/stores').DominanceInfo>
  dailyGuardianCaptures?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  badgeCount: 0,
  cycle: 'day',
  weather: undefined,
  playerClass: 'trainer',
  classData: () => ({}),
  safariTicketSecs: 0,
  ceruleanTicketSecs: 0,
  dominanceData: () => ({}),
  dailyGuardianCaptures: () => []
})

const emit = defineEmits<{
  (e: 'navigate', loc: MapLocation): void
}>()

const eventStore = useEventStore()
const mapStore = useMapStore()

interface SpawnPoolData {
  generic: string[]
  specific: string[]
  rates: Record<string, number>
  weather: string | null | undefined
}

import { getMapSpawnPoolData } from '@/logic/encounters/encounterHelpers'

const getMapData = (loc: MapLocation): SpawnPoolData => {
  if (!loc.wild) return { generic: [], specific: [], rates: {}, weather: 'clear' }

  const activeEvents = eventStore.activeEvents || []
  
  // Determinar clima: El clima forzado (props.weather) tiene prioridad absoluta si no es undefined
  const activeWeather = (props.weather !== undefined) ? props.weather : getRouteWeather(loc.id, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
  
  const { generic, specific, rates: ratesMap } = getMapSpawnPoolData(
    loc,
    props.cycle || 'day',
    activeWeather || 'clear',
    activeEvents
  )

  return { generic, specific, rates: ratesMap, weather: activeWeather }
}


const isMapLocked = (loc: MapLocation) => {
  if (loc.id === 'safari_zone') return props.safariTicketSecs <= 0
  return (props.badgeCount || 0) < (loc.badges || 0)
}

const getDominanceForMap = (mapId: string) => {
  const data = (props.dominanceData || {})[mapId] || {}
  const captured = (props.dailyGuardianCaptures || []).includes(mapId)
  
  const allMaps = pokemonDataProvider.getMaps()
  const guardianData = getGuardianData(mapId, allMaps.map(m => m.id))
  
  let guardian = null
  if (guardianData) {
    guardian = { id: guardianData.id, captured }
  }

  return {
    winner: (data as { winner?: string | null }).winner || null,
    guardian: guardian as { id: string, captured: boolean } | null
  }
}

const isRocketExtorted = (loc: MapLocation): boolean => {
  if (!props.classData) return false
  const now = Temporal.Now.instant().epochMilliseconds
  if (props.playerClass === 'rocket' && props.classData.extortedRouteId === loc.id) {
    const timestamp = Number(props.classData.extortedRouteTimestamp || 0)
    return (now - timestamp) <= 24 * 3600 * 1000
  }
  if (props.playerClass === 'entrenador' && props.classData.officialRouteId === loc.id) {
    const timestamp = Number(props.classData.officialRouteTimestamp || 0)
    return (now - timestamp) <= 30 * 60 * 1000
  }
  return false
}
</script>

<template>
  <div class="map-grid">
    <MapCard
      v-for="loc in maps"
      :key="loc.id"
      :map="loc"
      :is-locked="isMapLocked(loc)"
      :is-safari-locked="loc.id === 'safari_zone' && safariTicketSecs <= 0"
      :cycle="cycle"
      :weather="weather"
      :forced-weather="getMapData(loc).weather"
      :badge-count="badgeCount"
      :dominance="getDominanceForMap(loc.id)"
      :is-rocket-extorted="isRocketExtorted(loc)"
      :spawn-pool="getMapData(loc)"
      @navigate="emit('navigate', $event)"
    />
  </div>
</template>

<style scoped>
.map-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  padding: 5px;
}

@media (max-width: 940px) {
  .map-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 660px) {
  .map-grid {
    grid-template-columns: 1fr;
  }
}
</style>
