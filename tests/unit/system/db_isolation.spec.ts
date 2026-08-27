
/**
 * tests/unit/db_isolation.spec.js
 * Verifies that the DB isolation mandate is technically enforced.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts';

describe('Database Isolation Policy', () => {
  beforeEach(() => {
    // Ensure indexedDB exists for spying
    if (!window.indexedDB) {
      window.indexedDB = { open: vi.fn() } as unknown as IDBFactory;
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

  describe('Mock Time Synchronization', () => {
    it('supports datetime-local format without timezone (YYYY-MM-DDTHH:mm)', async () => {
      const db = await createTestDBRouter();
      expect(() => db.setMockTime('2026-08-27T18:49')).not.toThrow();
      expect(typeof db.getTimeOffset()).toBe('number');
    });

    it('supports date-only format (YYYY-MM-DD)', async () => {
      const db = await createTestDBRouter();
      expect(() => db.setMockTime('2026-01-01')).not.toThrow();
      expect(typeof db.getTimeOffset()).toBe('number');
    });

    it('supports full ISO instant with UTC indicator (Z)', async () => {
      const db = await createTestDBRouter();
      expect(() => db.setMockTime('2026-08-27T18:49:00Z')).not.toThrow();
      expect(typeof db.getTimeOffset()).toBe('number');
    });

    it('supports full ISO instant with timezone offset', async () => {
      const db = await createTestDBRouter();
      expect(() => db.setMockTime('2026-08-27T18:49:00-03:00')).not.toThrow();
      expect(typeof db.getTimeOffset()).toBe('number');
    });

    it('supports resetting time offset to 0', async () => {
      const db = await createTestDBRouter();
      db.setMockTime('2026-08-27T18:49');
      db.resetTime();
      expect(db.getTimeOffset()).toBe(0);
    });

    it('throws descriptive error on malformed date string', async () => {
      const db = await createTestDBRouter();
      expect(() => db.setMockTime('not-a-valid-time-format')).toThrow(
        /\[DBRouter\] Invalid mock time format 'not-a-valid-time-format'/
      );
    });
  });
});
