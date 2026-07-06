// fallow-ignore-file circular-dependencies
import { defineStore } from 'pinia'
import { reactive, ref, computed, watch, type Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth.ts'
import { supabase } from '@/logic/db/supabase'
import { INITIAL_STATE } from '@/stores/gameInitialState.ts'
import type { GameState } from '@/types/system/game'


// Actions Modules
import { useSaveActions } from '@/stores/game/actions/saveActions.ts'
import { usePokemonActions } from '@/stores/game/actions/pokemonActions.ts'
import { useTrainerActions } from '@/stores/game/actions/trainerActions.ts'
import { useBreedingActions } from '@/stores/game/actions/breedingActions.ts'
import { useTeamActions } from '@/stores/game/actions/teamActions.ts'

import { DBRouter } from '@/logic/db/dbRouter'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const state = reactive<GameState>(JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState)
  
  const db = ref<DBRouter>(supabase)
  const isDataLoaded = ref(false)
  const isEngineReady = ref(false)
  const isSaveLocked = ref(false)
  const isReady = computed(() => isDataLoaded.value && isEngineReady.value)
  const isSandboxActive = ref(false)
  const realStateBackup = ref<GameState | null>(null)

  function updateState(newData: Partial<GameState>) {
    if (newData.team && newData.team.length > 0) newData.starterChosen = true
    Object.assign(state, newData)
    // Standard state updates
    logger.debug('STORE', 'Game state updated.')
  }

  // --- ACTIONS INITIALIZATION ---
  
  // 1. Save Actions (Basics needed for others)
  const { loadGame: rawLoad, save, scheduleSave, claimAsset, fetchClaimQueue } = useSaveActions(
    state, 
    authStore, 
    db as Ref<DBRouter>, 
    updateState, 
    isSandboxActive
  )

  // 2. Team Actions (Special teams management)
  const { autoFillPvpTeam, swapPvpSlot, reorderPvpTeam, autoFillWarTeam, swapWarSlot, reorderWarTeam } = useTeamActions(state, scheduleSave)

  // 3. Pokemon Actions
  const { registerPokedex, chooseStarter, addPokemon, removePokemon, reorderTeam, reorderMoves, sendToBox, togglePokeTag, sanitizeAll } = usePokemonActions(state, scheduleSave, autoFillPvpTeam, autoFillWarTeam)

  // 4. Trainer Actions
  const { addTrainerExp, checkLevelUp } = useTrainerActions(state, scheduleSave)

  // 5. Breeding Actions
  const { executeHatch } = useBreedingActions(state, scheduleSave, addPokemon)

  // Wrapper for LoadGame to manage local state
  async function loadGame(): Promise<void> {
    const res = await rawLoad()

    if (res.success) {
      // Sync time ONLY after successful load/auth
      const { syncServerTime } = await import('@/logic/utils/timeUtils')
      await syncServerTime()
      
      isDataLoaded.value = true
      isEngineReady.value = true
      
      // Sanitize all pokemon to update types/metadata from DB
      sanitizeAll()

      // Clear expired routes
      checkRouteExpirations()


      // Initialize Session Hub for multi-tab/device locking
      if (authStore.user) {
        const { initSessionHub } = await import('@/logic/auth/sessionHub')
        initSessionHub(authStore.user.id)
        
        window.addEventListener('pv-save-lock', () => {
          isSaveLocked.value = true
        })

        window.addEventListener('pv-save-unlock', () => {
          isSaveLocked.value = false
        })

        // Cargar datos sociales y notificar solicitudes pendientes al iniciar sesión
        import('@/stores/social/social.ts').then(async ({ useSocialStore }) => {
          const socialStore = useSocialStore()
          await socialStore.loadSocialData()
          if (socialStore.pendingRequests.length > 0) {
            const { useUIStore } = await import('./ui.ts')
            const uiStore = useUIStore()
            uiStore.notify(`¡Tenés ${socialStore.pendingRequests.length} solicitud(es) de amistad pendiente(s)!`, '🤝')
          }
        }).catch(err => {
          logger.error('Social', `Error al cargar notificaciones iniciales: ${(err as Error).message}`)
        })
      }
    }
  }

  function checkRouteExpirations(): void {
    if (!state.classData) return
    const now = Temporal.Now.instant().epochMilliseconds

    let changed = false

    // 1. Rocket: limpiar extortedRouteId cuando pasan las 24h activas.
    //    El timestamp se limpia cuando pasan las 24h COMPLETAS (permite re-extorsionar).
    if (state.classData.extortedRouteTimestamp) {
      const timestamp = Number(state.classData.extortedRouteTimestamp)
      if ((now - timestamp) > 24 * 3600 * 1000) {
        logger.info('CLASS', `Extortion cooldown fully expired. Clearing.`)
        state.classData.extortedRouteId = null
        state.classData.extortedRouteTimestamp = null
        changed = true
      }
    }

    // 2. Trainer: limpiar officialRouteId cuando pasan los 30min activos.
    //    El timestamp persiste otras 23.5h para el cooldown de 24h.
    //    Cuando pasan las 24h COMPLETAS desde el timestamp, también limpiamos el timestamp.
    if (state.classData.officialRouteTimestamp) {
      const timestamp = Number(state.classData.officialRouteTimestamp)
      if (state.classData.officialRouteId && (now - timestamp) > 30 * 60 * 1000) {
        logger.info('CLASS', `Official route patrol finished. Clearing active ID.`)
        state.classData.officialRouteId = null
        changed = true
      }
      if ((now - timestamp) > 24 * 3600 * 1000) {
        // Cooldown completo de 24h: liberar el timestamp para permitir nuevo establecimiento
        state.classData.officialRouteTimestamp = null
        changed = true
      }
    }

    if (changed) {
      scheduleSave()
    }
  }

  async function reclaimControl() {
    const { reclaimControl: rawReclaim } = await import('@/logic/auth/sessionHub')
    await rawReclaim()
    isSaveLocked.value = false
  }

  function enterSandboxMode() {
    if (isSandboxActive.value) return
    realStateBackup.value = JSON.parse(JSON.stringify(state)) as GameState
    
    // Limpiar el estado actual y cargar el guardado del sandbox si existe
    Object.keys(state).forEach(key => {
      delete (state as Record<string, unknown>)[key]
    })
    
    let initialSandbox = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pvs_sandbox_save')
      if (saved) {
        try {
          initialSandbox = JSON.parse(saved) as GameState
        } catch (e) {
          logger.error('SANDBOX', 'Error parsing sandbox save, using initial state:', e)
        }
      }
    }
    
    Object.assign(state, initialSandbox)
    isSandboxActive.value = true
    logger.info('SANDBOX', 'Modo Sandbox activado para Test Aventura. Partida real respaldada.')
  }

  function exitSandboxMode() {
    if (!isSandboxActive.value) return
    
    // Guardar el estado del sandbox localmente antes de salir
    if (typeof window !== 'undefined') {
      localStorage.setItem('pvs_sandbox_save', JSON.stringify(state))
    }
    
    // Limpiar y restaurar la partida real
    Object.keys(state).forEach(key => {
      delete (state as Record<string, unknown>)[key]
    })
    
    if (realStateBackup.value) {
      Object.assign(state, realStateBackup.value)
      realStateBackup.value = null
    } else {
      Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)))
    }
    
    isDataLoaded.value = false // Reset data loaded so real save gets fetched when entering normal game
    isSandboxActive.value = false
    logger.info('SANDBOX', 'Modo Sandbox desactivado. Partida real restaurada.')
  }

  const dailyGuardianCaptures = computed(() => {
    const today = Temporal.Now.plainDateISO().toString()
    const captures = state.guardianCaptures || {}
    return Object.entries(captures)
      .filter(([_, date]) => date === today)
      .map(([mapId]) => mapId)
  })

  // --- WATCHERS ---
  watch(() => state.team.length, (newLen, oldLen) => {
    if (newLen > oldLen && state.pvpTeam.length < 3) autoFillPvpTeam()
  })

  return {
    state,
    db,
    dailyGuardianCaptures,
    updateState,
    registerPokedex,
    scheduleSave,
    claimAsset,
    fetchClaimQueue,
    loadGame,
    save,
    isDataLoaded,
    isEngineReady,
    isReady,
    isSaveLocked,
    chooseStarter,
    addTrainerExp,
    checkLevelUp,
    reorderTeam,
    reorderPvpTeam,
    reorderWarTeam,
    reorderMoves,
    sendToBox,
    addPokemon,
    removePokemon,
    autoFillPvpTeam,
    swapPvpSlot,
    swapWarSlot,
    togglePokeTag,
    executeHatch,
    reclaimControl,
    saveGame: save, // Alias
    enterSandboxMode,
    exitSandboxMode,
    checkRouteExpirations
  }
})

if (typeof window !== 'undefined') {
  (window as Window & { __VITE_DEBUG_GAME_STORE_RESOLVER__?: () => ReturnType<typeof useGameStore> }).__VITE_DEBUG_GAME_STORE_RESOLVER__ = () => useGameStore()
}
