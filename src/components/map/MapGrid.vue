<script setup lang="ts">

import MapCard from './MapCard.vue'
import { getEncounterPool } from '@/logic/encounters/encounters'
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
  classData?: { extortedRouteId?: string | null; officialRouteId?: string | null }
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

const getMapData = (loc: MapLocation): SpawnPoolData => {
  if (!loc.wild) return { generic: [], specific: [], rates: {}, weather: 'clear' }

  const activeEvents = eventStore.activeEvents || []
  
  // Determinar clima: El clima forzado (props.weather) tiene prioridad absoluta si no es undefined
  const activeWeather = (props.weather !== undefined) ? props.weather : getRouteWeather(loc.id, mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
  
  const { pool, rates } = getEncounterPool(loc, props.cycle || 'day', activeWeather || 'clear', activeEvents)

  const baseWild = loc.wild?.day || []
  const generic: string[] = []
  const specific: string[] = []
  const ratesMap: Record<string, number> = {}

  pool.forEach((id: string, index: number) => {
    ratesMap[id] = rates[index] || 10
    if (baseWild.includes(id)) generic.push(id)
    else specific.push(id)
  })

  // Add fishing pool to generic if not already there
  if (loc.fishing) {
    loc.fishing.pool.forEach((id: string, index: number) => {
      if (!generic.includes(id) && !specific.includes(id)) {
        generic.push(id)
        ratesMap[id] = loc.fishing!.rates[index] || 10
      }
    })
  }

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
      :is-rocket-extorted="(playerClass === 'rocket' && classData?.extortedRouteId === loc.id) || (playerClass === 'entrenador' && classData?.officialRouteId === loc.id)"
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
