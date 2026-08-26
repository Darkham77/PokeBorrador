import { queryLocal, persistSQLite, type SQLiteDatabase } from '../sqliteEngine.ts';
import { logger } from '@/logic/utils/logger.ts';
import type { DBResponse } from '@/types/system/database';
import { COMPETITION_RANKS, type CompetitionRankKey } from '@/types/system/stores';

const MAX_STORED_COMPETITION_RESULTS = 100;

interface EventConfigWithPrizes {
  hasCompetition?: boolean;
  metric?: string;
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
  data: string | Record<string, unknown>; // open-record
  pokemon_uid: string;
}

interface RankedWinner {
  rank: CompetitionRankKey;
  player_id: string;
  player_name: string;
  score: number;
  entry_data: Record<string, unknown>; // open-record
}

/**
 * Offline emulation for fn_award_event_automated.
 * Awards prizes to top 3 participants in a competition event based on metric (total_ivs).
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
      config: string | Record<string, unknown>; // open-record
      last_awarded_at: string | null;
    } | undefined;

    if (!eventRow) {
      return { data: { ok: false, error: 'No se encontró el evento.' }, error: null };
    }

    const cfg: EventConfigWithPrizes = typeof eventRow.config === 'string'
      ? (JSON.parse(eventRow.config) as EventConfigWithPrizes)
      : (eventRow.config as EventConfigWithPrizes) || {};

    if (cfg.hasCompetition !== true) {
      return { data: { ok: false, error: 'Evento sin competencia.' }, error: null };
    }

    // 1. Fetch entries for target event
    const rawRows = await queryLocal(`
      SELECT player_id, player_name, player_email, data, pokemon_uid
      FROM competition_entries
      WHERE event_id = ?
    `, [targetEventId]);
    const rawEntries: StoredCompetitionEntry[] = rawRows.map(r => ({
      player_id: String(r.player_id || ''),
      player_name: String(r.player_name || ''),
      player_email: String(r.player_email || ''),
      data: (typeof r.data === 'string' ? r.data : ((r.data || {}) as Record<string, unknown>)), // open-record
      pokemon_uid: String(r.pokemon_uid || '')
    }));

    if (!rawEntries || rawEntries.length === 0) {
      const nowIso = Temporal.Now.instant().toString();
      await queryLocal('UPDATE events_config SET last_awarded_at = ? WHERE id = ?', [nowIso, targetEventId]);
      await persistSQLite();
      return { data: { ok: false, error: 'Sin participantes.' }, error: null };
    }

    // 2. Parse and rank entries by metric (e.g. data.total_ivs DESC)
    const parsedEntries = rawEntries.map((e) => {
      const dataObj = typeof e.data === 'string' ? (JSON.parse(e.data) as Record<string, unknown>) : e.data; // open-record
      const score = Number((dataObj as Record<string, unknown>)?.total_ivs ?? 0); // open-record
      return {
        player_id: e.player_id,
        player_name: e.player_name,
        player_email: e.player_email,
        score,
        data: (dataObj || {}) as Record<string, unknown> // open-record
      };
    });

    parsedEntries.sort((a, b) => b.score - a.score);

    // Take top 3
    const top3 = parsedEntries.slice(0, 3);
    const winners: RankedWinner[] = [];

    const nowIso = Temporal.Now.instant().toString();
    const prizes = cfg.prizes || {};

    // 3. Insert awards for top 3
    for (let i = 0; i < top3.length; i++) {
      const entry = top3[i]!;
      const rank = COMPETITION_RANKS[i]!;
      const prize = prizes[rank] || { type: 'money', amount: 10000 };
      const awardId = `award_${targetEventId}_${entry.player_id}_${Temporal.Now.instant().epochMilliseconds}_${i}`;

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

      winners.push({
        rank,
        player_id: entry.player_id,
        player_name: entry.player_name,
        score: entry.score,
        entry_data: entry.data
      });
    }

    // 4. Record competition result
    const resultId = `result_${targetEventId}_${Temporal.Now.instant().epochMilliseconds}`;
    await queryLocal(`
      INSERT INTO competition_results (id, event_id, winners, ended_at)
      VALUES (?, ?, ?, ?)
    `, [resultId, targetEventId, JSON.stringify(winners), nowIso]);

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

    logger.info('DBRouter', `[EventRPC] Successfully awarded competition "${targetEventId}" to ${winners.length} winners.`);
    return { data: { ok: true, success: true, winners }, error: null };
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
