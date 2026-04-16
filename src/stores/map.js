import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMapStore = defineStore('map', () => {
  const currentCycle = ref('day')
  const maps = ref([])
  const activeEvents = ref([])
  const pendingAwards = ref([])
  const dailyGuardianCaptures = ref([])
  const mapWinners = ref({}) // locId -> winner
  
  const syncFromLegacy = (legacyState) => {
    if (typeof window.getDayCycle === 'function') {
      currentCycle.value = window.getDayCycle()
    }
    
    maps.value = window.FIRE_RED_MAPS || []
    activeEvents.value = window._activeEvents || []
    pendingAwards.value = window.state?._pendingAwards || []
    dailyGuardianCaptures.value = window.state?.dailyGuardianCaptures || []
    
    // Process map winners (dominance) if available
    // This is usually populated by loadDailyGuardianCaptures in legacy
  }

  const navigate = (locId) => {
    if (typeof window.goLocation === 'function') {
      window.goLocation(locId)
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
