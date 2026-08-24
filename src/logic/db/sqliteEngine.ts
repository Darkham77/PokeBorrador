// fallow-ignore-file circular-dependencies
/**
 * src/logic/db/sqliteEngine.ts
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 */
import { getFromIDB, setToIDB } from './idbHelper.ts'
import { saveToOPFS, loadFromOPFS } from './opfsHelper.ts'
import { TABLES_SCHEMA } from './schema.ts'
import { DATABASE_MIGRATIONS } from './migrations_data.ts'
import { logger } from '../utils/logger.ts'
import { ensureSchemaIntegrity } from './sqliteSchemaIntegrity.ts'
import { useLoadingStore } from '@/stores/loading'

export interface SQLiteResult {
  columns: string[];
  values: unknown[][];
}

export interface SQLiteDatabase {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => SQLiteResult[];
  export: () => Uint8Array;
  prepare: (sql: string) => unknown;
}

export interface LoadingStore {
  start: (id: string, title?: string, description?: string, lockSession?: boolean, icon?: string) => void;
  finish: (id: string) => void;
}

declare global {
  interface Window {
    initSqlJs?: (o?: unknown) => Promise<{ Database: new (data?: Uint8Array) => SQLiteDatabase }>;
  }
}

let _sqliteDb: SQLiteDatabase | null = null
let _initPromise: Promise<SQLiteDatabase | null> | null = null
let _sqliteKey = 'pokevicio_sqlite_v2'
let _isInMemory = false

export function canUseDevDatabaseBridge(isDevelopment: boolean, _isE2E: boolean): boolean {
  return isDevelopment && (!_isE2E || (typeof window !== 'undefined' && window.__GTS_SIMULATION__ === true))
}

