/**
 * tests/node/events/magikarp_contest_awarding_parity.test.ts
 *
 * Tier 1 RED Reproduction Test:
 * Replays the exact scenario from scripts/e2e/events/magikarp_contest_multiusers.simulation.ts:
 * 4 participants (ContestChampion 180 IVs, P2 150 IVs, P3 120 IVs, P4 60 IVs)
 * enrolled in 'torneo_pesca' under category 'ivs'.
 * Tests PostgREST upsert, RPC awarding, and results selection.
 */

import { it, expect } from 'vitest';
import { describeWithDatabase } from '../../dbTestHelper.ts';
import { createClient } from '@supabase/supabase-js';
import { createSignedJwt, POSTGREST_URL, SUPABASE_TEST_ANON_KEY } from '../../../scripts/testing/postgres_test_container.ts';

describeWithDatabase('Magikarp Contest Awarding Parity', (engine) => {
  it('tests client-side upsert, rpc, and awarding via PostgREST', async () => {
    if (engine === 'sqlite') {
      const { queryLocal, resetSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
      resetSQLite();
      await queryLocal(`
        CREATE TABLE IF NOT EXISTS competition_results (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          winners TEXT NOT NULL,
          ended_at TEXT NOT NULL
        )
      `);
      // Seed older result
      await queryLocal(`
        INSERT INTO competition_results (id, event_id, winners, ended_at)
        VALUES (?, ?, ?, ?)
      `, [
        'res_old',
        'torneo_pesca',
        JSON.stringify([{ rank: 'first', player_name: 'AwardsChampion', score: 99 }]),
        '2026-09-01T00:00:00.000Z'
      ]);
      // Seed newer result
      await queryLocal(`
        INSERT INTO competition_results (id, event_id, winners, ended_at)
        VALUES (?, ?, ?, ?)
      `, [
        'res_new',
        'torneo_pesca',
        JSON.stringify([{ rank: 'first', player_name: 'ContestChampion', score: 180 }]),
        '2026-09-04T12:00:00.000Z'
      ]);

      // Ordered query
      const ordered = (await queryLocal(
        'SELECT * FROM competition_results WHERE event_id = ? ORDER BY ended_at DESC',
        ['torneo_pesca']
      )) as Array<{ id: string; event_id: string; winners: string; ended_at: string }>;
      expect(ordered.length).toBe(2);
      const latestParsed = JSON.parse(ordered[0]!.winners) as Array<{ rank: string; player_name: string; score: number }>;
      expect(latestParsed[0]!.player_name).toBe('ContestChampion');
      expect(latestParsed[0]!.score).toBe(180);
      return;
    }

    const postgres = (await import('postgres')).default;
    const dbUrl = process.env.TEST_POSTGRES_URL!;
    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

    try {
      const p1Id = 'b0000000-0000-0000-0000-000000000001';
      const p2Id = 'b0000000-0000-0000-0000-000000000002';
      const p3Id = 'b0000000-0000-0000-0000-000000000003';
      const p4Id = 'b0000000-0000-0000-0000-000000000004';
      const p1Email = 'contestchampion@test.local';

      await sql`
        INSERT INTO auth.users (id, email, created_at) VALUES 
        (${p1Id}, ${p1Email}, NOW()),
        (${p2Id}, 'p2@test.local', NOW()),
        (${p3Id}, 'p3@test.local', NOW()),
        (${p4Id}, 'p4@test.local', NOW())
        ON CONFLICT (id) DO NOTHING;
      `;

      await sql`
        INSERT INTO public.profiles (id, username, email, gender, db_version, created_at)
        VALUES (${p1Id}, 'ContestChampion', ${p1Email}, 'h', 3, NOW())
        ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;
      `;

      await sql`DELETE FROM public.competition_entries WHERE event_id = 'torneo_pesca'`;
      await sql`DELETE FROM public.competition_results WHERE event_id = 'torneo_pesca'`;
      await sql`DELETE FROM public.awards WHERE event_id = 'torneo_pesca'`;
      await sql`UPDATE public.events_config SET last_awarded_at = NULL WHERE id = 'torneo_pesca'`;

      const userJwt = createSignedJwt({
        sub: p1Id,
        role: 'authenticated',
        email: p1Email,
        iss: 'supabase',
        iat: 1600000000,
        exp: 2500000000
      });

      const client = createClient(POSTGREST_URL, SUPABASE_TEST_ANON_KEY, {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${userJwt}`
          }
        }
      });

      // 1. P1 enrolls via PostgREST
      const entryData = {
        event_id: 'torneo_pesca',
        category_id: 'ivs',
        player_id: p1Id,
        player_name: 'ContestChampion',
        player_email: p1Email,
        pokemon_uid: 'sim-karp-p1-gold',
        data: {
          species: 'magikarp',
          name: 'Magikarp',
          nickname: 'Magikarp_180',
          level: 20,
          score: 180,
          total_ivs: 180,
          ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
          is_shiny: false,
          obtained_at: 1785870000000,
          height: 0.9,
          weight: 10,
          displayValue: '180 IVs'
        },
        submitted_at: new Date().toISOString()
      };

      const res = await client.from('competition_entries').upsert(entryData, {
        onConflict: 'event_id, category_id, player_id'
      }).select().single();

      expect(res.error).toBeNull();

      // 2. Competitors P2, P3, P4 seeded exactly like in seedCompetitorEntries()
      const comp2Data = JSON.stringify({
        species: 'magikarp',
        name: 'Magikarp',
        nickname: 'Magikarp_150',
        total_ivs: 150,
        ivs: { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 },
        obtained_at: 1785870000000
      });
      const comp3Data = JSON.stringify({
        species: 'magikarp',
        name: 'Magikarp',
        nickname: 'Magikarp_120',
        total_ivs: 120,
        ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
        obtained_at: 1785870000000
      });
      const comp4Data = JSON.stringify({
        species: 'magikarp',
        name: 'Magikarp',
        nickname: 'Magikarp_60',
        total_ivs: 60,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        obtained_at: 1785870000000
      });

      await sql`
        INSERT INTO public.competition_entries (id, event_id, category_id, player_id, player_name, player_email, data, submitted_at)
        VALUES 
        ('a0000000-0000-0000-0000-000000000002', 'torneo_pesca', 'ivs', ${p2Id}, 'ContestPlayer_2', 'p2@test.local', ${sql.json(JSON.parse(comp2Data))}, NOW()),
        ('a0000000-0000-0000-0000-000000000003', 'torneo_pesca', 'ivs', ${p3Id}, 'ContestPlayer_3', 'p3@test.local', ${sql.json(JSON.parse(comp3Data))}, NOW()),
        ('a0000000-0000-0000-0000-000000000004', 'torneo_pesca', 'ivs', ${p4Id}, 'ContestPlayer_4', 'p4@test.local', ${sql.json(JSON.parse(comp4Data))}, NOW())
        ON CONFLICT (event_id, category_id, player_id) DO NOTHING;
      `;

      // 2b. Seed an older tournament result from a previous run (like Suite 9)
      await sql`
        INSERT INTO public.competition_results (id, event_id, winners, ended_at)
        VALUES (
          '99999999-9999-9999-9999-999999999999',
          'torneo_pesca',
          ${sql.json([{ rank: 'first', player_name: 'AwardsChampion', score: 99 }])},
          NOW() - INTERVAL '1 hour'
        );
      `;

      // 3. Trigger awarding RPC via client
      await sql`UPDATE public.events_config SET last_awarded_at = NULL WHERE id = 'torneo_pesca'`;

      const rpcRes = await client.rpc('fn_award_event_automated', { target_event_id: 'torneo_pesca' });
      expect(rpcRes.error).toBeNull();

      // 4A. RED REPRODUCTION: Query WITHOUT .order('ended_at', { ascending: false })
      // Returns rows in creation/heap order, so rows[0] is the older result (AwardsChampion).
      const unOrderedSelect = await client.from('competition_results').select('*').eq('event_id', 'torneo_pesca');
      expect(unOrderedSelect.error).toBeNull();
      const unorderedRows = (unOrderedSelect.data || []) as Array<{ winners?: unknown }>;
      expect(unorderedRows.length).toBe(2);
      const staleResult = unorderedRows[0];
      const staleWinners = (typeof staleResult?.winners === 'string' ? JSON.parse(staleResult.winners) : staleResult?.winners) as Array<{
        rank: string;
        player_name: string;
        score: number;
      }>;
      const staleFirstPlace = staleWinners.find(w => w.rank === 'first' && w.player_name === 'ContestChampion');
      // Proves the bug: without .order('ended_at', { ascending: false }), rows[0] is stale and ContestChampion is undefined!
      expect(staleFirstPlace).toBeUndefined();

      // 4B. GREEN FIX: Query WITH .order('ended_at', { ascending: false })
      // Returns the newest result first, so rows[0] is the newly awarded contest.
      const orderedSelect = await client
        .from('competition_results')
        .select('*')
        .eq('event_id', 'torneo_pesca')
        .order('ended_at', { ascending: false });
      expect(orderedSelect.error).toBeNull();
      const orderedRows = (orderedSelect.data || []) as Array<{ winners?: unknown }>;
      expect(orderedRows.length).toBe(2);
      const latestResult = orderedRows[0];
      const latestWinners = (typeof latestResult?.winners === 'string' ? JSON.parse(latestResult.winners) : latestResult?.winners) as Array<{
        rank: string;
        player_name: string;
        score: number;
      }>;
      const firstPlace = latestWinners.find(w => w.rank === 'first' && w.player_name === 'ContestChampion');
      expect(firstPlace).toBeDefined();
      expect(firstPlace?.score).toBe(180);
    } finally {
      await sql.end();
    }
  });
});
