import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/logic/utils/logger'
import { FIRE_RED_MAPS } from '@/data/maps'
import { generateEncounter } from '@/logic/encounters'
import { getDayCycle, getSeason, syncServerTime, getServerTime } from '@/logic/timeUtils'
import { getRouteWeather } from '@/logic/weatherUtils'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { useUIStore } from './ui'
import { useEventStore } from './events'
import type { GameStore, BattleStore, UIStore, EventStore } from '@/types/stores'
import type { Pokemon } from '@/types/pokemon'

export const useMapStore = defineStore('map', () => {
  const gs = useGameStore() as unknown as GameStore
  const currentMap = computed({
    get: () => gs.state.map?.currentMap || 'route1',
    set: (val) => { if (gs.state.map) gs.state.map.currentMap = val }
  })
  const region = computed(() => gs.state.map?.region || 'kanto')
  const currentMapData = computed(() => maps.value.find(m => m.id === currentMap.value))

  const globalWeather = ref(null) // Si está forzado anula el determinístico
  const forcedCycle = ref(null) // null, morning, day, dusk, night
  const forcedSeason = ref(null) // null, spring, summer, autumn, winter
  const currentEpochHour = ref(Math.floor(Date.now() / 3600000))

  // Sync epoch hour every minute
  if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
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
  
  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      logger.info('MapStore', 'Time sync detected');
      currentEpochHour.value = Math.floor(getServerTime() / 3600000);
    });
  }

  // Sync time on store init (safer than onMounted in a store)
  // syncServerTime() -- DEFERRED to game initialization
  const maps = ref(FIRE_RED_MAPS)
  const activeEvents = ref<any[]>([])
  const lastNavigateTime = ref(0)
  const dailyGuardianCaptures = ref<string[]>([])
  const mapWinners = ref<Record<string, import('@/types/stores').DominanceInfo>>({}) // locId -> winner
  const pendingAwards = ref<any[]>([])
  
  const setGlobalWeather = (w: any) => { globalWeather.value = w }
  const setGlobalCycle = (c: any) => { forcedCycle.value = c }

  const navigate = async (locId: string) => {
    const now = Date.now()
    if (now - lastNavigateTime.value < 400) {
      logger.warn('MapStore', 'Navigate throttled');
      return
    }
    lastNavigateTime.value = now
    logger.info('MapStore', `Navigating to ${locId}...`);

    const gs = useGameStore() as unknown as GameStore
    const battleStore = useBattleStore() as unknown as BattleStore
    const uiStore = useUIStore() as unknown as UIStore

    // 1. Verificar salud del equipo
    const healthy = (gs.state.team as any[]).find(p => (p as any).hp > 0 && !(p as any).onMission && !(p as any).onDefense)
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
    const eventStore = useEventStore() as unknown as EventStore
    
    // MODO DEBUG: Si hay un bucle infinito activo, lo usamos
    const encounter = battleStore.debugLoopPokemon 
      ? (() => {
          const nextPoke = JSON.parse(JSON.stringify(battleStore.debugLoopPokemon)) as Pokemon
          nextPoke.hp = nextPoke.maxHp
          nextPoke.status = null
          nextPoke.confused = 0
          nextPoke.flinched = false
          logger.debug('DEBUG', `Navegación: Usando bucle infinito de ${nextPoke.name}`)
          return { type: 'wild', pokemon: nextPoke }
        })()
      : await generateEncounter(locId, gs.state, {
          activeEvents: activeEvents.value,
          dominanceData: mapWinners.value,
          shinyMultiplier: eventStore.globalMultipliers?.shiny || 1,
          weather: currentWeather.value
        })


    if (!encounter) {
      logger.info('MapStore', `No encounter generated for ${locId}`);
      return
    }
    logger.success('MapStore', `Encounter generated: ${encounter.type}`);

    // 4. Procesar Tipo de Encuentro
    const wildEnc = encounter as { type: string; pokemon: Pokemon; pts?: number; faction?: string };
    if (wildEnc.type === 'wild') {
      battleStore._startBattle(wildEnc.pokemon, { 
        locationId: locId,
        wasSearching: true 
      })
    } else if (wildEnc.type === 'guardian') {
      // El componente MapView debe manejar la notificación visual o podemos dispararla aquí si es modal
      // Por ahora, iniciamos la batalla marcando que es un Guardián;
      wildEnc.pokemon.isGuardian = true
      battleStore._startBattle(wildEnc.pokemon, { 
        locationId: locId,
        wasSearching: true,
        battleOptions: { isGuardian: true, pts: wildEnc.pts }
      })
    } else if (wildEnc.type === 'defender') {
      // TODO: Implementar búsqueda de defensores reales desde Supabase
      // Por ahora notificamos
      uiStore.notify(`¡Defensor del Team ${wildEnc.faction?.toUpperCase()} detectado!`, '⚔️')
    }
  }

  return {
    currentMap,
    currentMapData,
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