export function canRefreshCleanDatabaseTemplate(isDevelopment: boolean, isE2E: boolean): boolean {
  return isDevelopment && isE2E
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

async function devFetch(endpoint: '/api/dev-export-db' | '/api/dev-import-db-check' | '/api/dev-import-db' | '/api/dev-import-db-cleanup' | '/api/dev-clean-db' | '/api/dev-export-clean-db', dbKey?: string, init?: RequestInit): Promise<Response> {
  const cleanKey = dbKey ? dbKey.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  if (endpoint === '/api/dev-export-db') return fetch('/api/dev-export-db', { ...init, headers: { ...(init?.headers || {}), 'x-db-key': cleanKey } });
  if (endpoint === '/api/dev-import-db-check') return fetch('/api/dev-import-db-check', { ...init, headers: { ...(init?.headers || {}), 'x-db-key': cleanKey } });
  if (endpoint === '/api/dev-import-db') return fetch('/api/dev-import-db', { ...init, headers: { ...(init?.headers || {}), 'x-db-key': cleanKey } });
  if (endpoint === '/api/dev-import-db-cleanup') return fetch('/api/dev-import-db-cleanup', { ...init, headers: { ...(init?.headers || {}), 'x-db-key': cleanKey } });
  if (endpoint === '/api/dev-clean-db') return fetch('/api/dev-clean-db', init);
  return fetch('/api/dev-export-clean-db', init);
}

export async function persistSQLite(): Promise<void> {
  if (!_sqliteDb) return
  try {
    const binary = _sqliteDb.export()
    if (!_isInMemory) {
      await saveToOPFS(_sqliteKey, binary)
      await setToIDB(_sqliteKey, binary)
      // Shadow Backup for DB
      await setToIDB(_sqliteKey + '_backup', binary)
      logger.success('SQLite', `Persistence successful (OPFS + Main + Backup)`)
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
    throw new Error(`[sqliteEngine] SQLite persistence failed: ${(e as Error).message}`)
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
    } catch (_rbErr) {
      // Ignore rollback errors if transaction was already aborted
    }
    throw new Error(`[sqliteEngine] Atomic save transaction failed: ${(err as Error).message}`);
  }
}

/** Returns a serializable snapshot for explicit cross-context E2E database transfer. */
export function exportSQLiteSnapshot(): number[] {
  if (!_sqliteDb) throw new Error('[sqliteEngine] Cannot export an uninitialized SQLite database')
  return Array.from(_sqliteDb.export())
}

export async function initSQLite(options: { sqliteKey?: string, inMemory?: boolean, forceReload?: boolean } = {}): Promise<SQLiteDatabase | null> {
  const isE2E = typeof window !== 'undefined' && window.__E2E__ === true;
  if (options.inMemory === true || isE2E) {
    _isInMemory = true;
  }
  let targetKey = _sqliteKey;
  if (options.sqliteKey) {
    targetKey = options.sqliteKey;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    const storedKey = window.localStorage.getItem('pokevicio_sqlite_key');
    if (storedKey) targetKey = storedKey;
  }

  if (targetKey !== _sqliteKey || options.forceReload) {
    _sqliteDb = null;
    _initPromise = null;
  }
  _sqliteKey = targetKey;

  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const SQL = await window.initSqlJs({ locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}` })

    if (_isInMemory) {
      if (canUseDevDatabaseBridge(import.meta.env.DEV, isE2E)) {
        try {
          const importCheck = await devFetch('/api/dev-import-db-check', _sqliteKey, { cache: 'no-store' })
          if (importCheck.ok) {
            const { exists } = await importCheck.json() as { exists: boolean }
            if (exists) {
              const response = await devFetch('/api/dev-import-db', _sqliteKey, { cache: 'no-store' })
              if (response.ok) {
                logger.info('SQLite', 'Pending imported DB found in dev mode. Initializing in-memory DB from imported.db...')
                const arrayBuffer = await response.arrayBuffer()
                const binary = new Uint8Array(arrayBuffer)
                _sqliteDb = new SQL.Database(binary) as SQLiteDatabase // domain-ok
                try {
                  await ensureSchemaIntegrity(_sqliteDb)
                  await runMigrations()
                  await setToIDB(_sqliteKey, binary)
                  await setToIDB(_sqliteKey + '_backup', binary)
                  try {
                    await devFetch('/api/dev-import-db-cleanup', _sqliteKey, { method: 'POST' })
                  } catch (_e) {
                    void 0;
                  }
                  return _sqliteDb
                } catch (schemaErr) {
                  logger.warn('SQLite', `Imported DB integrity check failed (${(schemaErr as Error).message}). Falling back to clean DB template...`)
                }
              }
            }
          }
        } catch (err) {
          logger.warn('SQLite', `Failed to load imported db: ${(err as Error).message}. Falling back to IDB or clean DB template...`)
        }
      }

      if (!isE2E) {
        const localBinary = await getFromIDB(_sqliteKey)
        if (localBinary) {
          _sqliteDb = new SQL.Database(new Uint8Array(localBinary)) as SQLiteDatabase // domain-ok
          await ensureSchemaIntegrity(_sqliteDb)
          const appliedMigrations = await runMigrations()
          if (appliedMigrations && canRefreshCleanDatabaseTemplate(import.meta.env.DEV, isE2E)) {
            await publishCleanDatabaseTemplate(_sqliteDb)
          }
          return _sqliteDb
        }
      }

      try {
        const checkRes = await devFetch('/api/dev-clean-db', undefined, { cache: 'no-store' })
        if (checkRes.ok) {
          logger.info('SQLite', 'Clean DB template found. Initializing database instantly from template...')
          const arrayBuffer = await checkRes.arrayBuffer()
          _sqliteDb = new SQL.Database(new Uint8Array(arrayBuffer)) as SQLiteDatabase // domain-ok
          await ensureSchemaIntegrity(_sqliteDb)
          await runMigrations()
          return _sqliteDb
        }
      } catch (err) {
        throw new Error(`[sqliteEngine] Failed to fetch clean db template: ${(err as Error).message}`)
      }

      logger.info('SQLite', 'No clean DB template found. Initializing clean database and running schemas/migrations...')
      _sqliteDb = new SQL.Database() as SQLiteDatabase // domain-ok
      TABLES_SCHEMA.forEach(schema => { if (_sqliteDb) _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schema}`) })
      await runMigrations()

      if (import.meta.env.DEV) {
        await publishCleanDatabaseTemplate(_sqliteDb)
      }
      return _sqliteDb
    }
    
    // Check if we are in development mode and if there is a pending import (skip if already imported in this browser context)
    const alreadyImported = typeof localStorage !== 'undefined' && localStorage.getItem('pokevicio_db_imported') === 'true';
    if (import.meta.env.DEV && !alreadyImported) {
      try {
        const checkRes = await devFetch('/api/dev-import-db-check', _sqliteKey, { cache: 'no-store' })
        if (checkRes.ok) {
          const { exists } = await checkRes.json() as { exists: boolean }
          if (exists) {
            const response = await devFetch('/api/dev-import-db', _sqliteKey, { cache: 'no-store' })
            if (response.ok) {
              logger.info('SQLite', 'Pending import found! Downloading dev_imported.db...')
              
              // Show importing overlay to the user
              try {
                if (typeof window !== 'undefined') {
                  const loadingStore = useLoadingStore()
                  loadingStore.start('db_import', 'Importando Base de Datos...', 'Instalando copia de seguridad, por favor espera', true, '💾')
                }
              } catch (e) {
                throw new Error(`[sqliteEngine] Failed to initialize loadingStore in dev import: ${String(e)}`)
              }

              const arrayBuffer = await response.arrayBuffer()
              const binary = new Uint8Array(arrayBuffer)
              
              // Save directly to IDB (both primary and backup)
              await setToIDB(_sqliteKey, binary)
              await setToIDB(_sqliteKey + '_backup', binary)
              logger.success('SQLite', 'Dev DB successfully imported and persisted to IndexedDB!')
              
              // Trigger file cleanup on the dev server
              try {
                await devFetch('/api/dev-import-db-cleanup', _sqliteKey, { method: 'POST' })
              } catch (e) {
                throw new Error(`[sqliteEngine] Failed to cleanup dev import DB file: ${String(e)}`)
              }

              // Set import reload flag to preserve session during reload
              try {
                sessionStorage.setItem('pokevicio_import_reload', 'true')
                localStorage.setItem('pokevicio_db_imported', 'true')
                sessionStorage.setItem('pokevicio_import_original_path', window.location.pathname)
              } catch (e) {
                throw new Error(`[sqliteEngine] Failed to access sessionStorage during import reload: ${String(e)}`)
              }

const IMPORT_RELOAD_DELAY_MS = 1500;

              // Small delay so user sees the message
              await new Promise(resolve => setTimeout(resolve, IMPORT_RELOAD_DELAY_MS))
              
              // Force page reload to initialize the game state with the new database
              window.location.reload()
              return null
            }
          }
        }
      } catch (err) {
        logger.debug('SQLite', `No pending dev import DB found: ${(err as Error).message}`)
      }
    }

    let savedBinary = await loadFromOPFS(_sqliteKey)
    let loadedFromSource = 'OPFS'

    if (!savedBinary) {
      savedBinary = await getFromIDB(_sqliteKey)
      loadedFromSource = 'IndexedDB'
    }

    if (!savedBinary) {
      logger.warn('SQLite', 'Primary database missing, checking Shadow Backup...')
      savedBinary = await getFromIDB(_sqliteKey + '_backup')
      if (savedBinary) {
        loadedFromSource = 'Shadow Backup'
        logger.info('SQLite', 'Restored from Shadow Backup!')
      }
    }

    if (savedBinary) {
      try {
        _sqliteDb = new SQL.Database(new Uint8Array(savedBinary)) as SQLiteDatabase; // domain-ok
        logger.info('SQLite', `Loaded from ${loadedFromSource}`)
      } catch (dbErr) {
        logger.error('SQLite', 'Database corruption detected! Attempting Backup Rescue...')
        const backupBinary = await getFromIDB(_sqliteKey + '_backup')
        if (backupBinary) {
          _sqliteDb = new SQL.Database(new Uint8Array(backupBinary)) as SQLiteDatabase; // domain-ok
          logger.success('SQLite', 'Rescue successful from Backup.')
        } else {
          throw dbErr
        }
      }
    } else {
      _sqliteDb = new SQL.Database() as SQLiteDatabase; // domain-ok
      logger.info('SQLite', 'Created new in-memory database')
      TABLES_SCHEMA.forEach(schema => { if (_sqliteDb) _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schema}`) })
      await persistSQLite()
    }

    await ensureSchemaIntegrity(_sqliteDb)
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
      body: binary as BodyInit // domain-ok
    })
    logger.success('SQLite', 'Clean DB template successfully generated and uploaded to Vite server.')
  } catch (err) {
    throw new Error(`[sqliteEngine] Failed to upload generated clean DB template: ${String(err)}`)
  }
}

async function runMigrations(): Promise<boolean> {
  if (!_sqliteDb) return false
  _sqliteDb.run("PRAGMA foreign_keys = OFF") // Disable FKs during structural changes
  _sqliteDb.run("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))")
  const appliedRes = _sqliteDb.exec("SELECT id FROM _migrations")
  const applied = appliedRes[0]?.values.map((v: unknown[]) => v[0] as string) || []

  let loadingStore: LoadingStore | null = null
  try {
    if (typeof window !== 'undefined') {
      loadingStore = useLoadingStore()
    }
  } catch (_) {
    // Fail silently in node test context
  }
  
  let hasAppliedMigrations = false
  for (const m of DATABASE_MIGRATIONS as { id: string, sql: string, sqlite_sql?: string }[]) {
    if (!applied.includes(m.id)) {
      logger.info('SQLite', `Applying migration: ${m.id}`)
      if (loadingStore) {
        loadingStore.start('db_migration', 'Actualizando Base de Datos...', `Aplicando: ${m.id}`, false, '⚙️')
      }
      try {
        const sqlSource = m.sqlite_sql !== undefined ? m.sqlite_sql : m.sql
        const isSqliteSpec = m.sqlite_sql !== undefined
        const statements = splitSQLStatements(sqlSource)
        statements.forEach(stmt => {
          const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt)
          if (sql) {
            try {
              if (_sqliteDb) _sqliteDb.run(sql)
            } catch (stmtErr: unknown) {
              const msg = (stmtErr as Error).message.toLowerCase() // text-ok
              const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists')
              const isMissing = msg.includes('no such column')
              
              if (isDuplicate || isMissing) {
                logger.warn('SQLite', `Statement skipped (idempotent/safe): ${stmt}`)
              } else {
                logger.error('SQLite', `Statement failed: ${stmt} - ${msg}`)
                throw stmtErr
              }
            }
          }
        })
        _sqliteDb.run("INSERT OR IGNORE INTO _migrations (id) VALUES (?)", [m.id])
        hasAppliedMigrations = true
        logger.success('SQLite', `Migration applied successfully: ${m.id}`)
        if (loadingStore) loadingStore.finish('db_migration')
      } catch (e: unknown) { 
        if (loadingStore) loadingStore.finish('db_migration')
        logger.error('SQLite', `Migration ${m.id} failed: ${(e as Error).message}`) 
      }
    }
  }
  if (hasAppliedMigrations) {
    await persistSQLite()
  }
  // Update system_config.db_version to match the latest migration
  if (DATABASE_MIGRATIONS.length > 0) {
    const latestId = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]!.id
    const version = parseInt(latestId.split('_')[0] || '0')
    logger.info('SQLite', `Updating system_config.db_version to ${version}`)
    _sqliteDb.run("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('db_version', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))", [version])
  }

  _sqliteDb.run("PRAGMA foreign_keys = ON")
  return hasAppliedMigrations
}

import { splitSQLStatements, translatePostgresToSqlite } from './sqlTranslator.ts'


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
