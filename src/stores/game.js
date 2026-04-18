import { defineStore } from 'pinia'
import { reactive, watch, computed, ref } from 'vue'
import { saveGame as performSave } from '@/logic/auth/saveService'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'
import { supabase } from '@/logic/supabase'
import { DBRouter } from '@/logic/db/dbRouter'
import { loadBestSave } from '@/logic/auth/loadService'
import { makePokemon, levelUpPokemon } from '@/logic/pokemonFactory'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { TRAINER_RANKS, MARKET_UNLOCKS } from '@/data/trainer'

const INITIAL_STATE = {
  trainer: '',
  badges: 0,
  balls: 10,
  money: 3000,
  battleCoins: 0,
  eggs: [],
  trainerChance: 1,
  trainerLevel: 1,
  trainerExp: 0,
  trainerExpNeeded: 100,
  inventory: { 'Poción': 3, 'Pokéball': 10 },
  map: {
    currentMap: 'route1',
    region: 'kanto',
    lastNavigateAt: 0
  },
  team: [],
  box: [],
  pokedex: [],
  seenPokedex: [],
  defeatedGyms: [],
  gymProgress: {},
  lastGymWins: {},
  lastGymAttempts: {},
  battle: null,
  starterChosen: false,
  lastRankedSeason: null,
  nick_style: null,
  avatar_style: null,
  stats: {},
  eloRating: 1000,
  pvpStats: { wins: 0, losses: 0, draws: 0 },
  rankedMaxElo: 1000,
  rankedRewardsClaimed: [],
  activeBattle: null,
  daycare_missions: [],
  daycare_mission_refreshes: 3,
  safariTicketSecs: 0,
  ceruleanTicketSecs: 0,
  articunoTicketSecs: 0,
  mewtwoTicketSecs: 0,
  incenseType: null,
  incenseSecs: 0,
  boxCount: 4,
  chats: {},
  playerClass: null,
  classLevel: 1,
  classXP: 0,
  classData: {
    captureStreak: 0,
    longestStreak: 0,
    reputation: 0,
    blackMarketSales: 0,
    criminality: 0,
    blackMarketDaily: { date: '', items: [], purchased: [] }
  },
  faction: null,
  warCoins: 0,
  warCoinsSpent: 0,
  warDailyCap: {},
  warDailyCoins: {},
  warMyPtsLocal: {},
  notificationHistory: [],
  marketSoldSeenIds: [],
  claimQueue: [],
  isOverlayLoading: false,
  overlayMessage: 'Cargando...',
  isReady: (typeof localStorage !== 'undefined' && !!localStorage.getItem('pokevicio_save_v3_ash'))
}

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const state = reactive(JSON.parse(JSON.stringify(INITIAL_STATE)))
  
  // Instancia UNIFICADA de base de datos con ruteo inteligente
  const db = ref(supabase)

  function updateState(newData) {
    Object.assign(state, newData)
  }

  function resetToInitial() {
    Object.keys(state).forEach(key => delete state[key])
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)))
  }

  async function loadGame() {
    if (!authStore.user) return
    
    const uiStore = useUIStore()
    const { data, issues, lastSaveId, isNewerThanCloud } = await loadBestSave(authStore.user, db.value)
    
    if (data) {
      updateState(data)
      state.isReady = true; // Force ready as soon as data is in
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
        // El guardado se encargará de actualizar la db_version en el próximo ciclo
      }

      if (isNewerThanCloud) {
        uiStore.notify('Sincronizando progreso local más reciente...', '🔄')
        setTimeout(() => save(false), 3000)
      }

      state.isReady = true
    } else {
      state.isOverlayLoading = false
      state.isReady = true // Consider as ready even if empty for new users
    }
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
    const uiStore = useUIStore()
    const starter = makePokemon(id, 5)
    
    state.team = [starter]
    
    // Registrar en Pokedex
    registerPokedex(id, true)
    
    state.starterChosen = true
    uiStore.activeTab = 'team'
    
    const speciesData = pokemonDataProvider.getPokemonData(id)
    uiStore.notify(`¡${speciesData.name} es tu compañero! ¡Buena suerte!`, '🎉')
    
    // Guardado inmediato
    await save(false)
  }

  function getTrainerRank() {
    const idx = Math.min(state.trainerLevel - 1, TRAINER_RANKS.length - 1)
    return TRAINER_RANKS[idx]
  }

  function addTrainerExp(amount) {
    const uiStore = useUIStore()
    // TODO: getEventBonus logic if available
    const evBonus = 1 
    if (evBonus > 1) amount = Math.round(amount * evBonus)
    
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
    const hatchMult = 1 // TODO: Integrar con multiplicadores de eventos/clases
    
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
    save(false)
    return true
  }

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
    chooseStarter,
    addTrainerExp,
    checkLevelUp,
    getTrainerRank,
    getMaxObeyLevel,
    reorderTeam,
    sendToBox
  }
})
