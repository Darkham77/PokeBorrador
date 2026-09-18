/**
 * src/logic/db/sqliteEngine.ts
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 */
import initSqlJs from 'sql.js'

function getSqlWasmUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return new URL('sql.js/dist/sql-wasm.wasm', import.meta.url).href
    }
  } catch (_err) { // catch-ok: Fallback if import.meta.url is not a valid base URL in test environment
    // Fallback in environments without import.meta.url
  }
  return undefined
}

const sqlWasmUrl = getSqlWasmUrl()
import { getFromIDB, setToIDB } from './idbHelper.ts'
import { saveToOPFS, loadFromOPFS } from './opfsHelper.ts'
import { TABLES_SCHEMA } from './schema.ts'
import { logger } from '../utils/logger.ts'
import { ensureSchemaIntegrity } from './sqliteSchemaIntegrity.ts'
import { splitSQLStatements, translatePostgresToSqlite } from './sqlTranslator.ts'
import type { SQLiteResult, SQLiteDatabase } from '@/types/database/sqlite.ts'
export type { SQLiteResult, SQLiteDatabase }

export interface LoadingStore {
  start: (id: string, title?: string, description?: string, lockSession?: boolean, icon?: string) => void;
  finish: (id: string) => void;
}

declare global {
  interface Window {
    initSqlJs?: (o?: { locateFile?: (file: string) => string }) => Promise<{ Database: new (data?: Uint8Array) => SQLiteDatabase }>;
  }
}

if (typeof window !== 'undefined') {
  window.initSqlJs = initSqlJs as never;
}

let _sqliteDb: SQLiteDatabase | null = null
let _initPromise: Promise<SQLiteDatabase | null> | null = null
let _sqliteKey = 'pokevicio_sqlite_v2'
let _isInMemory = false

export function canUseDevDatabaseBridge(isDevelopment: boolean, _isE2E: boolean): boolean {
  return isDevelopment && (typeof window !== 'undefined' && window.__GTS_SIMULATION__ === true)
}

export function canRefreshCleanDatabaseTemplate(isDevelopment: boolean, isE2E: boolean): boolean {
  return isDevelopment && isE2E
}

async function getLoadingStore(): Promise<LoadingStore | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { useLoadingStore } = await import('@/stores/loading.ts');
    return useLoadingStore();
  } catch (_) {
    return null;
  }
}

export async function queryLocal(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  if (!_sqliteDb) await initSQLite()
  if (!_sqliteDb) {
    throw new Error('[sqliteEngine] SQLite database engine is not initialized');
  }
  const res = _sqliteDb.exec(sql, params)
  if (!res.length) return []
  return res[0]!.values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {}
    const result = res[0]!;
    result.columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  })
}

async function devFetch(
  endpoint:
    | '/api/dev-export-db'
    | '/api/dev-manual-import-check'
    | '/api/dev-manual-import-db'
    | '/api/dev-manual-import-cleanup'
    | '/api/dev-sim-db-check'
    | '/api/dev-sim-db'
    | '/api/dev-sim-db-cleanup'
    | '/api/dev-clean-db'
    | '/api/dev-export-clean-db',
  dbKey?: string,
  init?: RequestInit
): Promise<Response> {
  const cleanKey = dbKey ? dbKey.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  const headers = { ...(init?.headers || {}), ...(cleanKey ? { 'x-db-key': cleanKey } : {}) };
  const fullInit = { ...init, headers };

  switch (endpoint) {
    case '/api/dev-export-db':
      return fetch('/api/dev-export-db', fullInit);
    case '/api/dev-manual-import-check':
      return fetch('/api/dev-manual-import-check', fullInit);
    case '/api/dev-manual-import-db':
      return fetch('/api/dev-manual-import-db', fullInit);
    case '/api/dev-manual-import-cleanup':
      return fetch('/api/dev-manual-import-cleanup', fullInit);
    case '/api/dev-sim-db-check':
      return fetch('/api/dev-sim-db-check', fullInit);
    case '/api/dev-sim-db':
      return fetch('/api/dev-sim-db', fullInit);
    case '/api/dev-sim-db-cleanup':
      return fetch('/api/dev-sim-db-cleanup', fullInit);
    case '/api/dev-clean-db':
      return fetch('/api/dev-clean-db', fullInit);
    case '/api/dev-export-clean-db':
      return fetch('/api/dev-export-clean-db', fullInit);
  }
}

