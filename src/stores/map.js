import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { FIRE_RED_MAPS } from '@/data/maps'
import { generateEncounter } from '@/logic/encounters'
import { getDayCycle, getSeason, syncServerTime, getServerTime } from '@/logic/timeUtils'
import { getRouteWeather } from '@/logic/weatherUtils'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { useUIStore } from './ui'
import { useEventStore } from './events'

export const useMapStore = defineStore('map', () => {
  const gs = useGameStore()
  const currentMap = computed({
    get: () => gs.state.map?.currentMap || 'route1',
    set: (val) => { if (gs.state.map) gs.state.map.currentMap = val }
  })
  const region = computed(() => gs.state.map?.region || 'kanto')

  const globalWeather = ref(null) // Si está forzado anula el determinístico
  const forcedCycle = ref(null) // null, morning, day, dusk, night
  const forcedSeason = ref(null) // null, spring, summer, autumn, winter
  const currentEpochHour = ref(Math.floor(getServerTime() / 3600000))

  // Sync epoch hour every minute
  if (typeof window !== 'undefined') {
    setInterval(() => {
      currentEpochHour.value = Math.floor(getServerTime() / 3600000)
    }, 60000)
  }

  const currentCycle = computed(() => {
    if (forcedCycle.value) return forcedCycle.value
    return getDayCycle(currentEpochHour.value * 3600000)
  })
  
  const currentSeason = computed(() => {
    if (forcedSeason.value) return forcedSeason.value
    return getSeason(currentEpochHour.value * 3600000)
  })
  
  const currentWeather = computed(() => {
    if (globalWeather.value) return globalWeather.value
    return getRouteWeather(currentMap.value, currentSeason.value.id, currentEpochHour.value)
  })
  
  // React to debug time changes immediately
  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      console.log('[MapStore] Time sync detected');
      currentEpochHour.value = Math.floor(getServerTime() / 3600000);
    });
  }

  // Sync time on store init (safer than onMounted in a store)
  syncServerTime()
  const maps = ref(FIRE_RED_MAPS)
  const activeEvents = ref([])
  const lastNavigateTime = ref(0)
  const dailyGuardianCaptures = ref([])
  const mapWinners = ref({}) // locId -> winner
  const pendingAwards = ref([])
  
  const setGlobalWeather = (w) => { globalWeather.value = w }
  const setGlobalCycle = (c) => { forcedCycle.value = c }

  const navigate = async (locId) => {
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

    // Actualizar ubicación actual y sincronizar tiempo ambiental
    await syncServerTime()
    currentEpochHour.value = Math.floor(getServerTime() / 3600000)
    currentMap.value = locId

    // 2. Progreso de eclosión
    gs.hatchEggs()

    // 3. Generar Encuentro
    const eventStore = useEventStore()
    
    // MODO DEBUG: Si hay un bucle infinito activo, lo usamos
    const encounter = battleStore.debugLoopPokemon 
      ? (() => {
          const nextPoke = JSON.parse(JSON.stringify(battleStore.debugLoopPokemon))
          nextPoke.hp = nextPoke.maxHp
          nextPoke.status = null
          nextPoke.confused = 0
          nextPoke.flinched = false
          console.log('[DEBUG] Navegación: Usando bucle infinito de', nextPoke.name)
          return { type: 'wild', pokemon: nextPoke }
        })()
      : await generateEncounter(locId, gs.state, {
          activeEvents: activeEvents.value,
          dominanceData: mapWinners.value,
          shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
          weather: currentWeather.value
        })


    if (!encounter) {
      // No pasó nada, solo nos movemos (efecto visual en el componente)
      return
    }

    // 4. Procesar Tipo de Encuentro
    if (encounter.type === 'wild') {
      battleStore._startBattle(encounter.pokemon, { 
        locationId: locId,
        wasSearching: true 
      })
    } else if (encounter.type === 'guardian') {
      // El componente MapView debe manejar la notificación visual o podemos dispararla aquí si es modal
      // Por ahora, iniciamos la batalla marcando que es un Guardián
      encounter.pokemon.isGuardian = true
      battleStore._startBattle(encounter.pokemon, { 
        locationId: locId,
        wasSearching: true,
        battleOptions: { isGuardian: true, pts: encounter.pts }
      })
    } else if (encounter.type === 'defender') {
      // TODO: Implementar búsqueda de defensores reales desde Supabase
      // Por ahora notificamos
      uiStore.notify(`¡Defensor del Team ${encounter.faction.toUpperCase()} detectado!`, '⚔️')
    }
  }

  return {
    currentMap,
    region,
    currentEpochHour,
    currentCycle,
    currentSeason,
    currentWeather,
    globalWeather,
    forcedCycle,
    forcedSeason,
    maps,
    activeEvents,
    pendingAwards,
    dailyGuardianCaptures,
    mapWinners,
    setGlobalWeather,
    setGlobalCycle,
    navigate
  }
})
