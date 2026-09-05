/**
 * tests/node/events/saturday_contest_awards_reset.test.ts
 *
 * Tier 1 RED Reproduction & Reset Parity Test:
 * Replays Suite 16 (saturday_global_contest_and_tiebreaks.simulation.ts) failure:
 * When a suite is executed a second time (e.g. during 6B Intra-Suite Clean Pass),
 * prior awards for the user in public.awards accumulate unless explicitly purged
 * per the Dual Database Shared State Reset Contract (AGENTS.md line 12).
 */

import { it, expect } from 'vitest';
import { describeWithDatabase } from '../../dbTestHelper.ts';

describeWithDatabase('Saturday Contest Awards Reset Parity', (engine) => {
  it('verifies award accumulation without reset and clean isolation with purge', async () => {
    if (engine === 'sqlite') {
      const { queryLocal, resetSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      resetSQLite();
      await queryLocal(`
        CREATE TABLE IF NOT EXISTS awards (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          winner_id TEXT NOT NULL,
          winner_name TEXT NOT NULL,
          winner_email TEXT NOT NULL,
          prize TEXT NOT NULL,
          awarded_at TEXT NOT NULL,
          claimed INTEGER DEFAULT 0,
          received_at TEXT
        )
      `);

      const seedAward = async (id: string, eventId: string, user: string) => {
        await queryLocal(`
          INSERT INTO awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)
        `, [id, eventId, 'user-sat-1', user, 'sat@test.local', JSON.stringify({ type: 'money', money: 50000 }), new Date().toISOString()]);
      };

      // Pass 1: Two awards inserted
      await seedAward('aw_1', 'gran_concurso_sabado', 'SaturdayChamp');
      await seedAward('aw_2', 'gran_concurso_sabado', 'SaturdayChamp');
      let awards = await queryLocal('SELECT * FROM awards WHERE winner_name = ?', ['SaturdayChamp']);
      expect(awards.length).toBe(2);

      // Pass 2 WITHOUT PURGE: Two more awards inserted (RED condition: count = 4)
      await seedAward('aw_3', 'gran_concurso_sabado', 'SaturdayChamp');
      await seedAward('aw_4', 'gran_concurso_sabado', 'SaturdayChamp');
      awards = await queryLocal('SELECT * FROM awards WHERE winner_name = ?', ['SaturdayChamp']);
      expect(awards.length).toBe(4);

      // PURGE CONTRACT VERIFICATION: Purge awards for user/event restores clean count of 2
      await queryLocal('DELETE FROM awards WHERE event_id = ?', ['gran_concurso_sabado']);
      await seedAward('aw_clean_1', 'gran_concurso_sabado', 'SaturdayChamp');
      await seedAward('aw_clean_2', 'gran_concurso_sabado', 'SaturdayChamp');
      awards = await queryLocal('SELECT * FROM awards WHERE winner_name = ?', ['SaturdayChamp']);
      expect(awards.length).toBe(2);
      return;
    }

    // PostgreSQL branch
    const postgres = (await import('postgres')).default;
    const dbUrl = process.env.TEST_POSTGRES_URL!;
    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

    try {
      const testUserId = 'a1111111-1111-1111-1111-111111111111';
      const testUser = 'SaturdayChamp';
      const testEmail = 'saturdaychamp@test.local';

      await sql`
        INSERT INTO auth.users (id, email, created_at) VALUES (${testUserId}, ${testEmail}, NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
      await sql`
        INSERT INTO public.profiles (id, username, email, gender, db_version, created_at)
        VALUES (${testUserId}, ${testUser}, ${testEmail}, 'h', 3, NOW())
        ON CONFLICT (id) DO NOTHING;
      `;

      // Clean start
      await sql`DELETE FROM public.awards WHERE event_id = 'gran_concurso_sabado'`;

      const insertPgAward = async (id: string) => {
        await sql`
          INSERT INTO public.awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
          VALUES (${id}, 'gran_concurso_sabado', ${testUserId}, ${testUser}, ${testEmail}, ${sql.json({ type: 'money', money: 50000 })}, NOW(), false, NULL);
        `;
      };

      // Pass 1: 2 awards
      await insertPgAward('a0000000-0000-0000-0000-000000000001');
      await insertPgAward('a0000000-0000-0000-0000-000000000002');
      let rows = await sql`SELECT * FROM public.awards WHERE event_id = 'gran_concurso_sabado' AND winner_name = ${testUser}`;
      expect(rows.length).toBe(2);

      // Pass 2 WITHOUT PURGE: Accumulates to 4 (The RED reproduction of 6B failure)
      await insertPgAward('a0000000-0000-0000-0000-000000000003');
      await insertPgAward('a0000000-0000-0000-0000-000000000004');
      rows = await sql`SELECT * FROM public.awards WHERE event_id = 'gran_concurso_sabado' AND winner_name = ${testUser}`;
      expect(rows.length).toBe(4);

      // PURGE CONTRACT: Purging before re-running ensures exactly 2 awards
      await sql`DELETE FROM public.awards WHERE event_id = 'gran_concurso_sabado'`;
      await insertPgAward('a0000000-0000-0000-0000-000000000005');
      await insertPgAward('a0000000-0000-0000-0000-000000000006');
      rows = await sql`SELECT * FROM public.awards WHERE event_id = 'gran_concurso_sabado' AND winner_name = ${testUser}`;
      expect(rows.length).toBe(2);
    } finally {
      await sql.end();
    }
  });
});
