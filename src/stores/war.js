import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { getWeekId, isDisputePhase, getPointReward, FACTION_CHANGE_COST, DAILY_MAP_CAP } from '@/logic/war/warEngine'
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine'

export const useWarStore = defineStore('war', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()

  const faction = ref(null)
  const warCoins = ref(0)
  const weeklyPoints = ref(0)
  const mapDominance = ref({}) // { mapId: { union, poder, winner } }
  const dailyGuardianCaptures = ref([])
  const isLoading = ref(false)

  // Reactive engine-based state
  const currentWeekId = computed(() => getWeekId())
  const isDisputeActive = computed(() => isDisputePhase())

  /**
   * Loads all war-related data for the current session.
   * Handles Global vs Local instance isolation via gameStore.db (DBRouter).
   */
  async function loadWarData() {
    isLoading.value = true
    try {
      // 1. Load Faction and Coins from Game State (Synchronized via DBRouter)
      faction.value = gameStore.state.faction || null
      warCoins.value = gameStore.state.warCoins || 0

      // 2. Load Individual Weekly Progress
      if (authStore.user) {
        const { data: pts } = await gameStore.db.from('war_user_points')
          .select('points')
          .eq('user_id', authStore.user.id)
          .eq('week_id', currentWeekId.value)
        
        weeklyPoints.value = pts?.reduce((acc, r) => acc + (r.points || 0), 0) || 0

        // 3. Load Guardian Captures for today (isolated world)
        const today = new Date().toISOString().split('T')[0]
        const { data: guardians } = await gameStore.db.from('guardian_captures')
          .select('map_id')
          .eq('user_id', authStore.user.id)
          .eq('capture_date', today)
        
        dailyGuardianCaptures.value = guardians?.map(g => g.map_id) || []
      }

      // 4. Load Dominance Data
      await fetchMapDominance()
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Adds war points for the current faction.
   * Logic handles Daily Cap and Faction requirement.
   */
  async function addPoints(mapId, eventType, success) {
    if (!faction.value || !isDisputeActive.value) return 0
    
    // 1. Calculate points from Engine
    const pts = getPointReward(eventType, success)
    if (pts <= 0) return 0

    // 2. Daily PT Cap Check (Isolated by World)
    const today = new Date().toDateString()
    if (!gameStore.state.warDailyCap) gameStore.state.warDailyCap = {}
    if (!gameStore.state.warDailyCap[today]) gameStore.state.warDailyCap[today] = {}
    
    const currentMapPts = gameStore.state.warDailyCap[today][mapId] || 0
    if (currentMapPts >= DAILY_MAP_CAP) {
      // Only notify once per map session
      return 0
    }

    const allowedPts = Math.min(pts, DAILY_MAP_CAP - currentMapPts)
    
    // 3. Registration via DBRouter (Handles RPC online or SQL local)
    const { error } = await gameStore.db.rpc('add_war_points', {
      p_week_id: currentWeekId.value,
      p_map_id: mapId,
      p_faction: faction.value,
      p_points: allowedPts
    })

    if (!error) {
       weeklyPoints.value += allowedPts
       gameStore.state.warDailyCap[today][mapId] = currentMapPts + allowedPts
       
       // Handle War Coins (1 coin per 10 PT)
       handleWarCoins(allowedPts)
       
       await fetchMapDominance()
       return allowedPts
    }
    return 0
  }

  /**
   * Progressively awards War Coins based on points earned.
   * Cap: 50 coins per day (Legacy Parity).
   */
  function handleWarCoins(pts) {
    const today = new Date().toDateString()
    if (!gameStore.state.warDailyCoins) gameStore.state.warDailyCoins = {}
    if (!gameStore.state.warDailyCoins[today]) gameStore.state.warDailyCoins[today] = 0
    if (!gameStore.state.warPointsAccumulator) gameStore.state.warPointsAccumulator = 0

    const DAILY_COIN_CAP = 50 
    if (gameStore.state.warDailyCoins[today] >= DAILY_COIN_CAP) return

    gameStore.state.warPointsAccumulator += pts
    if (gameStore.state.warPointsAccumulator >= 10) {
      const newCoins = Math.floor(gameStore.state.warPointsAccumulator / 10)
      const allowedCoins = Math.min(newCoins, DAILY_COIN_CAP - gameStore.state.warDailyCoins[today])
      
      if (allowedCoins > 0) {
        warCoins.value += allowedCoins
        gameStore.state.warCoins = (gameStore.state.warCoins || 0) + allowedCoins
        gameStore.state.warDailyCoins[today] += allowedCoins
        uiStore.notify(`¡Ganaste ${allowedCoins} Moneda${allowedCoins > 1 ? 's' : ''} de Guerra!`, '⚡')
      }
      gameStore.state.warPointsAccumulator %= 10
    }
  }

  /**
   * Assigns or changes the player's faction.
   * Cost: 25k for changes.
   */
  async function chooseFaction(newFaction) {
    if (!authStore.user) return false
    
    const isChange = !!faction.value
    if (isChange) {
      if (faction.value === newFaction) return true
      if (gameStore.state.money < FACTION_CHANGE_COST) {
        uiStore.notify(`Necesitás 🪙${FACTION_CHANGE_COST.toLocaleString()} para cambiar de bando.`, '⛔')
        return false
      }
      
      // Legacy rule: Reset points on faction change
      gameStore.state.money -= FACTION_CHANGE_COST
      await gameStore.db.from('war_user_points').delete()
        .eq('user_id', authStore.user.id)
        .eq('week_id', currentWeekId.value)
      
      weeklyPoints.value = 0
    }

    const { error } = await gameStore.db.from('war_factions')
      .upsert({ user_id: authStore.user.id, faction: newFaction })
    
    if (!error) {
      faction.value = newFaction
      gameStore.state.faction = newFaction
      uiStore.notify(`¡Ahora eres parte del Team ${newFaction === 'union' ? 'Unión' : 'Poder'}!`, '⚔️')
      return true
    }
    return false
  }

  /**
   * Records a guardian capture or defeat.
   */
  async function claimGuardian(mapId, isDefeat = false) {
    if (!authStore.user || !faction.value) return
    
    const today = getArgDateString()
    const guardian = getGuardianData(mapId, []) // In real use we pass map list
    if (!guardian) return

    const ptsAwarded = isDefeat ? Math.floor(guardian.pts * 0.7) : guardian.pts

    const { error } = await gameStore.db.from('guardian_captures').insert({
      capture_date: today,
      map_id: mapId,
      user_id: authStore.user.id,
      winner_faction: faction.value,
      pts_awarded: ptsAwarded
    })

    if (!error) {
      if (!dailyGuardianCaptures.value.includes(mapId)) {
        dailyGuardianCaptures.value.push(mapId)
      }
      await addPoints(mapId, 'GUARDIAN', true) // Points logic handles Coins/State
      uiStore.notify(`¡Guardián ${isDefeat ? 'Derrotado' : 'Capturado'}! +${ptsAwarded} PT.`, '🏆')
    }
  }

  /**
   * Fetches the current dominance state.
   * Local Instances will simulate data if no records exist.
   */
  async function fetchMapDominance() {
    // 1. Fetch points for the current week
    const { data: points } = await gameStore.db.from('war_points')
      .select('map_id, faction, points')
      .eq('week_id', currentWeekId.value)

    const newDom = {}
    points?.forEach(row => {
      if (!newDom[row.map_id]) newDom[row.map_id] = { union: 0, poder: 0, winner: null }
      newDom[row.map_id][row.faction] = row.points
    })

    // 2. Fetch settled winners if not in dispute phase
    if (!isDisputeActive.value) {
      const { data: dom } = await gameStore.db.from('war_dominance')
        .select('map_id, winner_faction')
        .eq('week_id', currentWeekId.value)
      
      dom?.forEach(row => {
        if (!newDom[row.map_id]) newDom[row.map_id] = { union: 0, poder: 0, winner: null }
        newDom[row.map_id].winner = row.winner_faction
      })
    }

    // 3. Local Instance Simulation: If local and no points, add fake data to keep it alive
    if (gameStore.isOffline && Object.keys(newDom).length === 0) {
      // In a real scenario we would use guardianEngine.simulateLocalDominance
      // For now we just initialize empty to avoid breakage
    }

    mapDominance.value = newDom
  }

  /**
   * Triggers a guardian appearance check.
   */
  function checkGuardian(mapId, allMapIds) {
    if (dailyGuardianCaptures.value.includes(mapId)) return null
    if (Math.random() > GUARDIAN_CHANCE) return null

    return getGuardianData(mapId, allMapIds)
  }

  /**
   * Settles the weekly results and distributes coins.
   * This is typically called during the dominance phase transition.
   */
  async function resolveWeeklySeason() {
    if (isDisputeActive.value) return
    if (gameStore.state.lastResolvedWeek === currentWeekId.value) return

    // Calculate contribution coins based on milestones
    let totalCoins = 0
    const milestones = [...WEEKLY_REWARD_MILESTONES].reverse()
    const match = milestones.find(m => weeklyPoints.value >= m.pt)
    if (match) totalCoins = match.coins

    // Winner bonus
    const { data: winners } = await gameStore.db.from('war_dominance')
      .select('winner_faction')
      .eq('week_id', currentWeekId.value)
    
    let unionWins = 0, poderWins = 0
    winners?.forEach(w => {
      if (w.winner_faction === 'union') unionWins++
      else poderWins++
    })

    const isWinner = (faction.value === 'union' && unionWins >= poderWins) ||
                     (faction.value === 'poder' && poderWins > unionWins)
    
    if (isWinner) totalCoins += WEEKLY_WIN_BONUS_COINS

    if (totalCoins > 0) {
      warCoins.value += totalCoins
      gameStore.state.warCoins = (gameStore.state.warCoins || 0) + totalCoins
      uiStore.notify(`Fin de guerra. ¡Recibiste ${totalCoins} Monedas de Guerra!`, '⚡')
    }

    gameStore.state.lastResolvedWeek = currentWeekId.value
  }

  return {
    faction,
    warCoins,
    weeklyPoints,
    mapDominance,
    isDisputeActive,
    currentWeekId,
    dailyGuardianCaptures,
    isLoading,
    loadWarData,
    addPoints,
    fetchMapDominance,
    checkGuardian,
    chooseFaction,
    claimGuardian,
    resolveWeeklySeason
  }
})
