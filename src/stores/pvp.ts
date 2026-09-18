
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger.ts'
import { incrementRecordKey } from '@/logic/utils/mapUtils'

import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useModalStore } from '@/stores/modals'
import { checkAndResolveSeasonEnd } from '@/logic/pvp/rankedSeasonRewardEngine'
import { 
  RANKED_REWARD_MILESTONES, 
  RANKED_REWARD_MILESTONES_BY_ID, 
  isRankedRewardMilestoneId,
  type RankedRewardMilestoneId
} from '@/data/system/rankedData'
export { RANKED_REWARD_MILESTONES }
import { getEloTier } from '@/logic/pvp/rankedEngine'
import { GAME_TIMEZONE, parseZonedTime } from '@/logic/utils/timeUtils'
import { DEFAULT_INITIAL_ELO, SEASON_DURATION_MONTHS } from '@/logic/constants/gameplay.ts'
import { calculateEloDelta, applyEloDelta } from '@/logic/pvp/eloRatingMath.ts'
import { resolveDefendingTeam, createPassiveTeamSnapshot } from '@/logic/pvp/pvpTeamHelper'
import { evaluatePokemonForSeason } from '@/logic/pvp/seasonTeamFilter'


export const RANKED_REWARD_TIER_MARKS = [
  { name: 'Plata', elo: 1200, color: '#9E9E9E' },
  { name: 'Oro', elo: 1600, color: '#FFB800' },
  { name: 'Platino', elo: 2100, color: '#E5C100' },
  { name: 'Diamante', elo: 2700, color: '#89CFF0' },
  { name: 'Maestro', elo: 3400, color: '#FFD700' }
]

import type {
  PersonalPvPMatchSummary,
  PassiveBattleReport,
  PvPStats,
  SeasonRules
} from '@/types/battle/pvp'
import { recordLocalMatch } from '@/logic/pvp/pvpMatchHistoryHelper'
import { fetchAndFormatDefenseReports } from '@/logic/pvp/pvpDefenseReportsHelper'
import {
  fetchProfilePvPData,
  fetchActiveSeasonRules,
  findInvalidDefendingPokemon,
  syncPvPPersonalHistory
} from './pvpDataHelper.ts'

/**
 * usePvPStore - Gestor de Arena Clasificatoria y Defensa Pasiva.
 * Centraliza el ELO, las temporadas y el registro de equipos competitivos.
 */