export async function persistSQLite(): Promise<void> {
  if (!_sqliteDb) return
  try {
    const binary = _sqliteDb.export()
    if (!_isInMemory) {
      await saveToOPFS(_sqliteKey, binary)
      await setToIDB(_sqliteKey, binary)
      logger.success('SQLite', `Persistence successful (OPFS + IndexedDB)`)
    }

    const isE2E = typeof window !== 'undefined' && window.__E2E__ === true
    if (canUseDevDatabaseBridge(import.meta.env.DEV, isE2E)) {
      try {
        await devFetch('/api/dev-export-db', _sqliteKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: binary as BodyInit
        })
        logger.success('SQLite', 'Dev DB synced to Vite server.')
      } catch (err) {
        logger.warn('SQLite', `Dev DB sync skipped during teardown: ${(err as Error).message}`)
      }
    }
  } catch (e: unknown) {
    throw new Error(`[sqliteEngine] SQLite persistence failed: ${(e as Error).message}`, { cause: e })
  }
}

export async function executeAtomicSaveTransaction(queries: { sql: string; params?: unknown[] }[]): Promise<void> {
  if (!_sqliteDb) await initSQLite();
  if (!_sqliteDb) {
    throw new Error('[sqliteEngine] SQLite database engine is not initialized');
  }

  _sqliteDb.run('BEGIN TRANSACTION');
  try {
    for (const q of queries) {
      _sqliteDb.run(q.sql, q.params);
    }
    _sqliteDb.run('COMMIT');
    await persistSQLite();
  } catch (err) {
    try {
      _sqliteDb.run('ROLLBACK');
    } catch (_rbErr) { // catch-ok: Ignore rollback errors if transaction was already aborted
      // Transaction already closed
    }
    throw new Error(`[sqliteEngine] Atomic save transaction failed: ${(err as Error).message}`, { cause: err });
  }
}

/** Returns a serializable snapshot for explicit cross-context E2E database transfer. */
export function exportSQLiteSnapshot(): number[] {
  if (!_sqliteDb) throw new Error('[sqliteEngine] Cannot export an uninitialized SQLite database')
  return Array.from(_sqliteDb.export())
}

function resolveTargetKey(options: { sqliteKey?: string }): string {
  if (options.sqliteKey) return options.sqliteKey
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('pokevicio_sqlite_key') ?? _sqliteKey
  }
  return _sqliteKey
}

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>

async function resolveSqlJsInstance(): Promise<SqlJsStatic> {
  const hasWindowInit = typeof window !== 'undefined' && typeof window.initSqlJs === 'function'
  const isNode = typeof process !== 'undefined' && Boolean(process.versions?.node)
  const initFn = hasWindowInit ? window.initSqlJs! : initSqlJs
  return initFn({
    locateFile: (file: string) => {
      if (isNode) return `./node_modules/sql.js/dist/${file}`
      return sqlWasmUrl || `./node_modules/sql.js/dist/${file}`
    }
  })
}

