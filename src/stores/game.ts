import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from './auth'
import { supabase } from '@/logic/supabase'
import { INITIAL_STATE } from './gameInitialState'
import type { GameState } from '@/types/game'


// Actions Modules
import { useSaveActions } from './game/actions/saveActions'
import { usePokemonActions } from './game/actions/pokemonActions'
import { useTrainerActions } from './game/actions/trainerActions'
import { useBreedingActions } from './game/actions/breedingActions'
import { useTeamActions } from './game/actions/teamActions'

import type { SupabaseClient } from '@supabase/supabase-js'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const state = reactive<GameState>(JSON.parse(JSON.stringify(INITIAL_STATE)))
  
  const db = ref<SupabaseClient | null>(supabase as any)
  const isDataLoaded = ref(false)
  const isEngineReady = ref(false)
  const isSaveLocked = ref(false)
  const isReady = computed(() => isDataLoaded.value && isEngineReady.value)

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
  const { loadGame: rawLoad, save, scheduleSave, claimAsset, fetchClaimQueue } = useSaveActions(state, authStore, db, updateState)

  // 2. Team Actions (Special teams management)
  const { autoFillPvpTeam, swapPvpSlot, reorderPvpTeam, autoFillWarTeam, swapWarSlot, reorderWarTeam } = useTeamActions(state, scheduleSave)

  // 3. Pokemon Actions
  const { registerPokedex, chooseStarter, addPokemon, removePokemon, reorderTeam, reorderMoves, sendToBox, togglePokeTag } = usePokemonActions(state, scheduleSave, autoFillPvpTeam, autoFillWarTeam)

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
      }
    }
  }

  async function reclaimControl() {
    const { reclaimControl: rawReclaim } = await import('@/logic/auth/sessionHub')
    await rawReclaim()
    isSaveLocked.value = false
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
    saveGame: save // Alias
  }
})
