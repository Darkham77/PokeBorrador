/**
 * src/logic/pvp/pvpDefenseReportsHelper.ts
 *
 * Helper for querying, enriching, and formatting passive defense battle reports.
 * Manages opponent profile lookups and unnotified defense battle notifications.
 */

import { logger } from '@/logic/utils/logger.ts';
import type { DBRouter } from '@/logic/db/dbRouter.ts';
import type {
  PassiveBattleReport,
  PassiveBattleReportData,
  PassiveOpponentProfile,
  PassiveBattleResult
} from '@/types/battle/pvp.ts';

interface ProfileQueryRow {
  id: string;
  username?: string;
  player_class?: string;
  trainer_level?: number;
  avatar_style?: string;
  nick_style?: string;
  faction?: string;
  elo_rating?: number;
}

interface RawDefenseReportRow {
  id: number | string;
  user_id: string;
  opponent_id: string;
  result: PassiveBattleResult;
  report_data: unknown;
  created_at: string;
}

const MAX_DEFENSE_REPORTS_LIMIT = 10;

export async function fetchAndFormatDefenseReports(
  db: DBRouter,
  userId: string,
  notifyFn?: (msg: string, icon: string) => void
): Promise<PassiveBattleReport[]> {
  try {
    const { data: reports } = await db
      .from('passive_battle_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_DEFENSE_REPORTS_LIMIT) as { data: RawDefenseReportRow[] | null };

    if (!reports || reports.length === 0) {
      return [];
    }

    const opponentIds = [...new Set(reports.map(r => r.opponent_id).filter(id => id && id !== 'local_user'))];
    const profileMap = new Map<string, PassiveOpponentProfile>();

    if (opponentIds.length > 0) {
      try {
        const { data: profiles } = await db
          .from('profiles')
          .select('id, username, player_class, trainer_level, avatar_style, nick_style, faction, elo_rating')
          .in('id', opponentIds) as { data: ProfileQueryRow[] | null };

        if (profiles) {
          for (const p of profiles) {
            profileMap.set(String(p.id), {
              id: p.id,
              username: p.username,
              playerClass: p.player_class || 'Entrenador',
              level: p.trainer_level || 1,
              trainer_level: p.trainer_level || 1,
              avatar_style: p.avatar_style,
              avatarStyle: p.avatar_style,
              nick_style: p.nick_style,
              faction: p.faction,
              elo_rating: p.elo_rating
            });
          }
        }
      } catch {
        // Non-fatal profile enrichment failure
      }
    }

    const formattedReports: PassiveBattleReport[] = reports.map(r => {
      let parsedData: PassiveBattleReportData = {};
      if (typeof r.report_data === 'string') {
        try {
          parsedData = JSON.parse(r.report_data) as PassiveBattleReportData;
        } catch {
          parsedData = {};
        }
      } else if (typeof r.report_data === 'object' && r.report_data !== null) {
        parsedData = r.report_data as PassiveBattleReportData;
      }
      const oppProfile = r.opponent_id ? (profileMap.get(r.opponent_id) || null) : null;
      return {
        id: String(r.id),
        user_id: r.user_id,
        opponent_id: r.opponent_id,
        result: r.result,
        report_data: parsedData,
        opponent_profile: oppProfile,
        created_at: r.created_at
      };
    });

    // Check for unnotified reports
    const storageKey = `pvp_last_seen_defense_report_${userId}`;
    const lastSeenReportId = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(storageKey) || 0) : 0;
    const newReports = formattedReports.filter(r => Number(r.id) > lastSeenReportId);

    if (newReports.length > 0 && notifyFn) {
      const wins = newReports.filter(r => r.result === 'victory').length;
      const losses = newReports.filter(r => r.result === 'defeat').length;
      notifyFn(
        `Defensa Pasiva: ${newReports.length} combate${newReports.length > 1 ? 's' : ''} en tu ausencia (${wins}V / ${losses}D).`,
        '🛡️'
      );
      const highestId = Math.max(...newReports.map(r => Number(r.id) || 0));
      if (typeof localStorage !== 'undefined' && highestId > 0) {
        localStorage.setItem(storageKey, String(highestId));
      }
    }

    return formattedReports;
  } catch (err) {
    logger.error('PVP', 'Error al consultar reportes de defensa:', err);
    return [];
  }
}
