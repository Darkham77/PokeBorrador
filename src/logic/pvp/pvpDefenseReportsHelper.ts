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

const MAX_DEFENSE_REPORTS_LIMIT = 10 as const;
const DEFAULT_TRAINER_LEVEL = 1 as const;
const DEFAULT_PLAYER_CLASS = 'Entrenador' as const;

function parseReportData(rawData: unknown): PassiveBattleReportData {
  if (typeof rawData === 'string') {
    try {
      return JSON.parse(rawData) as PassiveBattleReportData;
    } catch {
      return {};
    }
  }
  if (typeof rawData === 'object' && rawData !== null) {
    return rawData as PassiveBattleReportData;
  }
  return {};
}

async function fetchOpponentProfilesMap(
  db: DBRouter,
  opponentIds: string[]
): Promise<Map<string, PassiveOpponentProfile>> {
  const profileMap = new Map<string, PassiveOpponentProfile>();
  if (opponentIds.length === 0) return profileMap;

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
          playerClass: p.player_class || DEFAULT_PLAYER_CLASS,
          level: p.trainer_level || DEFAULT_TRAINER_LEVEL,
          trainer_level: p.trainer_level || DEFAULT_TRAINER_LEVEL,
          avatar_style: p.avatar_style,
          avatarStyle: p.avatar_style,
          nick_style: p.nick_style,
          faction: p.faction,
          elo_rating: p.elo_rating
        });
      }
    }
  } catch (err) {
    logger.warn('[pvpDefenseReportsHelper] Error en enriquecimiento de perfiles:', err);
  }

  return profileMap;
}

function notifyUnseenDefenseReports(
  userUid: string,
  formattedReports: PassiveBattleReport[],
  notifyFn?: (msg: string, icon: string) => void
): void {
  const storageKey = `pvp_last_seen_defense_report_${userUid}`;
  const lastSeenReportId = typeof localStorage !== 'undefined' ? Number(localStorage.getItem(storageKey) || 0) : 0;
  const newReports = formattedReports.filter(r => Number(r.id) > lastSeenReportId);

  if (newReports.length === 0 || !notifyFn) return;

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

export async function fetchAndFormatDefenseReports(
  db: DBRouter,
  userUid: string,
  notifyFn?: (msg: string, icon: string) => void
): Promise<PassiveBattleReport[]> {
  try {
    const { data: reports } = await db
      .from('passive_battle_reports')
      .select('*')
      .eq('user_id', userUid)
      .order('created_at', { ascending: false })
      .limit(MAX_DEFENSE_REPORTS_LIMIT) as { data: RawDefenseReportRow[] | null };

    if (!reports || reports.length === 0) {
      return [];
    }

    const opponentIds = [...new Set(reports.map(r => r.opponent_id).filter(id => id && id !== 'local_user'))];
    const profileMap = await fetchOpponentProfilesMap(db, opponentIds);

    const formattedReports: PassiveBattleReport[] = reports.map(r => ({
      id: String(r.id),
      user_id: r.user_id,
      opponent_id: r.opponent_id,
      result: r.result,
      report_data: parseReportData(r.report_data),
      opponent_profile: r.opponent_id ? (profileMap.get(r.opponent_id) || null) : null,
      created_at: r.created_at
    }));

    notifyUnseenDefenseReports(userUid, formattedReports, notifyFn);

    return formattedReports;
  } catch (err) {
    logger.error('PVP', 'Error al consultar reportes de defensa:', err);
    return [];
  }
}
