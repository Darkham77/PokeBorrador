

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import {
  getWeekId,
  getPreviousWeekId,
  isDisputePhase,
  FACTION_CHANGE_COST
} from '@/logic/war/warEngine'
import { getGuardianData } from '@/logic/war/guardianEngine'

import type { DominanceInfo } from '@/types/system/stores'
import { requireFactionId, requireISODateKey, FACTION_IDS, type FactionId, type ISODateKey } from '@/types/system/game'
import { getGMT3Date } from '@/logic/utils/timeUtils'
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import {
  calculateWarCoinsAwarded,
  calculateAllowedMapPoints,
  parsePointsToDominance,
  mergeSettledWinners,
  fetchUserWeeklyProgress,
  registerGuardianLockout,
  calculateGuardianRewardPoints,
  persistGuardianCapture,
  resolveRewardPoints,
  executeResolveWeekDominance,
  fetchWeeklyRewardCalculation,
  formatWeeklyRewardNotification,
  type WarPointsRecord,
  type DominanceRecord
} from './war/warStoreHelpers.ts'

export const WAR_WINNER_FACTIONS = [...FACTION_IDS, 'tie'] as const
export type WarWinnerFaction = (typeof WAR_WINNER_FACTIONS)[number]

function getTodayISODateKey(): ISODateKey {
  return requireISODateKey(getGMT3Date().toPlainDate().toString())
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
          const today = getTodayISODateKey()
          const progress = await fetchUserWeeklyProgress(
            gameStore.db,
            authStore.user.id,
            currentWeekId.value,
            gameStore.state,
            today
          )
          weeklyPoints.value = progress.weeklyPoints
          dailyGuardianCaptures.value = progress.guardianRoutes
        }

        // 3. Load Dominance Data
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
  async function addPoints(mapId: MapRouteId, eventType: string, success: boolean, customPoints?: number) {
    const routeId = requireMapRouteId(mapId)
    if (!faction.value || !isDisputeActive.value || !gameStore.db) return 0
    
    const pts = resolveRewardPoints(eventType, success, customPoints)
    if (pts <= 0) return 0

    const today = getTodayISODateKey()
    if (!gameStore.state.warDailyCap) gameStore.state.warDailyCap = {}
    
    const allowedPts = calculateAllowedMapPoints(gameStore.state.warDailyCap, today, routeId, pts)
    if (allowedPts <= 0) return 0

    const { error } = await gameStore.db.rpc('add_war_points', {
      p_week_id: currentWeekId.value,
      p_map_id: routeId,
      p_faction: faction.value,
      p_points: allowedPts
    })

    if (error) return 0

    weeklyPoints.value += allowedPts
    const currentMapPts = gameStore.state.warDailyCap[today]![routeId] || 0
    gameStore.state.warDailyCap[today]![routeId] = currentMapPts + allowedPts
    
    handleWarCoins(allowedPts)
    await fetchMapDominance()
    return allowedPts
  }

  /**
   * Progressively awards War Coins based on points earned.
   * Cap: 50 coins per day (Legacy Parity).
   */
  function handleWarCoins(pts: number) {
    const today = getTodayISODateKey()
    if (!gameStore.state.warDailyCoins) gameStore.state.warDailyCoins = {}
    
    const dailyCoins = gameStore.state.warDailyCoins as Record<string, number> // open-record: Generic key-value data dictionary container
    const currentDailyCoins = dailyCoins[today] ?? 0
    const currentAccumulator = gameStore.state.warPointsAccumulator || 0

    const { allowedCoins, nextAccumulator, nextDailyCoins } = calculateWarCoinsAwarded(
      currentDailyCoins,
      currentAccumulator,
      pts
    )

    gameStore.state.warPointsAccumulator = nextAccumulator
    dailyCoins[today] = nextDailyCoins

    if (allowedCoins > 0) {
      warCoins.value += allowedCoins
      gameStore.state.warCoins = (gameStore.state.warCoins || 0) + allowedCoins
      const coinSuffix = allowedCoins > 1 ? 's' : ''
      uiStore.notify(`¡Ganaste ${allowedCoins} Moneda${coinSuffix} de Guerra!`, '⚡')
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
  async function claimGuardian(mapId: MapRouteId, isDefeat = false) {
    const routeId = requireMapRouteId(mapId)
    const today = getTodayISODateKey()
    
    registerGuardianLockout(gameStore.state, dailyGuardianCaptures.value, routeId, today)
    await gameStore.save()

    if (!authStore.user || !gameStore.db) return
    
    const guardian = getGuardianData(routeId, []) // In real use we pass map list
    if (!guardian) return

    const ptsAwarded = calculateGuardianRewardPoints(guardian.pts, isDefeat)
    const success = await persistGuardianCapture(
      gameStore.db,
      authStore.user.id,
      routeId,
      today,
      faction.value,
      ptsAwarded
    )

    if (success) {
      if (faction.value) {
        await addPoints(routeId, 'GUARDIAN', true, ptsAwarded) // Points logic handles Coins/State
      }
      const actionText = isDefeat ? 'Derrotado' : 'Capturado'
      uiStore.notify(`¡Guardián ${actionText}! +${ptsAwarded} PT.`, '🏆')
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

    const newDom = parsePointsToDominance(points as WarPointsRecord[] | null)

    // 2. Fetch settled winners if not in dispute phase
    if (!isDisputeActive.value) {
      const { data: dom } = await gameStore.db.from('war_dominance')
        .select('map_id, winner_faction')
        .eq('week_id', currentWeekId.value)
      
      mergeSettledWinners(newDom, dom as DominanceRecord[] | null)
    }

    mapDominance.value = newDom
  }

  /**
   * Resolves dominance for the previous week if not already settled.
   */
  async function resolveWeekIfNeeded() {
    if (!gameStore.db) return
    const prevWeek = getPreviousWeekId()
    await executeResolveWeekDominance(gameStore.db, prevWeek)
  }

  /**
   * Distributes weekly reward War Coins based on user's weekly PT milestone + victory bonus.
   */
  async function distributeWeeklyWarCoins() {
    if (!authStore.user || !gameStore.db || !faction.value) return

    const prevWeek = getPreviousWeekId()
    if (gameStore.state.lastResolvedWeek === prevWeek) return

    const reward = await fetchWeeklyRewardCalculation(gameStore.db, authStore.user.id, prevWeek, faction.value)
    if (!reward) return

    warCoins.value += reward.totalReward
    gameStore.state.warCoins = (gameStore.state.warCoins || 0) + reward.totalReward
    gameStore.state.lastResolvedWeek = prevWeek
    await gameStore.save()

    uiStore.notify(
      formatWeeklyRewardNotification(reward.milestoneCoins, reward.victoryBonus, reward.totalReward),
      '🎁'
    )
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
    chooseFaction,
    claimGuardian,
    resolveWeekIfNeeded,
    distributeWeeklyWarCoins
  }
})
