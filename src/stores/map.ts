
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { logger } from '@/logic/utils/logger'
import { FIRE_RED_MAPS } from '@/data/maps'
import { generateEncounter } from '@/logic/encounters'
import { getDayCycle, getSeason, syncServerTime, getServerTime } from '@/logic/timeUtils'
import { getRouteWeather } from '@/logic/weatherUtils'
import { useGameStore } from './game.ts'
import { useBattleStore } from './battle.ts'
import { useUIStore } from './ui.ts'
import { useEventStore } from './events.ts'
import type { Pokemon } from '@/types/pokemon'
import type { Event } from '@/logic/events/eventEngine'
import type { DayPhase, Season } from '@/logic/timeUtils'

export interface PendingAward {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export const useMapStore = defineStore('map', () => {
  const gs = useGameStore()
  const currentMap = computed({
    get: () => gs.state.map?.currentMap || 'route1',
    set: (val: string) => { if (gs.state.map) gs.state.map.currentMap = val }
  })
  const region = computed(() => gs.state.map?.region || 'kanto')
  const currentMapData = computed(() => maps.value.find((m: (typeof FIRE_RED_MAPS)[number]) => m.id === currentMap.value))

  const globalWeather = ref<string | null>(null) // Si está forzado anula el determinístico
  const forcedCycle = ref<DayPhase | null>(null)
  const forcedSeason = ref<Season | null>(null)
  const currentEpochHour = ref(Math.floor(Temporal.Now.instant().epochMilliseconds / 3600000))

  // Sync epoch hour every second for real-time feeling
  if (typeof window !== 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    const updateEpoch = () => {
      currentEpochHour.value = Math.floor(getServerTime() / 3600000)
      gsap.delayedCall(1, updateEpoch)
    }
    gsap.delayedCall(1, updateEpoch)
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
    return getRouteWeather(currentMap.value, currentSeason.value.id, currentEpochHour.value, currentCycle.value)
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
  const activeEvents = ref<Event[]>([])
  const lastNavigateTime = ref(0)
  const dailyGuardianCaptures = ref<string[]>([])
  const mapWinners = ref<Record<string, import('@/types/stores').DominanceInfo>>({}) // locId -> winner
  const pendingAwards = ref<PendingAward[]>([])
  
  const setGlobalSeason = (s: string | null) => {
    if (!s) {
      forcedSeason.value = null
      return
    }
    const seasons: Season[] = [
      { id: 'spring', label: 'Primavera', icon: '🌸' },
      { id: 'summer', label: 'Verano', icon: '🌻' },
      { id: 'autumn', label: 'Otoño', icon: '🍂' },
      { id: 'winter', label: 'Invierno', icon: '⛄' }
    ]
    forcedSeason.value = seasons.find(sea => sea.id === s) || null
  }
  
  const setGlobalWeather = (w: string | null) => { globalWeather.value = w }
  const setGlobalCycle = (c: DayPhase | null) => { forcedCycle.value = c }

  const navigate = async (locId: string) => {
    const now = Temporal.Now.instant().epochMilliseconds
    if (now - lastNavigateTime.value < 400) {
      logger.warn('MapStore', 'Navigate throttled');
      return
    }
    lastNavigateTime.value = now
    logger.info('MapStore', `Navigating to ${locId}...`);

    const gs = useGameStore()
    const battleStore = useBattleStore()
    const uiStore = useUIStore()

    // 1. Verificar salud del equipo
    const healthy = (gs.state.team as Pokemon[]).find(p => p.hp > 0 && !p.onMission && !p.onDefense)
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
    const wildEnc = encounter as { type: string; pokemon: Pokemon; pts?: number; faction?: string; rarity?: number };
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
        isGuardian: true,
        pts: wildEnc.pts
      })
    } else if (wildEnc.type === 'defender') {
      // TODO: Implementar búsqueda de defensores reales desde Supabase
      // Por ahora notificamos
      uiStore.notify(`¡Defensor del Team ${wildEnc.faction?.toUpperCase()} detectado!`, '⚔️')
    } else if (wildEnc.type === 'fishing') {
      const { showFishingIntro, startFishingMinigame } = await import('@/logic/encounterUI')
      showFishingIntro(wildEnc.pokemon, wildEnc.rarity || 50, () => {
        startFishingMinigame(
          wildEnc.pokemon,
          wildEnc.rarity || 50,
          () => {
            battleStore._startBattle(wildEnc.pokemon, { 
              locationId: locId,
              wasSearching: true,
              isFishing: true
            })
          },
          () => {
            uiStore.notify('El Pokémon escapó...', '💨')
          }
        )
      })
    } else if (wildEnc.type === 'archaeology') {
      const { showArchaeologyIntro, startArchaeologyMinigame } = await import('@/logic/encounterUI')
      showArchaeologyIntro(wildEnc.pokemon, wildEnc.rarity || 50, () => {
        startArchaeologyMinigame(
          wildEnc.pokemon,
          wildEnc.rarity || 50,
          () => {
            battleStore._startBattle(wildEnc.pokemon, { 
              locationId: locId,
              wasSearching: true,
              isArchaeology: true
            })
          },
          () => {
            uiStore.notify('El fósil se desmoronó...', '💨')
          }
        )
      })
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
    setGlobalSeason,
    navigate
  }
})
