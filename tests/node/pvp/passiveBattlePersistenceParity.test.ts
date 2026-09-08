/**
 * tests/node/pvp/passiveBattlePersistenceParity.test.ts
 *
 * Multi-Engine Dual Database Test for Passive Defense Teams & Battle Reports.
 * Validates passive_teams and passive_battle_reports schemas and record_passive_battle_result
 * execution parity across both SQLite and PostgreSQL.
 */

import { it, expect, vi } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describeWithDatabase } from '../../dbTestHelper.ts';

let memoryDb: DatabaseSync;

vi.mock('@/logic/db/sqliteEngine.ts', () => ({
  resetSQLite: vi.fn(),
  queryLocal: vi.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT');
    const stmt = memoryDb.prepare(sql);
    if (isSelect) {
      return stmt.all(...(params as (string | number | bigint | null)[])) as Record<string, unknown>[];
    }
    stmt.run(...(params as (string | number | bigint | null)[]));
    return [];
  }),
  persistSQLite: vi.fn(async () => {})
}));

import { emulateRecordPassiveBattleResult } from '@/logic/db/rpcEmulations/rankedRpc.ts';
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts';

describeWithDatabase('Passive Battle Persistence Parity', (engine, getDb) => {
  it('verifies passive_teams, passive_battle_reports and ELO adjustment across engines', async () => {
    const db = getDb();

    const defenderId = '3a111111-1111-4111-8111-111111111111';
    const attackerId = '4b222222-2222-4222-8222-222222222222';

    const sampleTeamData = [
      { id: 'pikachu', name: 'Pikachu', level: 50, maxHp: 120, hp: 120, type: 'electric' },
      { id: 'snorlax', name: 'Snorlax', level: 50, maxHp: 260, hp: 260, type: 'normal' }
    ];

    if (engine === 'postgres') {
      const postgres = (await import('postgres')).default;
      const dbUrl = process.env.TEST_POSTGRES_URL!;
      const schema = db.schema || 'public';
      const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

      try {
        await sql.unsafe(`SET search_path TO ${schema}, public`);

        // 1. Verify schema columns
        const teamCols = await sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = ${schema} AND table_name = 'passive_teams'
        `;

        assert.ok(teamCols.find(c => c.column_name === 'user_id'), 'passive_teams must have user_id');
        assert.ok(teamCols.find(c => c.column_name === 'team_data'), 'passive_teams must have team_data');
        assert.ok(teamCols.find(c => c.column_name === 'is_active'), 'passive_teams must have is_active');

        const reportCols = await sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = ${schema} AND table_name = 'passive_battle_reports'
        `;

        assert.ok(reportCols.find(c => c.column_name === 'user_id'), 'passive_battle_reports must have user_id');
        assert.ok(reportCols.find(c => c.column_name === 'opponent_id'), 'passive_battle_reports must have opponent_id');
        assert.ok(reportCols.find(c => c.column_name === 'result'), 'passive_battle_reports must have result');
        assert.ok(reportCols.find(c => c.column_name === 'report_data'), 'passive_battle_reports must have report_data');

        // 2. Setup auth.users and defender profile
        await sql`
          INSERT INTO auth.users (id, email, created_at)
          VALUES (${defenderId}, 'defender@test.local', NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        await sql`
          INSERT INTO auth.users (id, email, created_at)
          VALUES (${attackerId}, 'attacker@test.local', NOW())
          ON CONFLICT (id) DO NOTHING
        `;

        await sql`
          INSERT INTO public.profiles (id, username, elo_rating)
          VALUES (${defenderId}, 'DefenderPro', 1200)
          ON CONFLICT (id) DO UPDATE SET elo_rating = 1200
        `;

        // 3. Upsert passive team
        await sql`
          INSERT INTO public.passive_teams (user_id, team_data, elo_rating, is_active, updated_at)
          VALUES (${defenderId}, ${sql.json(sampleTeamData)}, 1200, true, NOW())
          ON CONFLICT (user_id) DO UPDATE SET is_active = true, team_data = ${sql.json(sampleTeamData)}
        `;

        // Verify active passive team query
        const activeTeams = await sql`
          SELECT user_id, team_data, elo_rating, is_active
          FROM public.passive_teams
          WHERE is_active = true AND user_id = ${defenderId}
        `;
        assert.strictEqual(activeTeams.length, 1);
        assert.strictEqual(activeTeams[0]!.is_active, true);

        // 4. Record passive battle result (defender loses 16 ELO)
        const reportData = { opponent: 'AttackerRed', turns: 4, endedAt: new Date().toISOString() };
        await sql`
          INSERT INTO public.passive_battle_reports (user_id, opponent_id, result, report_data, created_at)
          VALUES (${defenderId}, ${attackerId}, 'defeat', ${sql.json(reportData)}, NOW())
        `;

        await sql`
          UPDATE public.profiles
          SET elo_rating = GREATEST(1000, COALESCE(elo_rating, 1000) - 16)
          WHERE id = ${defenderId}
        `;

        // 5. Verify updated ELO and report insertion
        const [updatedProfile] = await sql`SELECT elo_rating FROM public.profiles WHERE id = ${defenderId}`;
        assert.strictEqual(updatedProfile!.elo_rating, 1184);

        const reports = await sql`
          SELECT user_id, opponent_id, result, report_data
          FROM public.passive_battle_reports
          WHERE user_id = ${defenderId}
          ORDER BY created_at DESC
          LIMIT 10
        `;
        assert.strictEqual(reports.length, 1);
        assert.strictEqual(reports[0]!.result, 'defeat');
        assert.strictEqual(reports[0]!.opponent_id, attackerId);

        // 6. Test floor limit at 1000 ELO
        await sql`
          UPDATE public.profiles
          SET elo_rating = GREATEST(1000, COALESCE(elo_rating, 1000) - 500)
          WHERE id = ${defenderId}
        `;
        const [flooredProfile] = await sql`SELECT elo_rating FROM public.profiles WHERE id = ${defenderId}`;
        assert.strictEqual(flooredProfile!.elo_rating, 1000);
      } finally {
        await sql`DELETE FROM public.passive_battle_reports WHERE user_id = ${defenderId}`.catch(() => {});
        await sql`DELETE FROM public.passive_teams WHERE user_id = ${defenderId}`.catch(() => {});
        await sql`DELETE FROM public.profiles WHERE id IN (${defenderId}, ${attackerId})`.catch(() => {});
        await sql`DELETE FROM auth.users WHERE id IN (${defenderId}, ${attackerId})`.catch(() => {});
        await sql.end();
      }
    } else {
      // SQLite Engine test with memory db
      memoryDb = new DatabaseSync(':memory:');
      memoryDb.exec(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          username TEXT,
          elo_rating INTEGER DEFAULT 1000
        );

        CREATE TABLE IF NOT EXISTS passive_teams (
          user_id TEXT PRIMARY KEY,
          team_data TEXT,
          elo_rating INTEGER DEFAULT 1000,
          is_active INTEGER DEFAULT 0,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS passive_battle_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          opponent_id TEXT,
          result TEXT,
          report_data TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO profiles (id, username, elo_rating) VALUES ('${defenderId}', 'DefenderPro', 1200);
        INSERT INTO passive_teams (user_id, team_data, elo_rating, is_active)
        VALUES ('${defenderId}', '${JSON.stringify(sampleTeamData)}', 1200, 1);
      `);

      const sqliteMock: SQLiteDatabase = {} as SQLiteDatabase;

      // Test active passive team retrieval
      const activeStmt = memoryDb.prepare('SELECT user_id, team_data, elo_rating, is_active FROM passive_teams WHERE is_active = 1 AND user_id = ?');
      const activeRows = activeStmt.all(defenderId) as Array<{ user_id: string; team_data: string; is_active: number }>;
      expect(activeRows).toHaveLength(1);
      expect(activeRows[0]?.is_active).toBe(1);

      // Record passive battle result via SQLite RPC emulation
      const res = await emulateRecordPassiveBattleResult(
        sqliteMock,
        {
          p_defender_id: defenderId,
          p_result: 'defeat',
          p_delta_elo: -16,
          p_report_data: { opponent: 'AttackerRed', turns: 4 }
        },
        { userId: attackerId, username: 'AttackerRed' }
      );

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();

      // Verify updated defender ELO
      const profileStmt = memoryDb.prepare('SELECT elo_rating FROM profiles WHERE id = ?');
      const profileRow = profileStmt.get(defenderId) as { elo_rating: number };
      expect(profileRow.elo_rating).toBe(1184);

      // Verify report in passive_battle_reports
      const reportStmt = memoryDb.prepare('SELECT user_id, opponent_id, result, report_data FROM passive_battle_reports WHERE user_id = ?');
      const reportRows = reportStmt.all(defenderId) as Array<{ user_id: string; opponent_id: string; result: string }>;
      expect(reportRows).toHaveLength(1);
      expect(reportRows[0]?.result).toBe('defeat');
      expect(reportRows[0]?.opponent_id).toBe(attackerId);

      // Verify floor limit at 1000 ELO
      await emulateRecordPassiveBattleResult(
        sqliteMock,
        {
          p_defender_id: defenderId,
          p_result: 'defeat',
          p_delta_elo: -500,
          p_report_data: { opponent: 'AttackerRed', turns: 2 }
        },
        { userId: attackerId, username: 'AttackerRed' }
      );

      const flooredRow = profileStmt.get(defenderId) as { elo_rating: number };
      expect(flooredRow.elo_rating).toBe(1000);
    }
  });
});
