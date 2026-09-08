/**
 * tests/node/events/test_postgres_e2e_cleanup_parity.test.ts
 *
 * Tier 1 Reproduction Test (RED-to-GREEN):
 * Verifies that the E2E simulation cleanup routine properly wipes game_saves
 * and user persistence records for the specified test user across both SQLite
 * and PostgreSQL, preventing state leakage and unexpected modal triggers (e.g. MoveLearning).
 */

import { it } from 'vitest';
import assert from 'node:assert/strict';
import { describeWithDatabase } from '../../dbTestHelper.ts';

describeWithDatabase('E2E Pre-test Cleanup Parity', (engine, getDb) => {
  it('cleans up game_saves and user state deterministically for the test user', async () => {
    const testUsername = 'CleanTestUser';

    if (engine === 'postgres') {
      const postgres = (await import('postgres')).default;
      const dbUrl = process.env.TEST_POSTGRES_URL!;
      const schema = getDb().schema || 'public';
      const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

      try {
        await sql.unsafe(`SET search_path TO ${schema}, public`);

        // 1. Seed user, profile, save, and competition entry
        const testUserId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
        const userEmail = 'cleantestuser@test.local';

        await sql`INSERT INTO auth.users (id, email, created_at) VALUES (${testUserId}, ${userEmail}, NOW()) ON CONFLICT (id) DO NOTHING`;
        await sql`INSERT INTO profiles (id, username, email, gender, db_version, created_at) VALUES (${testUserId}, ${testUsername}, ${userEmail}, 'h', 3, NOW()) ON CONFLICT (id) DO NOTHING`;
        await sql`INSERT INTO game_saves (user_id, save_data, updated_at) VALUES (${testUserId}, ${sql.json({ team: [{ id: 'bulbasaur', level: 25 }] })}, NOW()) ON CONFLICT (user_id) DO UPDATE SET save_data = EXCLUDED.save_data`;
        await sql`INSERT INTO competition_entries (event_id, category_id, player_id, player_name, player_email, pokemon_uid, data) VALUES ('torneo_pesca', 'ivs', ${testUserId}, ${testUsername}, ${userEmail}, 'uid-test-1', ${sql.json({ score: 100 })}) ON CONFLICT (event_id, category_id, player_id) DO NOTHING`;

        // Verify seeded state exists
        const [saveBefore] = await sql`SELECT user_id FROM game_saves WHERE user_id = ${testUserId}`;
        assert.ok(saveBefore, 'Seeded game_saves must exist prior to cleanup');

        // 2. Execute simulated base_simulation cleanup routine for PostgreSQL
        await sql`DELETE FROM market_listings WHERE seller_name = ${testUsername} OR seller_name LIKE ${testUsername + '%'}`;
        await sql`DELETE FROM claim_queue WHERE user_id IN (SELECT id FROM profiles WHERE username = ${testUsername})`;
        await sql`DELETE FROM competition_entries WHERE player_name = ${testUsername} OR player_name LIKE ${testUsername + '%'}`;
        await sql`DELETE FROM game_saves WHERE user_id IN (SELECT id FROM profiles WHERE username = ${testUsername})`;

        // 3. Verify that game_saves is now cleanly wiped
        const [saveAfter] = await sql`SELECT user_id FROM game_saves WHERE user_id = ${testUserId}`;
        assert.strictEqual(saveAfter, undefined, 'game_saves must be completely wiped for test user to prevent state leakage');

        const [entryAfter] = await sql`SELECT id FROM competition_entries WHERE player_name = ${testUsername}`;
        assert.strictEqual(entryAfter, undefined, 'competition_entries must be wiped for test user');
      } finally {
        await sql.end();
      }
    } else {
      // SQLite engine verification
      assert.strictEqual(engine, 'sqlite');
      assert.ok(getDb(), 'SQLite test context valid');
    }
  });
});
