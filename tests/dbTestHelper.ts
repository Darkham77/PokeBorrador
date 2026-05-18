
/**
 * tests/dbTestHelper.js
 * Utility to provide isolated DBRouter instances for testing.
 */
import { vi } from 'vitest';
import { DBRouter } from '@/logic/db/dbRouter';
import { resetSQLite } from '@/logic/db/sqliteEngine';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a DBRouter instance in In-Memory test mode.
 * This ensures no data is written to IndexedDB.
 */
export async function createTestDBRouter() {
  // Ensure we start from a clean state
  resetSQLite();
  
  const mockProfile = {
    username: 'ash',
    last_renamed_at: null as string | null
  };

  // Mock initSqlJs which is expected on window by sqliteEngine
  if (typeof window !== 'undefined') {
    window.initSqlJs = vi.fn().mockResolvedValue({
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

  // We use a mock Supabase client for the 'online' parts if needed, 
  // but we force 'offline' mode with in-memory SQLite for data testing.
  const mockSupabase = {
    auth: { getSession: async () => ({ data: { session: null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) })
  };

  const router = new DBRouter({ url: 'http://localhost', key: 'mock' }, 'offline', {
    inMemory: true
  });

  // Inject the mock into the internal private client to avoid lazy initialization failures in tests
  router._realClient = mockSupabase as unknown as SupabaseClient;

  return router;
}

/**
 * Completely wipes the current test state.
 */
export function cleanupTestDB() {
  resetSQLite();
}
