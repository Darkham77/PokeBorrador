<script setup>
import { computed } from 'vue'
import MapCard from './MapCard.vue'

const props = defineProps({
  maps: { type: Array, required: true },
  badgeCount: { type: Number, default: 0 },
  cycle: { type: String, default: 'day' },
  playerClass: { type: String, default: 'trainer' },
  classData: { type: Object, default: () => ({}) },
  safariTicketSecs: { type: Number, default: 0 },
  ceruleanTicketSecs: { type: Number, default: 0 },
  dominanceData: { type: Object, default: () => ({}) }, // mapId -> data
  dailyGuardianCaptures: { type: Array, default: () => [] }
})

const emit = defineEmits(['navigate'])

// Helpers de lógica de negocio (migrados de legacy a Vue-style)
const getEncounterPool = (loc, cycle) => {
  // En el futuro esto debería estar en un store o utilidad compartida
  if (typeof window.getEncounterPool === 'function') {
    return window.getEncounterPool(loc, cycle)
  }
  return { pool: [], rates: [] }
}

const getMapData = (loc) => {
  const encounterData = getEncounterPool(loc, props.cycle)
  const currentCycleWild = encounterData.pool
  const baseWild = loc.wild?.day || []
  
  const generic = []
  const specific = []
  
  currentCycleWild.forEach(id => {
    if (baseWild.includes(id)) generic.push(id)
    else specific.push(id)
  })

  // Agregar pesca si existe
  if (loc.fishing) {
    loc.fishing.pool.forEach(id => {
      if (!generic.includes(id) && !specific.includes(id)) generic.push(id)
    })
  }

  return { generic, specific }
}

const isMapLocked = (loc) => {
  const isBadgeLocked = props.badgeCount < loc.badges
  if (loc.id === 'safari_zone') return props.safariTicketSecs <= 0
  if (loc.id === 'cerulean_cave') {
    if (props.ceruleanTicketSecs > 0) return false
    return isBadgeLocked
  }
  return isBadgeLocked
}

const getDominanceForMap = (mapId) => {
  const data = props.dominanceData[mapId] || {}
  const captured = props.dailyGuardianCaptures.includes(mapId)
  
  // Guardián
  let guardian = null
  if (typeof window.getGuardianForMap === 'function') {
     const g = window.getGuardianForMap(mapId)
     if (g) guardian = { id: g.id, captured }
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
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1280px) {
  .map-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .map-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .map-grid {
    grid-template-columns: 1fr;
  }
}
</style>
