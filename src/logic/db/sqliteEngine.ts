// fallow-ignore-file circular-dependencies
/**
 * src/logic/db/sqliteEngine.ts
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 */
import { getFromIDB, setToIDB } from './idbHelper.ts'
import { TABLES_SCHEMA } from './schema.ts'
import { DATABASE_MIGRATIONS } from './migrations_data.ts'
import { logger } from '../utils/logger.ts'
import { ensureSchemaIntegrity } from './sqliteSchemaIntegrity.ts'

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
    initSqlJs: (o: unknown) => Promise<{ Database: new (data?: Uint8Array) => SQLiteDatabase }>;
  }
}

let _sqliteDb: SQLiteDatabase | null = null
let _initPromise: Promise<SQLiteDatabase | null> | null = null
let _sqliteKey = 'pokevicio_sqlite_v2'
let _isInMemory = false






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

export async function persistSQLite(): Promise<void> {
  if (!_sqliteDb) return
  try {
    const binary = _sqliteDb.export()
    if (!_isInMemory) {
      await setToIDB(_sqliteKey, binary)
      // Shadow Backup for DB
      await setToIDB(_sqliteKey + '_backup', binary)
      logger.success('SQLite', `Persistence successful (Main + Backup)`)
    }

    if (import.meta.env.DEV && typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__E2E__) {
      try {
        await fetch('/api/dev-export-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: binary as unknown as BodyInit
        })
        logger.success('SQLite', 'Dev DB synced to Vite server.')
      } catch (err) {
        throw new Error(`[sqliteEngine] Failed to sync Dev DB to server: ${String(err)}`)
      }
    }
  } catch (e: unknown) {
    throw new Error(`[sqliteEngine] SQLite persistence failed: ${(e as Error).message}`)
  }
}

