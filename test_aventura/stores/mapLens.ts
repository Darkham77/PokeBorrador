import { defineStore } from 'pinia';
import { ref } from 'vue';

import { logger } from '@/logic/utils/logger';

import { isMapLens, requireMapLens, type MapLens } from '../types/map/mapLenses.ts';

const MAP_LENS_STORAGE_KEY = 'pvs_active_map_lens';

export const useMapLensStore = defineStore('mapLens', () => {
  const activeLens = ref<MapLens>('adventure');

  function initFromStorage(): void {
    try {
      if (typeof globalThis.window !== 'undefined' && globalThis.localStorage) {
        const stored = globalThis.localStorage.getItem(MAP_LENS_STORAGE_KEY);
        if (stored && isMapLens(stored)) {
          activeLens.value = stored;
        }
      }
    } catch (e) {
      logger.warn('[MapLensStore] Could not read from localStorage', String(e));
    }
  }

  function setLens(lens: MapLens): void {
    const validated = requireMapLens(lens);
    activeLens.value = validated;
    try {
      if (typeof globalThis.window !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.setItem(MAP_LENS_STORAGE_KEY, validated);
      }
    } catch (e) {
      logger.warn('[MapLensStore] Could not write to localStorage', String(e));
    }
  }

  // Initial load
  initFromStorage();

  // Register in debug CLI if in browser debug environment
  if (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__) {
    Reflect.set(globalThis.__VITE_DEBUG__, 'setMapLens', setLens);
  }

  return {
    activeLens,
    setLens,
    initFromStorage
  };
});
