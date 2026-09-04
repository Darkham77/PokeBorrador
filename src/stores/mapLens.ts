import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isMapLens, requireMapLens, type MapLens } from '@/types/map/mapLenses'
import { logger } from '@/logic/utils/logger'

export const MAP_LENS_STORAGE_KEY = 'pvs_active_map_lens'

export const useMapLensStore = defineStore('mapLens', () => {
  const activeLens = ref<MapLens>('adventure')

  function initFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(MAP_LENS_STORAGE_KEY)
        if (stored && isMapLens(stored)) {
          activeLens.value = stored
        }
      }
    } catch (e) {
      logger.warn('[MapLensStore] Could not read from localStorage', String(e))
    }
  }

  function setLens(lens: MapLens) {
    const validated = requireMapLens(lens)
    activeLens.value = validated
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(MAP_LENS_STORAGE_KEY, validated)
      }
    } catch (e) {
      logger.warn('[MapLensStore] Could not write to localStorage', String(e))
    }
  }

  // Initial load
  initFromStorage()

  // Register in debug CLI if in browser debug environment
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    Reflect.set(window.__VITE_DEBUG__, 'setMapLens', setLens)
  }

  return {
    activeLens,
    setLens,
    initFromStorage
  }
})