export async function initSQLite(options: { sqliteKey?: string, inMemory?: boolean } = {}): Promise<SQLiteDatabase | null> {
  const isE2E = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__E2E__ === true;
  if (options.inMemory === true || isE2E) {
    _isInMemory = true;
  }
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    if (options.sqliteKey) _sqliteKey = options.sqliteKey

    const SQL = await window.initSqlJs({ locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}` })

    if (_isInMemory) {
      if (import.meta.env.DEV) {
        try {
          const importCheck = await fetch('/api/dev-import-db-check', { cache: 'no-store' })
          if (importCheck.ok) {
            const { exists } = await importCheck.json() as { exists: boolean }
            if (exists) {
              const response = await fetch('/api/dev-import-db', { cache: 'no-store' })
              if (response.ok) {
                logger.info('SQLite', 'Pending imported DB found in dev mode. Initializing in-memory DB from imported.db...')
                const arrayBuffer = await response.arrayBuffer()
                _sqliteDb = new SQL.Database(new Uint8Array(arrayBuffer)) as unknown as SQLiteDatabase
                try {
                  await ensureSchemaIntegrity(_sqliteDb)
                  await runMigrations()
                  return _sqliteDb
                } catch (schemaErr) {
                  logger.warn('SQLite', `Imported DB integrity check failed (${(schemaErr as Error).message}). Falling back to clean DB template...`)
                }
              }
            }
          }
        } catch (err) {
          logger.warn('SQLite', `Failed to load imported db: ${(err as Error).message}. Falling back to clean DB template...`)
        }
      }

      try {
        const checkRes = await fetch('/api/dev-clean-db', { cache: 'no-store' })
        if (checkRes.ok) {
          logger.info('SQLite', 'Clean DB template found. Initializing database instantly from template...')
          const arrayBuffer = await checkRes.arrayBuffer()
          _sqliteDb = new SQL.Database(new Uint8Array(arrayBuffer)) as unknown as SQLiteDatabase
          await ensureSchemaIntegrity(_sqliteDb)
          await runMigrations()
          return _sqliteDb
        }
      } catch (err) {
        throw new Error(`[sqliteEngine] Failed to fetch clean db template: ${(err as Error).message}`)
      }

      logger.info('SQLite', 'No clean DB template found. Initializing clean database and running schemas/migrations...')
      _sqliteDb = new SQL.Database() as unknown as SQLiteDatabase
      TABLES_SCHEMA.forEach(schema => { if (_sqliteDb) _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schema}`) })
      await runMigrations()

      try {
        const binary = _sqliteDb.export()
        await fetch('/api/dev-export-clean-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: binary as unknown as BodyInit
        })
        logger.success('SQLite', 'Clean DB template successfully generated and uploaded to Vite server.')
      } catch (err) {
        throw new Error(`[sqliteEngine] Failed to upload generated clean DB template: ${String(err)}`)
      }
      return _sqliteDb
    }
    
    // Check if we are in development mode and if there is a pending import (skip if already imported in this browser context)
    const alreadyImported = typeof localStorage !== 'undefined' && localStorage.getItem('pokevicio_db_imported') === 'true';
    if (import.meta.env.DEV && !alreadyImported) {
      try {
        const checkRes = await fetch('/api/dev-import-db-check', { cache: 'no-store' })
        if (checkRes.ok) {
          const { exists } = await checkRes.json() as { exists: boolean }
          if (exists) {
            const response = await fetch('/api/dev-import-db', { cache: 'no-store' })
            if (response.ok) {
              logger.info('SQLite', 'Pending import found! Downloading dev_imported.db...')
              
              // Show importing overlay to the user
              try {
                if (typeof window !== 'undefined') {
                  const { useLoadingStore } = await import('@/stores/loading')
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
                await fetch('/api/dev-import-db-cleanup', { method: 'POST' })
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

              // Small delay so user sees the message
              await new Promise(resolve => setTimeout(resolve, 1500))
              
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

    let savedBinary = await getFromIDB(_sqliteKey)

    if (!savedBinary) {
      logger.warn('SQLite', 'Primary database missing, checking Shadow Backup...')
      savedBinary = await getFromIDB(_sqliteKey + '_backup')
      if (savedBinary) {
        logger.info('SQLite', 'Restored from Shadow Backup!')
      }
    }

    if (savedBinary) {
      try {
        _sqliteDb = new SQL.Database(new Uint8Array(savedBinary)) as unknown as SQLiteDatabase
        logger.info('SQLite', 'Loaded from IndexedDB')
      } catch (dbErr) {
        logger.error('SQLite', 'Database corruption detected! Attempting Backup Rescue...')
        const backupBinary = await getFromIDB(_sqliteKey + '_backup')
        if (backupBinary) {
          _sqliteDb = new SQL.Database(new Uint8Array(backupBinary)) as unknown as SQLiteDatabase
          logger.success('SQLite', 'Rescue successful from Backup.')
        } else {
          throw dbErr
        }
      }
    } else {
      _sqliteDb = new SQL.Database() as unknown as SQLiteDatabase
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

async function runMigrations(): Promise<void> {
  if (!_sqliteDb) return
  _sqliteDb.run("PRAGMA foreign_keys = OFF") // Disable FKs during structural changes
  _sqliteDb.run("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))")
  const appliedRes = _sqliteDb.exec("SELECT id FROM _migrations")
  const applied = appliedRes[0]?.values.map((v: unknown[]) => v[0] as string) || []

  let loadingStore: LoadingStore | null = null
  try {
    if (typeof window !== 'undefined') {
      const { useLoadingStore } = await import('@/stores/loading')
      loadingStore = useLoadingStore()
    }
  } catch (_) {
    // Fail silently in node test context
  }
  
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
        logger.success('SQLite', `Migration applied successfully: ${m.id}`)
        await persistSQLite()
        if (loadingStore) loadingStore.finish('db_migration')
      } catch (e: unknown) { 
        if (loadingStore) loadingStore.finish('db_migration')
        logger.error('SQLite', `Migration ${m.id} failed: ${(e as Error).message}`) 
      }
    }
  }
  // Update system_config.db_version to match the latest migration
  if (DATABASE_MIGRATIONS.length > 0) {
    const latestId = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]!.id
    const version = parseInt(latestId.split('_')[0] || '0')
    logger.info('SQLite', `Updating system_config.db_version to ${version}`)
    _sqliteDb.run("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('db_version', ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))", [version])
  }

  _sqliteDb.run("PRAGMA foreign_keys = ON")
}

import { splitSQLStatements, translatePostgresToSqlite } from './sqlTranslator.ts'


export function resetSQLite(): void {
  _sqliteDb = null;
  _initPromise = null;
  _isInMemory = false;
  _sqliteKey = 'pokevicio_sqlite_v2';
}

interface QueryFilter {
  col: string;
  val: unknown;
  op: string;
}

export interface QueryBuilder {
  _table: string;
  _filters: QueryFilter[];
  _limit: number | null;
  _order: string | null;
  _select: string;
  select: (fields: string) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  neq: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, vals: unknown[]) => QueryBuilder;
  order: (col: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  single: () => Promise<{ data: Record<string, unknown> | null, error: string | null }>;
  then: (resolve?: (val: Record<string, unknown>[]) => void) => Promise<Record<string, unknown>[]>;
  insert: (payload: unknown) => Promise<{ data: unknown, error: string | null }>;
  update: (payload: Record<string, unknown>) => Promise<{ data: Record<string, unknown>, error: string | null }>;
  delete: () => Promise<{ data: boolean, error: string | null }>;
  rpc: (_fn: string, _params: unknown) => Promise<{ data: boolean, error: string | null }>;
}

class SQLiteQueryBuilder implements QueryBuilder {
  _table: string;
  _filters: QueryFilter[] = [];
  _limit: number | null = null;
  _order: string | null = null;
  _select: string = '*';

  constructor(table: string) {
    this._table = table;
  }

  select(fields: string): QueryBuilder {
    this._select = fields;
    return this;
  }

  eq(col: string, val: unknown): QueryBuilder {
    this._filters.push({ col, val, op: '=' });
    return this;
  }

  neq(col: string, val: unknown): QueryBuilder {
    this._filters.push({ col, val, op: '!=' });
    return this;
  }

  in(col: string, vals: unknown[]): QueryBuilder {
    this._filters.push({ col, val: vals, op: 'IN' });
    return this;
  }

  order(col: string, { ascending = true } = {}): QueryBuilder {
    this._order = `${col} ${ascending ? 'ASC' : 'DESC'}`;
    return this;
  }

  limit(n: number): QueryBuilder {
    this._limit = n;
    return this;
  }

  async single() {
    const res = await this.then();
    return { data: res[0] || null, error: null };
  }

  async then(resolve?: (val: Record<string, unknown>[]) => void): Promise<Record<string, unknown>[]> {
    if (!_sqliteDb) return [];
    let sql = `SELECT ${this._select} FROM ${this._table}`;
    const params: unknown[] = [];
    if (this._filters.length) {
      sql += ' WHERE ' + this._filters.map((f: QueryFilter) => {
        if (f.op === 'IN') {
          const placeholders = (f.val as unknown[]).map(() => '?').join(',');
          (f.val as unknown[]).forEach((v) => params.push(v));
          return `${f.col} IN (${placeholders})`;
        }
        params.push(f.val);
        return `${f.col} ${f.op} ?`;
      }).join(' AND ');
    }
    if (this._order) sql += ` ORDER BY ${this._order}`;
    if (this._limit) sql += ` LIMIT ${this._limit}`;
    
    const res = _sqliteDb.exec(sql, params);
    if (!res || res.length === 0) {
      if (resolve) resolve([]);
      return [];
    }
    const result = res[0]!;
    const data = result.values.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col: string, i: number) => (obj as Record<string, unknown>)[col] = row[i]);
      return obj;
    });
    if (resolve) resolve(data);
    return data;
  }

  async insert(payload: unknown) {
    if (!_sqliteDb) return { data: payload, error: 'DB not ready' };
    const items = Array.isArray(payload) ? payload : [payload];
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const r = item as Record<string, unknown>;
      const cols = Object.keys(r);
      const vals = Object.values(r);
      const sql = `INSERT INTO ${this._table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
      _sqliteDb.run(sql, vals);
    }
    await persistSQLite();
    return { data: payload, error: null };
  }

  async update(payload: Record<string, unknown>) {
    if (!_sqliteDb) return { data: payload, error: 'DB not ready' };
    const cols = Object.keys(payload);
    const vals = Object.values(payload);
    let sql = `UPDATE ${this._table} SET ` + cols.map(c => `${c} = ?`).join(',');
    const params = [...vals];
    if (this._filters.length) {
      sql += ' WHERE ' + this._filters.map((f: QueryFilter) => { params.push(f.val); return `${f.col} ${f.op} ?`; }).join(' AND ');
    }
    _sqliteDb.run(sql, params);
    await persistSQLite();
    return { data: payload, error: null };
  }

  async delete() {
    if (!_sqliteDb) return { data: false, error: 'DB not ready' };
    let sql = `DELETE FROM ${this._table}`;
    const params: unknown[] = [];
    if (this._filters.length) {
      sql += ' WHERE ' + this._filters.map((f: QueryFilter) => { params.push(f.val); return `${f.col} ${f.op} ?`; }).join(' AND ');
    }
    _sqliteDb.run(sql, params);
    await persistSQLite();
    return { data: true, error: null };
  }

  async rpc(_fn: string, _params: unknown) {
    return { data: true, error: null };
  }
}

export const db: {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => SQLiteResult[];
  prepare: (sql: string) => unknown;
  from: (table: string) => QueryBuilder;
} = {
  run: (sql: string, params: unknown[] = []) => { if (!_sqliteDb) return; _sqliteDb.run(sql, params); persistSQLite() },
  exec: (sql: string, params: unknown[] = []) => { if (!_sqliteDb) return []; return _sqliteDb.exec(sql, params) },
  prepare: (sql: string) => { if (!_sqliteDb) return null; return _sqliteDb.prepare(sql) },
  from: (table: string) => new SQLiteQueryBuilder(table)
}

