import { queryLocal, persistSQLite, type SQLiteDatabase } from '../sqliteEngine.ts';
import { logger } from '@/logic/utils/logger.ts';
import type { DBResponse } from '@/types/system/database';
import type { CompetitionEntryData, CompetitionRankKey } from '@/types/system/stores';
import { resolveSubCompetitionDirection, resolveEventSubCompetitions, type SubCompetitionConfig, type ResolvedSubCompetition, type Event as GameEvent } from '@/logic/events/eventEngine.ts';

const COMPETITION_RANKS: readonly CompetitionRankKey[] = ['first', 'second', 'third'] as const;
const MAX_STORED_COMPETITION_RESULTS = 100;

interface EventConfigWithPrizes {
  hasCompetition?: boolean;
  metric?: string;
  subCompetitions?: SubCompetitionConfig[];
  prizes?: {
    first?: Record<string, unknown>; // open-record
    second?: Record<string, unknown>; // open-record
    third?: Record<string, unknown>; // open-record
  };
}

interface StoredCompetitionEntry {
  player_id: string;
  player_name: string;
  player_email: string;
  data: string | CompetitionEntryData;
  pokemon_uid: string;
}

interface RankedWinner {
  rank: CompetitionRankKey;
  category_id?: string;
  category_name?: string;
  player_id: string;
  player_name: string;
  player_class?: string;
  player_level?: number;
  avatar_style?: string;
  nick_style?: string;
  gender?: string;
  score: number;
  entry_data: CompetitionEntryData;
}

function parseCompetitionEntryData(raw: string | CompetitionEntryData | undefined): CompetitionEntryData {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as CompetitionEntryData;
    } catch {
      return {};
    }
  }
  return raw;
}

/**
 * Offline emulation for fn_award_event_automated.
 * Awards prizes to top 3 participants in each sub-competition of an event.
 */
