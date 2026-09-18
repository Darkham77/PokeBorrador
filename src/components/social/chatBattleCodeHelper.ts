import type {
  BattleReplayRecord,
  BattleCode,
  ReplayCombatantSummary,
  ReplayChoiceStep
} from '@/types/battle/pvp'
import { isSeasonalThemeId } from '@/data/system/rankedData'
import type { SideID } from '@pkmn/sim'

const DEFAULT_REPLAY_ELO = 1000 as const
const DEFAULT_INITIAL_SEED = [0, 0, 0, 0] as const
const DEFAULT_THEME_ID = 'masters_allstars' as const
const DEFAULT_WINNER_SIDE: SideID = 'p1' as const

const DEFAULT_REPLAY_COMBATANT: ReplayCombatantSummary = {
  userId: '',
  username: '',
  tier: 'bronce',
  elo: DEFAULT_REPLAY_ELO,
  team: []
} as const

export function parseJsonSafe<T>(val: unknown, fallback: T): T {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T
    } catch {
      return fallback
    }
  }
  return (val as T) || fallback
}

function resolveReplayThemeId(raw: Record<string, unknown>): BattleReplayRecord['themeId'] {
  if (isSeasonalThemeId(raw.theme_id)) return raw.theme_id
  if (isSeasonalThemeId(raw.themeId)) return raw.themeId
  return DEFAULT_THEME_ID
}

export function mapDbRecordToBattleReplay(rawInput: unknown): BattleReplayRecord {
  const raw = (typeof rawInput === 'object' && rawInput !== null ? rawInput : {}) as Record<string, unknown> // open-record: Generic key-value data dictionary container
  return {
    id: String(raw.id || ''),
    battleCode: String(raw.battle_code || raw.battleCode || '') as BattleCode,
    seasonId: String(raw.season_id || raw.seasonId || ''),
    themeId: resolveReplayThemeId(raw),
    p1: parseJsonSafe(raw.p1_data, (raw.p1 as ReplayCombatantSummary) || DEFAULT_REPLAY_COMBATANT),
    p2: parseJsonSafe(raw.p2_data, (raw.p2 as ReplayCombatantSummary) || DEFAULT_REPLAY_COMBATANT),
    turnsCount: Number(raw.turns_count ?? raw.turnsCount ?? 0),
    winnerSide: (String(raw.winner_side || raw.winnerSide || DEFAULT_WINNER_SIDE)) as SideID,
    choiceStream: parseJsonSafe(raw.choice_stream, (raw.choiceStream as ReplayChoiceStep[]) || []),
    initialSeed: parseJsonSafe(raw.initial_seed, (raw.initialSeed as [number, number, number, number]) || [...DEFAULT_INITIAL_SEED]),
    isTop10Archived: Boolean(raw.is_top10_archived ?? raw.isTop10Archived),
    viewsCount: Number(raw.views_count ?? raw.viewsCount ?? 0),
    createdAt: String(raw.created_at || raw.createdAt || '')
  }
}
