import { queryLocal, persistSQLite, type SQLiteDatabase } from '../sqliteEngine.ts';
import { logger } from '@/logic/utils/logger.ts';
import { getServerInstant } from '@/logic/utils/timeUtils.ts';
import { MIN_INITIAL_ELO, ELO_SOFT_RESET_DIVISOR } from '@/logic/pvp/eloRatingMath.ts';
import type { DBResponse } from '@/types/system/database';

const RECENT_AWARD_LOCKOUT_MS = 600000 as const; // 10 minutes in ms
const MIN_MATCHES_FOR_RANKED = 5 as const;

interface StoredEligiblePlayer {
  id: string;
  username: string;
  email: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

interface RankedPodiumEntry {
  rank: number;
  tier: string;
  player_id: string;
  player_name: string;
  player_email: string;
  elo: number;
}

/**
 * Offline emulation for fn_award_ranked_season_automated RPC.
 * Awards tier-based prizes to all players with >= 5 matches, records podium,
 * grants seasonal ranked medals for player profiles, and performs the proportional ELO soft reset.
 */
export async function emulateAwardRankedSeasonAutomated(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown> = {}
): Promise<DBResponse> {
  const targetSeasonName = (params.p_season_name || params.season_name || 'Temporada 1') as string;
  const targetEventId = 'ranked_season_' + (targetSeasonName || 'actual');

  try {
    const rulesRows = await queryLocal('SELECT * FROM ranked_rules_config WHERE id = ?', ['current']);
    const rulesRow = rulesRows[0] as { last_awarded_at?: string } | undefined;
    const now = getServerInstant();
    const nowIso = now.toString();

    // 10-minute lockout guard to match Postgres procedure
    if (rulesRow?.last_awarded_at) {
      const lastEpochMs = Temporal.Instant.from(rulesRow.last_awarded_at).epochMilliseconds;
      if (now.epochMilliseconds - lastEpochMs < RECENT_AWARD_LOCKOUT_MS) {
        return { data: { ok: false, error: 'Ya premiado recientemente.' }, error: null };
      }
    }

    // Query players who completed at least 5 matches with ELO >= 1000
    const rawRows = await queryLocal(`
      SELECT 
        id,
        username,
        COALESCE(email, '') as email,
        COALESCE(elo_rating, ${MIN_INITIAL_ELO}) as elo,
        COALESCE(pvp_wins, 0) as wins,
        COALESCE(pvp_losses, 0) as losses,
        COALESCE(pvp_draws, 0) as draws
      FROM profiles
      WHERE (COALESCE(pvp_wins, 0) + COALESCE(pvp_losses, 0) + COALESCE(pvp_draws, 0)) >= ${MIN_MATCHES_FOR_RANKED}
        AND COALESCE(elo_rating, ${MIN_INITIAL_ELO}) >= ${MIN_INITIAL_ELO}
      ORDER BY elo_rating DESC, id ASC
    `);

    const eligiblePlayers: StoredEligiblePlayer[] = rawRows.map(r => ({
      id: String(r.id),
      username: String(r.username || ''),
      email: String(r.email || ''),
      elo: Number(r.elo) || MIN_INITIAL_ELO,
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
      draws: Number(r.draws) || 0
    }));

    let rank = 0;
    let awardsCount = 0;
    const podium: RankedPodiumEntry[] = [];

    for (const player of eligiblePlayers) {
      rank++;
      let tier = 'bronce';
      if (player.elo >= 3400) tier = 'maestro';
      else if (player.elo >= 2700) tier = 'diamante';
      else if (player.elo >= 2100) tier = 'platino';
      else if (player.elo >= 1600) tier = 'oro';
      else if (player.elo >= 1200) tier = 'plata';

      if (rank <= 10) {
        podium.push({
          rank,
          tier,
          player_id: player.id,
          player_name: player.username,
          player_email: player.email,
          elo: player.elo
        });
      }

      // Generate tier prizes & seasonal medal
      const prizes: Record<string, unknown>[] = [];

      // 1. Seasonal Achievement Medal (for player profile showcase)
      prizes.push({
        type: 'ranked_medal',
        tier,
        season: targetSeasonName || 'TEMPORADA ACTUAL',
        rank,
        elo: player.elo
      });

      if (tier === 'maestro') {
        prizes.push(
          { type: 'pokemon', species: 'eevee', level: 50, shiny: true, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } },
          { type: 'item', item: 'Ticket Cueva Celeste', qty: 3 },
          { type: 'item', item: 'Ticket Islas Espumas', qty: 3 },
          { type: 'bc', amount: 500, battleCoins: 500 }
        );
      } else if (tier === 'diamante') {
        prizes.push(
          { type: 'pokemon', species: 'eevee', level: 50, shiny: false, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 28 } },
          { type: 'item', item: 'Ticket Cueva Celeste', qty: 2 },
          { type: 'item', item: 'Ticket Islas Espumas', qty: 2 },
          { type: 'bc', amount: 350, battleCoins: 350 }
        );
      } else if (tier === 'platino') {
        prizes.push(
          { type: 'item', item: 'Ticket Cueva Celeste', qty: 2 },
          { type: 'item', item: 'Ticket Islas Espumas', qty: 2 },
          { type: 'bc', amount: 250, battleCoins: 250 }
        );
      } else if (tier === 'oro') {
        prizes.push(
          { type: 'item', item: 'Ticket Cueva Celeste', qty: 1 },
          { type: 'item', item: 'Ticket Islas Espumas', qty: 1 },
          { type: 'bc', amount: 150, battleCoins: 150 }
        );
      } else if (tier === 'plata') {
        prizes.push(
          { type: 'item', item: 'Ticket Cueva Celeste', qty: 1 },
          { type: 'bc', amount: 75, battleCoins: 75 }
        );
      } else {
        prizes.push(
          { type: 'bc', amount: 25, battleCoins: 25 }
        );
      }

      for (let i = 0; i < prizes.length; i++) {
        const awardId = `award_${targetEventId}_${player.id}_${i}_${now.epochMilliseconds}`;
        await queryLocal(`
          INSERT INTO awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)
        `, [awardId, targetEventId, player.id, player.username, player.email, JSON.stringify(prizes[i]), nowIso]);
        awardsCount++;
      }
    }

