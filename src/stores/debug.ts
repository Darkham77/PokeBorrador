import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'

// Section Registrations
import { registerStatsTools } from './debug/sections/statsTools.ts'
import { registerMapTools } from './debug/sections/mapTools.ts'
import { registerPokeTools } from './debug/sections/pokeTools.ts'
import { registerTimeTools } from './debug/sections/timeTools.ts'
import { registerItemTools } from './debug/sections/itemTools.ts'
import { registerSystemTools } from './debug/sections/systemTools.ts'
import { registerBattleTools } from './debug/sections/battleTools.ts'

export interface DebugTool {
  id: string
  command: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (...args: any[]) => any
  label?: string
  category?: string
  description?: string
}

export interface DebugSystem {
  register: (config: DebugTool) => void
  unregister?: (id: string) => void
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __VITE_DEBUG__?: Record<string, (...args: any[]) => any>
  }
}

export const useDebugStore = defineStore('debug', () => {
  const auth = useAuthStore()
  const game = useGameStore()

  const tools = ref<DebugTool[]>([])

  const canAccess = computed(() => {
    return auth.sessionMode === 'offline'
  })

  // True for offline mode OR online admins — used to show advanced info (tooltips, spawn details)
  // without requiring the full debug panel (which needs __VITE_DEBUG__ active)
  const isAdminOrOffline = computed(() => {
    return auth.sessionMode === 'offline' || auth.user?.role === 'admin'
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

  const trainerChance50 = ref(false)
  const forceRival = ref(false)
  const forceGuardian80 = ref(false)
  const debugMultipliers = ref({
    shiny: 1,
    trainer: 1,
    fishing: 1,
    rival: 1
  })

  function register(config: DebugTool) {
    if (tools.value.some(t => t.id === config.id)) return
    tools.value.push(config)
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
    // Preserve existing sub-objects (e.g. .battle from setupBattleDebug).
    // Only add/update the flat tool commands without wiping the whole object.
    if (!window.__VITE_DEBUG__) window.__VITE_DEBUG__ = {}

    // Bind reactive state directly to the window object so static logic can access them
    const debugObj = window.__VITE_DEBUG__ as unknown as Record<string, unknown>
    debugObj.trainerChance50 = trainerChance50.value
    debugObj.forceRival = forceRival.value
    debugObj.forceGuardian80 = forceGuardian80.value
    debugObj.multipliers = debugMultipliers.value

    tools.value.forEach(tool => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.__VITE_DEBUG__![tool.command] = (...args: any[]) => {
        if (securityCheck()) {
          return tool.action(...args)
        }
      }
    })
  }

  async function init() {
    logger.debug('DEBUG', 'Initializing debug tools (Modular)...');
    
    // Synchronous registrations (fastest availability)
    registerStatsTools({ register })
    registerMapTools({ register })
    registerPokeTools({ register })
    registerTimeTools({ register })
    registerItemTools({ register })
    registerBattleTools({ register })
    registerSystemTools({ register })

    updateGlobalProxy()
  }

  watch([trainerChance50, debugMultipliers, forceRival, forceGuardian80], () => {
    updateGlobalProxy()
  }, { deep: true })

  watch(canAccess, () => updateGlobalProxy())

  init()

  return {
    tools,
    canAccess,
    isAdminOrOffline,
    securityCheck,
    register,
    unregister,
    updateGlobalProxy,
    trainerChance50,
    forceRival,
    forceGuardian80,
    debugMultipliers
  }
})
