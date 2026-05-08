/**
 * src/logic/db/sqliteEngine.ts
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 */
import { getFromIDB, setToIDB } from './idbHelper'
import { TABLES_SCHEMA } from './schema'
import { DATABASE_MIGRATIONS } from './migrations_data'
import { useLoadingStore } from '@/stores/loading'
import { logger } from '../utils/logger'

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

let _sqliteDb: SQLiteDatabase | null = null
let _initPromise: Promise<SQLiteDatabase | null> | null = null
let _sqliteKey = 'pokevicio_sqlite_v2'
let _isInMemory = false

export { getFromIDB, setToIDB }

export async function queryLocal(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  if (!_sqliteDb) await initSQLite()
  if (!_sqliteDb) return []
  const res = _sqliteDb.exec(sql, params)
  if (!res.length) return []
  return res[0]!.values.map((row: any[]) => {
    const obj: { [key: string]: unknown } = {}
    const result = res[0]!;
    result.columns.forEach((col: string, i: number) => {
      (obj as any)[col] = row[i];
    });
    return obj;
  })
}

export async function persistSQLite(): Promise<void> {
  if (!_sqliteDb || _isInMemory) return
  try {
    const binary = _sqliteDb.export()
    await setToIDB(_sqliteKey, binary)
    // Shadow Backup for DB
    await setToIDB(_sqliteKey + '_backup', binary)
    logger.success('SQLite', `Persistence successful (Main + Backup)`)
  } catch (e: unknown) { logger.error('SQLite', `Persistence failed: ${(e as Error).message}`) }
}

