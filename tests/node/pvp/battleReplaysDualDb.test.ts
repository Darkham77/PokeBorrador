/**
 * tests/node/pvp/battleReplaysDualDb.test.ts
 *
 * Multi-Engine Dual Database Test for Battle Replays & Theater Persistence.
 * Validates table schema, fn_publish_battle_replay and fn_get_featured_replays
 * across both SQLite and PostgreSQL.
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
      return stmt.all(...(params as (string | number | bigint | null)[])) as Record<string, unknown>[]; // open-record: Generic key-value data dictionary container
    }
    stmt.run(...(params as (string | number | bigint | null)[]));
    return [];
  }),
  persistSQLite: vi.fn(async () => {})
}));

import {
  emulatePublishBattleReplay,
  emulateGetFeaturedReplays
} from '@/logic/db/rpcEmulations/rankedRpc.ts';
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts';

describeWithDatabase('Battle Replays Dual Database Integration', (engine, getDb) => {
  it('verifies battle_replays schema and RPC execution parity across engines', async () => {
    const db = getDb();

    const sampleP1 = {
      userId: '6f4dd8cc-1ad9-4bde-9339-4d1e8bbd713d',
      username: 'Red',
      tier: 'maestro',
      elo: 3500,
      team: [
        {
          species: 'charizard',
          name: 'Charizard',
          level: 50,
          sprite: '/assets/sprites/charizard.png',
          revealedMoves: ['flamethrower'],
          revealedItem: 'charcoal'
        }
      ]
    };

    const sampleP2 = {
      userId: '7e5ee9dd-2be0-4cde-9449-5e2e9ccd824e',
      username: 'Blue',
      tier: 'diamante',
      elo: 2900,
      team: [
        {
          species: 'blastoise',
          name: 'Blastoise',
          level: 50,
          sprite: '/assets/sprites/blastoise.png',
          revealedMoves: ['surf'],
          revealedItem: 'mysticwater'
        }
      ]
    };

    const sampleChoiceStream = [
      {
        turnNumber: 1,
        p1Choice: 'move flamethrower',
        p2Choice: 'move surf',
        logLines: ['|turn|1', '|move|p1a: Charizard|Flamethrower|p2a: Blastoise']
      }
    ];

    const samplePayload = {
      battleCode: 'BTL-ABCD-EFGH',
      seasonId: 'temporada_1',
      themeId: 'kanto_classic',
      p1: sampleP1,
      p2: sampleP2,
      turnsCount: 1,
      winnerSide: 'p1',
      choiceStream: sampleChoiceStream,
      initialSeed: [1234, 5678, 9012, 3456],
      isTop10Archived: true
    };

    if (engine === 'postgres') {
      const postgres = (await import('postgres')).default;
      const dbUrl = process.env.TEST_POSTGRES_URL!;
      const schema = db.schema || 'public';
      const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

      try {
        await sql.unsafe(`SET search_path TO ${schema}, public`);

        // 1. Verify schema column types
        const cols = await sql`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = ${schema} AND table_name = 'battle_replays'
        `;

        const idCol = cols.find(c => c.column_name === 'id');
        assert.ok(idCol, 'battle_replays must have an id column');
        assert.strictEqual(idCol.data_type, 'uuid', 'id column must be uuid');

        const codeCol = cols.find(c => c.column_name === 'battle_code');
        assert.ok(codeCol, 'battle_replays must have a battle_code column');

        const top10Col = cols.find(c => c.column_name === 'is_top10_archived');
        assert.ok(top10Col, 'battle_replays must have is_top10_archived column');
        assert.strictEqual(top10Col.data_type, 'boolean', 'is_top10_archived must be boolean');

        // 2. Test publishing battle replay via SQL function fn_publish_battle_replay
        const publishResult = await sql`
          SELECT public.fn_publish_battle_replay(${sql.json(samplePayload)}) as result
        `;
        assert.strictEqual(publishResult.length, 1);
        const resData = publishResult[0]!.result as {
          ok: boolean;
          replayId: string;
          battleCode: string;
          isTop10Archived: boolean;
        };
        assert.strictEqual(resData.ok, true);
        assert.strictEqual(resData.battleCode, 'BTL-ABCD-EFGH');
        assert.strictEqual(resData.isTop10Archived, true);
        assert.match(
          resData.replayId,
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          'Replay ID must be a valid UUID'
        );

        // 3. Test retrieving featured replays via fn_get_featured_replays
        const featuredResult = await sql`
          SELECT public.fn_get_featured_replays(10) as replays
        `;
        assert.strictEqual(featuredResult.length, 1);
        const replaysList = featuredResult[0]!.replays as Array<{
          id: string;
          battleCode: string;
          seasonId: string;
          isTop10Archived: boolean;
        }>;
        assert.ok(Array.isArray(replaysList), 'Featured replays must return an array');
        const found = replaysList.find(r => r.battleCode === 'BTL-ABCD-EFGH');
        assert.ok(found, 'Featured replays must include published battle replay');
        assert.strictEqual(found.isTop10Archived, true);

        // 4. Test re-publishing (increment views_count on conflict)
        const republicResult = await sql`
          SELECT public.fn_publish_battle_replay(${sql.json(samplePayload)}) as result
        `;
        const reData = republicResult[0]!.result as { replayId: string; battleCode: string };
        assert.strictEqual(reData.replayId, resData.replayId);

        const rowsCount = await sql`
          SELECT COUNT(*)::int as count FROM public.battle_replays WHERE battle_code = 'BTL-ABCD-EFGH'
        `;
        assert.strictEqual(rowsCount[0]!.count, 1, 'Conflict must not create duplicate replay rows');
      } finally {
        await sql`DELETE FROM public.battle_replays WHERE battle_code = 'BTL-ABCD-EFGH'`.catch(() => {});
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

        CREATE TABLE IF NOT EXISTS battle_replays (
          id TEXT PRIMARY KEY,
          battle_code TEXT UNIQUE NOT NULL,
          season_id TEXT NOT NULL,
          theme_id TEXT NOT NULL,
          p1_user_id TEXT,
          p2_user_id TEXT,
          p1_data TEXT NOT NULL,
          p2_data TEXT NOT NULL,
          turns_count INTEGER NOT NULL DEFAULT 0,
          winner_side TEXT NOT NULL,
          choice_stream TEXT NOT NULL DEFAULT '[]',
          initial_seed TEXT NOT NULL DEFAULT '[0,0,0,0]',
          is_top10_archived INTEGER NOT NULL DEFAULT 0,
          views_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const sqliteMock: SQLiteDatabase = {} as SQLiteDatabase;

      const pubRes = await emulatePublishBattleReplay(sqliteMock, { payload: samplePayload }, {
        userId: sampleP1.userId,
        username: sampleP1.username
      });

      expect(pubRes.error).toBeNull();
      expect(pubRes.data).toBeDefined();
      const pubData = pubRes.data as {
        ok: boolean;
        replayId: string;
        battleCode: string;
        isTop10Archived: boolean;
      };
      expect(pubData.ok).toBe(true);
      expect(pubData.battleCode).toBe('BTL-ABCD-EFGH');
      expect(pubData.isTop10Archived).toBe(true);

      const featuredRes = await emulateGetFeaturedReplays(sqliteMock, { p_limit: 10 });
      expect(featuredRes.error).toBeNull();
      const featuredData = featuredRes.data as Array<{
        id: string;
        battleCode: string;
        seasonId: string;
        isTop10Archived: boolean;
        p1: typeof sampleP1;
        p2: typeof sampleP2;
      }>;
      expect(Array.isArray(featuredData)).toBe(true);
      const replayFound = featuredData.find(r => r.battleCode === 'BTL-ABCD-EFGH');
      expect(replayFound).toBeDefined();
      expect(replayFound?.isTop10Archived).toBe(true);
      expect(replayFound?.p1.username).toBe('Red');
      expect(replayFound?.p2.username).toBe('Blue');

      // Test duplicate view count increment
      const rePubRes = await emulatePublishBattleReplay(sqliteMock, { payload: samplePayload });
      expect(rePubRes.error).toBeNull();
      const rePubData = rePubRes.data as { replayId: string; battleCode: string };
      expect(rePubData.replayId).toBe(pubData.replayId);
    }
  });
});