    // Save podium to competition_results
    if (podium.length > 0) {
      const resultId = `result_${targetEventId}_${now.epochMilliseconds}`;
      await queryLocal(`
        INSERT INTO competition_results (id, event_id, winners, ended_at)
        VALUES (?, ?, ?, ?)
      `, [resultId, targetEventId, JSON.stringify(podium), nowIso]);
    }

    // Proportional ELO Soft Reset: Math.floor(max(1000, 1000 + (elo - 1000) / 2))
    await queryLocal(`
      UPDATE profiles
      SET elo_rating = MAX(${MIN_INITIAL_ELO}, CAST(${MIN_INITIAL_ELO} + ((COALESCE(elo_rating, ${MIN_INITIAL_ELO}) - ${MIN_INITIAL_ELO}) / ${ELO_SOFT_RESET_DIVISOR}) AS INTEGER))
    `);

    // Update ranked_rules_config execution record
    await queryLocal(`
      INSERT INTO ranked_rules_config (id, season_name, last_awarded_at, updated_at)
      VALUES ('current', ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        last_awarded_at = excluded.last_awarded_at,
        updated_at = excluded.updated_at
    `, [targetSeasonName, nowIso, nowIso]);

    await persistSQLite();

    logger.info('DBRouter', `[RankedRPC] Successfully awarded ranked season "${targetSeasonName}" to ${eligiblePlayers.length} players (${awardsCount} awards).`);
    return {
      data: {
        ok: true,
        success: true,
        event_id: targetEventId,
        eligible_players: eligiblePlayers.length,
        awards_created: awardsCount,
        podium_count: podium.length
      },
      error: null
    };
  } catch (err) {
    logger.error('DBRouter', `[RankedRPC] Error awarding ranked season: ${(err as Error).message}`);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Offline emulation for record_passive_battle_result RPC.
 * Records the battle report into passive_battle_reports and adjusts the defender's ELO.
 */
export async function emulateRecordPassiveBattleResult(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown> = {},
  context: { userId: string; username: string } = { userId: 'local_user', username: 'Invitado' }
): Promise<DBResponse> {
  const defenderId = (params.p_defender_id || params.defender_id) as string;
  const result = String(params.p_result || params.result || '');
  const deltaElo = Number(params.p_delta_elo ?? params.delta_elo ?? 0);
  const reportData = params.p_report_data || params.report_data || {};
  const callerId = context.userId || 'local_user';

  if (!defenderId) {
    return { data: null, error: 'p_defender_id is required' };
  }

  try {
    const reportDataStr = typeof reportData === 'string' ? reportData : JSON.stringify(reportData);
    const nowIso = getServerInstant().toString();

    await queryLocal(`
      INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, [defenderId, callerId, result, reportDataStr, nowIso]);

    await queryLocal(`
      UPDATE profiles
      SET elo_rating = MAX(${MIN_INITIAL_ELO}, COALESCE(elo_rating, ${MIN_INITIAL_ELO}) + ?)
      WHERE id = ?
    `, [deltaElo, defenderId]);

    await persistSQLite();

    logger.info('DBRouter', `[RankedRPC] Recorded passive battle against defender ${defenderId}: result=${result}, deltaElo=${deltaElo}`);
    return { data: { ok: true, success: true }, error: null };
  } catch (err) {
    logger.error('DBRouter', `[RankedRPC] Error recording passive battle result: ${(err as Error).message}`);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Offline emulation for fn_publish_battle_replay RPC.
 * Stores battle replay record with Top 10 detection and returns replay metadata.
 */
export async function emulatePublishBattleReplay(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown> = {},
  context: { userId: string; username: string } = { userId: 'local_user', username: 'Invitado' }
): Promise<DBResponse> {
  const payload = (params.payload || params) as Record<string, unknown>; // open-record: Generic key-value data dictionary container

  try {
    let battleCode = String(payload.battleCode || payload.battle_code || '').trim();
    if (!battleCode) {
      const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      battleCode = `BTL-${p1}-${p2}`;
    }

    const seasonId = String(payload.seasonId || payload.season_id || 'TEMPORADA ACTUAL');
    const themeId = String(payload.themeId || payload.theme_id || 'masters_allstars');

    const rawP1 = (payload.p1 || payload.p1_data || {}) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    const rawP2 = (payload.p2 || payload.p2_data || {}) as Record<string, unknown>; // open-record: Generic key-value data dictionary container

    let p1UserId = String(payload.p1_user_id || rawP1.userId || context.userId || '');
    const p2UserId = String(payload.p2_user_id || rawP2.userId || '');
    if (!p1UserId) p1UserId = 'local_user';

    const turnsCount = Number(payload.turnsCount ?? payload.turns_count ?? 0);
    const winnerSide = String(payload.winnerSide || payload.winner_side || 'p1');
    const choiceStream = payload.choiceStream || payload.choice_stream || [];
    const initialSeed = payload.initialSeed || payload.initial_seed || [0, 0, 0, 0];

    // Check if either participant is in Top 10
    let isTop10 = Boolean(payload.isTop10Archived || payload.is_top10_archived);
    if (!isTop10 && (p1UserId || p2UserId)) {
      const top10Rows = await queryLocal(`
        SELECT id FROM profiles
        ORDER BY COALESCE(elo_rating, ${MIN_INITIAL_ELO}) DESC
        LIMIT 10
      `);
      const top10Ids = new Set(top10Rows.map(r => String(r.id)));
      if (top10Ids.has(p1UserId) || (p2UserId && top10Ids.has(p2UserId))) {
        isTop10 = true;
      }
    }

    // Check if battle code already exists (views count increment)
    const existingRows = await queryLocal('SELECT id, created_at, is_top10_archived, views_count FROM battle_replays WHERE battle_code = ?', [battleCode]);
    const existing = existingRows[0];
    if (existing) {
      await queryLocal('UPDATE battle_replays SET views_count = views_count + 1 WHERE battle_code = ?', [battleCode]);
      await persistSQLite();

      return {
        data: {
          ok: true,
          replayId: String(existing.id),
          battleCode,
          isTop10Archived: Boolean(existing.is_top10_archived),
          createdAt: String(existing.created_at)
        },
        error: null
      };
    }

    const replayId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `replay_${getServerInstant().epochMilliseconds}`;
    const nowIso = getServerInstant().toString();

    await queryLocal(`
      INSERT INTO battle_replays (
        id, battle_code, season_id, theme_id, p1_user_id, p2_user_id,
        p1_data, p2_data, turns_count, winner_side, choice_stream,
        initial_seed, is_top10_archived, views_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      replayId,
      battleCode,
      seasonId,
      themeId,
      p1UserId || null,
      p2UserId || null,
      JSON.stringify(rawP1),
      JSON.stringify(rawP2),
      turnsCount,
      winnerSide,
      JSON.stringify(choiceStream),
      JSON.stringify(initialSeed),
      isTop10 ? 1 : 0,
      nowIso
    ]);

    await persistSQLite();

    logger.info('DBRouter', `[RankedRPC] Published battle replay ${battleCode} (id=${replayId}, isTop10=${isTop10})`);
    return {
      data: {
        ok: true,
        replayId,
        battleCode,
        isTop10Archived: isTop10,
        createdAt: nowIso
      },
      error: null
    };
  } catch (err) {
    logger.error('DBRouter', `[RankedRPC] Error publishing battle replay: ${(err as Error).message}`);
    return { data: null, error: (err as Error).message };
  }
}

/**
 * Offline emulation for fn_get_featured_replays RPC.
 * Retrieves Top 10 and recent replays for the Theater feed.
 */
export async function emulateGetFeaturedReplays(
  _sqliteDb: SQLiteDatabase,
  params: Record<string, unknown> = {}
): Promise<DBResponse> {
  const limit = Math.min(50, Math.max(1, Number(params.p_limit ?? params.limit ?? 10)));

  try {
    const rows = await queryLocal(`
      SELECT 
        id,
        battle_code as battleCode,
        season_id as seasonId,
        theme_id as themeId,
        p1_data,
        p2_data,
        turns_count as turnsCount,
        winner_side as winnerSide,
        is_top10_archived as isTop10Archived,
        views_count as viewsCount,
        created_at as createdAt
      FROM battle_replays
      ORDER BY is_top10_archived DESC, created_at DESC
      LIMIT ?
    `, [limit]);

    const replays = rows.map(r => {
      let p1 = {};
      let p2 = {};
      try {
        p1 = typeof r.p1_data === 'string' ? JSON.parse(r.p1_data) : (r.p1_data || {});
      } catch {
        p1 = {};
      }
      try {
        p2 = typeof r.p2_data === 'string' ? JSON.parse(r.p2_data) : (r.p2_data || {});
      } catch {
        p2 = {};
      }

      return {
        id: String(r.id),
        battleCode: String(r.battleCode),
        seasonId: String(r.seasonId),
        themeId: String(r.themeId),
        p1,
        p2,
        turnsCount: Number(r.turnsCount) || 0,
        winnerSide: String(r.winnerSide),
        isTop10Archived: Boolean(r.isTop10Archived),
        viewsCount: Number(r.viewsCount) || 0,
        createdAt: String(r.createdAt)
      };
    });

    return { data: replays, error: null };
  } catch (err) {
    logger.error('DBRouter', `[RankedRPC] Error getting featured replays: ${(err as Error).message}`);
    return { data: null, error: (err as Error).message };
  }
}

