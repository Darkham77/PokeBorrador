/**
 * scripts/auditors/persistence/validate_sql_migrations.ts
 * 
 * SQL MIGRATION VALIDATOR (Node.js 26+)
 * In-memory SQLite validation of database migrations translated from PostgreSQL syntax,
 * strict monotonicity / non-repetition audit of migration timestamps, and exact parity
 * between filename timestamps and internal system_config db_version updates.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { enableCompileCache } from 'node:module';
import { translatePostgresToSqlite, splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { initTestDatabaseSchema } from './_testDbHelper.ts';

enableCompileCache();

function isIgnorableSqliteMigrationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = ((error as Error).message || '').toLowerCase();
  const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
  const isMissing = msg.includes('no such column');
  return isDuplicate || isMissing;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');
const TIMESTAMP_REGEX = /^(\d{14})_/;
const DB_VERSION_SQL_REGEX = /(?:VALUES\s*\(\s*['"]db_version['"]\s*,\s*['"]?(\d{14})|SET\s+value\s*=\s*['"]?(\d{14})|jsonb_build_object\s*\(\s*['"]db_version['"]\s*,\s*['"]?(\d{14}))/i;

export type SqlMigrationRuleId =
  | 'sql-migration-orphan-sqlite'
  | 'sql-migration-invalid-timestamp'
  | 'sql-migration-duplicate-timestamp'
  | 'sql-migration-broken-monotonicity'
  | 'sql-migration-dbversion-desync'
  | 'sql-migration-sqlite-exec-failure';

export const SQL_MIGRATION_RULES: readonly SqlMigrationRuleId[] = [
  'sql-migration-orphan-sqlite',
  'sql-migration-invalid-timestamp',
  'sql-migration-duplicate-timestamp',
  'sql-migration-broken-monotonicity',
  'sql-migration-dbversion-desync',
  'sql-migration-sqlite-exec-failure'
] as const;

export class SqlMigrationAuditor extends BaseAuditor<SqlMigrationRuleId> {
  constructor() {
    super({
      id: 'validate_sql_migrations',
      name: 'SQL Migration Validator',
      description: 'Errores de sintaxis o ejecución en migraciones SQL',
      family: 'persistence',
      ruleIds: SQL_MIGRATION_RULES,
      ruleDescriptions: {
        'sql-migration-orphan-sqlite': 'Archivo .sqlite.sql huérfano sin migración SQL',
        'sql-migration-invalid-timestamp': 'Timestamp inválido en nombre de migración',
        'sql-migration-duplicate-timestamp': 'Timestamp duplicado en migraciones SQL',
        'sql-migration-broken-monotonicity': 'Secuencia temporal no monótona en migraciones',
        'sql-migration-dbversion-desync': 'Desincronización de versión con db_version',
        'sql-migration-sqlite-exec-failure': 'Fallo de ejecución en SQLite en memoria'
      },
      requiredFiles: [MIGRATIONS_DIR]
    });
  }

  public override async runAudit(): Promise<void> {
    const dirEntries = await fs.readdir(MIGRATIONS_DIR);
    const baseSqlFiles = dirEntries
      .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'))
      .sort((a, b) => a.localeCompare(b));

    this.filesScannedCount = baseSqlFiles.length;
    this.context.logStep(1, 2, `Validating timestamps and db_version sync across ${baseSqlFiles.length} migrations...`);

    const sqliteFiles = dirEntries.filter(f => f.endsWith('.sqlite.sql'));
    for (const sqliteFile of sqliteFiles) {
      const baseSqlFile = sqliteFile.replace(/\.sqlite\.sql$/, '.sql');
      if (!dirEntries.includes(baseSqlFile)) {
        this.addViolation({
          ruleId: 'sql-migration-orphan-sqlite',
          severity: 'error',
          file: `database/migrations/${sqliteFile}`,
          line: 1,
          message: `Archivo SQLite huérfano sin archivo PostgreSQL base: ${sqliteFile}`,
          context: sqliteFile
        });
      }
    }

    const seenTimestamps = new Set<string>();
    let lastTimestamp = '';
    let validatedDbVersionStatements = 0;

    for (const file of baseSqlFiles) {
      const match = file.match(TIMESTAMP_REGEX);
      if (!match || !match[1]) {
        this.addViolation({
          ruleId: 'sql-migration-invalid-timestamp',
          severity: 'error',
          file: `database/migrations/${file}`,
          line: 1,
          message: `Formato de timestamp inválido en archivo '${file}'. Debe iniciar con un timestamp de 14 dígitos (YYYYMMDDHHmmss_...).`,
          context: file
        });
        continue;
      }

      const timestamp = match[1];

      if (seenTimestamps.has(timestamp)) {
        this.addViolation({
          ruleId: 'sql-migration-duplicate-timestamp',
          severity: 'error',
          file: `database/migrations/${file}`,
          line: 1,
          message: `Timestamp duplicado detectado: '${timestamp}' en archivo '${file}'. Todos los timestamps deben ser estrictamente únicos.`,
          context: timestamp
        });
      }
      seenTimestamps.add(timestamp);

      if (lastTimestamp && timestamp <= lastTimestamp) {
        this.addViolation({
          ruleId: 'sql-migration-broken-monotonicity',
          severity: 'error',
          file: `database/migrations/${file}`,
          line: 1,
          message: `Monotonicidad rota: El timestamp '${timestamp}' (${file}) no es estrictamente mayor que el anterior '${lastTimestamp}'.`,
          context: `${lastTimestamp} -> ${timestamp}`
        });
      }
      lastTimestamp = timestamp;

      const content = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
      const pgVersionMatch = content.match(DB_VERSION_SQL_REGEX);
      if (pgVersionMatch) {
        const sqlVersion = pgVersionMatch[1] || pgVersionMatch[2] || pgVersionMatch[3];
        if (sqlVersion && sqlVersion !== timestamp) {
          this.addViolation({
            ruleId: 'sql-migration-dbversion-desync',
            severity: 'error',
            file: `database/migrations/${file}`,
            line: 1,
            message: `Desincronización de db_version en PostgreSQL '${file}': El SQL declara versión '${sqlVersion}' pero el timestamp del nombre de archivo es '${timestamp}'.`,
            context: `${sqlVersion} !== ${timestamp}`
          });
        } else {
          validatedDbVersionStatements++;
        }
      }

      // Companion .sqlite.sql
      const companionSqliteName = file.replace(/\.sql$/, '.sqlite.sql');
      if (dirEntries.includes(companionSqliteName)) {
        const sqliteContent = await fs.readFile(path.join(MIGRATIONS_DIR, companionSqliteName), 'utf-8');
        const sqliteVersionMatch = sqliteContent.match(DB_VERSION_SQL_REGEX);
        if (sqliteVersionMatch) {
          const sqliteVersion = sqliteVersionMatch[1] || sqliteVersionMatch[2] || sqliteVersionMatch[3];
          if (sqliteVersion && sqliteVersion !== timestamp) {
            this.addViolation({
              ruleId: 'sql-migration-dbversion-desync',
              severity: 'error',
              file: `database/migrations/${companionSqliteName}`,
              line: 1,
              message: `Desincronización de db_version en SQLite '${companionSqliteName}': El SQL declara versión '${sqliteVersion}' pero el timestamp del nombre de archivo es '${timestamp}'.`,
              context: `${sqliteVersion} !== ${timestamp}`
            });
          }
        }
      }
    }

    this.context.logStep(2, 2, `Executing incremental SQL migrations on in-memory SQLite (${DATABASE_MIGRATIONS.length} migrations)...`);
    using db = new DatabaseSync(':memory:');
    initTestDatabaseSchema(db);

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
          if (!isIgnorableSqliteMigrationError(stmtErr)) {
            this.addViolation({
              ruleId: 'sql-migration-sqlite-exec-failure',
              severity: 'error',
              file: `database/migrations/${migration.id}.sql`,
              line: 1,
              message: `Migration ${migration.id} failed in-memory SQLite execution: ${(stmtErr as Error).message}`,
              context: stmt.trim().slice(0, 100)
            });
          }
        }
      }
    }

    this.context.setMetric('SQL migrations verified', baseSqlFiles.length);
    this.context.setMetric('Monotonic timestamps', seenTimestamps.size);
    this.context.setMetric('db_version synced', validatedDbVersionStatements);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SqlMigrationAuditor());
}
