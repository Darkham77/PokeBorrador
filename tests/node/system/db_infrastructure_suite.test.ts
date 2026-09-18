import { describe, it, test, expect } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import { TABLES_SCHEMA } from '@/logic/db/schema';
import { ensureSchemaIntegrity } from '@/logic/db/sqliteSchemaIntegrity';
import { translatePostgresToSqlite } from '@/logic/db/sqlTranslator';

describe('Database Infrastructure & Schema Integrity Suite', () => {
  describe('Database Parallelism & Isolation Validator', () => {
    it('should guarantee absolute data isolation between multiple concurrent in-memory databases initialized from the same schema', () => {
      using db1 = new DatabaseSync(':memory:');
      using db2 = new DatabaseSync(':memory:');

      TABLES_SCHEMA.forEach(schema => {
        db1.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
        db2.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
      });

      db1.prepare('INSERT INTO profiles (id, username, email) VALUES (?, ?, ?)')
        .run('user_1', 'TrainerOne', 'one@pkv.io');

      db2.prepare('INSERT INTO profiles (id, username, email) VALUES (?, ?, ?)')
        .run('user_2', 'TrainerTwo', 'two@pkv.io');

      const profiles1 = db1.prepare('SELECT username FROM profiles').all() as { username: string }[];
      assert.strictEqual(profiles1.length, 1);
      assert.strictEqual(profiles1[0]?.username, 'TrainerOne');

      const profiles2 = db2.prepare('SELECT username FROM profiles').all() as { username: string }[];
      assert.strictEqual(profiles2.length, 1);
      assert.strictEqual(profiles2[0]?.username, 'TrainerTwo');

      const hasUser1InDb2 = db2.prepare('SELECT 1 FROM profiles WHERE id = ?').all('user_1');
      assert.strictEqual(hasUser1InDb2.length, 0, 'State from DB 1 leaked into DB 2!');

      const hasUser2InDb1 = db1.prepare('SELECT 1 FROM profiles WHERE id = ?').all('user_2');
      assert.strictEqual(hasUser2InDb1.length, 0, 'State from DB 2 leaked into DB 1!');
    });
  });

  describe('DBRouter Server Time RPC Parser', () => {
    it('should parse ISO 8601 strings from Supabase RPC fn_get_server_time into valid epoch milliseconds without throwing', () => {
      const parseServerTime = (data: unknown): number => {
        if (typeof data === 'string') {
          return Temporal.Instant.from(data).epochMilliseconds;
        }
        if (typeof data === 'number' && Number.isFinite(data)) {
          return Temporal.Instant.fromEpochMilliseconds(data).epochMilliseconds;
        }
        throw new Error(`[DBRouter] Invalid server time payload: ${String(data)}`);
      };

      const isoString = '2026-09-02T06:58:12.123456+00:00';
      const epochMs = parseServerTime(isoString);
      expect(Number.isFinite(epochMs)).toBe(true);
      expect(epochMs).toBeGreaterThan(0);

      const numericEpoch = 1788343090822;
      const epochMsFromNum = parseServerTime(numericEpoch);
      expect(epochMsFromNum).toBe(numericEpoch);
    });
  });

  describe('sqliteSchemaIntegrity quote and comma parsing', () => {
    it('should not treat commas inside string literals as column separators (e.g. initial_seed in battle_replays)', async () => {
      using dbSync = new DatabaseSync(':memory:');
      
      TABLES_SCHEMA.forEach(schema => {
        dbSync.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
      });

      const attemptedAlters: string[] = [];

      const mockDb = {
        exec: (sql: string, params?: unknown[]) => {
          const stmt = dbSync.prepare(sql);
          const rows = stmt.all(...((params || []) as Array<string | number | bigint | Uint8Array | null>)) as Record<string, unknown>[];
          if (rows.length === 0) return [];
          const columns = Object.keys(rows[0]!);
          const values = rows.map(r => columns.map(c => r[c]));
          return [{ columns, values }];
        },
        run: (sql: string, params?: unknown[]) => {
          if (sql.includes('ALTER TABLE')) {
            attemptedAlters.push(sql);
          }
          const stmt = dbSync.prepare(sql);
          stmt.run(...((params || []) as Array<string | number | bigint | Uint8Array | null>));
        }
      };

      await ensureSchemaIntegrity(mockDb as unknown as Parameters<typeof ensureSchemaIntegrity>[0]);

      const invalidAlters = attemptedAlters.filter(sql => 
        sql.includes('battle_replays ADD COLUMN 0') || 
        sql.includes("battle_replays ADD COLUMN 0]'") ||
        sql.includes('battle_replays ADD COLUMN "0"')
      );

      assert.deepEqual(invalidAlters, [], `Auto-repair erroneously tried to alter battle_replays with split comma pieces: ${invalidAlters.join(', ')}`);
      assert.equal(attemptedAlters.length, 0, `Auto-repair should not run ALTER TABLE on a freshly initialized schema, but ran: ${attemptedAlters.join(', ')}`);
    });
  });

  describe('sqliteSchemaIntegrity legacy chat migration', () => {
    it('should not throw an error when global_chat_messages does not contain legacy sender_id or sender_name columns', async () => {
      using dbSync = new DatabaseSync(':memory:');
      
      TABLES_SCHEMA.forEach(schema => {
        dbSync.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
      });

      const mockDb = {
        exec: (sql: string, params?: unknown[]) => {
          const stmt = dbSync.prepare(sql);
          const rows = stmt.all(...((params || []) as Array<string | number | bigint | Uint8Array | null>)) as Record<string, unknown>[];
          if (rows.length === 0) return [];
          const columns = Object.keys(rows[0]!);
          const values = rows.map(r => columns.map(c => r[c]));
          return [{ columns, values }];
        },
        run: (sql: string, params?: unknown[]) => {
          const stmt = dbSync.prepare(sql);
          stmt.run(...((params || []) as Array<string | number | bigint | Uint8Array | null>));
        }
      };

      await assert.doesNotReject(async () => {
        await ensureSchemaIntegrity(mockDb as unknown as Parameters<typeof ensureSchemaIntegrity>[0]);
      });
    });
  });

  describe('SQL Translator Logic', () => {
    test('should translate basic serial to integer primary key autoincrement', () => {
      const input = 'id SERIAL PRIMARY KEY';
      const output = translatePostgresToSqlite(input);
      assert.strictEqual(output, 'id INTEGER PRIMARY KEY AUTOINCREMENT');
    });

    test('should handle TIMESTAMPTZ conversion', () => {
      const input = 'created_at TIMESTAMPTZ DEFAULT NOW()';
      const output = translatePostgresToSqlite(input);
      assert.ok(output.includes('TEXT DEFAULT'));
      assert.ok(output.includes("strftime('%Y-%m-%dT%H:%M:%SZ', 'now')"));
    });

    test('should skip PostgreSQL-only DROP FUNCTION statements', () => {
      const input = 'DROP FUNCTION IF EXISTS cancel_listing_v2(UUID)';
      const output = translatePostgresToSqlite(input);
      assert.strictEqual(output, '');
    });

    test('should skip PostgreSQL-only REVOKE, GRANT, and ALTER FUNCTION statements', () => {
      assert.strictEqual(translatePostgresToSqlite('REVOKE EXECUTE ON FUNCTION public.accept_trade_v2(uuid) FROM PUBLIC, anon;'), '');
      assert.strictEqual(translatePostgresToSqlite('GRANT EXECUTE ON FUNCTION public.accept_trade_v2(uuid) TO authenticated;'), '');
      assert.strictEqual(translatePostgresToSqlite('ALTER FUNCTION public.validate_game_save() SET search_path = public, pg_catalog;'), '');
    });

    test('should skip PostgreSQL-only RLS alter table statements', () => {
      assert.strictEqual(translatePostgresToSqlite('ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;'), '');
      assert.strictEqual(translatePostgresToSqlite('ALTER TABLE public.game_saves FORCE ROW LEVEL SECURITY;'), '');
    });
  });

  describe('War Dominance RLS & Persistence Integrity', () => {
    const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');

    it('guarantees war_dominance has explicit INSERT and UPDATE policies in migrations for authenticated users', () => {
      const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql'));
      let hasInsertPolicy = false;
      let hasUpdatePolicy = false;

      for (const file of files) {
        const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
        if (content.includes('war_dominance')) {
          if (/CREATE\s+POLICY\s+["'].*?["']\s+ON\s+(?:public\.)?war_dominance\s+FOR\s+INSERT/i.test(content)) {
            hasInsertPolicy = true;
          }
          if (/CREATE\s+POLICY\s+["'].*?["']\s+ON\s+(?:public\.)?war_dominance\s+FOR\s+UPDATE/i.test(content)) {
            hasUpdatePolicy = true;
          }
        }
      }

      expect(
        hasInsertPolicy,
        'Missing INSERT policy on public.war_dominance in database/migrations/. Client weekly dominance settlement will trigger HTTP 403 Forbidden!'
      ).toBe(true);

      expect(
        hasUpdatePolicy,
        'Missing UPDATE policy on public.war_dominance in database/migrations/. Client weekly dominance settlement will trigger HTTP 403 Forbidden!'
      ).toBe(true);
    });
  });
});
