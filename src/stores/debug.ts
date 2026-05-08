import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useMapStore } from './map'
import { usePvPStore } from './pvp'
import { useBreedingStore } from './breeding'
import { useModalStore } from './modals'
import { useErrorStore } from './errorStore'

// Section Registrations
import { registerStatsTools } from './debug/sections/statsTools'
import { registerMapTools } from './debug/sections/mapTools'
import { registerPokeTools } from './debug/sections/pokeTools'
import { registerTimeTools } from './debug/sections/timeTools'
import { registerItemTools } from './debug/sections/itemTools'
import { registerSystemTools } from './debug/sections/systemTools'
import { registerAudioTools } from './debug/sections/audioTools'

export interface DebugTool {
  id: string
  command: string
  action: (...args: any[]) => any
  label?: string
  category?: string
  description?: string
}

export interface DebugSystem {
  register: (config: DebugTool) => void
  unregister?: (id: string) => void
}

export interface DebugContext {
  game: ReturnType<typeof useGameStore>
  ui: ReturnType<typeof useUIStore>
  pvp: ReturnType<typeof usePvPStore>
  auth: ReturnType<typeof useAuthStore>
  map: ReturnType<typeof useMapStore>
  mapStore: ReturnType<typeof useMapStore>
  breedingStore: ReturnType<typeof useBreedingStore>
  modalStore: ReturnType<typeof useModalStore>
  errorStore: ReturnType<typeof useErrorStore>
  eventStoreModule?: any
}

declare global {
  interface Window {
    __VITE_DEBUG__?: Record<string, (...args: any[]) => any>
  }
}

export const useDebugStore = defineStore('debug', () => {
  const auth = useAuthStore()
  const game = useGameStore()
  const ui = useUIStore()
  const map = useMapStore()
  const pvp = usePvPStore()
  const modalStore = useModalStore()
  const errorStore = useErrorStore()
  const breedingStore = useBreedingStore()

  const tools = ref<DebugTool[]>([])

  const canAccess = computed(() => {
    if (auth.sessionMode === 'offline') return true
    return auth.user?.role === 'admin'
  })

  function securityCheck() {
    if (auth.sessionMode === 'online' && auth.user?.role !== 'admin') {
      logger.error('SECURITY', 'Unauthorized debug access detected. Banning user and force logout.')
      const userId = auth.user?.id
      if (userId) {
        const db = game.db
        if (db) {
          db.from('profiles').update({ 
            is_banned: true, 
            ban_reason: 'Intento de uso indebido de herramientas de debug' 
          }).eq('id', userId).then(() => {
            logger.success('SECURITY', 'DB Ban applied.')
          })
        }
      }
      auth.logout()
      return false
    }
    return true
  }

  function register(config: DebugTool) {
    const existingIdx = tools.value.findIndex(t => t.id === config.id)
    if (existingIdx !== -1) {
      tools.value[existingIdx] = config 
    } else {
      tools.value.push(config)
    }
    updateGlobalProxy()
  }

  function unregister(id: string) {
    tools.value = tools.value.filter(t => t.id !== id)
    updateGlobalProxy()
  }

  function updateGlobalProxy() {
    if (typeof window === 'undefined') return
    if (!canAccess.value) {
      delete window.__VITE_DEBUG__
      return
    }
    if (!window.__VITE_DEBUG__) window.__VITE_DEBUG__ = {}

    tools.value.forEach(tool => {
      window.__VITE_DEBUG__![tool.command] = (...args: any[]) => {
        if (securityCheck()) {
          return tool.action(...args)
        }
      }
    })
  }

  async function init() {
    logger.debug('DEBUG', 'Initializing debug tools (Modular)...');
    
    // Pass all necessary stores to the specialized registration functions
    const context: DebugContext = { game, ui, pvp, auth, map, mapStore: map, breedingStore, modalStore, errorStore }

    // Synchronous registrations (fastest availability)
    registerStatsTools({ register }, context)
    registerMapTools({ register }, context)
    registerPokeTools({ register }, context)
    registerTimeTools({ register }, context)
    registerItemTools({ register }, context)
    registerAudioTools({ register }, context)
    
    // SystemTools registration (now synchronous registration, async module resolution)
    registerSystemTools({ register }, { ...context })

    updateGlobalProxy()
    
    // Delayed dependency resolution for Admin tools
    try {
      const eventStoreModule = await import('./events')
      registerSystemTools({ register }, { ...context, eventStoreModule } as any)
      updateGlobalProxy()
    } catch (e) {
      logger.warn('DEBUG', `Failed to load optional eventStoreModule for SystemTools: ${(e as Error).message}`)
    }
  }

  watch(canAccess, () => updateGlobalProxy())

  init()

  return {
    tools,
    canAccess,
    securityCheck,
    register,
    unregister,
    updateGlobalProxy
  }
})