async function tryLoadSimulationDb(SQL: SqlJsStatic, sqliteKey: string): Promise<SQLiteDatabase | null> {
  try {
    const importCheck = await devFetch('/api/dev-sim-db-check', sqliteKey, { cache: 'no-store' })
    if (!importCheck.ok) return null
    const { exists } = (await importCheck.json()) as { exists: boolean }
    if (!exists) return null

    const response = await devFetch('/api/dev-sim-db', sqliteKey, { cache: 'no-store' })
    if (!response.ok) return null

    logger.info('SQLite', `Pending simulation DB found in dev mode for ${sqliteKey}. Initializing in-memory DB...`)
    const arrayBuffer = await response.arrayBuffer()
    const db = new SQL.Database(new Uint8Array(arrayBuffer)) as SQLiteDatabase
    try {
      await ensureSchemaIntegrity(db, persistSQLite)
      _sqliteDb = db
      await runMigrations()
      if (typeof window === 'undefined' || !window.__GTS_SIMULATION__) {
        await devFetch('/api/dev-sim-db-cleanup', sqliteKey, { method: 'POST' }).catch(() => void 0)
      }
      return db
    } catch (schemaErr) {
      logger.warn('SQLite', `Simulation DB integrity check failed (${(schemaErr as Error).message}). Falling back to clean DB template...`)
      return null
    }
  } catch (err) {
    logger.warn('SQLite', `Failed to load simulation db: ${(err as Error).message}. Falling back to IDB or clean DB template...`)
    return null
  }
}

async function tryLoadIdbInMemoryDb(SQL: SqlJsStatic, sqliteKey: string, isE2E: boolean): Promise<SQLiteDatabase | null> {
  if (isE2E) return null
  const localBinary = await getFromIDB(sqliteKey)
  if (!localBinary) return null
  const db = new SQL.Database(new Uint8Array(localBinary)) as SQLiteDatabase
  _sqliteDb = db
  await ensureSchemaIntegrity(db, persistSQLite)
  const appliedMigrations = await runMigrations()
  if (appliedMigrations && canRefreshCleanDatabaseTemplate(import.meta.env.DEV, isE2E)) {
    await publishCleanDatabaseTemplate(db)
  }
  return db
}

async function tryLoadCleanDbTemplate(SQL: SqlJsStatic): Promise<SQLiteDatabase | null> {
  try {
    const checkRes = await devFetch('/api/dev-clean-db', undefined, { cache: 'no-store' })
    if (!checkRes.ok) return null
    logger.info('SQLite', 'Clean DB template found. Initializing database instantly from template...')
    const arrayBuffer = await checkRes.arrayBuffer()
    const db = new SQL.Database(new Uint8Array(arrayBuffer)) as SQLiteDatabase
    _sqliteDb = db
    await ensureSchemaIntegrity(db, persistSQLite)
    await runMigrations()
    return db
  } catch (err) {
    throw new Error(`[sqliteEngine] Failed to fetch clean db template: ${(err as Error).message}`, { cause: err })
  }
}

