
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
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
  getSeasonalThemeForMonth,
  type RankedRewardMilestoneId
} from '@/data/system/rankedData'
export { RANKED_REWARD_MILESTONES }
import { getEloTier } from '@/logic/pvp/rankedEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { GAME_TIMEZONE, parseZonedTime } from '@/logic/utils/timeUtils'
import { DEFAULT_INITIAL_ELO, SEASON_DURATION_MONTHS, DEFAULT_MOVE_PP } from '@/logic/constants/gameplay.ts'
import { calculateEloDelta, applyEloDelta } from '@/logic/pvp/eloRatingMath.ts'


export const RANKED_REWARD_TIER_MARKS = [
  { name: 'Plata', elo: 1200, color: '#9E9E9E' },
  { name: 'Oro', elo: 1600, color: '#FFB800' },
  { name: 'Platino', elo: 2100, color: '#E5C100' },
  { name: 'Diamante', elo: 2700, color: '#89CFF0' },
  { name: 'Maestro', elo: 3400, color: '#FFD700' }
]

interface PvPStats {
  wins: number
  losses: number
  draws: number
}

interface SeasonRules {
  name: string
  startDate?: string
  endDate?: string
  seasonStartDate?: string
  seasonEndDate?: string
  bannedPokemonIds?: PokemonSpeciesId[]
  levelCap: number
  allowedTypes?: string[]
  maxPokemon: number
  [key: string]: unknown
}

import type { PassiveBattleResult, PersonalPvPMatchSummary } from '@/types/battle/pvp'
import { fetchOnlineMatchHistory, recordLocalMatch, mergeMatchHistories } from '@/logic/pvp/pvpMatchHistoryHelper'

export interface PassiveBattleReportData {
  opponent?: string
  turns?: number
  endedAt?: string
  [key: string]: unknown
}

export interface PassiveOpponentProfile {
  id?: string
  username?: string
  playerClass?: string | null
  level?: number | null
  trainer_level?: number | null
  avatar?: string | null
  avatarFrame?: string | null
  avatarDecor?: string | null
  avatar_style?: string | null
  avatarStyle?: string | null
  nick_style?: string | null
  faction?: string | null
  elo_rating?: number | null
  gender?: string | null
}

