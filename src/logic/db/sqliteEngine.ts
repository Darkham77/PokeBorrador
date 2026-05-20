/**
 * src/logic/db/sqliteEngine.ts
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 */
import { getFromIDB, setToIDB } from './idbHelper.ts'
import { TABLES_SCHEMA } from './schema.ts'
import { DATABASE_MIGRATIONS } from './migrations_data.ts'
import { useLoadingStore } from '@/stores/loading'
import { logger } from '../utils/logger.ts'

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

declare global {
  interface Window {
    initSqlJs: (o: unknown) => Promise<{ Database: new (data?: Uint8Array) => SQLiteDatabase }>;
  }
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

    const SQL = await window.initSqlJs({ locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}` })
    
    // Check if we are in development mode and if there is a pending import
    if (import.meta.env.DEV) {
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
                const loadingStore = useLoadingStore()
                loadingStore.start('db_import', 'Importando Base de Datos...', 'Instalando copia de seguridad, por favor espera', true)
              } catch (_) {
                // Safe fallback if store/pinia not ready
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
                logger.warn('SQLite', 'Failed to cleanup import db file:', e)
              }

              // Set import reload flag to preserve session during reload
              try {
                sessionStorage.setItem('pokevicio_import_reload', 'true')
                sessionStorage.setItem('pokevicio_import_original_path', window.location.pathname)
              } catch (_) {
                // Ignore if sessionStorage is not available
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

    await ensureSchemaIntegrity()
    await runMigrations()
    return _sqliteDb
  })()
  return _initPromise
}

async function ensureSchemaIntegrity(): Promise<void> {
  if (!_sqliteDb) return
  logger.info('SQLite', 'Verifying schema integrity...')
  
  // Migración segura para la clave primaria de trade_offers (INTEGER -> TEXT/UUID)
  try {
    const info = _sqliteDb.exec("PRAGMA table_info(trade_offers)")
    if (info.length > 0) {
      const idCol = info[0]!.values.find((row: unknown[]) => (row[1] as string) === 'id')
      if (idCol && (idCol[2] as string).toUpperCase() === 'INTEGER') {
        logger.info('SQLite', 'Upgrading trade_offers.id from INTEGER to TEXT...')
        _sqliteDb.run("PRAGMA foreign_keys = OFF")
        _sqliteDb.run(`
          CREATE TABLE trade_offers_new (
            id TEXT PRIMARY KEY,
            sender_id TEXT,
            receiver_id TEXT,
            offer_pokemon TEXT,
            offer_items TEXT,
            offer_money INTEGER DEFAULT 0,
            request_pokemon TEXT,
            request_items TEXT,
            request_money INTEGER DEFAULT 0,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
          )
        `)
        _sqliteDb.run(`
          INSERT INTO trade_offers_new (
            id, sender_id, receiver_id, offer_pokemon, offer_items, offer_money,
            request_pokemon, request_items, request_money, message, status, created_at, updated_at
          )
          SELECT 
            CAST(id AS TEXT), sender_id, receiver_id, offer_pokemon, offer_items, offer_money,
            request_pokemon, request_items, request_money, message, status, created_at, updated_at
          FROM trade_offers
        `)
        _sqliteDb.run("DROP TABLE trade_offers")
        _sqliteDb.run("ALTER TABLE trade_offers_new RENAME TO trade_offers")
        _sqliteDb.run("PRAGMA foreign_keys = ON")
        logger.success('SQLite', 'trade_offers table primary key successfully converted to TEXT.')
      }
    }
  } catch (e: unknown) {
    logger.error('SQLite', `Failed to migrate trade_offers PK: ${(e as Error).message}`)
  }
  
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

      const existingCols = info[0]!.values.map((v: unknown[]) => (v[1] as string).toLowerCase())
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

  // Post-repair: Migrate legacy chat columns if they exist in the database
  try {
    _sqliteDb.run("UPDATE global_chat_messages SET user_id = sender_id WHERE user_id IS NULL AND sender_id IS NOT NULL")
    _sqliteDb.run("UPDATE global_chat_messages SET username = sender_name WHERE username IS NULL AND sender_name IS NOT NULL")
    // Align sender IDs for mock accounts to ensure correct profile loading
    _sqliteDb.run("UPDATE global_chat_messages SET user_id = 'local_ash' WHERE username = 'ash'")
    _sqliteDb.run("UPDATE global_chat_messages SET user_id = 'local_entrenador' WHERE username = 'Entrenador' OR username = 'entrenador'")
    
    // Repair local dev profiles that defaulted to Entrenador
    _sqliteDb.run("UPDATE profiles SET username = 'Ash' WHERE id = 'local_ash' AND username = 'Entrenador'")
    
    // Seed default profiles for local testing
    _sqliteDb.run("INSERT OR IGNORE INTO profiles (id, username, trainer_level, player_class, nick_style) VALUES ('local_ash', 'Ash', 10, 'entrenador', 'nick-style-gold')")
    _sqliteDb.run("INSERT OR IGNORE INTO profiles (id, username, trainer_level, player_class, nick_style) VALUES ('local_entrenador', 'Entrenador', 5, 'entrenador', '')")
    _sqliteDb.run("INSERT OR IGNORE INTO game_saves (user_id, save_data, updated_at) VALUES ('local_ash', '{\"trainer\":\"Ash\",\"trainerLevel\":10,\"playerClass\":\"entrenador\",\"nick_style\":\"nick-style-gold\"}', datetime('now'))")
    _sqliteDb.run("INSERT OR IGNORE INTO game_saves (user_id, save_data, updated_at) VALUES ('local_entrenador', '{\"trainer\":\"Entrenador\",\"trainerLevel\":5,\"playerClass\":\"entrenador\",\"nick_style\":\"\"}', datetime('now'))")
    
    logger.info('SQLite', 'Legacy global chat columns migrated and aligned successfully.')
  } catch (_err: unknown) {
    // Columns or table might not exist or be loaded yet, which is safe to ignore
  }

  // Auto-repair: Populate missing profiles from game_saves to restore cosmetics and profile visibility
  try {
    const savesRes = _sqliteDb.exec("SELECT user_id, save_data FROM game_saves")
    if (savesRes.length > 0) {
      const rows = savesRes[0]!.values
      for (const row of rows) {
        const userId = row[0] as string
        const rawSave = row[1] as string
        if (!userId || !rawSave) continue
        
        // Check if profile exists
        const profRes = _sqliteDb.exec("SELECT id FROM profiles WHERE id = ?", [userId])
        if (profRes.length === 0) {
          logger.info('SQLite', `Auto-repair: Creating missing profile for user ${userId} from save_data`)
          
          let saveData: Record<string, unknown> = {}
          try {
            if (typeof rawSave === 'string') {
              saveData = JSON.parse(rawSave) as Record<string, unknown>
            }
          } catch (_) {
            continue
          }
          const fallbackName = userId.startsWith('local_') ? userId.replace('local_', '') : 'Entrenador'
          const capitalizedFallback = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)
          const username = (saveData.trainer as string) || capitalizedFallback
          const trainerLevel = (saveData.trainerLevel as number) || 1
          const playerClass = (saveData.playerClass as string) || 'entrenador'
          const faction = (saveData.faction as string) || null
          const avatarStyle = (saveData.avatar_style as string) || ''
          const nickStyle = (saveData.nick_style as string) || ''
          
          _sqliteDb.run(
            `INSERT INTO profiles (id, username, trainer_level, player_class, faction, avatar_style, nick_style) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, username, trainerLevel, playerClass, faction, avatarStyle, nickStyle]
          )
        }
      }
    }
    logger.info('SQLite', 'Auto-repair for missing profiles complete.')
  } catch (err: unknown) {
    logger.warn('SQLite', `Auto-repair for profiles failed: ${(err as Error).message}`)
  }

  logger.success('SQLite', 'Schema integrity check complete.')
  await persistSQLite()
}

async function runMigrations(): Promise<void> {
  if (!_sqliteDb) return
  _sqliteDb.run("PRAGMA foreign_keys = OFF") // Disable FKs during structural changes
  _sqliteDb.run("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')))")
  const appliedRes = _sqliteDb.exec("SELECT id FROM _migrations")
  const applied = appliedRes[0]?.values.map((v: unknown[]) => v[0] as string) || []

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
        const data = result.values.map((row: unknown[]) => {
          const obj: Record<string, unknown> = {}
          result.columns.forEach((col: string, i: number) => (obj as Record<string, unknown>)[col] = row[i])
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
