// fallow-ignore-file circular-dependencies
import { defineStore } from 'pinia'
import { reactive, ref, computed, watch, type Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from './auth.ts'
import { supabase } from '@/logic/supabase'
import { INITIAL_STATE } from './gameInitialState.ts'
import type { GameState } from '@/types/game'


// Actions Modules
import { useSaveActions } from './game/actions/saveActions.ts'
import { usePokemonActions } from './game/actions/pokemonActions.ts'
import { useTrainerActions } from './game/actions/trainerActions.ts'
import { useBreedingActions } from './game/actions/breedingActions.ts'
import { useTeamActions } from './game/actions/teamActions.ts'

import { DBRouter } from '@/logic/db/dbRouter'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const state = reactive<GameState>(JSON.parse(JSON.stringify(INITIAL_STATE)))
  
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

  function resetToInitial() {
    Object.keys(state).forEach(key => {
      delete (state as Record<string, unknown>)[key]
    })
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)))
    isDataLoaded.value = false
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
  const { getTrainerRank, addTrainerExp, checkLevelUp, getMaxObeyLevel } = useTrainerActions(state, scheduleSave)

  // 5. Breeding Actions
  const { hatchEggs, executeHatch } = useBreedingActions(state, scheduleSave, addPokemon)

  // Wrapper for LoadGame to manage local state
  async function loadGame(): Promise<void> {
    const res = await rawLoad()

    if (res.success) {
      // Sync time ONLY after successful load/auth
      const { syncServerTime } = await import('@/logic/timeUtils')
      await syncServerTime()
      
      isDataLoaded.value = true
      isEngineReady.value = true
      
      // Sanitize all pokemon to update types/metadata from DB
      sanitizeAll()
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
        import('./social.ts').then(async ({ useSocialStore }) => {
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

  async function reclaimControl() {
    const { reclaimControl: rawReclaim } = await import('@/logic/auth/sessionHub')
    await rawReclaim()
    isSaveLocked.value = false
  }

  function enterSandboxMode() {
    if (isSandboxActive.value) return
    realStateBackup.value = JSON.parse(JSON.stringify(state))
    
    // Limpiar el estado actual y cargar el guardado del sandbox si existe
    Object.keys(state).forEach(key => {
      delete (state as Record<string, unknown>)[key]
    })
    
    let initialSandbox = JSON.parse(JSON.stringify(INITIAL_STATE))
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pvs_sandbox_save')
      if (saved) {
        try {
          initialSandbox = JSON.parse(saved)
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

  // --- WATCHERS ---
  watch(() => state.team.length, (newLen, oldLen) => {
    if (newLen > oldLen && state.pvpTeam.length < 3) autoFillPvpTeam()
  })

  return {
    state,
    db,
    updateState,
    resetToInitial,
    registerPokedex,
    scheduleSave,
    hatchEggs,
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
    getTrainerRank,
    getMaxObeyLevel,
    reorderTeam,
    reorderPvpTeam,
    reorderWarTeam,
    reorderMoves,
    sendToBox,
    addPokemon,
    removePokemon,
    autoFillPvpTeam,
    swapPvpSlot,
    autoFillWarTeam,
    swapWarSlot,
    togglePokeTag,
    executeHatch,
    reclaimControl,
    saveGame: save, // Alias
    isSandboxActive,
    enterSandboxMode,
    exitSandboxMode
  }
})
