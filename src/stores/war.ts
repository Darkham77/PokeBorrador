

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { getWeekId, getPreviousWeekId, isDisputePhase, getPointReward, FACTION_CHANGE_COST, DAILY_MAP_CAP, WEEKLY_REWARD_MILESTONES, DAILY_COIN_CAP, WAR_POINTS_PER_COIN, GUARDIAN_DEFEAT_POINTS_MULTIPLIER, FACTION_VICTORY_BONUS_COINS } from '@/logic/war/warEngine'
import { getGuardianData } from '@/logic/war/guardianEngine'
import { GUARDIAN_ENCOUNTER_CHANCE_PERCENT } from '@/logic/constants/gameplay'

import type { DominanceInfo } from '@/types/system/stores'
import { requireFactionId, requireISODateKey, type FactionId } from '@/types/system/game'
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'

interface WarPointsRecord {
  map_id: string
  faction: string
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

  const faction = ref<FactionId | null>(null)
  const warCoins = ref(0)
  const weeklyPoints = ref(0)
  const mapDominance = ref<Partial<Record<MapRouteId, DominanceInfo>>>({})
  const dailyGuardianCaptures = ref<MapRouteId[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  let inFlightPromise: Promise<void> | null = null

  // Reactive engine-based state
  const currentWeekId = computed(() => getWeekId())
  const isDisputeActive = computed(() => isDisputePhase())

  /**
   * Loads all war-related data for the current session.
   * Handles Global vs Local instance isolation via gameStore.db (DBRouter).
   */
  async function loadWarData(force = false) {
    if (!force && isLoaded.value) return
    if (inFlightPromise) return inFlightPromise

    isLoading.value = true
    inFlightPromise = (async () => {
      try {
        // 0. Resolve previous week dominance & distribute rewards if applicable
        await resolveWeekIfNeeded()
        await distributeWeeklyWarCoins()

        // 1. Load Faction and Coins from Game State (Synchronized via DBRouter)
        faction.value = gameStore.state.faction || null
        warCoins.value = gameStore.state.warCoins || 0

        // 2. Load Individual Weekly Progress
        if (authStore.user && gameStore.db) {
          const { data: pts } = await gameStore.db.from('war_user_points')
            .select('points')
            .eq('user_id', authStore.user.id)
            .eq('week_id', currentWeekId.value)
          
          weeklyPoints.value = (pts as { points: number }[] | null)?.reduce((acc, r) => acc + (r.points || 0), 0) || 0

          // 3. Load Guardian Captures for today (isolated world)
          const today = requireISODateKey(Temporal.Now.plainDateISO().toString())
          const { data: guardians } = await gameStore.db.from('guardian_captures')
            .select('map_id')
            .eq('user_id', authStore.user.id)
            .eq('capture_date', today)
          
          const typedGuardians = guardians as { map_id: string }[] | null;
          dailyGuardianCaptures.value = typedGuardians?.map(g => requireMapRouteId(g.map_id)) || []

          if (typedGuardians && Array.isArray(typedGuardians)) {
            if (!gameStore.state.guardianCaptures) {
              gameStore.state.guardianCaptures = {}
            }
            typedGuardians.forEach(g => {
              const routeId = requireMapRouteId(g.map_id)
              gameStore.state.guardianCaptures![routeId] = today
            })
          }
        }

        // 4. Load Dominance Data
        await fetchMapDominance()
        isLoaded.value = true
      } finally {
        isLoading.value = false
        inFlightPromise = null
      }
    })()
    return inFlightPromise
  }

  /**
   * Adds war points for the current faction.
   * Logic handles Daily Cap and Faction requirement.
   */
  async function addPoints(mapId: string, eventType: string, success: boolean, customPoints?: number) {
    const routeId = requireMapRouteId(mapId)
    if (!faction.value || !isDisputeActive.value || !gameStore.db) return 0
    
    // 1. Calculate points from Engine or use custom override
    const pts = customPoints !== undefined ? customPoints : getPointReward(eventType, success)
    if (pts <= 0) return 0

    // 2. Daily PT Cap Check (Isolated by World)
    const today = requireISODateKey(Temporal.Now.plainDateISO().toString())
    if (!gameStore.state.warDailyCap) gameStore.state.warDailyCap = {}
    
    const dailyCap = gameStore.state.warDailyCap
    if (!dailyCap[today]) dailyCap[today] = {}
    
    const currentMapPts = dailyCap[today]?.[routeId] || 0
    if (currentMapPts >= DAILY_MAP_CAP) {
      // Only notify once per map session
      return 0
    }

    const allowedPts = Math.min(pts, DAILY_MAP_CAP - currentMapPts)
    
    // 3. Registration via DBRouter (Handles RPC online or SQL local)
    const { error } = await gameStore.db.rpc('add_war_points', {
      p_week_id: currentWeekId.value,
      p_map_id: routeId,
      p_faction: faction.value,
      p_points: allowedPts
    })

    if (!error) {
       weeklyPoints.value += allowedPts
       dailyCap[today]![routeId] = currentMapPts + allowedPts
       
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
    const today = requireISODateKey(Temporal.Now.plainDateISO().toString())
    if (!gameStore.state.warDailyCoins) gameStore.state.warDailyCoins = {}
    
    const dailyCoins = gameStore.state.warDailyCoins as Record<string, number> // open-record
    if (!dailyCoins[today]) dailyCoins[today] = 0
    if (!gameStore.state.warPointsAccumulator) gameStore.state.warPointsAccumulator = 0

    if ((dailyCoins[today] ?? 0) >= DAILY_COIN_CAP) return

    gameStore.state.warPointsAccumulator += pts
    if (gameStore.state.warPointsAccumulator >= WAR_POINTS_PER_COIN) {
      const newCoins = Math.floor(gameStore.state.warPointsAccumulator / WAR_POINTS_PER_COIN)
      const allowedCoins = Math.min(newCoins, DAILY_COIN_CAP - (dailyCoins[today] ?? 0))
      
      if (allowedCoins > 0) {
        warCoins.value += allowedCoins
        gameStore.state.warCoins = (gameStore.state.warCoins || 0) + allowedCoins
        dailyCoins[today] = (dailyCoins[today] ?? 0) + allowedCoins
        uiStore.notify(`¡Ganaste ${allowedCoins} Moneda${allowedCoins > 1 ? 's' : ''} de Guerra!`, '⚡')
      }
      gameStore.state.warPointsAccumulator %= WAR_POINTS_PER_COIN
    }
  }

  /**
   * Assigns or changes the player's faction.
   * Cost: 25k for changes.
   */
  async function chooseFaction(newFaction: string) {
    const resolvedFaction = requireFactionId(newFaction)
    if (!authStore.user || !gameStore.db) return false
    
    const isChange = !!faction.value
    if (isChange) {
      if (faction.value === resolvedFaction) return true
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
      .upsert({ user_id: authStore.user.id, faction: resolvedFaction })
    
    if (!error) {
      faction.value = resolvedFaction
      gameStore.state.faction = resolvedFaction
      uiStore.notify(`¡Ahora eres parte del Team ${resolvedFaction === 'union' ? 'Unión' : 'Poder'}!`, '⚔️')
      return true
    }
    return false
  }

  /**
   * Records a guardian capture or defeat.
   */
  async function claimGuardian(mapId: string, isDefeat = false) {
    const routeId = requireMapRouteId(mapId)
    const today = requireISODateKey(Temporal.Now.plainDateISO().toString())
    
    // Save to user account state immediately for local lockout persistence
    if (!gameStore.state.guardianCaptures) {
      gameStore.state.guardianCaptures = {}
    }
    gameStore.state.guardianCaptures[routeId] = today
    await gameStore.save()

    if (!dailyGuardianCaptures.value.includes(routeId)) {
      dailyGuardianCaptures.value.push(routeId)
    }

    if (!authStore.user || !gameStore.db) return
    
    const guardian = getGuardianData(routeId, []) // In real use we pass map list
    if (!guardian) return

    const ptsAwarded = isDefeat ? Math.floor(guardian.pts * GUARDIAN_DEFEAT_POINTS_MULTIPLIER) : guardian.pts

    const { error } = await gameStore.db.from('guardian_captures').insert({
      capture_date: today,
      map_id: routeId,
      user_id: authStore.user.id,
      winner_faction: faction.value || null,
      pts_awarded: ptsAwarded
    })

    if (!error) {
      if (faction.value) {
        await addPoints(routeId, 'GUARDIAN', true, ptsAwarded) // Points logic handles Coins/State
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

    const newDom: Partial<Record<MapRouteId, DominanceInfo>> = {}
    ;(points as WarPointsRecord[] | null)?.forEach(row => {
      const routeId = requireMapRouteId(row.map_id)
      const factionId = requireFactionId(row.faction)
      if (!newDom[routeId]) newDom[routeId] = { union: 0, poder: 0, winner: null }
      newDom[routeId]![factionId] = row.points
    })

    // 2. Fetch settled winners if not in dispute phase
    if (!isDisputeActive.value) {
      const { data: dom } = await gameStore.db.from('war_dominance')
        .select('map_id, winner_faction')
        .eq('week_id', currentWeekId.value)
      
      ;(dom as DominanceRecord[] | null)?.forEach(row => {
        const routeId = requireMapRouteId(row.map_id)
        if (!newDom[routeId]) newDom[routeId] = { union: 0, poder: 0, winner: null }
        newDom[routeId]!.winner = row.winner_faction === 'tie' ? null : requireFactionId(row.winner_faction)
      })
    }

    mapDominance.value = newDom
  }

  /**
   * Triggers a guardian appearance check.
   */
  function checkGuardian(mapId: string, allMapIds: string[]) {
    const routeId = requireMapRouteId(mapId)
    const routeIds = allMapIds.map(id => requireMapRouteId(id))
    if (dailyGuardianCaptures.value.includes(routeId)) return null
    if (Math.random() > GUARDIAN_ENCOUNTER_CHANCE_PERCENT) return null

    return getGuardianData(routeId, routeIds)
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
    const mapTotals: Partial<Record<MapRouteId, { union: number; poder: number }>> = {}
    pointsList.forEach(row => {
      const routeId = requireMapRouteId(row.map_id)
      const factionId = requireFactionId(row.faction)
      if (!mapTotals[routeId]) mapTotals[routeId] = { union: 0, poder: 0 }
      mapTotals[routeId]![factionId] += row.points
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
        victoryBonus = FACTION_VICTORY_BONUS_COINS
      }
    }

    const totalReward = milestoneCoins + victoryBonus
    if (totalReward > 0) {
      warCoins.value += totalReward
      gameStore.state.warCoins = (gameStore.state.warCoins || 0) + totalReward
      gameStore.state.lastResolvedWeek = prevWeek
      await gameStore.save()

      uiStore.notify(
        `¡Recompensa semanal recibida! ⚡+${totalReward} Monedas de Guerra (${milestoneCoins} por hitos${victoryBonus > 0 ? ` + ${FACTION_VICTORY_BONUS_COINS} por victoria de facción` : ''}).`,
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
    isLoaded,
    loadWarData,
    addPoints,
    checkGuardian,
    chooseFaction,
    claimGuardian,
    resolveWeekIfNeeded,
    distributeWeeklyWarCoins
  }
})