export interface PassiveBattleReport {
  id: number | string
  user_id: string
  opponent_id: string
  result: PassiveBattleResult
  report_data: PassiveBattleReportData
  opponent_profile?: PassiveOpponentProfile | null
  created_at: string
}

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

  const eloTier = computed(() => getEloTier(elo.value))

  async function loadPvPData() {
    if (!authStore.user || !gameStore.db) return

    interface ProfileRow {
      elo_rating: number;
      pvp_wins: number;
      pvp_losses: number;
      pvp_draws: number;
      role: string;
    }
    const { data: profile } = await gameStore.db.from('profiles')
      .select('elo_rating, pvp_wins, pvp_losses, pvp_draws, role')
      .eq('id', authStore.user.id)
      .single() as { data: ProfileRow | null }

    if (profile) {
      elo.value = profile.elo_rating || DEFAULT_INITIAL_ELO
      stats.value = { 
        wins: profile.pvp_wins || 0, 
        losses: profile.pvp_losses || 0, 
        draws: profile.pvp_draws || 0 
      }
      maxElo.value = Math.max(maxElo.value, elo.value)
    }

    // Load active seasonal rules from database
    try {
      const { data: rulesConfig } = await gameStore.db
        .from('ranked_rules_config')
        .select('*')
        .eq('id', 'current')
        .maybeSingle() as { data: { season_name?: string; config?: SeasonRules } | null }

      if (rulesConfig && rulesConfig.config) {
        const now = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE)
        const endStr = rulesConfig.config.endDate || rulesConfig.config.seasonEndDate
        const isExpired = endStr ? Temporal.ZonedDateTime.compare(parseZonedTime(endStr, now.toString()), now) <= 0 : false

        if (!isExpired) {
          currentSeasonRules.value = rulesConfig.config
        } else {
          // Stale database record from a past expired season; fall back to annual calendar theme
          const currentTheme = getSeasonalThemeForMonth(now.month)
          currentSeasonRules.value = {
            name: currentTheme.name,
            levelCap: 50,
            maxPokemon: 6,
            allowedTypes: currentTheme.allowedTypes ? [...currentTheme.allowedTypes] : [],
            bannedPokemonIds: currentTheme.bannedPokemonIds ? [...currentTheme.bannedPokemonIds] : []
          }
        }
      }
    } catch (err) {
      console.error('[loadPvPData Rules Error]', err)
    }

    // Sync maxElo from game state for rewards
    maxElo.value = (gameStore.state.rankedMaxElo as number) || elo.value
    rewardsClaimed.value = gameStore.state.rankedRewardsClaimed ?? []

    const { data: passive } = await gameStore.db.from('passive_teams')
      .select('is_active')
      .eq('user_id', authStore.user.id)
      .maybeSingle() as { data: { is_active: boolean } | null }
    
    passiveTeamActive.value = passive?.is_active || false

    // Fetch Passive Defense Reports
    await fetchDefenseReports()

    // Fetch and sync Personal Match History
    if (gameStore.db && authStore.user) {
      const onlineHistory = await fetchOnlineMatchHistory(gameStore.db, authStore.user.id)
      if (onlineHistory.length > 0) {
        gameStore.state.pvpMatchHistory = mergeMatchHistories(
          gameStore.state.pvpMatchHistory,
          onlineHistory
        )
      }
    }

    // Check end-of-season rollover and grant rewards if season has transitioned
    checkSeasonRollover()
  }

  function checkSeasonRollover() {
    try {
      const now = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE)
      const resolution = checkAndResolveSeasonEnd(gameStore.state, now.month)
      if (resolution.resolved) {
        if (resolution.newElo !== undefined) {
          elo.value = resolution.newElo
        }
        if (resolution.rewardPokemon || resolution.medal) {
          const modalStore = useModalStore()
          const awards = []
          if (resolution.rewardPokemon) {
            awards.push({
              id: `local_poke_${Temporal.Now.instant().epochMilliseconds}`,
              prize: {
                type: 'pokemon',
                species: resolution.rewardPokemon.species,
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
    try {
      const { data: reports } = await gameStore.db
        .from('passive_battle_reports')
        .select('*')
        .eq('user_id', authStore.user.id)
        .order('created_at', { ascending: false })
        .limit(10) as { data: Array<{ id: number | string, user_id: string, opponent_id: string, result: PassiveBattleResult, report_data: unknown, created_at: string }> | null }

      if (reports && reports.length > 0) {
        const opponentIds = [...new Set(reports.map(r => r.opponent_id).filter(id => id && id !== 'local_user'))]
        const profileMap = new Map<string, Record<string, unknown>>()
        if (opponentIds.length > 0) {
          try {
            const { data: profiles } = await gameStore.db
              .from('profiles')
              .select('id, username, playerClass, level, avatar, avatarFrame, avatarDecor, avatar_style, nick_style, faction, elo_rating')
              .in('id', opponentIds) as { data: Array<Record<string, unknown>> | null }
            if (profiles) {
              for (const p of profiles) {
                profileMap.set(String(p.id), p)
              }
            }
          } catch {
            // Non-fatal profile enrichment
          }
        }

        defenseReports.value = reports.map(r => {
          let parsedData: PassiveBattleReportData = {}
          if (typeof r.report_data === 'string') {
            try {
              parsedData = JSON.parse(r.report_data)
            } catch {
              parsedData = {}
            }
          } else if (typeof r.report_data === 'object' && r.report_data !== null) {
            parsedData = r.report_data as PassiveBattleReportData
          }
          const oppProfile = r.opponent_id ? (profileMap.get(r.opponent_id) || null) : null
          return {
            id: r.id,
            user_id: r.user_id,
            opponent_id: r.opponent_id,
            result: r.result,
            report_data: parsedData,
            opponent_profile: oppProfile,
            created_at: r.created_at
          }
        })

        // Check for unnotified reports
        const storageKey = `pvp_last_seen_defense_report_${authStore.user.id}`
        const lastSeenReportId = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(storageKey) || 0) : 0
        const newReports = defenseReports.value.filter(r => Number(r.id) > lastSeenReportId)
        if (newReports.length > 0) {
          const wins = newReports.filter(r => r.result === 'victory').length
          const losses = newReports.filter(r => r.result === 'defeat').length
          uiStore.notify(
            `Defensa Pasiva: ${newReports.length} combate${newReports.length > 1 ? 's' : ''} en tu ausencia (${wins}V / ${losses}D).`,
            '🛡️'
          )
          const highestId = Math.max(...newReports.map(r => Number(r.id) || 0))
          if (typeof localStorage !== 'undefined' && highestId > 0) {
            localStorage.setItem(storageKey, String(highestId))
          }
        }
      }
    } catch (err) {
      console.error('[fetchDefenseReports Error]', err)
    }
  }

  async function togglePassiveTeam() {
    const newState = !passiveTeamActive.value
    
    if (newState) {
      if (!gameStore.db || !authStore.user) return
      // Create Snapshot (prefer pvpTeam6, fallback to adventure team)
      const allPokes = [
        ...((gameStore.state.team || []) as (Pokemon | null)[]),
        ...((gameStore.state.box || []) as (Pokemon | null)[])
      ].filter((p): p is Pokemon => p !== null);
      const pvp6Uids = gameStore.state.pvpTeam6 || [];
      const teamToSnapshot = pvp6Uids.length > 0
        ? pvp6Uids.map(uid => allPokes.find(p => p.uid === uid)).filter((p): p is Pokemon => p !== null)
        : ((gameStore.state.team || []) as (Pokemon | null)[]).filter((p): p is Pokemon => p !== null);

      const snapshot = teamToSnapshot.map((p) => ({
        id: p.id,
        name: p.name,
        level: p.level,
        type: p.type,
        hp: p.hp,
        maxHp: p.maxHp,
        atk: p.atk,
        def: p.def,
        spa: p.spa,
        spd: p.spd,
        spe: p.spe,
        moves: p.moves.filter(m => !!m).map((m) => ({ name: m!.name, pp: m!.maxPP || DEFAULT_MOVE_PP })),
        heldItem: p.heldItem,
        isShiny: p.isShiny
      }))

      const { error } = await gameStore.db.from('passive_teams').upsert({
        user_id: authStore.user.id,
        team_data: JSON.stringify(snapshot),
        is_active: true,
        updated_at: Temporal.Now.instant().toString()
      })

      if (!error) {
        passiveTeamActive.value = true
        uiStore.notify('Equipo de Defensa Pasiva activado.', '🛡️')
      }
    } else {
      if (!gameStore.db || !authStore.user) return
      await gameStore.db.from('passive_teams').update({ is_active: false }).eq('user_id', authStore.user.id)
      passiveTeamActive.value = false
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
    recordMatchResult,
    passiveTeamActive,
    defenseReports,
    fetchDefenseReports,
    currentSeasonRules,
    seasonRange,
    loadPvPData,
    checkSeasonRollover,
    togglePassiveTeam,
    claimReward,
    updateElo,
    rules: currentSeasonRules,
    currentTier: getEloTier
  }
})
