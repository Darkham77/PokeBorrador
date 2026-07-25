

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { getWeekId, getPreviousWeekId, isDisputePhase, getPointReward, FACTION_CHANGE_COST, DAILY_MAP_CAP, WEEKLY_REWARD_MILESTONES } from '@/logic/war/warEngine'
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
      // 0. Resolve previous week dominance & distribute rewards if applicable
      await resolveWeekIfNeeded()
      await distributeWeeklyWarCoins()

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
        
        const typedGuardians = guardians as { map_id: string }[] | null;
        dailyGuardianCaptures.value = typedGuardians?.map(g => g.map_id) || []

        if (typedGuardians && Array.isArray(typedGuardians)) {
          if (!gameStore.state.guardianCaptures) {
            gameStore.state.guardianCaptures = {}
          }
          typedGuardians.forEach(g => {
            if (g.map_id) {
              gameStore.state.guardianCaptures![g.map_id] = today
            }
          })
        }
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
  async function addPoints(mapId: string, eventType: string, success: boolean, customPoints?: number) {
    if (!faction.value || !isDisputeActive.value || !gameStore.db) return 0
    
    // 1. Calculate points from Engine or use custom override
    const pts = customPoints !== undefined ? customPoints : getPointReward(eventType, success)
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
    const today = Temporal.Now.plainDateISO().toString()
    
    // Save to user account state immediately for local lockout persistence
    if (!gameStore.state.guardianCaptures) {
      gameStore.state.guardianCaptures = {}
    }
    gameStore.state.guardianCaptures[mapId] = today
    await gameStore.save()

    if (!dailyGuardianCaptures.value.includes(mapId)) {
      dailyGuardianCaptures.value.push(mapId)
    }

    if (!authStore.user || !gameStore.db) return
    
    const guardian = getGuardianData(mapId, []) // In real use we pass map list
    if (!guardian) return

    const ptsAwarded = isDefeat ? Math.floor(guardian.pts * 0.7) : guardian.pts

    const { error } = await gameStore.db.from('guardian_captures').insert({
      capture_date: today,
      map_id: mapId,
      user_id: authStore.user.id,
      winner_faction: faction.value || null,
      pts_awarded: ptsAwarded
    })

    if (!error) {
      if (faction.value) {
        await addPoints(mapId, 'GUARDIAN', true, ptsAwarded) // Points logic handles Coins/State
      }
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
   * Resolves dominance for the previous week if not already settled.
   */
  async function resolveWeekIfNeeded() {
    if (!gameStore.db) return

    const prevWeek = getPreviousWeekId()

    // 1. Check if previous week dominance has already been recorded
    const { data: existingDom } = await gameStore.db.from('war_dominance')
      .select('map_id')
      .eq('week_id', prevWeek)

    if (existingDom && (existingDom as Array<{ map_id: string }>).length > 0) {
      return
    }

    // 2. Fetch all points earned during previous week
    const { data: pointsData } = await gameStore.db.from('war_points')
      .select('map_id, faction, points')
      .eq('week_id', prevWeek)

    const pointsList = pointsData as WarPointsRecord[] | null
    if (!pointsList || pointsList.length === 0) return

    // 3. Group points by map and faction
    const mapTotals: Record<string, { union: number; poder: number }> = {}
    pointsList.forEach(row => {
      if (!mapTotals[row.map_id]) mapTotals[row.map_id] = { union: 0, poder: 0 }
      mapTotals[row.map_id]![row.faction] += row.points
    })

    // 4. Prepare dominance insert/upsert payload
    const dominanceRows = Object.entries(mapTotals).map(([map_id, totals]) => {
      let winner_faction = 'tie'
      if (totals.union > totals.poder) winner_faction = 'union'
      else if (totals.poder > totals.union) winner_faction = 'poder'

      return {
        week_id: prevWeek,
        map_id,
        winner_faction
      }
    })

    if (dominanceRows.length > 0) {
      await gameStore.db.from('war_dominance').upsert(dominanceRows)
    }
  }

  /**
   * Distributes weekly reward War Coins based on user's weekly PT milestone + victory bonus.
   */
  async function distributeWeeklyWarCoins() {
    if (!authStore.user || !gameStore.db || !faction.value) return

    const prevWeek = getPreviousWeekId()
    if (gameStore.state.lastResolvedWeek === prevWeek) return

    // 1. Fetch user's PT from previous week
    const { data: ptsData } = await gameStore.db.from('war_user_points')
      .select('points')
      .eq('user_id', authStore.user.id)
      .eq('week_id', prevWeek)

    const userPts = (ptsData as { points: number }[] | null)?.reduce((acc, r) => acc + (r.points || 0), 0) || 0
    if (userPts <= 0) return

    // 2. Calculate milestone coins
    let milestoneCoins = 0
    for (const milestone of WEEKLY_REWARD_MILESTONES) {
      if (userPts >= milestone.pt) {
        milestoneCoins = milestone.coins
      }
    }

    // 3. Check faction majority bonus (+50 coins)
    const { data: domData } = await gameStore.db.from('war_dominance')
      .select('winner_faction')
      .eq('week_id', prevWeek)

    let victoryBonus = 0
    if (domData && Array.isArray(domData)) {
      let unionWins = 0
      let poderWins = 0
      ;(domData as DominanceRecord[]).forEach(d => {
        if (d.winner_faction === 'union') unionWins++
        else if (d.winner_faction === 'poder') poderWins++
      })

      const winningFaction = unionWins > poderWins ? 'union' : poderWins > unionWins ? 'poder' : null
      if (winningFaction && winningFaction === faction.value) {
        victoryBonus = 50
      }
    }

    const totalReward = milestoneCoins + victoryBonus
    if (totalReward > 0) {
      warCoins.value += totalReward
      gameStore.state.warCoins = (gameStore.state.warCoins || 0) + totalReward
      gameStore.state.lastResolvedWeek = prevWeek
      await gameStore.save()

      uiStore.notify(
        `¡Recompensa semanal recibida! ⚡+${totalReward} Monedas de Guerra (${milestoneCoins} por hitos${victoryBonus > 0 ? ' + 50 por victoria de facción' : ''}).`,
        '🎁'
      )
    }
  }

  return {
    faction,
    warCoins,
    weeklyPoints,
    mapDominance,
    isDisputeActive,
    currentWeekId,
    dailyGuardianCaptures,
    loadWarData,
    addPoints,
    checkGuardian,
    chooseFaction,
    claimGuardian,
    resolveWeekIfNeeded,
    distributeWeeklyWarCoins
  }
})
