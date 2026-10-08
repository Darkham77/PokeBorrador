/**
 * @file migration_runner_hardening.test.ts
 * @description Hardening verification suite ensuring all database migration runners
 * execute atomically with fail-fast semantics (ON_ERROR_STOP parity) across SQLite and PostgreSQL.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { describeWithDatabase } from '../../dbTestHelper.ts';

describeWithDatabase('Database Migration Runner Hardening & Fail-Fast Parity', (engine, getDb) => {
  it('aborts transaction and fails fast when a migration statement contains invalid syntax', async () => {
    if (engine === 'postgres') {
      const db = getDb();
      await db.run('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)');
      await db.run('CREATE TABLE IF NOT EXISTS system_config (key TEXT PRIMARY KEY, value JSONB)');
      await db.run("INSERT INTO system_config (key, value) VALUES ('db_version', '20260101000000'::jsonb)");

      const validStmt = 'CREATE TABLE temp_hardening_probe (id TEXT PRIMARY KEY, name TEXT)';
      const brokenStmt = 'CREAT TABLE broken_syntax_error (id TEXT)'; // Deliberate syntax error

      let executionError: Error | null = null;
      try {
        await db.run(
          `DO $$
          BEGIN
            EXECUTE '${validStmt}';
            EXECUTE '${brokenStmt}';
            INSERT INTO _migrations (id, applied_at) VALUES ('99999999999999_flawed_migration', NOW()::text);
          END $$;`
        );
      } catch (err: unknown) {
        executionError = err as Error;
      }

      assert.ok(executionError !== null, 'Runner must throw fatal error on broken SQL in PostgreSQL');

      let probeTableExists = false;
      try {
        const rows = await db.query('SELECT * FROM temp_hardening_probe');
        probeTableExists = rows !== undefined && rows.length > 0;
      } catch {
        probeTableExists = false;
      }
      assert.strictEqual(probeTableExists, false, 'Table from aborted transaction must not exist after rollback in PostgreSQL');

      const appliedRows = await db.query<{ id: string }>("SELECT id FROM _migrations WHERE id = '99999999999999_flawed_migration'");
      assert.strictEqual(appliedRows.length, 0, 'Failed migration must never be registered in _migrations in PostgreSQL');

      const versionRows = await db.query<{ value: unknown }>("SELECT value FROM system_config WHERE key = 'db_version'");
      const dbVersion = String(versionRows[0]?.value);
      assert.ok(dbVersion.includes('20260101000000'), `system_config.db_version must not advance upon failure in PostgreSQL (got ${dbVersion})`);
    } else {
      using db = new DatabaseSync(':memory:');
      db.exec('CREATE TABLE _migrations (id TEXT PRIMARY KEY, applied_at TEXT);');
      db.exec('CREATE TABLE system_config (key TEXT PRIMARY KEY, value TEXT);');
      db.exec("INSERT INTO system_config (key, value) VALUES ('db_version', '20260101000000');");

      let threw = false;
      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec('CREATE TABLE temp_hardening_probe (id TEXT PRIMARY KEY, name TEXT);');
        db.exec('CREAT TABLE broken_syntax_error (id TEXT);');
        db.exec("INSERT INTO _migrations (id, applied_at) VALUES ('99999999999999_flawed_migration', 'now');");
        db.exec('COMMIT;');
      } catch {
        db.exec('ROLLBACK;');
        threw = true;
      }

      assert.strictEqual(threw, true, 'Runner must throw fatal error on broken SQL in SQLite');

      const probeCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='temp_hardening_probe'").all();
      assert.strictEqual(probeCheck.length, 0, 'Table from aborted transaction must not exist after rollback in SQLite');

      const migRows = db.prepare("SELECT id FROM _migrations WHERE id = '99999999999999_flawed_migration'").all();
      assert.strictEqual(migRows.length, 0, 'Failed migration must never be registered in _migrations in SQLite');

      const versionRow = db.prepare("SELECT value FROM system_config WHERE key = 'db_version'").get() as { value: string };
      assert.strictEqual(versionRow.value, '20260101000000', 'system_config.db_version must not advance upon failure in SQLite');
    }
  });

  it('rejects constraint violations and rolls back completely', async () => {
    if (engine === 'postgres') {
      const db = getDb();
      await db.run('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)');
      await db.run('CREATE TABLE IF NOT EXISTS strict_constraint_test (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)');
      await db.run("INSERT INTO strict_constraint_test (id, email) VALUES (1, 'alice@test.com')");

      let executionError: Error | null = null;
      try {
        await db.run(
          `DO $$
          BEGIN
            INSERT INTO strict_constraint_test (id, email) VALUES (2, 'bob@test.com');
            INSERT INTO strict_constraint_test (id, email) VALUES (3, 'alice@test.com');
            INSERT INTO _migrations (id, applied_at) VALUES ('99999999999998_constraint_migration', NOW()::text);
          END $$;`
        );
      } catch (err: unknown) {
        executionError = err as Error;
      }

      assert.ok(executionError !== null, 'Runner must throw on constraint violation in PostgreSQL');

      const bobRows = await db.query<{ id: number }>("SELECT id FROM strict_constraint_test WHERE email = 'bob@test.com'");
      assert.strictEqual(bobRows.length, 0, 'Row from aborted migration must be rolled back in PostgreSQL');

      const appliedRows = await db.query<{ id: string }>("SELECT id FROM _migrations WHERE id = '99999999999998_constraint_migration'");
      assert.strictEqual(appliedRows.length, 0, 'Failed constraint migration must not exist in _migrations in PostgreSQL');
    } else {
      using db = new DatabaseSync(':memory:');
      db.exec('CREATE TABLE _migrations (id TEXT PRIMARY KEY, applied_at TEXT);');
      db.exec('CREATE TABLE strict_users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE);');
      db.exec("INSERT INTO strict_users (id, email) VALUES (1, 'alice@test.com');");

      let threw = false;
      db.exec('BEGIN TRANSACTION;');
      try {
        db.exec("INSERT INTO strict_users (id, email) VALUES (2, 'bob@test.com');");
        db.exec("INSERT INTO strict_users (id, email) VALUES (3, 'alice@test.com');"); // Duplicate email
        db.exec("INSERT INTO _migrations (id, applied_at) VALUES ('99999999999998_constraint_migration', 'now');");
        db.exec('COMMIT;');
      } catch {
        db.exec('ROLLBACK;');
        threw = true;
      }

      assert.strictEqual(threw, true, 'Runner must throw on constraint violation in SQLite');

      const bob = db.prepare("SELECT id FROM strict_users WHERE email = 'bob@test.com'").all();
      assert.strictEqual(bob.length, 0, 'Bob must not be persisted after transaction rollback in SQLite');

      const mig = db.prepare("SELECT id FROM _migrations WHERE id = '99999999999998_constraint_migration'").all();
      assert.strictEqual(mig.length, 0, 'Failed constraint migration must not exist in _migrations in SQLite');
    }
  });
});

describe('SQLite Migration Execution Helper Hardening', () => {
  it('detects unignorable errors in statement-by-statement executor', () => {
    using db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE _migrations (id TEXT PRIMARY KEY, applied_at TEXT);');
    db.exec('CREATE TABLE items (id TEXT PRIMARY KEY, qty INTEGER NOT NULL);');

    let caughtError: Error | null = null;
    db.exec('BEGIN TRANSACTION;');
    try {
      try {
        db.exec("INSERT INTO items (id, qty) VALUES ('potion', NULL);");
      } catch (err: unknown) {
        throw new Error(`Statement failed in migration test: ${(err as Error).message}`, { cause: err });
      }
      db.exec("INSERT INTO _migrations VALUES ('mig_test', 'now');");
      db.exec('COMMIT;');
    } catch (e: unknown) {
      db.exec('ROLLBACK;');
      caughtError = e as Error;
    }

    assert.ok(caughtError !== null, 'Statement executor must fail loudly on constraint violation');
    assert.ok(caughtError.message.includes('Statement failed in migration test'));

    const items = db.prepare('SELECT * FROM items').all();
    assert.strictEqual(items.length, 0, 'No items should be committed');

    const migs = db.prepare('SELECT * FROM _migrations').all();
    assert.strictEqual(migs.length, 0, 'No migrations should be marked applied');
  });
});