async function initializeFreshInMemoryDb(SQL: SqlJsStatic): Promise<SQLiteDatabase> {
  logger.info('SQLite', 'No clean DB template found. Initializing clean database and running schemas/migrations...')
  const db = new SQL.Database() as SQLiteDatabase
  _sqliteDb = db
  TABLES_SCHEMA.forEach(schema => {
    if (_sqliteDb) _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schema}`)
  })
  await runMigrations()
  if (import.meta.env.DEV) {
    await publishCleanDatabaseTemplate(db)
  }
  return db
}

async function initInMemoryDatabase(SQL: SqlJsStatic, sqliteKey: string, isE2E: boolean): Promise<SQLiteDatabase> {
  if (canUseDevDatabaseBridge(import.meta.env.DEV, isE2E)) {
    const simDb = await tryLoadSimulationDb(SQL, sqliteKey)
    if (simDb) return simDb
  }

  const idbDb = await tryLoadIdbInMemoryDb(SQL, sqliteKey, isE2E)
  if (idbDb) return idbDb

  const templateDb = await tryLoadCleanDbTemplate(SQL)
  if (templateDb) return templateDb

  return initializeFreshInMemoryDb(SQL)
}

const IMPORT_RELOAD_DELAY_MS = 1500

async function tryHandleManualDevImport(sqliteKey: string): Promise<boolean> {
  if (!import.meta.env.DEV) return false
  try {
    const checkRes = await devFetch('/api/dev-manual-import-check', undefined, { cache: 'no-store' })
    if (!checkRes.ok) return false
    const { exists } = (await checkRes.json()) as { exists: boolean }
    if (!exists) return false

    const response = await devFetch('/api/dev-manual-import-db', undefined, { cache: 'no-store' })
    if (!response.ok) return false

    logger.info('SQLite', 'Explicit manual backup import found! Installing manual_user_backup_import.db...')
    const loadingStore = await getLoadingStore().catch(e => {
      throw new Error(`[sqliteEngine] Failed to initialize loadingStore in manual dev import: ${String(e)}`, { cause: e })
    })
    loadingStore?.start('db_import', 'Importando Base de Datos...', 'Instalando copia de seguridad manual, por favor espera', true, '💾')

    const binary = new Uint8Array(await response.arrayBuffer())
    await saveToOPFS(sqliteKey, binary)
    await setToIDB(sqliteKey, binary)
    logger.success('SQLite', 'Manual backup successfully imported and persisted to OPFS and IndexedDB!')

    const { purgeAllCachedSaves } = await import('../utils/opfsStorage.ts')
    await purgeAllCachedSaves()

    await devFetch('/api/dev-manual-import-cleanup', undefined, { method: 'POST' }).catch(e => {
      throw new Error(`[sqliteEngine] Failed to cleanup manual import DB file: ${String(e)}`, { cause: e })
    })

    try {
      sessionStorage.setItem('pokevicio_import_reload', 'true')
      sessionStorage.setItem('pokevicio_import_original_path', window.location.pathname)
    } catch (e) {
      throw new Error(`[sqliteEngine] Failed to access sessionStorage during import reload: ${String(e)}`, { cause: e })
    }

    await new Promise(resolve => setTimeout(resolve, IMPORT_RELOAD_DELAY_MS))
    window.location.reload()
    return true
  } catch (err) {
    logger.debug('SQLite', `No manual backup import found: ${(err as Error).message}`)
    return false
  }
}

async function loadPersistedDatabase(SQL: SqlJsStatic, sqliteKey: string): Promise<SQLiteDatabase> {
  const opfsBinary = await loadFromOPFS(sqliteKey)
  const savedBinary = opfsBinary ?? (await getFromIDB(sqliteKey))
  const loadedFromSource = opfsBinary ? 'OPFS' : 'IndexedDB'

  if (savedBinary) {
    const db = new SQL.Database(new Uint8Array(savedBinary)) as SQLiteDatabase
    logger.info('SQLite', `Loaded from ${loadedFromSource}`)
    return db
  }

  const db = new SQL.Database() as SQLiteDatabase
  logger.info('SQLite', 'Created new in-memory database')
  _sqliteDb = db
  TABLES_SCHEMA.forEach(schema => {
    if (_sqliteDb) _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schema}`)
  })
  await persistSQLite()
  return db
}

export async function initSQLite(options: { sqliteKey?: string, inMemory?: boolean, forceReload?: boolean } = {}): Promise<SQLiteDatabase | null> {
  const isE2E = typeof window !== 'undefined' && window.__E2E__ === true
  if (options.inMemory === true || isE2E) {
    _isInMemory = true
  }
  const targetKey = resolveTargetKey(options)
  if (targetKey !== _sqliteKey || options.forceReload) {
    _sqliteDb = null
    _initPromise = null
  }
  _sqliteKey = targetKey

  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    const SQL = await resolveSqlJsInstance()

    if (_isInMemory) {
      _sqliteDb = await initInMemoryDatabase(SQL, _sqliteKey, isE2E)
      return _sqliteDb
    }

    const reloaded = await tryHandleManualDevImport(_sqliteKey)
    if (reloaded) return null

    _sqliteDb = await loadPersistedDatabase(SQL, _sqliteKey)
    await ensureSchemaIntegrity(_sqliteDb, persistSQLite)
    await runMigrations()
    return _sqliteDb
  })()
  return _initPromise
}

async function publishCleanDatabaseTemplate(db: SQLiteDatabase): Promise<void> {
  try {
    const binary = db.export()
    await devFetch('/api/dev-export-clean-db', undefined, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: binary as BodyInit
    })
    logger.success('SQLite', 'Clean DB template successfully generated and uploaded to Vite server.')
  } catch (err) {
    throw new Error(`[sqliteEngine] Failed to upload generated clean DB template: ${String(err)}`, { cause: err })
  }
}

