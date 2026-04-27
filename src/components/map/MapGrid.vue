<script setup>
import MapCard from './MapCard.vue'
import { getEncounterPool } from '@/logic/encounters'
import { useEventStore } from '@/stores/events'
import { getGuardianData } from '@/logic/war/guardianEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const props = defineProps({
  maps: { type: Array, required: true },
  badgeCount: { type: Number, default: 0 },
  cycle: { type: String, default: 'day' },
  weather: { type: String, default: 'clear' },
  playerClass: { type: String, default: 'trainer' },
  classData: { type: Object, default: () => ({}) },
  safariTicketSecs: { type: Number, default: 0 },
  ceruleanTicketSecs: { type: Number, default: 0 },
  dominanceData: { type: Object, default: () => ({}) },
  dailyGuardianCaptures: { type: Array, default: () => [] }
})

const emit = defineEmits(['navigate'])
const eventStore = useEventStore()

const getMapData = (loc) => {
  if (!loc.wild) return { generic: [], specific: [], rates: {} }

  const activeEvents = eventStore.activeEvents || []
  const { pool, rates } = getEncounterPool(loc, props.cycle, activeEvents)
  
  const baseWild = loc.wild?.day || []
  const generic = []
  const specific = []
  const ratesMap = {}

  pool.forEach((id, index) => {
    ratesMap[id] = rates[index] || 10
    if (baseWild.includes(id)) generic.push(id)
    else specific.push(id)
  })

  // Add fishing pool to generic if not already there
  if (loc.fishing) {
    loc.fishing.pool.forEach((id, index) => {
      if (!generic.includes(id) && !specific.includes(id)) {
        generic.push(id)
        ratesMap[id] = loc.fishing.rates[index] || 10
      }
    })
  }

  return { generic, specific, rates: ratesMap }
}

const isMapLocked = (loc) => {
  if (loc.id === 'safari_zone') return props.safariTicketSecs <= 0
  return props.badgeCount < loc.badges
}

const getDominanceForMap = (mapId) => {
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
