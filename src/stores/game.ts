import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { supabase } from '@/logic/supabase'
import { INITIAL_STATE } from './gameInitialState'

// Actions Modules
import { useSaveActions } from './game/actions/saveActions'
import { usePokemonActions } from './game/actions/pokemonActions'
import { useTrainerActions } from './game/actions/trainerActions'
import { useBreedingActions } from './game/actions/breedingActions'
import { useTeamActions } from './game/actions/teamActions'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore() as any
  const state = reactive(JSON.parse(JSON.stringify(INITIAL_STATE)))
  
  const db = ref(supabase)
  const isDataLoaded = ref(false)
  const isEngineReady = ref(false)
  const isReady = computed(() => isDataLoaded.value && isEngineReady.value)

  function updateState(newData) {
    if (newData.team && newData.team.length > 0) newData.starterChosen = true
    Object.assign(state, newData)
    console.log('[STORE] Game state updated.');
  }

  function resetToInitial() {
    Object.keys(state).forEach(key => delete state[key])
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
  async function loadGame() {
    const res = await rawLoad()
    if (res.success) {
      isDataLoaded.value = true
      isEngineReady.value = true
    }
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
    saveGame: save // Alias
  }
})