function executeSqliteMigrationStatements(db: SQLiteDatabase, sqlSource: string): void {
  const statements = splitSQLStatements(sqlSource)
  for (const stmt of statements) {
    const sql = translatePostgresToSqlite(stmt)
    if (!sql) continue
    try {
      db.run(sql)
    } catch (stmtErr: unknown) {
      const isIgnorable = /(?:duplicate column name|already exists|no such column)/i.test((stmtErr as Error).message)
      if (!isIgnorable) throw stmtErr
    }
  }
}

function applySingleMigration(db: SQLiteDatabase, m: { id: string, sql: string, sqlite_sql?: string }): void {
  const sqlSource = m.sqlite_sql !== undefined ? m.sqlite_sql : m.sql
  if (m.sqlite_sql !== undefined) {
    try {
      db.exec(sqlSource)
      return
    } catch (_batchErr) {
      logger.debug('SQLite', `Batch execution failed for migration ${m.id}, falling back to statement-by-statement execution:`, _batchErr)
    }
  }
  executeSqliteMigrationStatements(db, sqlSource)
}

async function runMigrations(): Promise<boolean> {
  if (!_sqliteDb) return false
  _sqliteDb.run("PRAGMA foreign_keys = OFF")
  _sqliteDb.run("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))")
  const appliedRes = _sqliteDb.exec("SELECT id FROM _migrations")
  const applied = appliedRes[0]?.values.map((v: unknown[]) => v[0] as string) || []

  const loadingStore = await getLoadingStore()
  const { DATABASE_MIGRATIONS } = await import('./migrations_data.ts')

  let hasAppliedMigrations = false
  for (const m of DATABASE_MIGRATIONS as { id: string, sql: string, sqlite_sql?: string }[]) {
    if (applied.includes(m.id)) continue
    logger.info('SQLite', `Applying migration: ${m.id}`)
    if (loadingStore) {
      loadingStore.start('db_migration', 'Actualizando Base de Datos...', `Aplicando: ${m.id}`, false, '⚙️')
    }
    try {
      applySingleMigration(_sqliteDb, m)
      _sqliteDb.run("INSERT OR IGNORE INTO _migrations (id) VALUES (?)", [m.id])
      hasAppliedMigrations = true
      logger.success('SQLite', `Migration applied successfully: ${m.id}`)
      if (loadingStore) loadingStore.finish('db_migration')
    } catch (e: unknown) {
      if (loadingStore) loadingStore.finish('db_migration')
      logger.error('SQLite', `Migration ${m.id} failed: ${(e as Error).message}`)
    }
  }

  if (hasAppliedMigrations) {
    await persistSQLite()
  }

  if (DATABASE_MIGRATIONS.length > 0) {
    const latestId = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]!.id
    const version = parseInt(latestId.split('_')[0] || '0')
    logger.info('SQLite', `Updating system_config.db_version to ${version}`)
    _sqliteDb.run("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('db_version', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))", [version])
  }

  _sqliteDb.run("PRAGMA foreign_keys = ON")
  return hasAppliedMigrations
}


export function resetSQLite(): void {
  _sqliteDb = null;
  _initPromise = null;
  _isInMemory = false;
  _sqliteKey = 'pokevicio_sqlite_v2';
}

import { SQLiteQueryBuilder, type QueryBuilder } from './sqliteQueryBuilder.ts';
export type { QueryBuilder };

export const db: {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => SQLiteResult[];
  prepare: (sql: string) => unknown;
  from: (table: string) => QueryBuilder;
} = {
  run: (sql: string, params: unknown[] = []) => { if (!_sqliteDb) return; _sqliteDb.run(sql, params); persistSQLite() },
  exec: (sql: string, params: unknown[] = []) => { if (!_sqliteDb) return []; return _sqliteDb.exec(sql, params) },
  prepare: (sql: string) => { if (!_sqliteDb) return null; return _sqliteDb.prepare(sql) },
  from: (table: string) => new SQLiteQueryBuilder(table, () => _sqliteDb, persistSQLite)
};
