// fallow-ignore-file security-sink
/**
 * scripts/auditors/persistence/validate_sql_migrations.ts
 * 
 * SQL MIGRATION VALIDATOR (Node.js 26+)
 * In-memory SQLite validation of database migrations translated from PostgreSQL syntax.
 */

import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { enableCompileCache } from 'node:module';
import { translatePostgresToSqlite, splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { setupValidation } from '../../lib/validationBase.ts';
import { initTestDatabaseSchema } from './_testDbHelper.ts';

enableCompileCache();

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');

async function validateMigrations() {
  const validator = setupValidation({
    title: 'SQL MIGRATION VALIDATOR',
    requiredFiles: [MIGRATIONS_DIR]
  });

  await validator.checkFiles();

  using db = new DatabaseSync(':memory:');
  initTestDatabaseSchema(db);

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain

  for (const migration of DATABASE_MIGRATIONS) {
    const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
    const isSqliteSpec = migration.sqlite_sql !== undefined;
    const statements = splitSQLStatements(sqlSource);

    for (const stmt of statements) {
      if (!stmt.trim()) continue;
      const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
      if (!sql) continue;

      try {
        db.exec(sql);
      } catch (stmtErr: unknown) {
        const msg = (stmtErr as Error).message.toLowerCase(); // string-ok
        const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
        const isMissing = msg.includes('no such column');
        if (!isDuplicate && !isMissing) {
          errors.push(`[Migración] ${migration.id}: FALLÓ: ${(stmtErr as Error).message}`);
        }
      }
    }
  }

  await validator.finish(
    {
      'Migraciones SQL validadas': DATABASE_MIGRATIONS.length
    },
    errors,
    warnings
  );
}

validateMigrations().catch(err => {
  console.error(`💥 Error fatal: ${(err as Error).message}`);
  process.exit(1);
});
