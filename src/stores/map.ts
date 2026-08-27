import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/logic/utils/logger'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { getDayCycle, getSeason, getServerTime } from '@/logic/utils/timeUtils'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { useGameStore } from '@/stores/game.ts'
import type { Event } from '@/logic/events/eventEngine'
import type { DayPhase, Season } from '@/logic/utils/timeUtils'

import type { MapRouteId } from '@/data/world/map-assets';
import type { WeatherId } from '@/logic/weather/weatherRegistry';
import { requireMapRouteId } from '@/data/world/map-assets';
import { requireWeatherSeasonId } from '@/data/world/weather-tables';
import type { DominanceInfo } from '@/types/system/stores';
import { ONE_HOUR_MS } from '@/logic/constants/items.ts';

import { gsap } from 'gsap'

export interface PendingAward {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export const useMapStore = defineStore('map', () => {
  const gs = useGameStore()
  const currentMap = computed<MapRouteId>({
    get: () => requireMapRouteId(gs.state.map?.currentMap || 'route1'),
    set: (val: MapRouteId) => { if (gs.state.map) gs.state.map.currentMap = val }
  })

  const globalWeather = ref<WeatherId | null>(null) // Si está forzado anula el determinístico
  const forcedCycle = ref<DayPhase | null>(null)
  const forcedSeason = ref<Season | null>(null)
  const isTimeTickerFrozen = ref(false)
  const currentEpochHour = ref(Math.floor(Temporal.Now.instant().epochMilliseconds / ONE_HOUR_MS))

  // Reactive Epoch Hour computation on demand & time-sync-update events (Zero-Timer Event-Driven Architecture)
  const updateEpochHour = () => {
    currentEpochHour.value = Math.floor(getServerTime() / ONE_HOUR_MS);
  };

  const setFreezeClock = (freeze: boolean) => {
    isTimeTickerFrozen.value = freeze
    if (typeof window !== 'undefined') {
      if (!window.__VITE_DEBUG__) {
        window.__VITE_DEBUG__ = {}
      }
      window.__VITE_DEBUG__.freezeClock = freeze
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      logger.info('MapStore', 'Time sync detected');
      updateEpochHour();
    });

    let lastCheckedSec = 0
    const onTimeTick = (time: number) => {
      // Sample every 10 seconds of GSAP timeline execution
      if (time - lastCheckedSec < 10) return
      lastCheckedSec = time

      const isFrozen = isTimeTickerFrozen.value || 
        Boolean(
          window.__VITE_DEBUG__?.freezeClock || 
          window.__VITE_DEBUG__?.isScriptedReplayMode || 
          window.__VITE_DEBUG__?.isDeterministicSimulation
        )

      if (isFrozen) return

      const newEpochHour = Math.floor(getServerTime() / ONE_HOUR_MS)
      if (newEpochHour !== currentEpochHour.value) {
        logger.info('MapStore', `Real-time hour changed: ${currentEpochHour.value} -> ${newEpochHour}`)
        currentEpochHour.value = newEpochHour
      }
    }

    if (gsap && gsap.ticker && typeof gsap.ticker.add === 'function') {
      gsap.ticker.add(onTimeTick)
    }
  }

  const currentCycle = computed(() => {
    if (forcedCycle.value) return forcedCycle.value
    return getDayCycle(currentEpochHour.value * ONE_HOUR_MS)
  })
  
  const currentSeason = computed(() => {
    if (forcedSeason.value) return forcedSeason.value
    return getSeason(currentEpochHour.value * ONE_HOUR_MS)
  })
  
  const currentWeather = computed<WeatherId>(() => {
    if (globalWeather.value) return globalWeather.value
    return getRouteWeather(currentMap.value, requireWeatherSeasonId(currentSeason.value.id), currentEpochHour.value, currentCycle.value)
  })

  // Sync time on store init (safer than onMounted in a store)
  // syncServerTime() -- DEFERRED to game initialization
  const maps = ref(FIRE_RED_MAPS)
  const activeEvents = ref<Event[]>([])
  const lastNavigateTime = ref(0)
  const lastTrainerChanceIncrementAt = ref(Temporal.Now.instant().epochMilliseconds)
  const mapWinners = ref<Partial<Record<MapRouteId, DominanceInfo>>>({}) // locId -> winner
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
  
  const setGlobalWeather = (w: WeatherId | null) => { globalWeather.value = w }
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
        currentCycle: currentCycle.value,
        activeEvents: activeEvents.value,
        mapWinners: mapWinners.value
      },
      {
        setCurrentMap: (val: MapRouteId) => { currentMap.value = val },
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
    currentEpochHour,
    currentCycle,
    currentSeason,
    currentWeather,
    globalWeather,
    forcedCycle,
    forcedSeason,
    isTimeTickerFrozen,
    setFreezeClock,
    maps,
    activeEvents,
    pendingAwards,
    mapWinners,
    setGlobalWeather,
    setGlobalCycle,
    setGlobalSeason,
    navigate,
    triggerArchaeologyRewards
  }
})
