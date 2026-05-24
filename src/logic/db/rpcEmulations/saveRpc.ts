import { queryLocal, persistSQLite } from '../sqliteEngine.ts';
import type { SQLiteDatabase } from '../sqliteEngine.ts';
import type { DBResponse } from '@/types/database';

export async function emulateSaveGameTrusted(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>,
  context: { userId: string }
): Promise<DBResponse> {
  const { p_save_data, p_expected_id } = params as { p_save_data: Record<string, unknown>, p_expected_id: string | null };
  const { userId } = context;
  const newSaveId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11) + Temporal.Now.instant().epochMilliseconds.toString(36);
  
  // 1. Verificar concurrencia (optimistic lock)
  if (p_expected_id) {
    const current = await queryLocal("SELECT last_save_id FROM game_saves WHERE user_id = ?", [userId]);
    if (current.length > 0 && current[0]!.last_save_id !== p_expected_id) {
      return { data: { success: false, error: 'OUT_OF_SYNC', current_id: current[0]!.last_save_id }, error: null };
    }
  }

  // 2. Upsert del save
  sqliteDb.run(
    `INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) 
     VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
     ON CONFLICT(user_id) DO UPDATE SET 
      save_data = excluded.save_data, 
      last_save_id = excluded.last_save_id, 
      updated_at = excluded.updated_at`,
    [userId, JSON.stringify(p_save_data), newSaveId]
  );

  await persistSQLite();
  return { data: { success: true, last_save_id: newSaveId }, error: null };
}

export async function emulateReportPassiveBattle(
  sqliteDb: SQLiteDatabase,
  params: Record<string, unknown>
): Promise<DBResponse> {
  const { p_opponent_id, p_result, p_report_data } = params;
  sqliteDb.run(
    `INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data) VALUES (?, ?, ?, ?)`,
    ['local_user', p_opponent_id, p_result, JSON.stringify(p_report_data)]
  );
  await persistSQLite();
  return { data: { success: true }, error: null };
}
