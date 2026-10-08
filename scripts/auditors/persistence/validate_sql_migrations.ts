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
import { BaseAuditor } from '@francogp/auditor';
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
const DB_VERSION_SQL_REGEX = /(?:VALUES\s*\(\s*['"]db_version['"]\s*,\s*['"]*(\d{14})|SET\s+value\s*=\s*['"]*(\d{14})|jsonb_build_object\s*\(\s*['"]db_version['"]\s*,\s*['"]*(\d{14}))/i;
const MANDATORY_DB_VERSION_TIMESTAMP = '20260901000000';
const MANDATORY_SQLITE_COMPANION_TIMESTAMP = '20260619202000';

export type SqlMigrationRuleId =
  | 'sql-migration-orphan-sqlite'
  | 'sql-migration-invalid-timestamp'
  | 'sql-migration-duplicate-timestamp'
  | 'sql-migration-broken-monotonicity'
  | 'sql-migration-missing-dbversion'
  | 'sql-migration-missing-sqlite-companion'
  | 'sql-migration-sqlite-missing-dbversion'
  | 'sql-migration-dbversion-desync'
  | 'sql-migration-sqlite-exec-failure';

export const SQL_MIGRATION_RULES: readonly SqlMigrationRuleId[] = [
  'sql-migration-orphan-sqlite',
  'sql-migration-invalid-timestamp',
  'sql-migration-duplicate-timestamp',
  'sql-migration-broken-monotonicity',
  'sql-migration-missing-dbversion',
  'sql-migration-missing-sqlite-companion',
  'sql-migration-sqlite-missing-dbversion',
  'sql-migration-dbversion-desync',
  'sql-migration-sqlite-exec-failure'
] as const;

export class SqlMigrationAuditor extends BaseAuditor<SqlMigrationRuleId> {
  constructor() {
    super({
      id: 'validate_sql_migrations',
      configKey: 'persistence.sqlMigrations',
      defaultConfig: {
        enabled: true
      },
      name: 'SQL Migration Validator',
      description: 'Errores de sintaxis o ejecución en migraciones SQL',
      icon: '📜',
      family: 'persistence',
      ruleIds: SQL_MIGRATION_RULES,
      packageName: 'Migración',
      ruleDescriptions: {
        'sql-migration-orphan-sqlite': '.sqlite.sql huérfano',
        'sql-migration-invalid-timestamp': 'Timestamp inválido',
        'sql-migration-duplicate-timestamp': 'Timestamp duplicado',
        'sql-migration-broken-monotonicity': 'Secuencia no monótona',
        'sql-migration-missing-dbversion': 'Postgres sin db_version',
        'sql-migration-missing-sqlite-companion': 'Falta compañero .sqlite.sql',
        'sql-migration-sqlite-missing-dbversion': 'SQLite sin db_version',
        'sql-migration-dbversion-desync': 'Desincronización db_version',
        'sql-migration-sqlite-exec-failure': 'Fallo en SQLite en memoria'
      },
      requiredFiles: [MIGRATIONS_DIR],
      coverage: {
        include: ['database/migrations/*.sql']
      }
    });
  }

  private validateOrphanSqliteFiles(dirEntries: readonly string[]): void {
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
  }

  private validateTimestampHeader(file: string, seenTimestamps: Set<string>, lastTimestamp: string): string | null {
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
      return null;
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
    return timestamp;
  }

  private validatePostgresDbVersion(file: string, timestamp: string, content: string): boolean {
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
        return false;
      }
      return true;
    }
    if (timestamp >= MANDATORY_DB_VERSION_TIMESTAMP) {
      this.addViolation({
        ruleId: 'sql-migration-missing-dbversion',
        severity: 'error',
        file: `database/migrations/${file}`,
        line: 1,
        message: `Migración PostgreSQL '${file}' sin sentencia obligatoria de db_version en system_config.`,
        context: file
      });
    }
    return false;
  }

  private async validateCompanionSqlite(file: string, timestamp: string, dirEntries: readonly string[]): Promise<void> {
    const companionSqliteName = file.replace(/\.sql$/, '.sqlite.sql');
    const hasCompanionSqlite = dirEntries.includes(companionSqliteName);

    if (hasCompanionSqlite) {
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
      } else if (timestamp >= MANDATORY_DB_VERSION_TIMESTAMP) {
        this.addViolation({
          ruleId: 'sql-migration-sqlite-missing-dbversion',
          severity: 'error',
          file: `database/migrations/${companionSqliteName}`,
          line: 1,
          message: `Migración SQLite '${companionSqliteName}' sin sentencia obligatoria de db_version en system_config.`,
          context: companionSqliteName
        });
      }
    } else if (timestamp >= MANDATORY_SQLITE_COMPANION_TIMESTAMP) {
      this.addViolation({
        ruleId: 'sql-migration-missing-sqlite-companion',
        severity: 'error',
        file: `database/migrations/${file}`,
        line: 1,
        message: `Migración PostgreSQL '${file}' sin archivo compañero SQLite obligatorio: '${companionSqliteName}'.`,
        context: companionSqliteName
      });
    }
  }

  private executeSingleMigrationStatement(
    db: DatabaseSync,
    stmt: string,
    isSqliteSpec: boolean,
    migrationId: string
  ): void {
    if (!stmt.trim()) return;
    const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
    if (!sql) return;

    try {
      db.exec(sql);
    } catch (stmtErr: unknown) {
      if (!isIgnorableSqliteMigrationError(stmtErr)) {
        this.addViolation({
          ruleId: 'sql-migration-sqlite-exec-failure',
          severity: 'error',
          file: `database/migrations/${migrationId}.sql`,
          line: 1,
          message: `Migration ${migrationId} failed in-memory SQLite execution: ${(stmtErr as Error).message}`,
          context: stmt.trim().slice(0, 100)
        });
      }
    }
  }

  private executeSingleMigration(db: DatabaseSync, migration: (typeof DATABASE_MIGRATIONS)[number]): void {
    const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
    const isSqliteSpec = migration.sqlite_sql !== undefined;
    const statements = splitSQLStatements(sqlSource);

    for (const stmt of statements) {
      this.executeSingleMigrationStatement(db, stmt, isSqliteSpec, migration.id);
    }
  }

  private executeInMemoryMigrations(): void {
    using db = new DatabaseSync(':memory:');
    initTestDatabaseSchema(db);

    for (const migration of DATABASE_MIGRATIONS) {
      this.executeSingleMigration(db, migration);
    }
  }

  public override async runAudit(): Promise<void> {
    for (const rule of SQL_MIGRATION_RULES) {
      this.markRuleEvaluated(rule);
    }

    const dirEntries = await fs.readdir(MIGRATIONS_DIR);
    for (const file of dirEntries) {
      if (file.endsWith('.sql')) {
        this.recordScanned(path.posix.join('database/migrations', file));
      }
    }

    const baseSqlFiles = dirEntries
      .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'))
      .sort((a, b) => a.localeCompare(b));

    this.context.logStep(1, 2, `Validating timestamps and db_version sync across ${baseSqlFiles.length} migrations...`);
    this.validateOrphanSqliteFiles(dirEntries);

    const seenTimestamps = new Set<string>();
    let lastTimestamp = '';
    let validatedDbVersionStatements = 0;

    for (const file of baseSqlFiles) {
      const timestamp = this.validateTimestampHeader(file, seenTimestamps, lastTimestamp);
      if (!timestamp) continue;
      lastTimestamp = timestamp;

      const content = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8');
      if (this.validatePostgresDbVersion(file, timestamp, content)) {
        validatedDbVersionStatements++;
      }

      await this.validateCompanionSqlite(file, timestamp, dirEntries);
    }

    this.context.logStep(2, 2, `Executing incremental SQL migrations on in-memory SQLite (${DATABASE_MIGRATIONS.length} migrations)...`);
    this.executeInMemoryMigrations();

    this.context.setMetric('SQL migrations verified', baseSqlFiles.length);
    this.context.setMetric('Monotonic timestamps', seenTimestamps.size);
    this.context.setMetric('db_version synced', validatedDbVersionStatements);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SqlMigrationAuditor());
}