export const usePvPStore = defineStore('pvp', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  const elo = ref(DEFAULT_INITIAL_ELO)
  const stats = ref<PvPStats>({ wins: 0, losses: 0, draws: 0 })
  const maxElo = ref(DEFAULT_INITIAL_ELO)
  const rewardsClaimed = ref<string[]>([])
  const passiveTeamActive = ref(false)
  const defenseReports = ref<PassiveBattleReport[]>([])
  const currentSeasonRules = ref<SeasonRules | null>(null)

  // Sync ELO with game state
  watch(() => gameStore.state.eloRating, (newElo) => {
    if (newElo !== undefined) elo.value = newElo
  }, { immediate: true })

  // Sync Max ELO with game state
  watch(() => gameStore.state.rankedMaxElo, (newMax) => {
    if (newMax !== undefined) {
      maxElo.value = Math.max(maxElo.value, newMax)
    }
  }, { immediate: true })

  // Sync claimed rewards with game state
  watch(() => gameStore.state.rankedRewardsClaimed, (claimed) => {
    if (Array.isArray(claimed)) {
      rewardsClaimed.value = [...claimed]
    }
  }, { immediate: true })

  // Sync passive defense active state with game state
  watch(() => gameStore.state.passiveTeamActive, (active) => {
    if (active !== undefined) {
      passiveTeamActive.value = Boolean(active)
    }
  }, { immediate: true })

  const eloTier = computed(() => getEloTier(elo.value))

  let inFlightPromise: Promise<void> | null = null
  const isLoaded = ref(false)

  function consumeLoginReminderIfNeeded(): void {
    if (!passiveTeamActive.value && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pvp_login_reminder_pending') === 'true') {
      sessionStorage.removeItem('pvp_login_reminder_pending')
      uiStore.notify('Recuerda activar tu Defensa Pasiva en el Home para proteger tu ELO.', '🛡️')
    }
  }

  async function loadPvPData(force = false): Promise<void> {
    if (isLoaded.value && !force) {
      consumeLoginReminderIfNeeded()
      return
    }
    if (inFlightPromise) return inFlightPromise

    inFlightPromise = (async () => {
      try {
        if (!authStore.user || !gameStore.db) return

        const profileData = await fetchProfilePvPData(gameStore.db, authStore.user.id)
        if (profileData) {
          elo.value = profileData.elo
          stats.value = profileData.stats
          maxElo.value = Math.max(maxElo.value, elo.value)
        }

        const rules = await fetchActiveSeasonRules(gameStore.db)
        if (rules) {
          currentSeasonRules.value = rules
        }

        maxElo.value = (gameStore.state.rankedMaxElo as number) || elo.value
        rewardsClaimed.value = gameStore.state.rankedRewardsClaimed ?? []

        const { data: passive } = await gameStore.db.from('passive_teams')
          .select('is_active')
          .eq('user_id', authStore.user.id)
          .maybeSingle() as { data: { is_active: boolean } | null }
        
        passiveTeamActive.value = Boolean(passive?.is_active)
        gameStore.state.passiveTeamActive = passiveTeamActive.value

        const defendingTeam = resolveDefendingTeam(gameStore.state)
        if (passiveTeamActive.value && currentSeasonRules.value && defendingTeam.length > 0) {
          const firstInvalid = findInvalidDefendingPokemon(defendingTeam, currentSeasonRules.value)
          if (firstInvalid) {
            await deactivatePassiveDefense(
              `Defensa Pasiva desactivada: ${firstInvalid.mon.name} no cumple las reglas de la temporada (${firstInvalid.reason}).`
            )
          }
        }

        consumeLoginReminderIfNeeded()

        await fetchDefenseReports()

        if (gameStore.db && authStore.user) {
          gameStore.state.pvpMatchHistory = await syncPvPPersonalHistory(
            gameStore.db,
            authStore.user.id,
            gameStore.state.pvpMatchHistory || []
          )
        }

        checkSeasonRollover()
        isLoaded.value = true
      } finally {
        inFlightPromise = null
      }
    })()

    return inFlightPromise
  }

  function checkSeasonRollover() {
    try {
      const now = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE)
      const resolution = checkAndResolveSeasonEnd(gameStore.state, now.month)
      if (resolution.resolved) {
        if (resolution.newElo !== undefined) {
          elo.value = resolution.newElo
        }
        if (passiveTeamActive.value) {
          void deactivatePassiveDefense('Defensa Pasiva desactivada por finalización de temporada.')
        } else if (gameStore.db && authStore.user) {
          void gameStore.db.from('passive_teams').update({ is_active: false }).eq('user_id', authStore.user.id)
        }
        if (resolution.rewardPokemon || resolution.medal) {
          const modalStore = useModalStore()
          const awards = []
          if (resolution.rewardPokemon) {
            awards.push({
              id: `local_poke_${Temporal.Now.instant().epochMilliseconds}`,
              prize: {
                type: 'pokemon',
                species: resolution.rewardPokemon.id,
                shiny: resolution.rewardPokemon.isShiny,
                level: resolution.rewardPokemon.level
              }
            })
          }
          if (resolution.medal) {
            awards.push({
              id: `local_medal_${Temporal.Now.instant().epochMilliseconds}`,
              prize: {
                type: 'ranked_medal',
                season: resolution.medal.seasonName,
                tier: resolution.tier
              }
            })
          }
          modalStore.open('RankedSeasonReward', {
            seasonName: resolution.previousSeasonName,
            tier: resolution.tier,
            finalElo: resolution.previousElo,
            awards
          })
        }
      }
      return resolution
    } catch (err) {
      console.error('[checkSeasonRollover Error]', err)
      return { resolved: false }
    }
  }

  async function fetchDefenseReports() {
    if (!gameStore.db || !authStore.user) return
    defenseReports.value = await fetchAndFormatDefenseReports(
      gameStore.db,
      authStore.user.id,
      (msg, icon) => uiStore.notify(msg, icon)
    )
  }

  const DEFENSE_SNAPSHOT_DEBOUNCE_MS = 1500;

  // audit-disable timers: Low-level persistence debounce for passive defense snapshot
  let defenseSnapshotTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleDefenseSnapshotSync(delayMs = DEFENSE_SNAPSHOT_DEBOUNCE_MS) {
    if (defenseSnapshotTimer) {
      clearTimeout(defenseSnapshotTimer)
      defenseSnapshotTimer = null
    }
    defenseSnapshotTimer = setTimeout(() => {
      defenseSnapshotTimer = null
      void syncDefendingTeamSnapshot()
    }, delayMs)
  }

  async function flushPendingDefenseSnapshotSync() {
    if (defenseSnapshotTimer) {
      clearTimeout(defenseSnapshotTimer)
      defenseSnapshotTimer = null
      await syncDefendingTeamSnapshot()
    }
  }

  async function deactivatePassiveDefense(reason?: string) {
    if (defenseSnapshotTimer) {
      clearTimeout(defenseSnapshotTimer)
      defenseSnapshotTimer = null
    }
    if (!gameStore.db || !authStore.user) return
    try {
      await gameStore.db.from('passive_teams').update({ is_active: false }).eq('user_id', authStore.user.id)
    } catch (err) {
      logger.error('PVP', 'Error al desactivar defensa pasiva en BD:', err)
    }
    passiveTeamActive.value = false
    gameStore.state.passiveTeamActive = false
    gameStore.scheduleSave()
    if (reason) {
      uiStore.notify(reason, '⚠️')
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pvp_login_reminder_pending')
    }
  }

  async function syncDefendingTeamSnapshot() {
    if (!passiveTeamActive.value || !gameStore.db || !authStore.user) return
    const defendingTeam = resolveDefendingTeam(gameStore.state)
    if (defendingTeam.length === 0) return
    if (currentSeasonRules.value) {
      const hasIneligible = defendingTeam.some(p => !evaluatePokemonForSeason(p, currentSeasonRules.value!).eligible)
      if (hasIneligible) {
        return
      }
    }
    const snapshotJson = createPassiveTeamSnapshot(defendingTeam)
    try {
      await gameStore.db.from('passive_teams').upsert({
        user_id: authStore.user.id,
        team_data: snapshotJson,
        is_active: true,
        updated_at: Temporal.Now.instant().toString()
      })
    } catch (err) {
      logger.error('PVP', 'Error al sincronizar snapshot de defensa pasiva:', err)
    }
  }

  async function togglePassiveTeam() {
    const newState = !passiveTeamActive.value
    
    if (newState) {
      if (!gameStore.db || !authStore.user) return
      const defendingTeam = resolveDefendingTeam(gameStore.state)
      if (defendingTeam.length === 0) {
        uiStore.notify('No tienes Pokémon disponibles para defender.', '⚠️')
        return
      }

      if (currentSeasonRules.value) {
        for (const mon of defendingTeam) {
          const check = evaluatePokemonForSeason(mon, currentSeasonRules.value)
          if (!check.eligible) {
            const reason = check.reason || 'no cumple las reglas de la temporada'
            uiStore.notify(`No puedes activar la Defensa Pasiva: ${mon.name} no cumple las reglas (${reason}).`, '⚠️')
            return
          }
        }
      }

      const snapshotJson = createPassiveTeamSnapshot(defendingTeam)

      const { error } = await gameStore.db.from('passive_teams').upsert({
        user_id: authStore.user.id,
        team_data: snapshotJson,
        is_active: true,
        updated_at: Temporal.Now.instant().toString()
      })

      if (!error) {
        passiveTeamActive.value = true
        gameStore.state.passiveTeamActive = true
        gameStore.scheduleSave()
        uiStore.notify('Equipo de Defensa Pasiva activado.', '🛡️')
      }
    } else {
      await deactivatePassiveDefense()
      uiStore.notify('Defensa Pasiva desactivada.', '⏸️')
    }
  }

  async function claimReward(milestoneId: RankedRewardMilestoneId, options: { autoSave?: boolean; silent?: boolean } = {}) {
    const autoSave = options.autoSave ?? true
    const silent = options.silent ?? false

    if (rewardsClaimed.value.includes(milestoneId)) return
    if (!isRankedRewardMilestoneId(milestoneId)) return
    
    const milestone = RANKED_REWARD_MILESTONES_BY_ID[milestoneId]
    if (!milestone) return

    if (maxElo.value < milestone.elo) {
      if (!silent) uiStore.notify('Hito no alcanzado', '⚠️')
      return
    }

    // Add items to inventory
    Object.entries(milestone.rewards).forEach(([itemId, qty]) => {
      incrementRecordKey(gameStore.state.inventory, itemId, qty as number)
    })

    rewardsClaimed.value.push(milestoneId)
    gameStore.state.rankedRewardsClaimed = [...rewardsClaimed.value]
    if (!silent) {
      uiStore.notify('¡Recompensa reclamada!', '🎁')
    }
    if (autoSave) {
      await gameStore.save(true)
    }
  }

  const seasonRange = computed(() => {
    const defaultRules: SeasonRules = { name: 'Default', levelCap: 100, maxPokemon: 6 }
    const rules = currentSeasonRules.value || defaultRules
    
    let start = parseZonedTime(rules.startDate || rules.seasonStartDate, '2026-04-01T00:00:00')
    const defaultEndStr = start.add({ months: SEASON_DURATION_MONTHS }).toString()
    let end = parseZonedTime(rules.endDate || rules.seasonEndDate, defaultEndStr)
    
    const now = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE)
    if (Temporal.ZonedDateTime.compare(end, now) <= 0) {
      start = now.startOfDay()
      end = start.add({ months: SEASON_DURATION_MONTHS })
    }

    const diff = end.since(now, { largestUnit: 'day' })
    const daysLeft = Math.max(0, Math.ceil(diff.days))
    
    return {
      start: start.toInstant(),
      end: end.toInstant(),
      daysLeft
    }
  })

  async function updateElo(won: boolean, opponentElo: number = DEFAULT_INITIAL_ELO) {
    if (!authStore.user || !gameStore.db) return 0
    
    const delta = calculateEloDelta(elo.value, opponentElo, won)
    elo.value = applyEloDelta(elo.value, delta)
    gameStore.state.eloRating = elo.value

    // Reward Battle Coins (15 for win, 5 for loss)
    const bcEarned = won ? 15 : 5
    gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + bcEarned
    
    if (won) {
      stats.value.wins++
      if (elo.value > maxElo.value) {
        maxElo.value = elo.value
        gameStore.state.rankedMaxElo = maxElo.value
      }
    } else {
      stats.value.losses++
    }
    
    // Save to DB
    await gameStore.db.from('profiles').update({
      elo_rating: elo.value,
      pvp_wins: stats.value.wins,
      pvp_losses: stats.value.losses,
      ranked_max_elo: maxElo.value
    }).eq('id', authStore.user.id)
    
    gameStore.save(false)
    return delta
  }

  const personalMatchHistory = computed<PersonalPvPMatchSummary[]>(() => {
    return (gameStore.state.pvpMatchHistory || []) as PersonalPvPMatchSummary[]
  })

  function recordMatchResult(match: PersonalPvPMatchSummary) {
    recordLocalMatch(gameStore, match)
  }

  return {
    elo,
    stats,
    maxElo,
    eloTier,
    rewardsClaimed,
    personalMatchHistory,
    // fallow-ignore-next-line unused-store-member
    recordMatchResult,
    passiveTeamActive,
    defenseReports,
    currentSeasonRules,
    seasonRange,
    loadPvPData,
    togglePassiveTeam,
    deactivatePassiveDefense,
    scheduleDefenseSnapshotSync,
    flushPendingDefenseSnapshotSync,
    claimReward,
    // fallow-ignore-next-line unused-store-member
    updateElo,
    rules: currentSeasonRules,
    currentTier: getEloTier
  }
})
