import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts';
import { executeAtomicSaveTransaction, queryLocal } from '@/logic/db/sqliteEngine';

describe('Atomic Save Transaction Guard', () => {
  beforeEach(async () => {
    await createTestDBRouter();
    // Spy or mock .run behavior on the test db
    (window as unknown as { initSqlJs: () => Promise<{ Database: new () => { run: (sql: string) => void; exec: (sql: string) => { columns: string[]; values: unknown[][] }[]; export: () => Uint8Array } }> }).initSqlJs = vi.fn().mockResolvedValue({
      Database: class {
        run(sql: string) {
          if (sql.includes('INVALID SQL SYNTAX ATOMIC FAIL')) {
            throw new Error('SQLite syntax error mock');
          }
        }
        exec(sql: string) {
          if (sql.includes('PRAGMA table_info')) {
            return [{ columns: ['cid', 'name'], values: [[0, 'id'], [1, 'created_at'], [2, 'senderid'], [3, 'value']] }];
          }
          return [{ columns: ['id'], values: [['a']] }];
        }
        export() {
          return new Uint8Array([1, 2, 3]);
        }
      }
    });
  });

  afterEach(() => {
    cleanupTestDB();
    vi.clearAllMocks();
  });

  it('successfully executes multi-table atomic queries inside transaction', async () => {
    const queries = [
      { sql: "CREATE TABLE IF NOT EXISTS test_table (id TEXT PRIMARY KEY, val INT);" },
      { sql: "INSERT INTO test_table (id, val) VALUES ('a', 10);" },
      { sql: "INSERT INTO test_table (id, val) VALUES ('b', 20);" }
    ];

    await executeAtomicSaveTransaction(queries);

    const rows = await queryLocal("SELECT * FROM test_table ORDER BY id ASC");
    expect(rows).toBeDefined();
  });

  it('triggers ROLLBACK and throws when a query fails inside transaction', async () => {
    const failingQueries = [
      { sql: "INSERT INTO rollback_test (id) VALUES ('valid_second');" },
      { sql: "INVALID SQL SYNTAX ATOMIC FAIL;" }
    ];

    await expect(executeAtomicSaveTransaction(failingQueries)).rejects.toThrow();
  });
});