export async function emulateAwardEventAutomated(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown> = {}
): Promise<DBResponse> {
  const targetEventId = (params.target_event_id || params.p_event_id || params.eventId) as string;
  if (!targetEventId) {
    return { data: null, error: 'target_event_id is required' };
  }

  try {
    const eventRows = await queryLocal('SELECT * FROM events_config WHERE id = ?', [targetEventId]);
    const eventRow = eventRows[0] as {
      id: string;
      name?: string;
      description?: string;
      active?: boolean | number;
      config: string | Record<string, unknown>; // open-record
      last_awarded_at: string | null;
    } | undefined;

    if (!eventRow) {
      return { data: { ok: false, error: 'No se encontró el evento.' }, error: null };
    }

    const cfg: EventConfigWithPrizes = typeof eventRow.config === 'string'
      ? (JSON.parse(eventRow.config) as EventConfigWithPrizes)
      : (eventRow.config as EventConfigWithPrizes) || {};

    const gameEvent: GameEvent = {
      id: targetEventId,
      name: String(eventRow.name || ''),
      description: String(eventRow.description || ''),
      active: Boolean(eventRow.active),
      config: cfg
    };
    const subComps = resolveEventSubCompetitions(gameEvent, Temporal.Now.instant());

    // Query all distinct categories present in competition_entries for this event
    const distinctCatRows = await queryLocal(`
      SELECT DISTINCT COALESCE(category_id, 'ivs') as cat_id
      FROM competition_entries
      WHERE event_id = ?
    `, [targetEventId]);

    const presentCatIds = new Set(distinctCatRows.map(r => String(r.cat_id || 'ivs')));
    
    // Combine resolved sub-competitions with any distinct registered categories
    const allEvaluationSubComps: (ResolvedSubCompetition | SubCompetitionConfig)[] = [...subComps];
    for (const catId of presentCatIds) {
      if (!allEvaluationSubComps.some(s => s.id === catId)) {
        const matchingBase = subComps.find(s => catId.startsWith(s.id)) || subComps[0]!;
        allEvaluationSubComps.push({
          ...matchingBase,
          id: catId,
          name: matchingBase.name
        });
      }
    }

    const allWinners: RankedWinner[] = [];
    const nowIso = Temporal.Now.instant().toString();

    for (const sub of allEvaluationSubComps) {
      // 1. Fetch entries for target event & sub-category
      const rawRows = await queryLocal(`
        SELECT player_id, player_name, player_email, data, pokemon_uid
        FROM competition_entries
        WHERE event_id = ? AND (category_id = ? OR (category_id IS NULL AND ? = 'ivs'))
      `, [targetEventId, sub.id, sub.id]);

      const rawEntries: StoredCompetitionEntry[] = rawRows.map(r => ({
        player_id: String(r.player_id || ''),
        player_name: String(r.player_name || ''),
        player_email: String(r.player_email || ''),
        data: (typeof r.data === 'string' ? r.data : ((r.data || {}) as CompetitionEntryData)),
        pokemon_uid: String(r.pokemon_uid || '')
      }));

      if (!rawEntries || rawEntries.length === 0) continue;

      const direction = resolveSubCompetitionDirection(targetEventId, sub.id, sub.order);

      // 2. Parse and rank entries
      const parsedEntries = rawEntries.map((e) => {
        const dataObj = parseCompetitionEntryData(e.data);
        const score = Number(dataObj.score ?? dataObj.total_ivs ?? 0);
        const isShiny = Boolean(dataObj.is_shiny);
        const rawObtainedAt = dataObj.obtained_at;
        const obtainedAt = typeof rawObtainedAt === 'number' && !isNaN(rawObtainedAt) && rawObtainedAt > 0 ? rawObtainedAt : Infinity;
        return {
          player_id: e.player_id,
          player_name: e.player_name,
          player_email: e.player_email,
          score,
          is_shiny: isShiny,
          obtained_at: obtainedAt,
          data: dataObj
        };
      });

      parsedEntries.sort((a, b) => {
        // 1. Primary: Score based on direction
        if (direction === 'min') {
          if (a.score !== b.score) return a.score - b.score;
        } else {
          if (b.score !== a.score) return b.score - a.score;
        }
        // 2. Tiebreaker 1: Shiny Pokémon takes priority over non-shiny
        if (a.is_shiny !== b.is_shiny) {
          return a.is_shiny ? -1 : 1;
        }
        // 3. Tiebreaker 2: Older capture date takes priority
        if (a.obtained_at !== b.obtained_at) {
          return a.obtained_at - b.obtained_at;
        }
        return 0;
      });

      // Take top 3 for this category
      const top3 = parsedEntries.slice(0, 3);
      const prizes = sub.prizes || cfg.prizes || {};

      // 3. Insert awards for top 3 in category
      for (let i = 0; i < top3.length; i++) {
        const entry = top3[i]!;
        const rank = COMPETITION_RANKS[i]!;
        const rawPrize = prizes[rank] || { type: 'money', amount: 10000 };
        const prize = typeof rawPrize === 'object' && rawPrize !== null ? { ...rawPrize, rank } : { rank, type: 'money', amount: 10000 };
        const awardId = `award_${targetEventId}_${sub.id}_${entry.player_id}_${Temporal.Now.instant().epochMilliseconds}_${i}`;

        await queryLocal(`
          INSERT INTO awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)
        `, [
          awardId,
          targetEventId,
          entry.player_id,
          entry.player_name,
          entry.player_email || '',
          JSON.stringify(prize),
          nowIso
        ]);

        allWinners.push({
          rank,
          category_id: sub.id,
          category_name: sub.name,
          player_id: entry.player_id,
          player_name: entry.player_name,
          player_class: entry.data.player_class,
          player_level: entry.data.trainer_level,
          avatar_style: entry.data.avatar_style,
          nick_style: entry.data.nick_style,
          gender: entry.data.gender,
          score: entry.score,
          entry_data: entry.data
        });
      }
    }

    if (allWinners.length === 0) {
      await queryLocal('UPDATE events_config SET last_awarded_at = ? WHERE id = ?', [nowIso, targetEventId]);
      await persistSQLite();
      return { data: { ok: false, error: 'Sin participantes.' }, error: null };
    }

    // 4. Record competition result
    const resultId = `result_${targetEventId}_${Temporal.Now.instant().epochMilliseconds}`;
    await queryLocal(`
      INSERT INTO competition_results (id, event_id, winners, ended_at)
      VALUES (?, ?, ?, ?)
    `, [resultId, targetEventId, JSON.stringify(allWinners), nowIso]);

    // Prune older results to keep at most MAX_STORED_COMPETITION_RESULTS in database
    await queryLocal(`
      DELETE FROM competition_results
      WHERE id NOT IN (
        SELECT id FROM competition_results
        ORDER BY ended_at DESC
        LIMIT ?
      )
    `, [MAX_STORED_COMPETITION_RESULTS]);

    // 5. Update events_config and clean up competition entries
    await queryLocal('UPDATE events_config SET last_awarded_at = ? WHERE id = ?', [nowIso, targetEventId]);
    await queryLocal('DELETE FROM competition_entries WHERE event_id = ?', [targetEventId]);
    await persistSQLite();

    logger.info('DBRouter', `[EventRPC] Successfully awarded competition "${targetEventId}" to ${allWinners.length} category winners.`);
    return { data: { ok: true, success: true, winners: allWinners }, error: null };
  } catch (err) {
    logger.error('DBRouter', `[EventRPC] Error awarding event: ${(err as Error).message}`);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Offline emulation for claim_award RPC.
 * Marks the award as claimed and returns the prize payload.
 */
export async function emulateClaimAward(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown> = {}
): Promise<DBResponse> {
  const awardId = (params.p_award_id || params.awardId || params.id) as string;
  if (!awardId) {
    return { data: null, error: 'p_award_id is required' };
  }

  try {
    const awardRows = await queryLocal('SELECT * FROM awards WHERE id = ?', [awardId]);
    const awardRow = awardRows[0] as {
      id: string;
      prize: string | Record<string, unknown>; // open-record
      claimed: number | boolean;
      received_at: string | null;
    } | undefined;

    if (!awardRow) {
      return { data: { ok: false, error: 'Recompensa no encontrada' }, error: null };
    }

    if (awardRow.claimed || awardRow.received_at) {
      return { data: { ok: false, error: 'Recompensa ya reclamada' }, error: null };
    }

    const nowIso = Temporal.Now.instant().toString();
    await queryLocal('UPDATE awards SET claimed = 1, received_at = ? WHERE id = ?', [nowIso, awardId]);
    await persistSQLite();

    const prizeObj = typeof awardRow.prize === 'string'
      ? (JSON.parse(awardRow.prize) as Record<string, unknown>) // open-record
      : awardRow.prize;

    return {
      data: {
        ok: true,
        success: true,
        prize: prizeObj
      },
      error: null
    };
  } catch (err) {
    logger.error('DBRouter', `[EventRPC] Error claiming award: ${(err as Error).message}`);
    return { data: null, error: (err as Error).message };
  }
}
