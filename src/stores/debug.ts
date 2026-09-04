import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'
import { useBattleStore } from './battle/battle.ts'
import { useMapStore } from './map.ts'
import { pokemonDebugService } from '@/logic/debug/pokemonDebugService'
import { testResetShowdownWorker } from '@/logic/battle/showdownWorkerClient'

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
  action: (...args: never[]) => unknown
  label?: string
  category?: string
  description?: string
}

export interface DebugSystem {
  register: (config: DebugTool) => void
  unregister?: (id: string) => void
}


export const useDebugStore = defineStore('debug', () => {
  const auth = useAuthStore()
  const game = useGameStore()

  const tools = ref<DebugTool[]>([])

  const isE2E = (typeof window !== 'undefined' && Boolean((window as { __E2E__?: boolean }).__E2E__)) ||
                (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');

  const canAccess = computed(() => {
    return isE2E || auth.sessionMode === 'offline';
  })

  // True for offline mode OR online admins — used to show advanced info (tooltips, spawn details)
  // without requiring the full debug panel (which needs __VITE_DEBUG__ active)
  const isAdminOrOffline = computed(() => {
    return isE2E || auth.sessionMode === 'offline' || auth.user?.role === 'admin';
  })

  function securityCheck() {
    if (isE2E) return true;
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
  const forceShiny100 = ref(false)

  // Configurable Spawn & Minigames Rates (null = default game calculation)
  const forceEncounterType = ref<'none' | 'wild' | 'trainer' | 'rival' | 'fishing' | 'archaeology'>('none')
  const shinyRateOverride = ref<number | null>(null)
  const trainerChancePct = ref<number | null>(null)
  const rivalChancePct = ref<number | null>(null)
  const guardianChancePct = ref<number | null>(null)
  const defenderChancePct = ref<number | null>(null)
  const fishingChancePct = ref<number | null>(null)
  const archaeologyChancePct = ref<number | null>(null)

  const debugMultipliers = ref({
    shiny: 1,
    trainer: 1,
    fishing: 1,
    rival: 1
  })

  function resetSpawnDefaults() {
    forceEncounterType.value = 'none'
    shinyRateOverride.value = null
    trainerChancePct.value = null
    rivalChancePct.value = null
    guardianChancePct.value = null
    defenderChancePct.value = null
    fishingChancePct.value = null
    archaeologyChancePct.value = null
    trainerChance50.value = false
    forceRival.value = false
    forceGuardian80.value = false
    forceShiny100.value = false
    updateGlobalProxy()
  }

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
    if (window.__VITE_DEBUG__) {
      Reflect.set(window.__VITE_DEBUG__, 'trainerChance50', trainerChance50.value || trainerChancePct.value === 50)
      Reflect.set(window.__VITE_DEBUG__, 'forceRival', forceRival.value || rivalChancePct.value === 100)
      Reflect.set(window.__VITE_DEBUG__, 'forceGuardian80', forceGuardian80.value || guardianChancePct.value === 80)
      Reflect.set(window.__VITE_DEBUG__, 'forceShiny100', forceShiny100.value || shinyRateOverride.value === 1)
      Reflect.set(window.__VITE_DEBUG__, 'shinyRateOverride', shinyRateOverride.value)
      Reflect.set(window.__VITE_DEBUG__, 'trainerChancePct', trainerChancePct.value)
      Reflect.set(window.__VITE_DEBUG__, 'rivalChancePct', rivalChancePct.value)
      Reflect.set(window.__VITE_DEBUG__, 'guardianChancePct', guardianChancePct.value)
      Reflect.set(window.__VITE_DEBUG__, 'defenderChancePct', defenderChancePct.value)
      Reflect.set(window.__VITE_DEBUG__, 'fishingChancePct', fishingChancePct.value)
      Reflect.set(window.__VITE_DEBUG__, 'archaeologyChancePct', archaeologyChancePct.value)
      Reflect.set(window.__VITE_DEBUG__, 'forceEncounterType', forceEncounterType.value === 'none' ? undefined : forceEncounterType.value)
      Reflect.set(window.__VITE_DEBUG__, 'multipliers', debugMultipliers.value)
    }

    // Exponer stores y utilidades de depuración requeridas por las simulaciones E2E
    Reflect.set(window.__VITE_DEBUG__, 'useBattleStore', useBattleStore)
    Reflect.set(window.__VITE_DEBUG__, 'useGameStore', useGameStore)
    Reflect.set(window.__VITE_DEBUG__, 'useMapStore', useMapStore)
    Reflect.set(window.__VITE_DEBUG__, 'testResetShowdownWorker', testResetShowdownWorker)
    Reflect.set(window.__VITE_DEBUG__, 'pokemonDebugService', pokemonDebugService)

    tools.value.forEach(tool => {
      window.__VITE_DEBUG__![tool.command] = (...args: unknown[]) => {
        if (securityCheck()) {
          const fn = tool.action as (...a: unknown[]) => unknown
          return fn(...args)
        }
        return undefined
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

  watch([
    trainerChance50,
    debugMultipliers,
    forceRival,
    forceGuardian80,
    forceShiny100,
    forceEncounterType,
    shinyRateOverride,
    trainerChancePct,
    rivalChancePct,
    guardianChancePct,
    defenderChancePct,
    fishingChancePct,
    archaeologyChancePct
  ], () => {
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
    forceShiny100,
    forceEncounterType,
    shinyRateOverride,
    trainerChancePct,
    rivalChancePct,
    guardianChancePct,
    defenderChancePct,
    fishingChancePct,
    archaeologyChancePct,
    resetSpawnDefaults,
    debugMultipliers
  }
})
