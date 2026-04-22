/**
 * src/logic/db/sqliteEngine.js
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 */
import { getFromIDB, setToIDB } from './idbHelper'
import { TABLES_SCHEMA } from './schema'
import { DATABASE_MIGRATIONS } from './migrations_data'

let _sqliteDb = null
let _initPromise = null
let _sqliteKey = 'pokevicio_sqlite_v2'
let _isInMemory = false

export { getFromIDB, setToIDB }

export async function queryLocal(sql, params = []) {
  if (!_sqliteDb) await initSQLite()
  const res = _sqliteDb.exec(sql, params)
  if (!res.length) return []
  return res[0].values.map(row => {
    const obj = {}
    res[0].columns.forEach((col, i) => obj[col] = row[i])
    return obj
  })
}

export async function persistSQLite() {
  if (!_sqliteDb || _isInMemory) return
  try {
    const binary = _sqliteDb.export()
    await setToIDB(_sqliteKey, binary)
    console.log(`[SQLite] Persistence successful`)
  } catch (e) { console.error('[SQLite] Persistence failed', e) }
}

export async function initSQLite(options = {}) {
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    if (options.sqliteKey) _sqliteKey = options.sqliteKey
    if (options.inMemory !== undefined) _isInMemory = options.inMemory

    const SQL = await window.initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}` })
    const savedBinary = await getFromIDB(_sqliteKey)

    if (savedBinary) {
      _sqliteDb = new SQL.Database(new Uint8Array(savedBinary))
      console.log('[SQLite] Loaded from IndexedDB')
    } else {
      _sqliteDb = new SQL.Database()
      console.log('[SQLite] Created new in-memory database')
      TABLES_SCHEMA.forEach(schema => _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schema}`))
      await persistSQLite()
    }

    await ensureSchemaIntegrity()
    await runMigrations()
    return _sqliteDb
  })()
  return _initPromise
}

/**
 * Ensures all tables have all columns defined in TABLES_SCHEMA.
 * Self-healing mechanism for local SQLite schema drift.
 */
