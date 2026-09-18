import type { Pokemon } from '@/types/pokemon/pokemon'
import type { SeasonRules, PvPStats, PersonalPvPMatchSummary } from '@/types/battle/pvp'
import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay.ts'
import { GAME_TIMEZONE, parseZonedTime } from '@/logic/utils/timeUtils'
import { getSeasonalThemeForMonth } from '@/data/system/rankedData'
import { evaluatePokemonForSeason } from '@/logic/pvp/seasonTeamFilter'
import { fetchOnlineMatchHistory, mergeMatchHistories } from '@/logic/pvp/pvpMatchHistoryHelper'

interface ProfileRow {
  elo_rating: number
  pvp_wins: number
  pvp_losses: number
  pvp_draws: number
  role: string
}

export async function fetchProfilePvPData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string
): Promise<{ elo: number; stats: PvPStats } | null> {
  const { data: profile } = await db.from('profiles')
    .select('elo_rating, pvp_wins, pvp_losses, pvp_draws, role')
    .eq('id', userId)
    .single() as { data: ProfileRow | null }

  if (!profile) return null

  return {
    elo: profile.elo_rating || DEFAULT_INITIAL_ELO,
    stats: {
      wins: profile.pvp_wins || 0,
      losses: profile.pvp_losses || 0,
      draws: profile.pvp_draws || 0
    }
  }
}

export async function fetchActiveSeasonRules(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
): Promise<SeasonRules | null> {
  try {
    const { data: rulesConfig } = await db
      .from('ranked_rules_config')
      .select('*')
      .eq('id', 'current')
      .maybeSingle() as { data: { season_name?: string; config?: SeasonRules } | null }

    if (!rulesConfig?.config) return null

    const now = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE)
    const endStr = rulesConfig.config.endDate || rulesConfig.config.seasonEndDate
    const isExpired = endStr ? Temporal.ZonedDateTime.compare(parseZonedTime(endStr, now.toString()), now) <= 0 : false

    if (!isExpired) {
      return rulesConfig.config
    }

    // Stale database record from a past expired season; fall back to annual calendar theme
    const currentTheme = getSeasonalThemeForMonth(now.month)
    return {
      name: currentTheme.name,
      levelCap: 50,
      maxPokemon: 6,
      allowedTypes: currentTheme.allowedTypes ? [...currentTheme.allowedTypes] : [],
      bannedPokemonIds: currentTheme.bannedPokemonIds ? [...currentTheme.bannedPokemonIds] : []
    }
  } catch (err) {
    console.error('[loadPvPData Rules Error]', err)
    return null
  }
}

export function findInvalidDefendingPokemon(
  defendingTeam: Pokemon[],
  seasonRules: SeasonRules
): { mon: Pokemon; reason: string } | null {
  for (const mon of defendingTeam) {
    const check = evaluatePokemonForSeason(mon, seasonRules)
    if (!check.eligible) {
      return {
        mon,
        reason: check.reason || 'no cumple las reglas de la temporada'
      }
    }
  }
  return null
}

export async function syncPvPPersonalHistory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  userId: string,
  currentHistory: PersonalPvPMatchSummary[]
): Promise<PersonalPvPMatchSummary[]> {
  const onlineHistory = await fetchOnlineMatchHistory(db, userId)
  if (onlineHistory.length > 0) {
    return mergeMatchHistories(currentHistory, onlineHistory)
  }
  return currentHistory
}
