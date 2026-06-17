

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { getWeekId, isDisputePhase, getPointReward, FACTION_CHANGE_COST, DAILY_MAP_CAP, WEEKLY_REWARD_MILESTONES, WEEKLY_WIN_BONUS_COINS } from '@/logic/war/warEngine'
import { getGuardianData, GUARDIAN_CHANCE } from '@/logic/war/guardianEngine'

import type { DominanceInfo } from '@/types/system/stores'

interface WarPointsRecord {
  map_id: string
  faction: 'union' | 'poder'
  points: number
}

interface DominanceRecord {
  map_id: string
  winner_faction: string
}

export const useWarStore = defineStore('war', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()

  const faction = ref<'union' | 'poder' | null>(null)
  const warCoins = ref(0)
  const weeklyPoints = ref(0)
  const mapDominance = ref<Record<string, DominanceInfo>>({})
  const dailyGuardianCaptures = ref<string[]>([])
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
      faction.value = (gameStore.state.faction as 'union' | 'poder' | null) || null
      warCoins.value = gameStore.state.warCoins || 0

      // 2. Load Individual Weekly Progress
      if (authStore.user && gameStore.db) {
        const { data: pts } = await gameStore.db.from('war_user_points')
          .select('points')
          .eq('user_id', authStore.user.id)
          .eq('week_id', currentWeekId.value)
        
        weeklyPoints.value = (pts as { points: number }[] | null)?.reduce((acc, r) => acc + (r.points || 0), 0) || 0

        // 3. Load Guardian Captures for today (isolated world)
        const today = Temporal.Now.plainDateISO().toString()
        const { data: guardians } = await gameStore.db.from('guardian_captures')
          .select('map_id')
          .eq('user_id', authStore.user.id)
          .eq('capture_date', today)
        
        dailyGuardianCaptures.value = (guardians as { map_id: string }[] | null)?.map(g => g.map_id) || []
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
  async function addPoints(mapId: string, eventType: string, success: boolean) {
    if (!faction.value || !isDisputeActive.value || !gameStore.db) return 0
    
    // 1. Calculate points from Engine
    const pts = getPointReward(eventType, success)
    if (pts <= 0) return 0

    // 2. Daily PT Cap Check (Isolated by World)
    const today = Temporal.Now.plainDateISO().toString()
    if (!gameStore.state.warDailyCap) gameStore.state.warDailyCap = {}
    
    const dailyCap = gameStore.state.warDailyCap as Record<string, Record<string, number>>
    if (!dailyCap[today]) dailyCap[today] = {}
    
    const currentMapPts = dailyCap[today]?.[mapId] || 0
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
       dailyCap[today]![mapId] = currentMapPts + allowedPts
       
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
  function handleWarCoins(pts: number) {
    const today = Temporal.Now.plainDateISO().toString()
    if (!gameStore.state.warDailyCoins) gameStore.state.warDailyCoins = {}
    
    const dailyCoins = gameStore.state.warDailyCoins as Record<string, number>
    if (!dailyCoins[today]) dailyCoins[today] = 0
    if (!gameStore.state.warPointsAccumulator) gameStore.state.warPointsAccumulator = 0

    const DAILY_COIN_CAP = 50 
    if ((dailyCoins[today] ?? 0) >= DAILY_COIN_CAP) return

    gameStore.state.warPointsAccumulator += pts
    if (gameStore.state.warPointsAccumulator >= 10) {
      const newCoins = Math.floor(gameStore.state.warPointsAccumulator / 10)
      const allowedCoins = Math.min(newCoins, DAILY_COIN_CAP - (dailyCoins[today] ?? 0))
      
      if (allowedCoins > 0) {
        warCoins.value += allowedCoins
        gameStore.state.warCoins = (gameStore.state.warCoins || 0) + allowedCoins
        dailyCoins[today] = (dailyCoins[today] ?? 0) + allowedCoins
        uiStore.notify(`¡Ganaste ${allowedCoins} Moneda${allowedCoins > 1 ? 's' : ''} de Guerra!`, '⚡')
      }
      gameStore.state.warPointsAccumulator %= 10
    }
  }

  /**
   * Assigns or changes the player's faction.
   * Cost: 25k for changes.
   */
  async function chooseFaction(newFaction: string) {
    if (!authStore.user || !gameStore.db) return false
    
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
      faction.value = newFaction as 'union' | 'poder'
      gameStore.state.faction = newFaction
      uiStore.notify(`¡Ahora eres parte del Team ${newFaction === 'union' ? 'Unión' : 'Poder'}!`, '⚔️')
      return true
    }
    return false
  }

  /**
   * Records a guardian capture or defeat.
   */
  async function claimGuardian(mapId: string, isDefeat = false) {
    if (!authStore.user || !faction.value || !gameStore.db) return
    
    const today = Temporal.Now.plainDateISO().toString()
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
    if (!gameStore.db) return
    // 1. Fetch points for the current week
    const { data: points } = await gameStore.db.from('war_points')
      .select('map_id, faction, points')
      .eq('week_id', currentWeekId.value)

    const newDom: Record<string, DominanceInfo> = {}
    ;(points as WarPointsRecord[] | null)?.forEach(row => {
      if (!newDom[row.map_id]) newDom[row.map_id] = { union: 0, poder: 0, winner: null }
      newDom[row.map_id]![row.faction] = row.points
    })

    // 2. Fetch settled winners if not in dispute phase
    if (!isDisputeActive.value) {
      const { data: dom } = await gameStore.db.from('war_dominance')
        .select('map_id, winner_faction')
        .eq('week_id', currentWeekId.value)
      
      ;(dom as DominanceRecord[] | null)?.forEach(row => {
        if (!newDom[row.map_id]) newDom[row.map_id] = { union: 0, poder: 0, winner: null }
        newDom[row.map_id]!.winner = row.winner_faction
      })
    }

    mapDominance.value = newDom
  }

  /**
   * Triggers a guardian appearance check.
   */
  function checkGuardian(mapId: string, allMapIds: string[]) {
    if (dailyGuardianCaptures.value.includes(mapId)) return null
    if (Math.random() > GUARDIAN_CHANCE) return null

    return getGuardianData(mapId, allMapIds)
  }

  /**
   * Settles the weekly results and distributes coins.
   * This is typically called during the dominance phase transition.
   */
  async function resolveWeeklySeason() {
    if (isDisputeActive.value || !gameStore.db) return
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
    ;(winners as { winner_faction: string }[] | null)?.forEach(w => {
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
