import { isSeasonalThemeId, type SeasonalThemeId } from '@/data/system/rankedData'
import type { BattleCode, BattleReplayRecord, ReplayChoiceStep, ReplayCombatantSummary } from '@/types/battle/pvp'
import type { SideID } from '@pkmn/sim'

const DEFAULT_SEASONAL_THEME: SeasonalThemeId = 'masters_allstars'
const DEFAULT_INITIAL_SEED: [number, number, number, number] = [0, 0, 0, 0]

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') {
    return (raw as T) ?? fallback
  }
  try {
    return (JSON.parse(raw) as T) ?? fallback
  } catch {
    return fallback
  }
}

function resolveSeasonalTheme(themeId: unknown, altThemeId: unknown): SeasonalThemeId {
  if (isSeasonalThemeId(themeId)) return themeId
  if (isSeasonalThemeId(altThemeId)) return altThemeId
  return DEFAULT_SEASONAL_THEME
}

export function parseReplayRow(r: Record<string, unknown>): BattleReplayRecord {
  const p1 = safeJsonParse<ReplayCombatantSummary>(
    r.p1_data,
    (r.p1 || {}) as ReplayCombatantSummary
  )
  const p2 = safeJsonParse<ReplayCombatantSummary>(
    r.p2_data,
    (r.p2 || {}) as ReplayCombatantSummary
  )
  const choiceStream = safeJsonParse<ReplayChoiceStep[]>(
    r.choice_stream,
    (r.choiceStream || []) as ReplayChoiceStep[]
  )
  const initialSeed = safeJsonParse<[number, number, number, number]>(
    r.initial_seed,
    (r.initialSeed || DEFAULT_INITIAL_SEED) as [number, number, number, number]
  )

  return {
    id: String(r.id || ''),
    battleCode: String(r.battleCode || r.battle_code || '') as BattleCode,
    seasonId: String(r.seasonId || r.season_id || ''),
    themeId: resolveSeasonalTheme(r.themeId, r.theme_id),
    p1,
    p2,
    turnsCount: Number(r.turnsCount ?? r.turns_count ?? 0),
    winnerSide: String(r.winnerSide || r.winner_side || 'p1') as SideID,
    choiceStream,
    initialSeed,
    isTop10Archived: Boolean(r.isTop10Archived ?? r.is_top10_archived),
    viewsCount: Number(r.viewsCount ?? r.views_count ?? 0),
    createdAt: String(r.createdAt || r.created_at || '')
  }
}
