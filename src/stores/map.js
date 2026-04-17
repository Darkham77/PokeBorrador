import { defineStore } from 'pinia'
import { ref } from 'vue'
import { FIRE_RED_MAPS } from '@/data/maps'
import { generateEncounter } from '@/logic/encounters'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { useUIStore } from './ui'

export const useMapStore = defineStore('map', () => {
  const currentCycle = ref('day')
  const maps = ref(FIRE_RED_MAPS)
  const activeEvents = ref([])
  const lastNavigateTime = ref(0)
  const dailyGuardianCaptures = ref([])
  const mapWinners = ref({}) // locId -> winner
  
  const syncFromLegacy = (legacyState) => {
    if (typeof window.getDayCycle === 'function') {
      currentCycle.value = window.getDayCycle()
    }
    
    maps.value = window.FIRE_RED_MAPS || []
    activeEvents.value = window._activeEvents || []
    pendingAwards.value = window.state?._pendingAwards || []
    
    // Process map winners (dominance) if available
    // This is usually populated by loadDailyGuardianCaptures in legacy
  }

  const navigate = (locId) => {
    const now = Date.now()
    if (now - lastNavigateTime.value < 400) return // Throttling
    lastNavigateTime.value = now

    const gs = useGameStore()
    const battleStore = useBattleStore()
    const uiStore = useUIStore()

    // 1. Verificar salud del equipo
    const healthy = gs.state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense)
    if (!healthy) {
      uiStore.notify('Todos tus Pokémon están debilitados. ¡Ve al Centro Pokémon!', '🏥')
      return
    }

    // 2. Progreso de eclosión
    gs.hatchEggs()

    // 3. Generar Encuentro
    const encounter = generateEncounter(locId, gs.state, {
      activeEvents: activeEvents.value,
      dominanceData: mapWinners.value
    })

    if (!encounter) {
      // No pasó nada, solo nos movemos (efecto visual en el componente)
      return
    }

    // 4. Procesar Tipo de Encuentro
    if (encounter.type === 'wild') {
      battleStore.startBattle(encounter.pokemon, { locationId: locId })
    } else if (encounter.type === 'guardian') {
      // El componente MapView debe manejar la notificación visual o podemos dispararla aquí si es modal
      // Por ahora, iniciamos la batalla marcando que es un Guardián
      encounter.pokemon.isGuardian = true
      battleStore.startBattle(encounter.pokemon, { 
        locationId: locId,
        battleOptions: { isGuardian: true, pts: encounter.pts }
      })
    } else if (encounter.type === 'defender') {
      // TODO: Implementar búsqueda de defensores reales desde Supabase
      // Por ahora notificamos
      uiStore.notify(`¡Defensor del Team ${encounter.faction.toUpperCase()} detectado!`, '⚔️')
    }
  }

  return {
    currentCycle,
    maps,
    activeEvents,
    pendingAwards,
    dailyGuardianCaptures,
    mapWinners,
    syncFromLegacy,
    navigate
  }
})