export async function initSQLite(options: { sqliteKey?: string, inMemory?: boolean } = {}): Promise<SQLiteDatabase | null> {
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    if (options.sqliteKey) _sqliteKey = options.sqliteKey
    if (options.inMemory !== undefined) _isInMemory = options.inMemory

    const SQL = await (window as any).initSqlJs({ locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}` })
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

    await ensureSchemaIntegrity()
    await runMigrations()
    return _sqliteDb
  })()
  return _initPromise
}

async function ensureSchemaIntegrity(): Promise<void> {
  if (!_sqliteDb) return
  logger.info('SQLite', 'Verifying schema integrity...')
  
  for (const schemaStr of TABLES_SCHEMA) {
    try {
      const parts = schemaStr.split('(')
      if (parts.length < 2) continue
      const tableName = parts[0]!.replace('CREATE TABLE IF NOT EXISTS', '').trim()
      const info = _sqliteDb!.exec(`PRAGMA table_info(${tableName})`)
      
      if (!info.length) {
        logger.warn('SQLite', `Table "${tableName}" missing from DB, creating...`)
        _sqliteDb!.run(`CREATE TABLE IF NOT EXISTS ${schemaStr}`)
        continue
      }

      const existingCols = info[0]!.values.map((v: any[]) => (v[1] as string).toLowerCase())
      const colPart = schemaStr.substring(schemaStr.indexOf('(') + 1, schemaStr.lastIndexOf(')'))
      
      const colDefs: string[] = []
      let current = ''
      let depth = 0
      for (let i = 0; i < colPart.length; i++) {
        if (colPart[i] === '(') depth++
        else if (colPart[i] === ')') depth--
        
        if (colPart[i] === ',' && depth === 0) {
          colDefs.push(current.trim())
          current = ''
        } else {
          current += colPart[i]
        }
      }
      if (current.trim()) colDefs.push(current.trim())

      for (const def of colDefs) {
        const upperDef = def.toUpperCase()
        if (upperDef.startsWith('PRIMARY KEY') || upperDef.startsWith('FOREIGN KEY') || upperDef.startsWith('UNIQUE')) {
          continue
        }

        const colName = def.split(/\s+/)[0]!.toLowerCase()
        if (!existingCols.includes(colName)) {
          logger.info('SQLite', `Auto-repair: Adding missing column "${colName}" to "${tableName}"`)
          try {
            const cleanDef = def.replace(/\s+PRIMARY\s+KEY/gi, '').replace(/\s+AUTOINCREMENT/gi, '')
            _sqliteDb!.run(`ALTER TABLE ${tableName} ADD COLUMN ${cleanDef}`)
          } catch (e: unknown) {
            logger.warn('SQLite', `Auto-repair failed for ${tableName}.${colName}: ${(e as Error).message}`)
          }
        }
      }
    } catch (e: unknown) {
      logger.error('SQLite', `Error during integrity check for: ${schemaStr} - ${(e as Error).message}`)
    }
  }
  logger.success('SQLite', 'Schema integrity check complete.')
  await persistSQLite()
}

async function runMigrations(): Promise<void> {
  if (!_sqliteDb) return
  _sqliteDb.run("PRAGMA foreign_keys = OFF") // Disable FKs during structural changes
  _sqliteDb.run("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))")
  const appliedRes = _sqliteDb.exec("SELECT id FROM _migrations")
  const applied = appliedRes[0]?.values.map((v: any[]) => v[0] as string) || []

  const loadingStore = useLoadingStore()
  
  for (const m of DATABASE_MIGRATIONS as { id: string, sql: string }[]) {
    if (!applied.includes(m.id)) {
      logger.info('SQLite', `Applying migration: ${m.id}`)
      loadingStore.start('db_migration', 'Actualizando Base de Datos...', `Aplicando: ${m.id}`, false)
      try {
        const statements = splitSQLStatements(m.sql)
        statements.forEach(stmt => {
          const sql = translatePostgresToSqlite(stmt)
          if (sql) {
            try {
              if (_sqliteDb) _sqliteDb.run(sql)
            } catch (stmtErr: unknown) {
              const msg = (stmtErr as Error).message.toLowerCase()
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
        loadingStore.finish('db_migration')
      } catch (e: unknown) { 
        loadingStore.finish('db_migration')
        logger.error('SQLite', `Migration ${m.id} failed: ${(e as Error).message}`) 
      }
    }
  }
  // Update system_config.db_version to match the latest migration
  if (DATABASE_MIGRATIONS.length > 0) {
    const latestId = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1]!.id
    const version = parseInt(latestId.split('_')[0] || '0')
    logger.info('SQLite', `Updating system_config.db_version to ${version}`)
    _sqliteDb.run("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('db_version', ?, datetime('now'))", [version])
  }

  _sqliteDb.run("PRAGMA foreign_keys = ON")
}

import { splitSQLStatements, translatePostgresToSqlite } from './sqlTranslator'


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

export const db: {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => SQLiteResult[];
  prepare: (sql: string) => unknown;
  from: (table: string) => QueryBuilder;
} = {
  run: (sql: string, params: unknown[] = []) => { if (!_sqliteDb) return; _sqliteDb.run(sql, params); persistSQLite() },
  exec: (sql: string, params: unknown[] = []) => { if (!_sqliteDb) return []; return _sqliteDb.exec(sql, params) },
  prepare: (sql: string) => { if (!_sqliteDb) return null; return _sqliteDb.prepare(sql) },
  from: (table: string) => {
    const builder: QueryBuilder = {
      _table: table, 
      _filters: [], 
      _limit: null, 
      _order: null, 
      _select: '*',
      select: (fields: string) => { builder._select = fields; return builder },
      eq: (col: string, val: unknown) => { builder._filters.push({ col, val, op: '=' }); return builder },
      neq: (col: string, val: unknown) => { builder._filters.push({ col, val, op: '!=' }); return builder },
      in: (col: string, vals: unknown[]) => { builder._filters.push({ col, val: vals, op: 'IN' }); return builder },
      order: (col: string, { ascending = true } = {}) => { builder._order = `${col} ${ascending ? 'ASC' : 'DESC'}`; return builder },
      limit: (n: number) => { builder._limit = n; return builder },
      single: async () => {
        const res = await builder.then()
        return { data: res[0] || null, error: null }
      },
      then: async (resolve?: (val: Record<string, unknown>[]) => void) => {
        if (!_sqliteDb) return []
        let sql = `SELECT ${builder._select} FROM ${builder._table}`
        const params: unknown[] = []
        if (builder._filters.length) {
          sql += ' WHERE ' + builder._filters.map((f: QueryFilter) => {
            if (f.op === 'IN') {
              const placeholders = (f.val as unknown[]).map(() => '?').join(',');
              (f.val as unknown[]).forEach((v) => params.push(v));
              return `${f.col} IN (${placeholders})`
            }
            params.push(f.val)
            return `${f.col} ${f.op} ?`
          }).join(' AND ')
        }
        if (builder._order) sql += ` ORDER BY ${builder._order}`
        if (builder._limit) sql += ` LIMIT ${builder._limit}`
        
        const res = _sqliteDb.exec(sql, params)
        const result = res[0]!;
        const data = result.values.map((row: any[]) => {
          const obj: Record<string, unknown> = {}
          result.columns.forEach((col: string, i: number) => (obj as any)[col] = row[i])
          return obj
        });
        if (resolve) resolve(data)
        return data
      },
      insert: async (payload: unknown) => {
        if (!_sqliteDb) return { data: payload, error: 'DB not ready' }
        const items = Array.isArray(payload) ? payload : [payload]
        for (const item of items) {
          if (typeof item !== 'object' || item === null) continue;
          const r = item as Record<string, unknown>;
          const cols = Object.keys(r)
          const vals = Object.values(r)
          const sql = `INSERT INTO ${builder._table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
          _sqliteDb.run(sql, vals)
        }
        await persistSQLite()
        return { data: payload, error: null }
      },
      update: async (payload: Record<string, unknown>) => {
        if (!_sqliteDb) return { data: payload, error: 'DB not ready' }
        const cols = Object.keys(payload)
        const vals = Object.values(payload)
        let sql = `UPDATE ${builder._table} SET ` + cols.map(c => `${c} = ?`).join(',')
        const params = [...vals]
        if (builder._filters.length) {
          sql += ' WHERE ' + builder._filters.map((f: QueryFilter) => { params.push(f.val); return `${f.col} ${f.op} ?` }).join(' AND ')
        }
        _sqliteDb.run(sql, params)
        await persistSQLite()
        return { data: payload, error: null }
      },
      delete: async () => {
        if (!_sqliteDb) return { data: false, error: 'DB not ready' }
        let sql = `DELETE FROM ${builder._table}`
        const params: unknown[] = []
        if (builder._filters.length) {
          sql += ' WHERE ' + builder._filters.map((f: QueryFilter) => { params.push(f.val); return `${f.col} ${f.op} ?` }).join(' AND ')
        }
        _sqliteDb.run(sql, params)
        await persistSQLite()
        return { data: true, error: null }
      },
      rpc: async (_fn: string, _params: unknown) => {
        // Mock RPC for local mode
        return { data: true, error: null }
      }
    }
    return builder
  }
}
