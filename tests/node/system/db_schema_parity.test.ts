import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';

describe('Database Schema and Migration Parity Validator', () => {
  it('should have all migration changes fully reflected in the static TABLES_SCHEMA', () => {
    // 1. Database A: Built using ONLY static TABLES_SCHEMA definitions
    using dbA = new DatabaseSync(':memory:');
    TABLES_SCHEMA.forEach(schema => {
      dbA.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
    });

    // 2. Database B: Built using TABLES_SCHEMA + executing all migrations
    using dbB = new DatabaseSync(':memory:');
    TABLES_SCHEMA.forEach(schema => {
      dbB.exec(`CREATE TABLE IF NOT EXISTS ${schema}`);
    });

    dbB.exec("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))");

    // Apply migrations step-by-step
    for (const m of DATABASE_MIGRATIONS as { id: string, sql: string, sqlite_sql?: string }[]) {
      const sqlSource = m.sqlite_sql !== undefined ? m.sqlite_sql : m.sql;
      const isSqliteSpec = m.sqlite_sql !== undefined;
      const statements = splitSQLStatements(sqlSource);

      statements.forEach(stmt => {
        const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
        if (sql) {
          try {
            dbB.exec(sql);
          } catch (err: unknown) {
            const msg = (err as Error).message.toLowerCase();
            const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
            const isMissing = msg.includes('no such column');
            if (!isDuplicate && !isMissing) {
              throw err;
            }
          }
        }
      });
    }

    // 3. Compare schemas between DB A and DB B
    const tablesResA = dbA.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_sqlite%'").all() as { name: string, sql: string }[];
    const tablesResB = dbB.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_sqlite%' AND name != '_migrations'").all() as { name: string, sql: string }[];

    const schemaMapA = new Map(tablesResA.map(t => [t.name, t.sql]));
    const schemaMapB = new Map(tablesResB.map(t => [t.name, t.sql]));

    // Check that all tables in migrated DB B are present in DB A
    for (const tableName of schemaMapB.keys()) {
      assert.ok(schemaMapA.has(tableName), `Table "${tableName}" was created by migrations but is missing in TABLES_SCHEMA.`);
    }

    // Check that column structures are identical
    for (const tableName of schemaMapB.keys()) {

      // Get columns for table in DB A
      const infoA = dbA.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string, type: string }[];
      const infoB = dbB.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string, type: string }[];

      const colsA = new Set(infoA.map(c => c.name));
      const colsB = new Set(infoB.map(c => c.name));

      for (const colName of colsB) {
        assert.ok(colsA.has(colName), `Column "${colName}" in table "${tableName}" is added by migrations but is missing in the static TABLES_SCHEMA definition (schema.ts).`);
      }
    }
  });
});