async function ensureSchemaIntegrity() {
  if (!_sqliteDb) return
  console.log('[SQLite] Verifying schema integrity...')
  
  for (const schemaStr of TABLES_SCHEMA) {
    try {
      const tableName = schemaStr.split('(')[0].trim()
      const info = _sqliteDb.exec(`PRAGMA table_info(${tableName})`)
      
      if (!info.length) {
        console.warn(`[SQLite] Table "${tableName}" missing from DB, creating...`)
        _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${schemaStr}`)
        continue
      }

      const existingCols = info[0].values.map(v => v[1].toLowerCase())
      const colPart = schemaStr.substring(schemaStr.indexOf('(') + 1, schemaStr.lastIndexOf(')'))
      
      const colDefs = []
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
        if (def.toUpperCase().startsWith('PRIMARY KEY') || def.toUpperCase().startsWith('FOREIGN KEY') || def.toUpperCase().startsWith('UNIQUE')) {
          continue
        }

        const colName = def.split(/\s+/)[0].toLowerCase()
        if (!existingCols.includes(colName)) {
          console.log(`[SQLite] Auto-repair: Adding missing column "${colName}" to "${tableName}"`)
          try {
            const cleanDef = def.replace(/\s+PRIMARY\s+KEY/gi, '').replace(/\s+AUTOINCREMENT/gi, '')
            _sqliteDb.run(`ALTER TABLE ${tableName} ADD COLUMN ${cleanDef}`)
          } catch (e) {
            console.warn(`[SQLite] Auto-repair failed for ${tableName}.${colName}:`, e.message)
          }
        }
      }
    } catch (e) {
      console.error(`[SQLite] Error during integrity check for: ${schemaStr}`, e)
    }
  }
  console.log('[SQLite] Schema integrity check complete.')
  await persistSQLite()
}

async function runMigrations() {
  if (!_sqliteDb) return
  _sqliteDb.run("PRAGMA foreign_keys = OFF") // Disable FKs during structural changes
  _sqliteDb.run("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))")
  const applied = _sqliteDb.exec("SELECT id FROM _migrations")[0]?.values.map(v => v[0]) || []

  for (const m of DATABASE_MIGRATIONS) {
    if (!applied.includes(m.id)) {
      console.log(`[SQLite] Applying migration: ${m.id}`)
      try {
        const statements = splitSQLStatements(m.sql)
        statements.forEach(stmt => {
          const sql = translatePostgresToSqlite(stmt)
          if (sql) {
            try {
              _sqliteDb.run(sql)
            } catch (stmtErr) {
              const msg = stmtErr.message.toLowerCase()
              const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists')
              const isMissing = msg.includes('no such column')
              
              if (isDuplicate || isMissing) {
                console.warn(`[SQLite] Statement skipped (idempotent/safe): ${stmt}`)
              } else {
                console.error(`[SQLite] Statement failed: ${stmt}`)
                throw stmtErr
              }
            }
          }
        })
        _sqliteDb.run("INSERT OR IGNORE INTO _migrations (id) VALUES (?)", [m.id])
        console.log(`[SQLite] Migration applied successfully: ${m.id}`)
        await persistSQLite()
      } catch (e) { 
        console.error(`[SQLite] Migration ${m.id} failed:`, e.message) 
      }
    }
  }
  // Update system_config.db_version to match the latest migration
  if (DATABASE_MIGRATIONS.length > 0) {
    const latestId = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1].id
    const version = parseInt(latestId.split('_')[0])
    console.log(`[SQLite] Updating system_config.db_version to ${version}`)
    _sqliteDb.run("INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('db_version', ?, datetime('now'))", [version])
  }

  _sqliteDb.run("PRAGMA foreign_keys = ON")
}

/**
 * Splits SQL by semicolon, respecting $$ blocks and strings.
 */
export function splitSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let inString = false;
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    if (!inDollarQuote && !inString) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = true;
        current += '$$';
        i++;
        continue;
      }
      if (char === "'") {
        inString = true;
        current += "'";
        continue;
      }
      if (char === ';') {
        statements.push(current.trim());
        current = '';
        continue;
      }
    } else if (inDollarQuote) {
      if (char === '$' && nextChar === '$') {
        inDollarQuote = false;
        current += '$$';
        i++;
        continue;
      }
    } else if (inString) {
      if (char === "'" && sql[i-1] !== '\\') {
        inString = false;
        current += "'";
        continue;
      }
    }
    current += char;
  }
  
  if (current.trim()) statements.push(current.trim());
  return statements.filter(s => s.length > 0);
}

/**
 * Translates common Postgres syntax to SQLite.
 */
export function translatePostgresToSqlite(sql) {
  if (!sql) return '';
  
  return sql
    .replace(/public\./gi, '')
    // 1. Types & Casts
    .replace(/\bJSONB\b/gi, 'TEXT')
    .replace(/\bUUID\b/gi, 'TEXT')
    .replace(/\bTIMESTAMPTZ\b/gi, 'TEXT')
    .replace(/\bTIMESTAMP\b/gi, 'TEXT')
    .replace(/\bBIGINT\b/gi, 'INTEGER')
    .replace(/\b(BIGSERIAL|SERIAL)\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/\b(BIGSERIAL|SERIAL)\b/gi, 'INTEGER')
    .replace(/::[a-z0-9]+/gi, '')
    // 2. Functions
    .replace(/\bNOW\(\)/gi, "datetime('now')")
    .replace(/\bgen_random_uuid\(\)/gi, "hex(randomblob(16))")
    .replace(/\bEXTRACT\(epoch\s+FROM\s+([^)]+)\)/gi, "unixepoch($1)")
    .replace(/\bARRAY_AGG\b/gi, "json_group_array")
    .replace(/\bstring_agg\b/gi, "group_concat")
    .replace(/\bjsonb_build_object\b/gi, "json_object")
    .replace(/\bjsonb_set\b/gi, "json_set")
    .replace(/\bjsonb_agg\b/gi, "json_group_array")
    .replace(/\bjsonb_object_agg\b/gi, "json_group_object")
    .replace(/\bjsonb_build_array\b/gi, "json_array")
    .replace(/\bjsonb_array_elements\b/gi, "json_each")
    .replace(/\bjsonb_array_length\b/gi, "json_array_length")
    .replace(/\bto_jsonb\b/gi, "json")
    .replace(/\bjsonb_(\w+)\b/gi, "json_$1")
    .replace(/\bSUBSTRING\b/gi, "SUBSTR")
    // 3. Operators & Constants
    .replace(/\bTRUE\b/gi, '1')
    .replace(/\bFALSE\b/gi, '0')
    .replace(/->>/g, '->>')
    .replace(/->/g, '->')
    // 4. SQL Patterns
    .replace(/FOR\s+UPDATE/gi, '')
    .replace(/DEFAULT\s+datetime\('now'\)/gi, "DEFAULT (datetime('now'))")
    .replace(/RAISE\s+EXCEPTION\s+'[^']*'/gi, 'SELECT 1')
    .replace(/\bADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b/gi, 'ADD COLUMN')
    .trim();
}

export function resetSQLite() {
  _sqliteDb = null;
  _initPromise = null;
  _isInMemory = false;
  _sqliteKey = 'pokevicio_sqlite_v2';
}

export const db = {
  run: (sql, params = []) => { if (!_sqliteDb) return; _sqliteDb.run(sql, params); persistSQLite() },
  exec: (sql, params = []) => { if (!_sqliteDb) return []; return _sqliteDb.exec(sql, params) },
  prepare: (sql) => { if (!_sqliteDb) return null; return _sqliteDb.prepare(sql) },
  from: (table) => {
    const builder = {
      _table: table, _filters: [], _limit: null, _order: null, _select: '*',
      select: (fields) => { builder._select = fields; return builder },
      eq: (col, val) => { builder._filters.push({ col, val, op: '=' }); return builder },
      neq: (col, val) => { builder._filters.push({ col, val, op: '!=' }); return builder },
      in: (col, vals) => { builder._filters.push({ col, val: vals, op: 'IN' }); return builder },
      order: (col, { ascending = true } = {}) => { builder._order = `${col} ${ascending ? 'ASC' : 'DESC'}`; return builder },
      limit: (n) => { builder._limit = n; return builder },
      single: async () => {
        const res = await builder.then()
        return { data: res[0] || null, error: null }
      },
      then: async (resolve) => {
        let sql = `SELECT ${builder._select} FROM ${builder._table}`
        const params = []
        if (builder._filters.length) {
          sql += ' WHERE ' + builder._filters.map(f => {
            if (f.op === 'IN') {
              const placeholders = f.val.map(() => '?').join(',')
              f.val.forEach(v => params.push(v))
              return `${f.col} IN (${placeholders})`
            }
            params.push(f.val)
            return `${f.col} ${f.op} ?`
          }).join(' AND ')
        }
        if (builder._order) sql += ` ORDER BY ${builder._order}`
        if (builder._limit) sql += ` LIMIT ${builder._limit}`
        
        const res = _sqliteDb.exec(sql, params)
        const data = res[0] ? res[0].values.map(row => {
          const obj = {}
          res[0].columns.forEach((col, i) => obj[col] = row[i])
          return obj
        }) : []
        if (resolve) resolve(data)
        return data
      },
      insert: async (payload) => {
        const items = Array.isArray(payload) ? payload : [payload]
        for (const item of items) {
          const cols = Object.keys(item)
          const vals = Object.values(item)
          const sql = `INSERT INTO ${builder._table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
          _sqliteDb.run(sql, vals)
        }
        await persistSQLite()
        return { data: payload, error: null }
      },
      update: async (payload) => {
        const cols = Object.keys(payload)
        const vals = Object.values(payload)
        let sql = `UPDATE ${builder._table} SET ` + cols.map(c => `${c} = ?`).join(',')
        const params = [...vals]
        if (builder._filters.length) {
          sql += ' WHERE ' + builder._filters.map(f => { params.push(f.val); return `${f.col} ${f.op} ?` }).join(' AND ')
        }
        _sqliteDb.run(sql, params)
        await persistSQLite()
        return { data: payload, error: null }
      },
      delete: async () => {
        let sql = `DELETE FROM ${builder._table}`
        const params = []
        if (builder._filters.length) {
          sql += ' WHERE ' + builder._filters.map(f => { params.push(f.val); return `${f.col} ${f.op} ?` }).join(' AND ')
        }
        _sqliteDb.run(sql, params)
        await persistSQLite()
        return { data: true, error: null }
      },
      rpc: async (fn, _params) => {
        // Mock RPC for local mode
        if (fn === 'handle_guardian_defeat') {
          // Special logic for local guardian defeat if needed
        }
        return { data: true, error: null }
      }
    }
    return builder
  }
}
