// [PureVue-Ignore-Length]
import { defineStore } from 'pinia'
import { reactive, ref, computed, watch } from 'vue'
import { saveGame as performSave } from '@/logic/auth/saveService'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'
import { supabase } from '@/logic/supabase'
import { loadBestSave } from '@/logic/auth/loadService'
import { makePokemon, levelUpPokemon } from '@/logic/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { TRAINER_RANKS, MARKET_UNLOCKS } from '@/data/trainer'
import { useEventStore } from './events'
import { useLoadingStore } from './loading'

import { INITIAL_STATE } from './gameInitialState'

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const state = reactive(JSON.parse(JSON.stringify(INITIAL_STATE)))
  
  // Instancia UNIFICADA de base de datos con ruteo inteligente
  const db = ref(supabase)
  const isDataLoaded = ref(false)
  const isEngineReady = ref(false)
  const isReady = computed(() => isDataLoaded.value && isEngineReady.value)

  function updateState(newData) {
    // Legacy fix: if they have a team, they must have chosen a starter
    if (newData.team && newData.team.length > 0) {
      newData.starterChosen = true
    }
    
    Object.assign(state, newData)
    console.log('[STORE] Game loaded successfully. Starter chosen:', state.starterChosen);
  }

  function resetToInitial() {
    Object.keys(state).forEach(key => delete state[key])
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)))
    isDataLoaded.value = false
  }

  async function loadGame() {
    const loadingStore = useLoadingStore()
    loadingStore.start('game_data', 'Cargando datos...', 'Leyendo partida guardada', false)
    
    if (!authStore.user) {
      isDataLoaded.value = true // Nothing to load for guests
      return
    }
    
    const uiStore = useUIStore()
    
    let data, issues, lastSaveId, isNewerThanCloud;
    try {
      // PROMISE RACE CON TIMEOUT DE 8 SEGUNDOS PARA EVITAR CUELGUES EN MÓVILES
      const loadPromise = loadBestSave(authStore.user, db.value)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LOAD_TIMEOUT')), 8000)
      );
      
      const result = await Promise.race([loadPromise, timeoutPromise]);
      data = result.data;
      issues = result.issues;
      lastSaveId = result.lastSaveId;
      isNewerThanCloud = result.isNewerThanCloud;
      
    } catch (error) {
      console.warn('[LOAD] Error o timeout al cargar la partida:', error);
      
      if (error.message === 'LOAD_TIMEOUT') {
        if (!navigator.onLine) {
          loadingStore.setProgress('game_data', 'Sin conexión a Internet', 'Esperando señal para reintentar...');
          
          window.addEventListener('online', () => {
            window.location.reload();
          }, { once: true });
          
          return;
        } else {
          loadingStore.setProgress('game_data', 'Red inestable...', 'Reconectando al servidor...');
          window.location.reload();
          return;
        }
      }
    }
    
    if (data) {
      updateState(data)
      authStore.user.last_save_id = lastSaveId
      
      if (issues && issues.length > 0) {
        console.warn('[LOAD] Saneamiento realizado:', issues)
        uiStore.notify('Partida saneada y cargada', '🛡️')
      } else {
        uiStore.notify(`¡Bienvenido, ${state.trainer || authStore.user.user_metadata?.username}!`, '👋')
      }

      // Notificar migración V2 si aplica
      if (authStore.user.db_version < 2) {
        uiStore.notify('Cuenta actualizada a Seguridad v2', '✨')
        authStore.user.db_version = 2
      }

      if (isNewerThanCloud) {
        uiStore.notify('Sincronizando progreso local más reciente...', '🔄')
        setTimeout(() => save(false), 3000)
      }
    } else {
      console.log('[LOAD] No save found for user. Starting fresh.');
    }
    
    isDataLoaded.value = true
    loadingStore.finish('game_data')
  }

  async function save(showNotif = true) {
    if (!authStore.user) return
    
    // Si estamos en modo Online pero se perdió la conexión, BLOQUEAR guardado
    if (authStore.sessionMode === 'online' && authStore.connectionLost) {
      console.warn('[GameStore] Guardado bloqueado por falta de conexión en modo Online.')
      return
    }

    const uiStore = useUIStore()
    const notifyFn = uiStore.notify
    const result = await performSave(state, authStore.user, { 
      showNotif, 
      notifyFn, 
      db: db.value,
      userVersion: authStore.user.db_version,
      lastSaveId: authStore.user.last_save_id
    })

    if (result && result.migrated) {
      authStore.user.db_version = 2
    }

    if (result && result.lastSaveId) {
      authStore.user.last_save_id = result.lastSaveId
    }

    if (result && result.rollback) {
      if (result.outOfSync) {
        notifyFn('Desincronización detectada. Restaurando...', '🔄')
      }
      
      // Reload everything from server
      const { data: freshSave } = await db.value.from('game_saves').select('save_data, last_save_id').eq('user_id', authStore.user.id).single()
      if (freshSave) {
        updateState(freshSave.save_data)
        authStore.user.last_save_id = freshSave.last_save_id
      }
    }
  }

  function registerPokedex(id, caught = false) {
    if (!state.seenPokedex.includes(id)) state.seenPokedex.push(id)
    if (caught && !state.pokedex.includes(id)) state.pokedex.push(id)
  }

  /**
   * Schedules a save operation (deferred).
   */
  function scheduleSave() {
    save(false) // For now, direct save without notification.
  }

  async function chooseStarter(id) {
    const loadingStore = useLoadingStore()
    loadingStore.start('choose_starter', 'Preparando aventura...', 'Asignando primer compañero', true)
    
    const uiStore = useUIStore()
    const starter = makePokemon(id, 5)
    
    // Use the new centralized addPokemon
    addPokemon(starter, { notify: false })
    
    state.starterChosen = true
    uiStore.activeTab = 'map'
    
    const speciesData = pokemonDataProvider.getPokemonData(id)
    uiStore.notify(`¡${speciesData.name} es tu compañero! ¡Buena suerte!`, '🎉')
    
    // Guardado inmediato
    await save(false)
    loadingStore.finish('choose_starter')
  }

  /**
   * Adds a pokemon to the player's collection (team or box).
   * @param {Object} pokemon - The pokemon instance to add.
   * @param {Object} options - { silent: boolean, notify: boolean }
   */
  function addPokemon(pokemon, options = { notify: true }) {
    if (!pokemon) return false

    // 1. Pokedex Registration
    registerPokedex(pokemon.id, true)

    // 2. Determine target (Team if < 6, else Box)
    let target = 'team'
    if (state.team.length < 6) {
      state.team.push(pokemon)
    } else {
      state.box = state.box || []
      state.box.push(pokemon)
      target = 'box'
    }

    // 3. UI Notification
    if (options.notify) {
      const location = target === 'team' ? 'tu equipo' : 'la Caja PC'
      useUIStore().notify(`¡${pokemon.name} se unió a ${location}!`, '✨')
    }

    scheduleSave()
    autoFillPvpTeam()
    autoFillWarTeam()
    return { success: true, target }
  }

  /**
   * Automatically fills the PVP team (3 slots) using references from Team or Box.
   */
  function autoFillPvpTeam() {
    const uiStore = useUIStore()
    if (uiStore.pvpAutoFillDisabled) return
    
    // Collect all available pokemons
    const allPokes = [...state.team, ...(state.box || [])]
    if (allPokes.length === 0) {
      state.pvpTeam = []
      return
    }

    // Clean up pvpTeam from non-existent UIDs
    const existingUids = new Set(allPokes.map(p => p.uid))
    const oldPvp = [...(state.pvpTeam || [])]
    state.pvpTeam = (state.pvpTeam || []).filter(uid => existingUids.has(uid))

    // If total count < 3, just add whatever we have
    // If total count >= 3, ensure we have 3
    const targetCount = Math.min(3, allPokes.length)

    if (state.pvpTeam.length < targetCount) {
      console.log('[PvP] Auto-filling slots...', { current: state.pvpTeam.length, target: targetCount })
      for (const p of allPokes) {
        if (state.pvpTeam.length >= targetCount) break
        if (!state.pvpTeam.includes(p.uid)) {
          state.pvpTeam.push(p.uid)
        }
      }
    }
    
    // Ensure no more than 3
    if (state.pvpTeam.length > 3) {
      state.pvpTeam = state.pvpTeam.slice(0, 3)
    }

    if (JSON.stringify(oldPvp) !== JSON.stringify(state.pvpTeam)) {
      console.log('[PvP] Team updated:', state.pvpTeam)
    }
  }

  /**
   * Automatically fills the War team using references from Team or Box.
   */
  function autoFillWarTeam() {
    const allPokes = [...state.team, ...(state.box || [])]
    if (allPokes.length === 0) {
      state.warTeam = []
      return
    }

    // Clean up warTeam from non-existent UIDs
    const existingUids = new Set(allPokes.map(p => p.uid))
    state.warTeam = (state.warTeam || []).filter(uid => existingUids.has(uid))

    // Target count is dynamic based on warSlots
    const targetCount = Math.min(state.warSlots || 6, allPokes.length)

    if (state.warTeam.length < targetCount) {
      for (const p of allPokes) {
        if (state.warTeam.length >= targetCount) break
        if (!state.warTeam.includes(p.uid)) {
          state.warTeam.push(p.uid)
        }
      }
    }
    
    // Ensure no more than capacity
    if (state.warTeam.length > (state.warSlots || 6)) {
      state.warTeam = state.warTeam.slice(0, state.warSlots || 6)
    }
  }

  function swapWarSlot(slotIndex, newPokemonUid) {
    const maxSlots = state.warSlots || 6
    if (slotIndex < 0 || slotIndex >= maxSlots) return
    
    const allPokes = [...state.team, ...(state.box || [])]
    const exists = allPokes.some(p => p.uid === newPokemonUid)
    const warTeam = state.warTeam || []
    const alreadyIn = warTeam.includes(newPokemonUid)

    if (exists && !alreadyIn) {
      if (!state.warTeam) state.warTeam = []
      state.warTeam[slotIndex] = newPokemonUid
      save(false)
    }
  }

  function swapPvpSlot(slotIndex, newPokemonUid) {
    if (slotIndex < 0 || slotIndex >= 3) return
    
    // Check if pokemon exists and is not already in PVP team
    const allPokes = [...state.team, ...(state.box || [])]
    const exists = allPokes.some(p => p.uid === newPokemonUid)
    const pvpTeam = state.pvpTeam || []
    const alreadyIn = pvpTeam.includes(newPokemonUid)

    if (exists && !alreadyIn) {
      if (!state.pvpTeam) state.pvpTeam = []
      state.pvpTeam[slotIndex] = newPokemonUid
      save(false)
    }
  }

  /**
   * Removes a pokemon from the collection.
   * @param {String} uid - The unique ID of the pokemon.
   */
  function removePokemon(uid) {
    const teamIdx = state.team.findIndex(p => p.uid === uid)
    if (teamIdx !== -1) {
      state.team.splice(teamIdx, 1)
      autoFillPvpTeam()
      scheduleSave()
      return true
    }
    const boxIdx = state.box.findIndex(p => p.uid === uid)
    if (boxIdx !== -1) {
      state.box.splice(boxIdx, 1)
      autoFillPvpTeam()
      autoFillWarTeam()
      scheduleSave()
      return true
    }
    return false
  }

  function getTrainerRank() {
    const idx = Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1)
    return TRAINER_RANKS[idx]
  }

  function addTrainerExp(amount) {
    const uiStore = useUIStore()
    const eventStore = useEventStore()
    const evBonus = (eventStore.globalMultipliers?.exp || 1) - 1
    const totalMult = 1 + evBonus
    if (totalMult > 1) amount = Math.round(amount * totalMult)
    
    state.trainerExp += amount
    const MAX_LEVEL = 30
    
    let currentRank = getTrainerRank()
    let leveledUp = false

    while (state.trainerExp >= currentRank.expNeeded && state.trainerLevel < MAX_LEVEL) {
      state.trainerExp -= currentRank.expNeeded
      state.trainerLevel++
      leveledUp = true
      
      currentRank = getTrainerRank()
      uiStore.notify(`¡Subiste al rango ${currentRank.title}! Nivel ${state.trainerLevel}`, '⭐')
      
      const unlocks = MARKET_UNLOCKS[state.trainerLevel]
      if (unlocks) {
        setTimeout(() => uiStore.notify(`¡Nuevos items en el Poké Market!`, '🛒'), 1500)
      }
    }

    if (leveledUp) {
      // Logic to check class unlocks could go here
    }
    
    scheduleSave()
  }

  /**
   * Checks if a pokemon should level up and processes the increase.
   * @param {Object} pokemon - The pokemon instance.
   */
  function checkLevelUp(pokemon) {
    const uiStore = useUIStore()
    const learnQueue = []

    while (pokemon.exp >= pokemon.expNeeded && pokemon.level < 100) {
      pokemon.exp -= pokemon.expNeeded
      const pendingMoves = levelUpPokemon(pokemon)
      
      if (pendingMoves === null) break // Blocked by Everstone

      uiStore.notify(`¡${pokemon.name} subió al nivel ${pokemon.level}!`, '📈')
      
      if (pendingMoves.length > 0) {
        pendingMoves.forEach(m => learnQueue.push({ pokemon, move: m }))
      }

      // Trigger evolution check if needed
      // (Legacy did this inside levelUpPokemon, but we might want to defer it to EvolutionScene)
    }

    if (learnQueue.length > 0) {
      // In a pure Vue way, we should have a MoveLearningModal
      // For now, we'll notify or handle it via uiStore
      uiStore.addToLearnQueue(learnQueue)
    }

    scheduleSave()
  }

  function hatchEggs() {
    if (!state.eggs || state.eggs.length === 0) return false
    let anyReady = false
    const eventStore = useEventStore()
    const evHatchMult = (eventStore.globalMultipliers?.hatch || 1) - 1
    const hatchMult = 1 + evHatchMult
    
    state.eggs.forEach(egg => {
      if (!egg.ready && typeof egg.steps === 'number' && egg.steps > 0) {
        egg.steps -= hatchMult
        if (egg.steps <= 0) {
          egg.steps = 0
          egg.ready = true
          anyReady = true
          useUIStore().notify('¡Un Huevo Pokémon está listo para eclosionar!', '🥚')
        }
      }
    })
    return anyReady
  }

  /**
   * Formalizes the hatching of an egg into a real Pokémon.
   * @param {Object} egg - The egg data from the inventory.
   */
  async function executeHatch(egg) {
    const { recalcPokemonStats } = await import('@/logic/pokemonFactory')
    
    // 1. Transform egg genes into a real Pokémon
    const p = makePokemon(egg.id, 1, {
      isShiny: egg.isShiny,
      isGuardian: egg.isGuardian,
      nature: egg.nature,
      abilitySlot: egg.abilitySlot,
      gender: egg.gender // Inherited gender if exists
    })

    // 2. Apply inherited traits
    p.ivs = { ...p.ivs, ...egg.ivs }
    if (egg.movesAtBirth) {
      p.moves = egg.movesAtBirth.map(mName => {
        const mData = pokemonDataProvider.getMoveData(mName) || {}
        return { name: mName, pp: mData.pp || 35, maxPP: mData.pp || 35 }
      })
    }
    p.obtainedMethod = 'egg'
    recalcPokemonStats(p)
    p.hp = p.maxHp

    // 3. Remove egg from inventory
    state.eggs = state.eggs.filter(e => e.uid !== egg.uid)

    // 4. Add new Pokemon to team/box
    addPokemon(p, { notify: false })

    await save(false)
    return p
  }

  async function claimAsset(claimId) {
    if (!authStore.user) return false
    
    try {
      const { data, error } = await db.value.rpc('claim_asset_v2', {
        p_claim_id: claimId
      })
      
      if (error) throw error
      
      if (data) {
        updateState(data)
        
        // Remove from local queue
        state.claimQueue = state.claimQueue.filter(c => c.id !== claimId)
        return true
      }
    } catch (e) {
      console.error('[CLAIM ERROR]', e)
      useUIStore().notify('Error al reclamar activo', '❌')
      return false
    }
  }

  async function fetchClaimQueue() {
    if (!authStore.user || authStore.sessionMode === 'offline') return
    
    const { data, error } = await db.value.from('claim_queue')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: true })
      
    if (!error) {
      state.claimQueue = data || []
    }
  }

  function getMaxObeyLevel() {
    const badges = state.defeatedGyms?.length || 0
    if (badges >= 8) return 100
    if (badges >= 7) return 75
    if (badges >= 6) return 65
    if (badges >= 5) return 55
    if (badges >= 4) return 45
    if (badges >= 3) return 35
    if (badges >= 2) return 30
    if (badges >= 1) return 25
    return 20
  }

  function reorderTeam(draggedIndex, targetIndex) {
    if (draggedIndex === targetIndex) return
    const newTeam = [...state.team]
    const [moved] = newTeam.splice(draggedIndex, 1)
    newTeam.splice(targetIndex, 0, moved)
    state.team = newTeam
    save(false)
  }

  function reorderPvpTeam(draggedIndex, targetIndex) {
    if (draggedIndex === targetIndex) return
    const newPvpTeam = [...(state.pvpTeam || [])]
    const [moved] = newPvpTeam.splice(draggedIndex, 1)
    newPvpTeam.splice(targetIndex, 0, moved)
    state.pvpTeam = newPvpTeam
    save(false)
  }

  function reorderWarTeam(draggedIndex, targetIndex) {
    if (draggedIndex === targetIndex) return
    const newWarTeam = [...(state.warTeam || [])]
    const [moved] = newWarTeam.splice(draggedIndex, 1)
    newWarTeam.splice(targetIndex, 0, moved)
    state.warTeam = newWarTeam
    save(false)
  }

  function reorderMoves(pokemon, fromIndex, toIndex) {
    if (fromIndex === toIndex || !pokemon || !pokemon.moves) return
    const newMoves = [...pokemon.moves]
    const [moved] = newMoves.splice(fromIndex, 1)
    newMoves.splice(toIndex, 0, moved)
    pokemon.moves = newMoves
    save(false)
  }

  function sendToBox(index) {
    if (state.team.length <= 1) {
      useUIStore().notify('No puedes quedarte sin Pokémon en el equipo.', '⚠️')
      return false
    }
    const p = state.team[index]
    
    // Heal on storage
    p.hp = p.maxHp
    p.status = null
    p.sleepTurns = 0
    p.moves?.forEach(m => { m.pp = m.maxPP })

    state.team.splice(index, 1)
    state.box.push(p)
    useUIStore().notify(`¡${p.name} fue enviado a la Caja PC!`, '📦')
    autoFillPvpTeam()
    autoFillWarTeam()
    save(false)
    return true
  }

  // --- WATCHERS (Emergency Triggers) ---
  watch(() => state.team.length, (newLen, oldLen) => {
    // If a pokemon was added to the team, and there are empty PVP slots, fill them.
    if (newLen > oldLen && state.pvpTeam.length < 3) {
      autoFillPvpTeam()
    }
  })

  watch(() => state.pvpTeam, (newTeam) => {
    console.log('[PvP] state.pvpTeam mutation detected:', newTeam)
  }, { deep: true })

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
    executeHatch,
    saveGame: save // Alias for backward compatibility
  }
})
