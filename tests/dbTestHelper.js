/**
 * tests/dbTestHelper.js
 * Utility to provide isolated DBRouter instances for testing.
 */
import { vi } from 'vitest';
import { DBRouter } from '@/logic/db/dbRouter';
import { resetSQLite } from '@/logic/db/sqliteEngine';

/**
 * Creates a DBRouter instance in In-Memory test mode.
 * This ensures no data is written to IndexedDB.
 */
export async function createTestDBRouter() {
  // Ensure we start from a clean state
  resetSQLite();
  
  // Mock initSqlJs which is expected on window by sqliteEngine
  if (typeof window !== 'undefined') {
    window.initSqlJs = vi.fn().mockResolvedValue({
      Database: class {
        constructor() { this.tables = []; }
        run(sql) { if (this.tables && this.tables.push) this.tables.push(sql); }
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

  const router = new DBRouter(mockSupabase, 'offline', {
    inMemory: true,
    dbName: 'pokevicio_unit_test_db'
  });

  return router;
}

/**
 * Completely wipes the current test state.
 */
export function cleanupTestDB() {
  resetSQLite();
}
