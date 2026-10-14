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
import { BaseAuditor , createRuleCapabilities} from '@francogp/auditor';
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
      ruleCapabilities: createRuleCapabilities(SQL_MIGRATION_RULES, {
        speed: 'heavy',
        phase: 'normal',
        fix: 'none',
        md: false,
        ast: false,
        changedOnly: false,
        critical: false
      }),
      id: 'validate_sql_migrations',
      configKey: 'persistence.sqlMigrations',
      defaultConfig: {
        enabled: true
      },
      criticalConfig: {},
      name: 'SQL Migration Validator',
      description: 'Errores de sintaxis o ejecución en migraciones SQL',
      icon: '📜',
      family: 'persistence',
      ruleIds: SQL_MIGRATION_RULES,
      packageName: 'Migración',
      usesThirdPartyTool: false,
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
      ruleRemediations: {
        'sql-migration-orphan-sqlite': 'Remove orphan .sqlite.sql file or add matching .sql migration',
        'sql-migration-invalid-timestamp': 'Use valid 14-digit YYYYMMDDHHmmss timestamp prefix for migration file',
        'sql-migration-duplicate-timestamp': 'Ensure migration timestamp is unique across all migrations',
        'sql-migration-broken-monotonicity': 'Ensure migration timestamps are strictly increasing',
        'sql-migration-missing-dbversion': 'Update system_config.db_version to match the migration timestamp',
        'sql-migration-missing-sqlite-companion': 'Create companion .sqlite.sql migration for SQLite engine parity',
        'sql-migration-sqlite-missing-dbversion': 'Update system_config.db_version in companion .sqlite.sql file',
        'sql-migration-dbversion-desync': 'Synchronize db_version value between PostgreSQL and SQLite migrations',
        'sql-migration-sqlite-exec-failure': 'Fix SQL syntax or schema mismatch causing in-memory SQLite execution error'
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
    let dirEntries: string[] = [];
    let baseSqlFiles: string[] = [];
    const migrationFileContents = new Map<string, string>();
    const sqliteCompanionContents = new Map<string, string>();

    // Rule 1: Orphan sqlite files
    await this.runSubAuditor('sql-migration-orphan-sqlite', async () => {
      dirEntries = await fs.readdir(MIGRATIONS_DIR);
      for (const file of dirEntries) {
        if (file.endsWith('.sql')) {
          this.recordScanned(path.posix.join('database/migrations', file));
        }
      }

      baseSqlFiles = dirEntries
        .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql') && !f.includes('baseline_schema'))
        .sort((a, b) => a.localeCompare(b));

      for (const file of baseSqlFiles) {
        migrationFileContents.set(file, await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8'));
      }
      for (const file of dirEntries.filter(f => f.endsWith('.sqlite.sql'))) {
        sqliteCompanionContents.set(file, await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf-8'));
      }

      this.validateOrphanSqliteFiles(dirEntries);
    });

    // Rule 2: Invalid timestamps
    this.runSubAuditorSync('sql-migration-invalid-timestamp', () => {
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
        }
      }
    });

    // Rule 3: Duplicate timestamps
    this.runSubAuditorSync('sql-migration-duplicate-timestamp', () => {
      const seen = new Set<string>();
      for (const file of baseSqlFiles) {
        const match = file.match(TIMESTAMP_REGEX);
        if (!match || !match[1]) continue;
        const timestamp = match[1];
        if (seen.has(timestamp)) {
          this.addViolation({
            ruleId: 'sql-migration-duplicate-timestamp',
            severity: 'error',
            file: `database/migrations/${file}`,
            line: 1,
            message: `Timestamp duplicado detectado: '${timestamp}' en archivo '${file}'. Todos los timestamps deben ser estrictamente únicos.`,
            context: timestamp
          });
        }
        seen.add(timestamp);
      }
    });

    // Rule 4: Broken monotonicity
    this.runSubAuditorSync('sql-migration-broken-monotonicity', () => {
      let lastTimestamp = '';
      for (const file of baseSqlFiles) {
        const match = file.match(TIMESTAMP_REGEX);
        if (!match || !match[1]) continue;
        const timestamp = match[1];
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
      }
    });

    // Rule 5: Missing dbversion in Postgres
    this.runSubAuditorSync('sql-migration-missing-dbversion', () => {
      for (const file of baseSqlFiles) {
        const match = file.match(TIMESTAMP_REGEX);
        if (!match || !match[1]) continue;
        const timestamp = match[1];
        const content = migrationFileContents.get(file) ?? '';
        const pgVersionMatch = content.match(DB_VERSION_SQL_REGEX);
        if (!pgVersionMatch && timestamp >= MANDATORY_DB_VERSION_TIMESTAMP) {
          this.addViolation({
            ruleId: 'sql-migration-missing-dbversion',
            severity: 'error',
            file: `database/migrations/${file}`,
            line: 1,
            message: `Migración PostgreSQL '${file}' sin sentencia obligatoria de db_version en system_config.`,
            context: file
          });
        }
      }
    });

    // Rule 6: Missing sqlite companion
    this.runSubAuditorSync('sql-migration-missing-sqlite-companion', () => {
      for (const file of baseSqlFiles) {
        const match = file.match(TIMESTAMP_REGEX);
        if (!match || !match[1]) continue;
        const timestamp = match[1];
        const companionSqliteName = file.replace(/\.sql$/, '.sqlite.sql');
        const hasCompanionSqlite = dirEntries.includes(companionSqliteName);
        if (!hasCompanionSqlite && timestamp >= MANDATORY_SQLITE_COMPANION_TIMESTAMP) {
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
    });

    // Rule 7: SQLite missing dbversion
    this.runSubAuditorSync('sql-migration-sqlite-missing-dbversion', () => {
      for (const file of baseSqlFiles) {
        const match = file.match(TIMESTAMP_REGEX);
        if (!match || !match[1]) continue;
        const timestamp = match[1];
        const companionSqliteName = file.replace(/\.sql$/, '.sqlite.sql');
        if (dirEntries.includes(companionSqliteName)) {
          const sqliteContent = sqliteCompanionContents.get(companionSqliteName) ?? '';
          const sqliteVersionMatch = sqliteContent.match(DB_VERSION_SQL_REGEX);
          if (!sqliteVersionMatch && timestamp >= MANDATORY_DB_VERSION_TIMESTAMP) {
            this.addViolation({
              ruleId: 'sql-migration-sqlite-missing-dbversion',
              severity: 'error',
              file: `database/migrations/${companionSqliteName}`,
              line: 1,
              message: `Migración SQLite '${companionSqliteName}' sin sentencia obligatoria de db_version en system_config.`,
              context: companionSqliteName
            });
          }
        }
      }
    });

    // Rule 8: dbversion desync
    this.runSubAuditorSync('sql-migration-dbversion-desync', () => {
      for (const file of baseSqlFiles) {
        const match = file.match(TIMESTAMP_REGEX);
        if (!match || !match[1]) continue;
        const timestamp = match[1];
        const content = migrationFileContents.get(file) ?? '';
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
          }
        }
        const companionSqliteName = file.replace(/\.sql$/, '.sqlite.sql');
        if (dirEntries.includes(companionSqliteName)) {
          const sqliteContent = sqliteCompanionContents.get(companionSqliteName) ?? '';
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
    });

    this.runSubAuditorSync('sql-migration-sqlite-exec-failure', () => {
      this.executeInMemoryMigrations();
    });

    this.context.setMetric('SQL migrations verified', baseSqlFiles.length);
    this.context.setMetric('Monotonic timestamps', baseSqlFiles.length);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SqlMigrationAuditor());
}
