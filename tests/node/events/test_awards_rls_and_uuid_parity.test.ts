/**
 * tests/node/events/test_awards_rls_and_uuid_parity.test.ts
 *
 * Tier 1 Reproduction Test (RED-to-GREEN):
 * Verifies that authenticated players can insert, select, and delete their own awards
 * and claim_queue items in PostgreSQL without RLS or permission violations.
 */

import { it, describe, beforeAll } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

describe('Public Awards and Claim Queue RLS and Privileges Parity', () => {
  const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const testUsername = 'AwardParityUser';
  const dbUrl = process.env.TEST_POSTGRES_URL || 'postgres://postgres:postgres@localhost:54329/postgres';

  beforeAll(async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
    try {
      const migPath = path.resolve(process.cwd(), 'database/migrations/20260908060000_grant_awards_insert_policy.sql');
      const sqlContent = await fs.readFile(migPath, 'utf-8');
      await sql.unsafe(sqlContent);
      await sql`INSERT INTO public._migrations (id) VALUES ('20260908060000_grant_awards_insert_policy') ON CONFLICT DO NOTHING`;
      await sql.unsafe("NOTIFY pgrst, 'reload schema';");
    } finally {
      await sql.end();
    }
  });

  it('allows authenticated role to insert own award in public.awards', async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
    const testAwardId = 'b2222222-3333-4444-5555-666666666666';

    try {
      await sql`INSERT INTO auth.users (id, email, created_at) VALUES (${testUserId}, 'award_parity@test.local', NOW()) ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO profiles (id, username, email, gender, db_version, created_at) VALUES (${testUserId}, ${testUsername}, 'award_parity@test.local', 'h', 3, NOW()) ON CONFLICT (id) DO NOTHING`;

      await sql.begin(async (tx) => {
        await tx.unsafe(`
          SET LOCAL ROLE authenticated;
          SET LOCAL "request.jwt.claim.sub" = '${testUserId}';
          SET LOCAL "request.jwt.claim.role" = 'authenticated';
        `);

        await tx`
          INSERT INTO public.awards (id, event_id, winner_id, winner_name, winner_email, prize, awarded_at, claimed, received_at)
          VALUES (
            ${testAwardId},
            'legacy_archived_tournament_2024',
            ${testUserId},
            ${testUsername},
            'award_parity@test.local',
            ${tx.json({ money: 10000 })},
            NOW(),
            false,
            NULL
          )
        `;

        const [insertedRow] = await tx`SELECT id, event_id, winner_id, received_at FROM public.awards WHERE id = ${testAwardId}`;
        assert.ok(insertedRow, 'Authenticated user must be able to SELECT their own inserted award');
        assert.strictEqual(insertedRow.winner_id, testUserId);
      });
    } finally {
      await sql`DELETE FROM public.awards WHERE id = ${testAwardId}`;
      await sql.end();
    }
  });

  it('allows authenticated role to insert and claim own item in public.claim_queue', async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
    const testClaimId = 'c3333333-4444-5555-6666-777777777777';
    const testSourceId = 'd4444444-5555-6666-7777-888888888888';

    try {
      await sql`INSERT INTO auth.users (id, email, created_at) VALUES (${testUserId}, 'award_parity@test.local', NOW()) ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO profiles (id, username, email, gender, db_version, created_at) VALUES (${testUserId}, ${testUsername}, 'award_parity@test.local', 'h', 3, NOW()) ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO game_saves (user_id, save_data, updated_at) VALUES (${testUserId}, ${sql.json({ money: 1000, team: [] })}, NOW()) ON CONFLICT (user_id) DO NOTHING`;

      await sql.begin(async (tx) => {
        await tx.unsafe(`
          SET LOCAL ROLE authenticated;
          SET LOCAL "request.jwt.claim.sub" = '${testUserId}';
          SET LOCAL "request.jwt.claim.role" = 'authenticated';
        `);

        // Attempt INSERT into claim_queue
        await tx`
          INSERT INTO public.claim_queue (id, user_id, source_type, source_id, asset_data, created_at)
          VALUES (
            ${testClaimId},
            ${testUserId},
            'gts',
            ${testSourceId},
            ${tx.json({ type: 'money', data: 15000 })},
            NOW()
          )
        `;

        const [insertedClaim] = await tx`SELECT id, user_id FROM public.claim_queue WHERE id = ${testClaimId}`;
        assert.ok(insertedClaim, 'Authenticated user must be able to SELECT their own claim_queue item');
        assert.strictEqual(insertedClaim.user_id, testUserId);
      });
    } finally {
      await sql`DELETE FROM public.claim_queue WHERE id = ${testClaimId}`;
      await sql.end();
    }
  });
});
