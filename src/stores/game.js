import { defineStore } from 'pinia'
import { reactive, watch, computed } from 'vue'
import { saveGame as performSave } from '@/logic/auth/saveService'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'
import { supabase } from '@/logic/supabase'
import { DBRouter } from '@/logic/db/dbRouter'

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
  isReady: false,
  uiSelection: {
    teamRocketMode: false,
    teamRocketSelected: [],
    teamReleaseMode: false,
    teamReleaseSelected: [],
    boxRocketMode: false,
    boxRocketSelected: [],
    boxReleaseMode: false,
    boxReleaseSelected: [],
    isOverlayLoading: false,
    overlayMessage: 'Cargando...'
  }
}

export const useGameStore = defineStore('game', () => {
  const authStore = useAuthStore()
  const state = reactive(JSON.parse(JSON.stringify(INITIAL_STATE)))
  
  // Instancia UNIFICADA de base de datos con ruteo inteligente
  const db = computed(() => {
    return new DBRouter(supabase, authStore.sessionMode)
  })

  // Exponer db globalmente para compatibilidad con scripts legacy si es necesario
  if (typeof window !== 'undefined') {
    window.DBRouter = db.value
  }

  function updateState(newData) {
    Object.assign(state, newData)
  }

  function resetToInitial() {
    Object.keys(state).forEach(key => delete state[key])
    Object.assign(state, JSON.parse(JSON.stringify(INITIAL_STATE)))
  }

  /**
   * Sincroniza el store global de Vue con el estado interno del motor legacy.
   */
  function syncFromLegacy(legacyState) {
    if (!legacyState) return
    
    const props = Object.keys(INITIAL_STATE)
    
    props.forEach(prop => {
      if (legacyState[prop] !== undefined) {
        const val = legacyState[prop]
        if (Array.isArray(val)) {
          state[prop] = [...val]
        } else if (val !== null && typeof val === 'object') {
          state[prop] = { ...val }
        } else {
          state[prop] = val
        }
      }
    })

    if (legacyState.trainer) state.trainer = legacyState.trainer
    if (legacyState.trainerLevel !== undefined) state.level = legacyState.trainerLevel
    if (legacyState.trainerExp !== undefined) state.exp = legacyState.trainerExp
    if (legacyState.trainerExpNeeded !== undefined) state.expNeeded = legacyState.trainerExpNeeded
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
    await performSave(state, authStore.user, { showNotif, notifyFn, db: db.value })
  }

  return {
    state,
    db,
    updateState,
    resetToInitial,
    syncFromLegacy,
    save
  }
})
