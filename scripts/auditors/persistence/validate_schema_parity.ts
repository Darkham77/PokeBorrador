/**
 * scripts/auditors/persistence/validate_schema_parity.ts
 *
 * SQL SCHEMA MULTI-ENGINE PARITY AUDITOR (Node.js 26+ Native)
 *
 * Enforces 100% schema parity across PostgreSQL (online production) and SQLite (offline in-browser/dev):
 *   1. Parses all PostgreSQL migration files in database/migrations/*.sql (ignoring .sqlite.sql).
 *   2. Extracts all declared tables and their columns.
 *   3. Executes migrations against an in-memory node:sqlite database.
 *   4. Queries SQLite PRAGMA table_info and asserts that every table and column in PostgreSQL
 *      exists in SQLite with identical column identifiers.
 *
 * Rules:
 *   - Any table declared in PostgreSQL migrations missing from SQLite is an ERROR.
 *   - Any column declared in PostgreSQL migrations missing from SQLite is an ERROR.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/persistence/validate_schema_parity.ts
 *   npm run validate:schema-parity
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { initTestDatabaseSchema } from './_testDbHelper.ts';

enableCompileCache();

export type SchemaParityRuleId =
  | 'schema-parity-missing-table'
  | 'schema-parity-missing-column';

export const SCHEMA_PARITY_RULES: readonly SchemaParityRuleId[] = [
  'schema-parity-missing-table',
  'schema-parity-missing-column'
] as const;

const EXEMPT_TABLES = new Set<string>([
  'schema_migrations',
  'flyway_schema_history',
  'pg_stat_statements'
]);

function cleanIdentifier(id: string): string {
  return id.replace(/["'`]/g, '').trim().toLowerCase();
}

export class SchemaParityAuditor extends BaseAuditor<SchemaParityRuleId> {
  private readonly migrationsDir: string;

  constructor() {
    super({
      id: 'validate_schema_parity',
      name: 'SQL Schema Multi-Engine Parity Auditor',
      description: 'Verifica paridad de esquemas entre PostgreSQL y SQLite',
      family: 'persistence',
      ruleIds: SCHEMA_PARITY_RULES,
      ruleDescriptions: {
        'schema-parity-missing-table': 'Tabla de PostgreSQL no existe en esquema SQLite offline',
        'schema-parity-missing-column': 'Columna de PostgreSQL falta en tabla de SQLite offline'
      }
    });
    this.migrationsDir = path.resolve(this.projectRoot, 'database/migrations');
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 3, 'Parseando esquemas y columnas de migraciones PostgreSQL...');
    const pgTables = this.parsePostgresSchema();

    this.context.logStep(2, 3, 'Ejecutando migraciones en SQLite en memoria...');
    const sqliteTables = this.getSqliteSchema();

    this.context.logStep(3, 3, 'Comparando paridad de tablas y columnas...');
    let columnsAudited = 0;

    for (const [tableName, pgCols] of pgTables.entries()) {
      const sqliteCols = sqliteTables.get(tableName);
      if (!sqliteCols) {
        this.addViolation({
          ruleId: 'schema-parity-missing-table',
          severity: 'error',
          file: 'database/migrations',
          line: 1,
          message: `Tabla PostgreSQL '${tableName}' no existe en el esquema SQLite offline.`,
          context: tableName
        });
        continue;
      }

      for (const col of pgCols) {
        columnsAudited++;
        if (!sqliteCols.has(col)) {
          this.addViolation({
            ruleId: 'schema-parity-missing-column',
            severity: 'error',
            file: 'database/migrations',
            line: 1,
            message: `Columna '${col}' en tabla '${tableName}' existe en PostgreSQL pero falta en SQLite offline.`,
            context: `${tableName}.${col}`
          });
        }
      }
    }

    this.context.setMetric('PG Tables', pgTables.size);
    this.context.setMetric('SQLite Tables', sqliteTables.size);
    this.context.setMetric('Columns Checked', columnsAudited);
  }

  private parsePostgresSchema(): Map<string, Set<string>> {
    const pgTables = new Map<string, Set<string>>();
    if (!fs.existsSync(this.migrationsDir)) return pgTables;

    const entries = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of entries) {
      this.filesScannedCount++;
      const content = fs.readFileSync(path.join(this.migrationsDir, file), 'utf-8');

      // 1. Match CREATE TABLE [IF NOT EXISTS] [public.]tableName ( ... )
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
      let match: RegExpExecArray | null;

      while ((match = createTableRegex.exec(content)) !== null) {
        const rawTableName = cleanIdentifier(match[1] || '');
        if (!rawTableName || EXEMPT_TABLES.has(rawTableName)) continue;

        if (!pgTables.has(rawTableName)) {
          pgTables.set(rawTableName, new Set<string>());
        }
        const colSet = pgTables.get(rawTableName)!;

        const body = match[2] || '';
        const lines = body.split('\n');
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line.startsWith('--') || line.startsWith('/*')) continue;

          const upper = line.toUpperCase();
          if (
            upper.startsWith('CONSTRAINT') ||
            upper.startsWith('PRIMARY KEY') ||
            upper.startsWith('FOREIGN KEY') ||
            upper.startsWith('UNIQUE') ||
            upper.startsWith('CHECK') ||
            upper.startsWith('EXCLUDE')
          ) {
            continue;
          }

          const colMatch = line.match(/^([a-zA-Z0-9_]+)\b/);
          if (colMatch && colMatch[1]) {
            colSet.add(cleanIdentifier(colMatch[1]));
          }
        }
      }

      // 2. Match ALTER TABLE [public.]tableName ADD COLUMN [IF NOT EXISTS] colName
      const alterTableRegex = /ALTER\s+TABLE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/gi;
      let alterMatch: RegExpExecArray | null;

      while ((alterMatch = alterTableRegex.exec(content)) !== null) {
        const tableName = cleanIdentifier(alterMatch[1] || '');
        const colName = cleanIdentifier(alterMatch[2] || '');
        if (!tableName || !colName || EXEMPT_TABLES.has(tableName)) continue;

        if (!pgTables.has(tableName)) {
          pgTables.set(tableName, new Set<string>());
        }
        pgTables.get(tableName)!.add(colName);
      }
    }

    return pgTables;
  }

  private getSqliteSchema(): Map<string, Set<string>> {
    const sqliteTables = new Map<string, Set<string>>();

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
        } catch {
          // Ignored for harmless migration redundancies
        }
      }
    }

    const tablesResult = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];

    for (const row of tablesResult) {
      const tableName = cleanIdentifier(row.name);
      if (EXEMPT_TABLES.has(tableName)) continue;

      const colSet = new Set<string>();
      const colsResult = db.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string }[];
      for (const col of colsResult) {
        colSet.add(cleanIdentifier(col.name));
      }
      sqliteTables.set(tableName, colSet);
    }

    return sqliteTables;
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new SchemaParityAuditor());
}
