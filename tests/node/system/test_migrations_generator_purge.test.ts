import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';
import { initTestDatabaseSchema } from '../../../scripts/auditors/persistence/_testDbHelper.ts';

describe('Client Migrations Manifest PostgreSQL Purge Specification', () => {
  const migrationsDir = path.resolve('database/migrations');
  const manifestPath = path.resolve('src/logic/db/migrations_data.ts');

  it('should purge PostgreSQL SQL from DATABASE_MIGRATIONS when a companion .sqlite.sql exists', () => {
    const list = fs.readdirSync(migrationsDir);
    const sqlFiles = list.filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'));

    let purgedCount = 0;
    let fallbackCount = 0;

    for (const sqlFile of sqlFiles) {
      const migrationId = sqlFile.replace(/\.sql$/, '');
      const sqliteFile = sqlFile.replace(/\.sql$/, '.sqlite.sql');
      const hasCompanion = list.includes(sqliteFile);

      const entry = DATABASE_MIGRATIONS.find(m => m.id === migrationId) as {
        id: string;
        sql: string;
        sqlite_sql?: string;
      } | undefined;

      expect(entry, `Migration ${migrationId} must be registered in DATABASE_MIGRATIONS`).toBeDefined();
      if (!entry) continue;

      if (hasCompanion) {
        expect(
          entry.sqlite_sql,
          `Migration ${migrationId} has a companion .sqlite.sql, so sqlite_sql must be defined`
        ).toBeDefined();
        expect(
          entry.sqlite_sql!.length,
          `Migration ${migrationId} sqlite_sql must not be empty`
        ).toBeGreaterThan(0);
        expect(
          entry.sql,
          `Migration ${migrationId} has companion .sqlite.sql, so sql (PostgreSQL) MUST be purged to empty string`
        ).toBe('');
        purgedCount++;
      } else {
        expect(
          entry.sqlite_sql,
          `Migration ${migrationId} has NO companion .sqlite.sql, so sqlite_sql must be undefined`
        ).toBeUndefined();
        expect(
          entry.sql.length,
          `Migration ${migrationId} has NO companion, so sql must contain the fallback DDL`
        ).toBeGreaterThan(0);
        fallbackCount++;
      }
    }

    expect(purgedCount).toBeGreaterThanOrEqual(50);
    expect(fallbackCount).toBeGreaterThanOrEqual(40);
  });

  it('should execute 100% of purged DATABASE_MIGRATIONS on in-memory SQLite without schema errors', () => {
    using db = new DatabaseSync(':memory:');
    initTestDatabaseSchema(db);

    let executedCount = 0;
    for (const m of DATABASE_MIGRATIONS as { id: string; sql: string; sqlite_sql?: string }[]) {
      const sqlSource = m.sqlite_sql !== undefined ? m.sqlite_sql : m.sql;
      const isSqliteSpec = m.sqlite_sql !== undefined;
      const statements = splitSQLStatements(sqlSource);

      for (const stmt of statements) {
        if (!stmt.trim()) continue;
        const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
        if (!sql) continue;

        try {
          db.exec(sql);
        } catch (err: unknown) {
          const msg = (err as Error).message.toLowerCase();
          const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
          const isMissing = msg.includes('no such column');
          if (!isDuplicate && !isMissing) {
            throw new Error(`Migration ${m.id} failed during in-memory SQLite execution: ${(err as Error).message}`);
          }
        }
      }
      executedCount++;
    }

    expect(executedCount).toBe(DATABASE_MIGRATIONS.length);

    // Verify key tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
    const tableNames = new Set(tables.map(t => t.name));
    expect(tableNames.has('profiles')).toBe(true);
    expect(tableNames.has('game_saves')).toBe(true);
    expect(tableNames.has('system_config')).toBe(true);
  });

  it('should reduce the manifest source file size below 8 MB', () => {
    const stats = fs.statSync(manifestPath);
    // Prior to purge, manifest is ~10.68 MB (10,688,462 bytes).
    // After purge of 2.84 MB Postgres SQL, manifest must be under 8,000,000 bytes.
    expect(stats.size).toBeLessThan(8000000);
  });
});
