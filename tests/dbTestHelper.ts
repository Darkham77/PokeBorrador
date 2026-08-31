/**
 * @file dbTestHelper.ts
 * @description Unified test database helper supporting both in-memory SQLite and isolated PostgreSQL schemas.
 */

import { vi, describe, beforeAll, afterAll } from 'vitest';
import { DBRouter } from '@/logic/db/dbRouter.ts';
import { resetSQLite } from '@/logic/db/sqliteEngine.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';

export type DBEngine = 'sqlite' | 'postgres';

export const ACTIVE_DB_ENGINES: DBEngine[] = 
  typeof process !== 'undefined' && process.env.TEST_POSTGRES_URL 
    ? ['sqlite', 'postgres'] 
    : ['sqlite'];

export interface TestDatabaseContext {
  engine: DBEngine;
  run(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  cleanup(): Promise<void>;
  schema?: string;
}

/**
 * Creates an isolated database context for testing against SQLite or PostgreSQL.
 */
export async function initTestDatabaseContext(engine: DBEngine, suiteName: string): Promise<TestDatabaseContext> {
  if (engine === 'postgres') {
    const dbUrl = process.env.TEST_POSTGRES_URL;
    if (!dbUrl) {
      throw new Error('[dbTestHelper] TEST_POSTGRES_URL environment variable is required for postgres test context.');
    }

    const cleanSuite = suiteName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const schema = `test_${cleanSuite}_${uniqueId}`;

    const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });

