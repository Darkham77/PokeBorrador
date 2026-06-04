
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { logger } from '@/logic/utils/logger'
import { FIRE_RED_MAPS } from '@/data/maps'
import { getDayCycle, getSeason, getServerTime } from '@/logic/timeUtils'
import { getRouteWeather } from '@/logic/weatherUtils'
import { useGameStore } from './game.ts'
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
  const lastTrainerChanceIncrementAt = ref(Temporal.Now.instant().epochMilliseconds)
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
    const { executeNavigation } = await import('./mapActions')
    await executeNavigation(
      locId,
      {
        currentMap: currentMap.value,
        currentEpochHour: currentEpochHour.value,
        lastNavigateTime: lastNavigateTime.value,
        lastTrainerChanceIncrementAt: lastTrainerChanceIncrementAt.value,
        currentWeather: currentWeather.value,
        activeEvents: activeEvents.value,
        mapWinners: mapWinners.value
      },
      {
        setCurrentMap: (val: string) => { currentMap.value = val },
        setCurrentEpochHour: (val: number) => { currentEpochHour.value = val },
        setLastNavigateTime: (val: number) => { lastNavigateTime.value = val },
        setLastTrainerChanceIncrementAt: (val: number) => { lastTrainerChanceIncrementAt.value = val }
      }
    )
  }

  const triggerArchaeologyRewards = async (locId: string, difficulty?: string) => {
    const { executeArchaeologyRewards } = await import('./mapActions')
    await executeArchaeologyRewards(locId, gs, difficulty)
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
    navigate,
    triggerArchaeologyRewards
  }
})
