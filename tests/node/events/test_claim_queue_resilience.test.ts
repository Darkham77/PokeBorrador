/**
 * tests/node/events/test_claim_queue_resilience.test.ts
 *
 * Tier 1 Reproduction Test (RED-to-GREEN):
 * Verifies that claim_asset_v2 handles claims where asset_data was stored as
 * a JSON string (e.g., from JSON.stringify) or JSON object, without throwing 'case not found'.
 */

import { it, describe } from 'vitest';
import assert from 'node:assert/strict';

describe('claim_asset_v2 JSON resilience and parity', () => {
  const testUserId = 'e57ac10b-58cc-4372-a567-0e02b2c3d479';
  const testUsername = 'ClaimParityUser';
  const dbUrl = process.env.TEST_POSTGRES_URL || 'postgres://postgres:postgres@localhost:54329/postgres';

  it('fails or succeeds on stringified JSON asset_data in claim_asset_v2', async () => {
    if (!process.env.TEST_POSTGRES_URL) {
      return; // only runs against PostgreSQL
    }

    const postgres = (await import('postgres')).default;
    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
    const stringClaimId = 'a1111111-2222-3333-4444-555555555555';
    const sourceId = 'b1111111-2222-3333-4444-555555555555';

    try {
      await sql`INSERT INTO auth.users (id, email, created_at) VALUES (${testUserId}, 'claim_resilience@test.local', NOW()) ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO profiles (id, username, email, gender, db_version, created_at) VALUES (${testUserId}, ${testUsername}, 'claim_resilience@test.local', 'h', 3, NOW()) ON CONFLICT (id) DO NOTHING`;
      await sql`INSERT INTO game_saves (user_id, save_data, updated_at) VALUES (${testUserId}, ${sql.json({ money: 1000, team: [] })}, NOW()) ON CONFLICT (user_id) DO NOTHING`;

      // Insert claim with asset_data as a JSON string scalar (simulating JSON.stringify via postgrest)
      const stringifiedPayload = JSON.stringify({
        type: 'money',
        data: 15000,
        sold_item: { name: 'nugget', qty: 1 }
      });

      await sql`
        INSERT INTO public.claim_queue (id, user_id, source_type, source_id, asset_data, created_at)
        VALUES (
          ${stringClaimId},
          ${testUserId},
          'gts',
          ${sourceId},
          ${sql.json(stringifiedPayload)},
          NOW()
        )
      `;

      // Execute claim_asset_v2 as authenticated user
      let claimResult: unknown = null;
      await sql.begin(async (tx) => {
        await tx.unsafe(`
          SET LOCAL ROLE authenticated;
          SET LOCAL "request.jwt.claim.sub" = '${testUserId}';
          SET LOCAL "request.jwt.claim.role" = 'authenticated';
        `);

        const [res] = await tx`SELECT public.claim_asset_v2(${stringClaimId}) as updated_save`;
        claimResult = res?.updated_save;
      });

      assert.ok(claimResult, 'claim_asset_v2 must return updated game save');
      const saveObj = claimResult as { money: number };
      assert.strictEqual(Number(saveObj.money), 16000, 'Money must be 1000 + 15000 = 16000');
    } finally {
      await sql`DELETE FROM public.claim_queue WHERE id = ${stringClaimId}`;
      await sql`DELETE FROM public.game_saves WHERE user_id = ${testUserId}`;
      await sql`DELETE FROM public.profiles WHERE id = ${testUserId}`;
      await sql`DELETE FROM auth.users WHERE id = ${testUserId}`;
      await sql.end();
    }
  });
});
