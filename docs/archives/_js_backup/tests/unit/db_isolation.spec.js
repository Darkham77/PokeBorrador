/**
 * tests/unit/db_isolation.spec.js
 * Verifies that the DB isolation mandate is technically enforced.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDBRouter, cleanupTestDB } from '../dbTestHelper';

describe('Database Isolation Policy', () => {
  beforeEach(() => {
    // Ensure indexedDB exists for spying
    if (!window.indexedDB) {
      window.indexedDB = { open: vi.fn() };
    }
    vi.spyOn(window.indexedDB, 'open');
  });

  afterEach(() => {
    cleanupTestDB();
    vi.clearAllMocks();
  });

  it('should initialize in-memory without touching IndexedDB', async () => {
    const db = await createTestDBRouter();
    
    // Check isolation
    expect(window.indexedDB.open).not.toHaveBeenCalled();
    expect(db.options.inMemory).toBe(true);
  });

  it('should allow querying isolated tables', async () => {
    const db = await createTestDBRouter();
    
    // In a real environment, this would hit the mocked SQL.js
    // For this unit test, we just verify the routing logic
    const query = db.from('profiles').select('*').eq('id', 'test');
    expect(query.router.options.inMemory).toBe(true);
  });
});
