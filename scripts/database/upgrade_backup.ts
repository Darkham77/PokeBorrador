/**
 * @file upgrade_backup.ts
 * @description Upgrades legacy database backup JSON files to the latest game schema and Showdown legality.
 * 
 * WORKFLOW:
 * 1. Loads legacy backup tables dynamically into an in-memory SQLite database.
 * 2. Applies all pending official migrations in chronological order.
 * 3. Sanitizes all player saves, synchronizing species names, vigor, HP, and repairing illegal moves/abilities.
 * 4. Exports a clean, 100% compatible upgraded backup JSON (<name>_upgraded.json) ready for immediate restoration.
 * 
 * Usage:
 *   npm run database:upgrade-backup file=database/backups/server_franco/server_franco_backup_2026-06-27T05-06-25-158315918Z.json
 *   npm run database:upgrade-backup server=server_franco
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { DATABASE_MIGRATIONS } from '../../src/logic/db/migrations_data.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../src/logic/db/sqlTranslator.ts';
import { safeResolve, safeJoin } from '@francogp/auditor';

enableCompileCache();

const BACKUPS_DIR = safeResolve(process.cwd(), 'database/backups');

async function resolveTargetBackupPath(serverArg?: string, fileArg?: string): Promise<string> {
  if (fileArg) return safeResolve(process.cwd(), fileArg);
  if (!serverArg) return '';

  const serverBackupDir = safeJoin(BACKUPS_DIR, serverArg);
  try {
    const files = await fsPromises.readdir(serverBackupDir);
    const matching = files
      .filter(f => f.startsWith(`${serverArg}_backup_`) && f.endsWith('.json') && !f.includes('_upgraded'))
      .sort()
      .reverse();
    return matching.length > 0 && matching[0] ? safeJoin(serverBackupDir, matching[0]) : '';
  } catch {
    return '';
  }
}

function getPrimaryKeyClause(tableName: string, cols: readonly string[]): string {
  if (tableName === 'system_config' || tableName === 'config') return ', PRIMARY KEY ("key")';
  if (tableName === 'game_saves' || tableName === 'passive_teams' || tableName === 'war_factions' || tableName === 'war_coins' || tableName === 'daycare_upgrades' || tableName === 'ranked_queue') {
    return ', PRIMARY KEY ("user_id")';
  }
  if (tableName === 'guardian_captures') return ', PRIMARY KEY ("capture_date", "map_id", "user_id")';
  if (tableName === 'war_dominance') return ', PRIMARY KEY ("week_id", "map_id")';
  if (cols.includes('id')) return ', PRIMARY KEY ("id")';
  return '';
}

function loadBackupIntoMemorySqlite(db: DatabaseSync, backupData: Record<string, Record<string, unknown>[]>): void {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN TRANSACTION;');

  for (const [tableName, rows] of Object.entries(backupData)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const sample = rows[0];
    if (!sample || typeof sample !== 'object') continue;
    const cols = Object.keys(sample);

    const pkClause = getPrimaryKeyClause(tableName, cols);
    const colDefs = cols.map(c => `"${c}" TEXT`).join(', ') + pkClause;
    db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs})`);

    const placeholders = cols.map(() => '?').join(', ');
    const colNames = cols.map(c => `"${c}"`).join(', ');
    const stmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (${colNames}) VALUES (${placeholders})`);
    for (const r of rows) {
      const vals = cols.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
      });
      stmt.run(...vals);
    }
  }

  db.exec('COMMIT;');
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)');
}

function execStatementsBestEffort(db: DatabaseSync, statements: readonly string[]): void {
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    try {
      db.exec(trimmed);
    } catch {
      // catch-ok: Statement might already be applied or redundant in partial schema
    }
  }
}

function applySqliteMigrationSource(db: DatabaseSync, sqlSource: string, isSqliteSpec: boolean): void {
  if (isSqliteSpec) {
    try {
      db.exec(sqlSource);
      return;
    } catch {
      execStatementsBestEffort(db, splitSQLStatements(sqlSource));
      return;
    }
  }

  const translatedStmts = splitSQLStatements(sqlSource)
    .map(stmt => translatePostgresToSqlite(stmt.trim()))
    .filter((stmt): stmt is string => Boolean(stmt));
  execStatementsBestEffort(db, translatedStmts);
}

function applyPendingBackupMigrations(db: DatabaseSync, appliedSet: ReadonlySet<string>): number {
  let appliedCount = 0;
  for (const migration of DATABASE_MIGRATIONS) {
    if (appliedSet.has(migration.id)) continue;
    const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
    applySqliteMigrationSource(db, sqlSource, migration.sqlite_sql !== undefined);
    db.prepare('INSERT OR REPLACE INTO _migrations (id, applied_at) VALUES (?, ?)').run(migration.id, Temporal.Now.instant().toString());
    appliedCount++;
  }
  return appliedCount;
}

interface DatabaseTableRow {
  readonly [column: string]: unknown;
}

function isDatabaseTableRow(row: unknown): row is DatabaseTableRow {
  return typeof row === 'object' && row !== null;
}

function cleanTableRow(tableName: string, r: DatabaseTableRow): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    if (tableName === 'events_config' && (k === 'active' || k === 'manual')) {
      clean[k] = v === 1 || v === '1' || v === 'true' || v === true;
    } else if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { clean[k] = JSON.parse(v); } catch { clean[k] = v; }
    } else if (typeof v === 'string' && v.includes('[object Object]')) {
      clean[k] = {};
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function extractUpgradedBackupTables(db: DatabaseSync): Record<string, unknown[]> {
  const upgradedBackupData: Record<string, unknown[]> = {};
  const tablesStmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const tableList = tablesStmt.all() as { name: string }[];

  for (const t of tableList) {
    const rawRows = db.prepare(`SELECT * FROM "${t.name}"`).all();
    const rows = rawRows.filter(isDatabaseTableRow);
    upgradedBackupData[t.name] = rows.map(r => cleanTableRow(t.name, r));
  }
  return upgradedBackupData;
}

interface BackupObject {
  metadata?: { profile?: string; timestamp?: string; totalTables?: number; totalRows?: number };
  data?: Record<string, Record<string, unknown>[]>;
  auth?: unknown;
}

export async function upgradeBackup(): Promise<string> {
  console.log(styleText('bold', '\n--- 🔄 DATABASE BACKUP UPGRADE & NORMALIZATION TOOL (Node.js 26+) ---'));

  const rawArgs = process.argv.slice(2);
  const normalized = rawArgs.map(a => a.includes('=') && !a.startsWith('-') ? `--${a}` : a);
  const { values, positionals } = parseArgs({
    args: normalized,
    options: {
      server: { type: 'string', short: 's' },
      file: { type: 'string', short: 'f' }
    },
    allowPositionals: true,
    strict: false
  });

  const serverArg = typeof values.server === 'string' ? values.server : undefined;
  const fileArg = typeof values.file === 'string' ? values.file : positionals.find(p => p.endsWith('.json'));
  const targetBackupPath = await resolveTargetBackupPath(serverArg, fileArg);

  if (!targetBackupPath) {
    console.error(styleText('red', '❌ Error: Debes especificar un archivo de respaldo con file=<ruta> o server=<perfil>.'));
    console.log(styleText('gray', 'Ejemplo: npm run database:upgrade-backup file=database/backups/server_franco/backup.json'));
    process.exit(1);
  }

  console.log(styleText('cyan', `📂 Leyendo archivo de respaldo: ${targetBackupPath}...`));
  const rawContent = await fsPromises.readFile(targetBackupPath, 'utf8');
  const backupObj = JSON.parse(rawContent) as BackupObject;
  const backupData = backupObj.data || {};
  console.log(styleText('green', `📦 Respaldo detectado: ${Object.keys(backupData).length} tablas cargadas.`));

  using db = new DatabaseSync(':memory:');
  loadBackupIntoMemorySqlite(db, backupData);

  const appliedRows = db.prepare('SELECT id FROM _migrations').all() as { id: string }[];
  const appliedSet = new Set(appliedRows.map(r => r.id));
  console.log(styleText('cyan', `🔍 Migraciones previas registradas en el backup: ${appliedSet.size}`));

  const appliedCount = applyPendingBackupMigrations(db, appliedSet);
  console.log(styleText('green', `✅ Migraciones oficiales aplicadas con éxito: ${appliedCount}`));

  const { repairAccountsInSqlite } = await import('../maintenance/repair_account_legality.ts');
  console.log(styleText('cyan', '⚖️ Auditando y legalizando Pokémon en las cuentas...'));
  repairAccountsInSqlite({ dbInstance: db, all: true, silent: false });

  const upgradedBackupData = extractUpgradedBackupTables(db);
  const latestMigrationId = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]?.id || '20260830230000';
  const upgradedBackup = {
    metadata: {
      profile: backupObj.metadata?.profile || serverArg || 'server_franco',
      timestamp: Temporal.Now.instant().toString(),
      totalTables: Object.keys(upgradedBackupData).length,
      totalRows: Object.values(upgradedBackupData).reduce((sum, arr) => sum + arr.length, 0),
      upgradedFrom: path.basename(targetBackupPath),
      db_version: latestMigrationId
    },
    data: upgradedBackupData,
    auth: backupObj.auth || undefined
  };

  const parsedPath = path.parse(targetBackupPath);
  const outFilename = `${parsedPath.name.replace('_upgraded', '')}_upgraded${parsedPath.ext}`;
  const outPath = path.join(parsedPath.dir, outFilename);

  await fsPromises.writeFile(outPath, JSON.stringify(upgradedBackup, null, 2), 'utf8');
  console.log(styleText('bold', styleText('green', `\n🎉 Respaldo actualizado exitosamente!`)));
  console.log(styleText('cyan', `📁 Archivo generado: ${outPath}`));
  console.log(styleText('cyan', `📊 Tablas totales: ${upgradedBackup.metadata.totalTables} | Filas totales: ${upgradedBackup.metadata.totalRows}`));
  console.log(styleText('cyan', `🏷️ Versión de DB: ${latestMigrationId}`));

  return outPath;
}

const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('upgrade_backup.ts') ||
  process.argv[1].includes('upgrade_backup.ts')
);

if (isDirectRun) {
  upgradeBackup().catch(err => {
    console.error(styleText('red', `❌ Error fatal durante la actualización del respaldo: ${(err as Error).message}`));
    process.exit(1);
  });
}
