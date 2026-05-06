<script setup lang="ts">
import MapCard from './MapCard.vue'
import { getEncounterPool } from '@/logic/encounters'
import { useEventStore } from '@/stores/events'
import { getGuardianData } from '@/logic/war/guardianEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { getRouteWeather } from '@/logic/weatherUtils'
import { useMapStore } from '@/stores/map'

interface Props {
  maps: any[]
  badgeCount?: number
  cycle?: string
  weather?: string
  playerClass?: string
  classData?: any
  safariTicketSecs?: number
  ceruleanTicketSecs?: number
  dominanceData?: any
  dailyGuardianCaptures?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  badgeCount: 0,
  cycle: 'day',
  weather: 'clear',
  playerClass: 'trainer',
  classData: () => ({}),
  safariTicketSecs: 0,
  ceruleanTicketSecs: 0,
  dominanceData: () => ({}),
  dailyGuardianCaptures: () => []
})

const emit = defineEmits<{
  (e: 'navigate', loc: any): void
}>()

const eventStore = useEventStore() as any
const mapStore = useMapStore() as any

const getMapData = (loc: any) => {
  if (!loc.wild) return { generic: [], specific: [], rates: {}, weather: 'clear' }

  const activeEvents = eventStore.activeEvents || []
  
  // Determinar clima para esta ruta específica si no hay uno global
  // RE-TRACK: Asegurar que el pool se recalcule si cambia la hora del epoch
  const activeWeather = (props.weather && props.weather !== 'clear') ? props.weather : getRouteWeather(loc.id, mapStore.currentSeason.id, mapStore.currentEpochHour)
  
  const { pool, rates } = getEncounterPool(loc, props.cycle, activeWeather, activeEvents)

  const baseWild = loc.wild?.day || []
  const generic: any[] = []
  const specific: any[] = []
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
        ratesMap[id] = loc.fishing.rates[index] || 10
      }
    })
  }

  return { generic, specific, rates: ratesMap, weather: activeWeather }
}

const isMapLocked = (loc: any) => {
  if (loc.id === 'safari_zone') return props.safariTicketSecs <= 0
  return props.badgeCount < loc.badges
}

const getDominanceForMap = (mapId: string) => {
  const data = props.dominanceData[mapId] || {}
  const captured = props.dailyGuardianCaptures.includes(mapId)
  
  const allMaps = pokemonDataProvider.getMaps()
  const guardianData = getGuardianData(mapId, allMaps.map(m => m.id))
  
  let guardian = null
  if (guardianData) {
    guardian = { id: guardianData.id, captured }
  }

  return {
    winner: data.winner_faction || null,
    guardian
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
      :is-rocket-extorted="playerClass === 'rocket' && classData?.extortedRouteId === loc.id"
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
