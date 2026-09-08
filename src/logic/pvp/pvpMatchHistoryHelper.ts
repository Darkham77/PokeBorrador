import type { DBRouter } from '@/logic/db/dbRouter';
import { 
  appendPersonalMatchHistory, 
  type PersonalPvPMatchSummary, 
  requireBattleCode 
} from '@/types/battle/pvp';
import type { GameState } from '@/types/system/game';

const MAX_HISTORY_FETCH_LIMIT = 20 as const;

export async function fetchOnlineMatchHistory(
  db: DBRouter,
  userId: string
): Promise<PersonalPvPMatchSummary[]> {
  try {
    const { data: replays } = await db
      .from('battle_replays')
      .select('*')
      .or(`p1_user_id.eq.${userId},p2_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_FETCH_LIMIT) as { data: Array<Record<string, unknown>> | null };

    if (!replays || !Array.isArray(replays)) return [];

    return replays.map((r): PersonalPvPMatchSummary => {
      const isP1 = r['p1_user_id'] === userId;
      const oppData = (isP1 ? r['p2_data'] : r['p1_data']) as Record<string, unknown> | null; // open-record: Generic key-value data dictionary container
      const winnerSide = String(r['winner_side'] || '');
      const won = (winnerSide === 'p1' && isP1) || (winnerSide === 'p2' && !isP1);
      const result = winnerSide === 'draw' ? 'draw' : (won ? 'victory' : 'defeat');

      return {
        id: String(r['id'] || ''),
        battleCode: requireBattleCode(r['battle_code'] || 'BTL-XXXX-000'),
        opponentId: String(isP1 ? r['p2_user_id'] : r['p1_user_id']),
        opponentName: String(oppData?.['username'] || 'Rival'),
        opponentAvatar: oppData?.['avatar'] ? String(oppData['avatar']) : undefined,
        format: r['theme_id'] ? '6v6' : '3v3',
        isRanked: true,
        result,
        turnsCount: Number(r['turns_count'] || 0),
        timestamp: String(r['created_at'] || Temporal.Now.instant().toString())
      };
    });
  } catch {
    return [];
  }
}

export interface MatchHistoryPersistentStore {
  state: GameState;
  save(force?: boolean): Promise<unknown>;
}

export function recordLocalMatch(
  gameStore: MatchHistoryPersistentStore,
  match: PersonalPvPMatchSummary
): void {
  gameStore.state.pvpMatchHistory = appendPersonalMatchHistory(
    gameStore.state.pvpMatchHistory,
    match
  );
  void gameStore.save(false);
}

export function mergeMatchHistories(
  localHistory: readonly PersonalPvPMatchSummary[] | undefined,
  onlineHistory: readonly PersonalPvPMatchSummary[]
): PersonalPvPMatchSummary[] {
  let merged = [...(localHistory || [])];
  for (const m of onlineHistory) {
    merged = appendPersonalMatchHistory(merged, m);
  }
  return merged;
}
