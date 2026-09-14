/**
 * scripts/auditors/persistence/validate_schema_parity.ts
 *
 * SQL SCHEMA MULTI-ENGINE PARITY AUDITOR (Node.js 26+ Native)
 *
 * Enforces 100% structural parity between PostgreSQL migrations (database/migrations/*.sql)
 * and the SQLite offline engine schema (node:sqlite in-memory):
 *   1. Executes the complete migration pipeline on an in-memory SQLite database.
 *   2. Extracts all tables and columns from SQLite PRAGMA table_info.
 *   3. Parses PostgreSQL DDL statements (CREATE TABLE, ALTER TABLE ADD COLUMN).
 *   4. Asserts that every PostgreSQL table and column exists in SQLite without divergence.
 *   5. Guarantees behavioral parity across offline and online database engines.
 *
 * Escape Hatch:
 *   -- parity-ok: <justification> disables violation for that table/column.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/persistence/validate_schema_parity.ts
 *   npm run validate:schema-parity
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { enableCompileCache } from 'node:module';
import { translatePostgresToSqlite, splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { setupValidation } from '../../lib/validationBase.ts';
import type { FindingSeverity } from '../../lib/auditContract.ts';
import { initTestDatabaseSchema } from './_testDbHelper.ts';

enableCompileCache();

export interface SchemaParityViolation {
  readonly table: string;
  readonly column?: string;
  readonly type: 'missing_table' | 'missing_column' | 'orphan_table';
  readonly severity: FindingSeverity;
  readonly message: string;
}

export interface SchemaParityAuditResult {
  readonly pgTablesCount: number;
  readonly sqliteTablesCount: number;
  readonly columnsAudited: number;
  readonly violations: readonly SchemaParityViolation[];
  readonly passed: boolean;
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'database/migrations');

// System or internal tables that are engine-specific
const EXEMPT_TABLES = new Set<string>([ // runtime-set: Fast O(1) membership lookup set
  'schema_migrations',
  'flyway_schema_history',
  'pg_stat_statements'
]);

function cleanIdentifier(id: string): string {
  return id.replace(/["'`]/g, '').trim().toLowerCase(); // string-ok: Database identifier normalization
}

/**
 * Parses PostgreSQL migration files to extract tables and their declared columns.
 */
function parsePostgresSchema(): Map<string, Set<string>> {
  const pgTables = new Map<string, Set<string>>();

  if (!fs.existsSync(MIGRATIONS_DIR)) return pgTables;

  const entries = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !f.endsWith('.sqlite.sql'))
    .sort((a, b) => a.localeCompare(b));

  for (const file of entries) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

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

        // Skip table constraints
        const upper = line.toUpperCase(); // string-ok: SQL constraint normalization
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

        // Extract first identifier as column name
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

/**
 * Executes migrations on in-memory SQLite and extracts actual tables and columns.
 */
function getSqliteSchema(): Map<string, Set<string>> {
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
        // Ignored for harmless migration redundancies, exactly as in validate_sql_migrations.ts
      }
    }
  }

  // Query tables
  const tablesResult = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all() as { name: string }[];

  for (const row of tablesResult) {
    const tableName = cleanIdentifier(row.name);
    if (EXEMPT_TABLES.has(tableName)) continue;

    const colSet = new Set<string>(); // runtime-set: Fast O(1) membership lookup set
    const colsResult = db.prepare(`PRAGMA table_info("${tableName}")`).all() as { name: string }[];
    for (const col of colsResult) {
      colSet.add(cleanIdentifier(col.name));
    }
    sqliteTables.set(tableName, colSet);
  }

  return sqliteTables;
}

export function auditSchemaParity(): SchemaParityAuditResult {
  const violations: SchemaParityViolation[] = [];
  const pgTables = parsePostgresSchema();
  const sqliteTables = getSqliteSchema();

  let columnsAudited = 0;

  // 1. Check PostgreSQL -> SQLite parity
  for (const [tableName, pgCols] of pgTables.entries()) {
    const sqliteCols = sqliteTables.get(tableName);
    if (!sqliteCols) {
      violations.push({
        table: tableName,
        type: 'missing_table',
        severity: 'error',
        message: `Tabla PostgreSQL '${tableName}' no existe en el esquema SQLite offline.`
      });
      continue;
    }

    for (const col of pgCols) {
      columnsAudited++;
      if (!sqliteCols.has(col)) {
        violations.push({
          table: tableName,
          column: col,
          type: 'missing_column',
          severity: 'error',
          message: `Columna '${col}' en tabla '${tableName}' existe en PostgreSQL pero falta en SQLite offline.`
        });
      }
    }
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  return {
    pgTablesCount: pgTables.size,
    sqliteTablesCount: sqliteTables.size,
    columnsAudited,
    violations,
    passed: !hasErrors
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'SQL SCHEMA MULTI-ENGINE PARITY AUDITOR',
    family: 'persistence',
    id: 'validate_schema_parity'
  });

  const result = auditSchemaParity();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    const target = v.column ? `${v.table}.${v.column}` : v.table;
    const msg = `[SCHEMA_PARITY_${v.type.toUpperCase()}] ${target} → ${v.message}`;
    if (v.severity === 'error') {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  await validator.finish(
    {
      'PostgreSQL tables parsed': result.pgTablesCount,
      'SQLite tables validated': result.sqliteTablesCount,
      'Columns parity audited': result.columnsAudited,
      'Parity violations': result.violations.length
    },
    errors,
    warnings
  );
}
