import type {
  BattleReplayRecord,
  BattleCode,
  ReplayCombatantSummary,
  ReplayChoiceStep
} from '@/types/battle/pvp';
import { isSeasonalThemeId } from '@/data/system/rankedData';
import { parseJsonSafe } from '@/logic/utils/jsonUtils';
import { DEFAULT_INITIAL_BATTLE_SEED } from '@/logic/constants/gameplay.ts';
import type { SideID } from '@pkmn/sim';

const DEFAULT_REPLAY_ELO = 1000 as const;
const DEFAULT_THEME_ID = 'masters_allstars' as const;
const DEFAULT_WINNER_SIDE: SideID = 'p1' as const;

const DEFAULT_REPLAY_COMBATANT: ReplayCombatantSummary = {
  userId: '',
  username: '',
  tier: 'bronce',
  elo: DEFAULT_REPLAY_ELO,
  team: []
} as const;

function resolveReplayThemeId(raw: Record<string, unknown>): BattleReplayRecord['themeId'] {
  if (isSeasonalThemeId(raw.theme_id)) return raw.theme_id;
  if (isSeasonalThemeId(raw.themeId)) return raw.themeId;
  return DEFAULT_THEME_ID;
}

export function mapDbRecordToBattleReplay(rawInput: unknown): BattleReplayRecord {
  const raw = (typeof rawInput === 'object' && rawInput !== null ? rawInput : {}) as Record<
    string,
    unknown
  >; // open-record: Generic key-value data dictionary container
  return {
    id: typeof raw.id === 'string' ? raw.id : typeof raw.id === 'number' ? String(raw.id) : '',
    battleCode: (typeof raw.battle_code === 'string'
      ? raw.battle_code
      : typeof raw.battleCode === 'string'
        ? raw.battleCode
        : '') as BattleCode,
    seasonId:
      typeof raw.season_id === 'string'
        ? raw.season_id
        : typeof raw.seasonId === 'string'
          ? raw.seasonId
          : '',
    themeId: resolveReplayThemeId(raw),
    p1: parseJsonSafe(raw.p1_data, (raw.p1 as ReplayCombatantSummary) || DEFAULT_REPLAY_COMBATANT),
    p2: parseJsonSafe(raw.p2_data, (raw.p2 as ReplayCombatantSummary) || DEFAULT_REPLAY_COMBATANT),
    turnsCount: Number(raw.turns_count ?? raw.turnsCount ?? 0),
    winnerSide: (typeof raw.winner_side === 'string'
      ? raw.winner_side
      : typeof raw.winnerSide === 'string'
        ? raw.winnerSide
        : DEFAULT_WINNER_SIDE) as SideID,
    choiceStream: parseJsonSafe(raw.choice_stream, (raw.choiceStream as ReplayChoiceStep[]) || []),
    initialSeed: parseJsonSafe(
      raw.initial_seed,
      (raw.initialSeed as [number, number, number, number]) || [...DEFAULT_INITIAL_BATTLE_SEED]
    ),
    isTop10Archived: Boolean(raw.is_top10_archived ?? raw.isTop10Archived),
    viewsCount: Number(raw.views_count ?? raw.viewsCount ?? 0),
    createdAt:
      typeof raw.created_at === 'string'
        ? raw.created_at
        : typeof raw.createdAt === 'string'
          ? raw.createdAt
          : ''
  };
}