    // 1. Create isolated schema
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schema}`);

    // 2. Clone table structures from public schema
    const publicTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;

    for (const t of publicTables) {
      const tName = t.table_name as string;
      if (tName !== '_migrations') {
        await sql.unsafe(`CREATE TABLE IF NOT EXISTS ${schema}.${tName} (LIKE public.${tName} INCLUDING ALL)`);
      }
    }

    // Client bound to the isolated schema
    const schemaSql = postgres(dbUrl, {
      max: 1,
      onnotice: () => {}
    });

    // Set search_path for this connection
    await schemaSql.unsafe(`SET search_path TO ${schema}, public`);

    return {
      engine: 'postgres',
      schema,
      async run(queryText: string, params: unknown[] = []): Promise<void> {
        let transformedSql = queryText;
        // Convert '?' placeholders to Postgres '$1, $2' format if needed
        let pIndex = 1;
        transformedSql = transformedSql.replace(/\?/g, () => `$${pIndex++}`);
        await schemaSql.unsafe(transformedSql, params as any);
      },
      async query<T = Record<string, unknown>>(queryText: string, params: unknown[] = []): Promise<T[]> {
        let transformedSql = queryText;
        let pIndex = 1;
        transformedSql = transformedSql.replace(/\?/g, () => `$${pIndex++}`);
        const rows = await schemaSql.unsafe(transformedSql, params as any);
        return rows as unknown as T[];
      },
      async cleanup(): Promise<void> {
        try {
          await schemaSql.end();
          const adminSql = postgres(dbUrl, { max: 1, onnotice: () => {} });
          await adminSql.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
          await adminSql.end();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }

  // SQLite In-Memory Context
  resetSQLite();
  const mockStorage: Record<string, Record<string, unknown>[]> = {};

  return {
    engine: 'sqlite',
    async run(sql: string, params: unknown[] = []): Promise<void> {
      // Basic SQL runner simulation for offline unit tests
      if (sql.includes('INSERT INTO game_saves')) {
        const p = params as [string, string, string];
        mockStorage.game_saves = mockStorage.game_saves || [];
        mockStorage.game_saves.push({ user_id: p[0], save_data: JSON.parse(p[1]), last_save_id: p[2] });
      } else if (sql.includes('INSERT INTO market_listings')) {
        const p = params as [string, string, string, string, number, string, string];
        mockStorage.market_listings = mockStorage.market_listings || [];
        mockStorage.market_listings.push({
          id: p[0],
          listing_type: p[1],
          seller_id: p[2],
          seller_name: p[3],
          price: p[4],
          data: typeof p[5] === 'string' ? JSON.parse(p[5]) : p[5],
          status: p[6] || 'active'
        });
      } else if (sql.includes('INSERT INTO claim_queue')) {
        const p = params as [string, string, string, string];
        mockStorage.claim_queue = mockStorage.claim_queue || [];
        mockStorage.claim_queue.push({
          user_id: p[0],
          claim_id: p[1],
          type: p[2],
          data: typeof p[3] === 'string' ? JSON.parse(p[3]) : p[3]
        });
      } else if (sql.includes('UPDATE market_listings SET status')) {
        const p = params as [string, string];
        const listings = mockStorage.market_listings || [];
        const listing = listings.find(l => l.id === p[1]);
        if (listing) listing.status = p[0];
      }
    },
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
      if (sql.includes('FROM game_saves')) {
        const p = params as [string];
        const saves = (mockStorage.game_saves || []).filter(s => s.user_id === p[0]);
        return saves as unknown as T[];
      }
      if (sql.includes('FROM market_listings')) {
        const p = params as [string];
        const listings = (mockStorage.market_listings || []).filter(l => l.id === p[0]);
        return listings as unknown as T[];
      }
      if (sql.includes('FROM claim_queue')) {
        return (mockStorage.claim_queue || []) as unknown as T[];
      }
      return [];
    },
    async cleanup(): Promise<void> {
      resetSQLite();
    }
  };
}

/**
 * Executes a test suite across all active database engines (SQLite and/or PostgreSQL).
 */
export function describeWithDatabase(
  suiteName: string, 
  testFn: (engine: DBEngine, getDb: () => TestDatabaseContext) => void
) {
  for (const engine of ACTIVE_DB_ENGINES) {
    describe(`[${engine.toUpperCase()}] ${suiteName}`, () => {
      let context: TestDatabaseContext;

      beforeAll(async () => {
        context = await initTestDatabaseContext(engine, suiteName);
      });

      afterAll(async () => {
        if (context) {
          await context.cleanup();
        }
      });

      testFn(engine, () => context);
    });
  }
}

/**
 * Creates a DBRouter instance in In-Memory test mode.
 * This ensures no data is written to IndexedDB.
 */
export async function createTestDBRouter() {
  resetSQLite();
  
  const mockProfile = {
    username: 'ash',
    last_renamed_at: null as string | null
  };

  if (typeof window !== 'undefined') {
    (window as unknown as { initSqlJs: unknown }).initSqlJs = vi.fn().mockResolvedValue({
      Database: class {
        tables: string[] = [];
        run(sql: string, params?: unknown[]) {
          if (sql.includes('UPDATE profiles SET username = ?') && params && params.length >= 2) {
            mockProfile.username = params[0] as string;
            mockProfile.last_renamed_at = params[1] as string;
          }
          if (this.tables && this.tables.push) this.tables.push(sql);
        }
        exec(sql: string, params?: unknown[]) {
          if (sql.includes('UPDATE profiles SET username = ?') && params && params.length >= 2) {
            mockProfile.username = params[0] as string;
            mockProfile.last_renamed_at = params[1] as string;
            return [{ columns: [], values: [] }];
          }
          if (sql.includes('SELECT username, last_renamed_at') || sql.includes('SELECT last_renamed_at')) {
            return [{
              columns: ['username', 'last_renamed_at'],
              values: [[mockProfile.username, mockProfile.last_renamed_at]]
            }];
          }
          return [{ columns: [], values: [] }];
        }
        prepare() { return { bind: () => {}, step: () => false, free: () => {} }; }
        export() { return new Uint8Array(); }
      }
    });
  }

  const mockSupabase = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) })
  };

  const router = new DBRouter({ url: 'http://localhost', key: 'mock' }, 'offline', {
    inMemory: true
  });

  router._realClient = mockSupabase as unknown as SupabaseClient;

  return router;
}

/**
 * Completely wipes the current test state.
 */
export function cleanupTestDB() {
  resetSQLite();
}
