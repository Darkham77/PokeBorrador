/**
 * src/logic/db/sqliteEngine.js
 * Unified SQL.js (SQLite WASM) Engine with IndexedDB Persistence.
 * This is the primary database handler for local/offline mode.
 */

let _sqliteDb = null;
let _initPromise = null;

const TABLES_SCHEMA = [
  "profiles (id TEXT PRIMARY KEY, username TEXT, email TEXT, trainer_level INTEGER DEFAULT 1, player_class TEXT, faction TEXT, nick_style TEXT, avatar_style TEXT, role TEXT DEFAULT 'user', created_at TEXT, current_session_id TEXT)",
  "game_saves (user_id TEXT PRIMARY KEY, save_data TEXT, updated_at TEXT)",
  "friendships (id INTEGER PRIMARY KEY AUTOINCREMENT, requester_id TEXT, addressee_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "battle_invites (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, opponent_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "ranked_queue (user_id TEXT PRIMARY KEY, elo INTEGER DEFAULT 1000, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "global_chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, sender_name TEXT, message TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "passive_teams (user_id TEXT PRIMARY KEY, team_data TEXT, updated_at TEXT)",
  "passive_battle_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, opponent_id TEXT, result TEXT, report_data TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "daycare_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, pokemon_id TEXT, slot_index INTEGER, deposited_at TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "daycare_upgrades (player_id TEXT PRIMARY KEY, egg_capacity INTEGER DEFAULT 1, slot_boost INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')))",
  "pokedex_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, pokemon_id INTEGER, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "trade_offers (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, receiver_id TEXT, offer_pokemon TEXT, offer_items TEXT, offer_money INTEGER DEFAULT 0, request_pokemon TEXT, request_items TEXT, request_money INTEGER DEFAULT 0, message TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))",
  "events_config (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, icon TEXT, type TEXT, config TEXT, active BOOLEAN, start_date TEXT, end_date TEXT)",
  "chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, sender_name TEXT, message TEXT, type TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "market_listings (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id TEXT, seller_name TEXT, listing_type TEXT, data TEXT, price INTEGER, status TEXT, buyer_id TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "ranked_rules_config (id TEXT PRIMARY KEY, season_name TEXT, config TEXT)",
  "war_dominance (week_id TEXT, map_id TEXT, winner_faction TEXT, union_points INTEGER DEFAULT 0, poder_points INTEGER DEFAULT 0, resolved_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (week_id, map_id))",
  "war_points (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id TEXT, map_id TEXT, faction TEXT, points INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')), UNIQUE (week_id, map_id, faction))",
  "war_user_points (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, map_id TEXT, week_id TEXT, points INTEGER DEFAULT 0, faction TEXT, updated_at TEXT)",
  "guardian_captures (capture_date TEXT, map_id TEXT, user_id TEXT, winner_faction TEXT, pts_awarded INTEGER DEFAULT 150, captured_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (capture_date, map_id, user_id))",
  "eggs (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, egg_id TEXT, steps_remaining INTEGER DEFAULT 1000, created_at TEXT DEFAULT (datetime('now')))",
  "awards (id TEXT PRIMARY KEY, event_id TEXT, winner_id TEXT, winner_email TEXT, winner_name TEXT, prize TEXT, awarded_at TEXT DEFAULT (datetime('now')), claimed BOOLEAN DEFAULT 0, claimed_at TEXT, received_at TEXT)",
  "competition_entries (id TEXT PRIMARY KEY, event_id TEXT, player_email TEXT, player_name TEXT, data TEXT, submitted_at TEXT DEFAULT (datetime('now')))",
  "competition_results (id TEXT PRIMARY KEY, event_id TEXT, winners TEXT, ended_at TEXT DEFAULT (datetime('now')))",
  "war_factions (user_id TEXT PRIMARY KEY, email TEXT, faction TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "war_defenders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, map_id TEXT, pokemon_uid TEXT, pokemon_data TEXT, wins_count INTEGER DEFAULT 0, week_id TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "claim_queue (id TEXT PRIMARY KEY, user_id TEXT, source_type TEXT, source_id TEXT, asset_data TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))",
  "config (key TEXT PRIMARY KEY, value TEXT)"
];

let _dbName = 'pokevicio_idb';
let _sqliteKey = 'pokevicio_sqlite_v2';
let _isInMemory = false;

import { DATABASE_MIGRATIONS } from './migrations_data';

async function openIDB() {
  if (_isInMemory) return null;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(_dbName, 1);
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e.target.error);
  });
}

export async function getFromIDB(key) {
  if (_isInMemory) return null;
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('keyval', 'readonly');
      const req = tx.objectStore('keyval').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (_e) { return null; }
}

export async function setToIDB(key, val) {
  if (_isInMemory) return;
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('keyval', 'readwrite');
      const req = tx.objectStore('keyval').put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.error('[SQLite] IDB Save Error:', e); }
}

export async function persistSQLite() {
  if (!_sqliteDb || _isInMemory) return;
  try {
    const binary = _sqliteDb.export();
    await setToIDB(_sqliteKey, binary);
    console.log(`[SQLite] Persistence successful (IDB: ${_dbName})`);
  } catch (e) { console.error('[SQLite] Persistence failed', e); }
}

export async function initSQLite(options = {}) {
  if (options.dbName) _dbName = options.dbName;
  if (options.sqliteKey) _sqliteKey = options.sqliteKey;
  if (options.inMemory !== undefined) _isInMemory = options.inMemory;

  if (_sqliteDb) return _sqliteDb;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      console.log(`[SQLite] Initializing with IDB: ${_dbName}`);

      if (!window.initSqlJs) {
        throw new Error('initSqlJs is not loaded in window.');
      }

      const SQL = await window.initSqlJs({
        locateFile: _file => `/sql-wasm.wasm`
      });

      const binaryData = _isInMemory ? null : await getFromIDB(_sqliteKey);

      if (binaryData) {
        _sqliteDb = new SQL.Database(binaryData);
        console.log('[SQLite] Database loaded from IndexedDB');
      } else {
        _sqliteDb = new SQL.Database();
        console.log('[SQLite] New database created');
      }

      // 1. Check current version to avoid redundant syncs
      let currentVersion = '0';
      try {
        _sqliteDb.run(`CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT)`);
        const verResult = _sqliteDb.exec(`SELECT value FROM config WHERE key = 'db_version'`);
        if (verResult.length > 0 && verResult[0].values.length > 0) {
          currentVersion = verResult[0].values[0][0];
        }
      } catch (e) { console.warn('[SQLite] Could not read version:', e); }

      const latestMig = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1];
      const targetVersion = latestMig.id.split('_')[0];
      const needsSync = currentVersion !== targetVersion;

      if (needsSync) {
        console.log(`[SQLite] Version mismatch (${currentVersion} vs ${targetVersion}). Running sync...`);
        
        // A. Initialize schemas and ensure columns exist
        TABLES_SCHEMA.forEach(tableDef => {
          try {
            const tableName = tableDef.split(' ')[0];
            _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${tableDef};`);
            
            const colsStr = tableDef.substring(tableDef.indexOf('(') + 1, tableDef.lastIndexOf(')'));
            const colDefs = [];
            let current = '';
            let depth = 0;
            for (let i = 0; i < colsStr.length; i++) {
              const char = colsStr[i];
              if (char === '(') depth++;
              if (char === ')') depth--;
              if (char === ',' && depth === 0) {
                colDefs.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            if (current.trim()) colDefs.push(current.trim());
            
            const info = _sqliteDb.exec(`PRAGMA table_info(${tableName})`);
            const existingCols = info[0].values.map(row => row[1]);
            
            colDefs.forEach(def => {
              const colName = def.split(/\s+/)[0];
              const upper = colName.toUpperCase();
              
              if (!colName || 
                  ['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'REFERENCES'].includes(upper) || 
                  colName.includes('(') || 
                  colName.includes(')')) return;

              if (!existingCols.includes(colName)) {
                let alterDef = def;
                if (def.toUpperCase().includes('DEFAULT') && (def.includes('(') || def.toUpperCase().includes('NOW'))) {
                  alterDef = def.split(/DEFAULT/i)[0].trim();
                }
                
                if (!alterDef.toUpperCase().includes('PRIMARY KEY')) {
                  console.log(`[SQLite] Adding missing column ${colName} to ${tableName}`);
                  _sqliteDb.run(`ALTER TABLE ${tableName} ADD COLUMN ${alterDef}`);
                }
              }
            });
          } catch (e) {
            console.error(`[SQLite] Error syncing table schema: ${tableDef.split(' ')[0]}`, e);
          }
        });

        // B. Initialize migrations table
        _sqliteDb.run(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));`);

        // C. Run migrations
        runMigrationsInternal(_sqliteDb, DATABASE_MIGRATIONS);

        // D. Force Version Sync
        try {
          _sqliteDb.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('db_version', '${targetVersion}')`);
          console.log(`[SQLite] Local DB Version synchronized to: ${targetVersion}`);
        } catch (e) {
          console.error('[SQLite] Failed to sync db_version:', e);
        }

        if (!_isInMemory) await persistSQLite();
      } else {
        console.log(`[SQLite] Database version is up to date (${currentVersion}). Skipping sync.`);
      }
      
      return _sqliteDb;
    } catch (err) {
      console.error('[SQLite] Initialization failed:', err);
      _initPromise = null;
      throw err;
    }
  })();
  return _initPromise;
}

function runMigrationsInternal(db, migrations) {
  migrations.forEach(m => {
    try {
      const applied = db.exec(`SELECT 1 FROM _migrations WHERE id = '${m.id}'`);
      if (applied.length > 0) return;

      if (m.check) {
        const info = db.exec(`PRAGMA table_info(${m.check.table})`);
        const exists = info[0] && info[0].values.some(row => row[1] === m.check.column);
        if (exists) {
          db.run(`INSERT OR IGNORE INTO _migrations (id) VALUES ('${m.id}')`);
          return;
        }
      }

      console.log(`[SQLite Migration] APPLYING: ${m.id}`);
      
      const statements = splitSQLStatements(m.sql);
      
      statements.forEach(stmt => {
        const cleaned = translatePostgresToSqlite(stmt);
        if (!cleaned) return;

        const upper = cleaned.toUpperCase();
        
        // Ignorar lógica incompatible de Postgres
        if (upper.startsWith('CREATE OR REPLACE FUNCTION') || 
            upper.startsWith('CREATE POLICY') ||
            upper.startsWith('DROP POLICY') ||
            upper.startsWith('CREATE TRIGGER') ||
            upper.startsWith('DROP TRIGGER') ||
            upper.startsWith('CREATE EXTENSION') ||
            (upper.startsWith('ALTER TABLE') && (upper.includes('ENABLE ROW LEVEL SECURITY') || upper.includes('OWNER TO'))) ||
            upper.includes('RETURNS TRIGGER') || 
            upper.includes('LANGUAGE PLPGSQL') ||
            upper.includes('SECURITY DEFINER')) {
          console.warn(`[SQLite Migration] Skipping Postgres-specific block: ${cleaned.substring(0, 80)}...`);
          return;
        }

        // Evitar ejecutar ALTER TABLE que no sean ADD COLUMN básicos
        if (upper.startsWith('ALTER TABLE') && !upper.includes('ADD COLUMN')) {
           console.warn(`[SQLite Migration] Skipping complex ALTER TABLE: ${cleaned}`);
           return;
        }

        console.log(`[SQLite Migration] Executing: ${cleaned.substring(0, 100)}${cleaned.length > 100 ? '...' : ''}`);
        try {
          db.run(cleaned);
        } catch (e) {
          if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
            console.warn(`[SQLite Migration] Object already exists, skipping in ${m.id}`);
          } else {
            console.error(`[SQLite Migration] Failed statement in ${m.id}:`, cleaned, e);
          }
        }
      });

      db.run(`INSERT INTO _migrations (id) VALUES ('${m.id}')`);
      const version = m.id.split('_')[0];
      if (/^\d+$/.test(version)) {
        db.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('db_version', '${version}')`);
      }
      console.log(`[SQLite Migration] SUCCESS: ${m.id}`);
    } catch (e) {
      console.error(`[SQLite Migration] CRITICAL FAILURE applying ${m.id}:`, e);
    }
  });
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
    .trim();
}

/**
 * ASYNC query wrapper that ensures DB is initialized.
 */
export async function queryLocal(sql, params = []) {
  await initSQLite();
  if (!_sqliteDb) {
    console.error('[SQLite] queryLocal failed: DB is null after initialization.');
    return [];
  }
  try {
    const stmt = _sqliteDb.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  } catch (e) {
    console.error(`[SQLite Error] Query: ${sql}`, e);
    return [];
  }
}

/**
 * ASYNC execution wrapper.
 */
export async function execLocal(sql, params = []) {
  await initSQLite();
  if (!_sqliteDb) return;
  _sqliteDb.run(sql, params);
  await persistSQLite();
}

export function getRawSqlite() {
  return _sqliteDb;
}

export function resetSQLite() {
  _sqliteDb = null;
  _initPromise = null;
  _isInMemory = false;
  _dbName = 'pokevicio_idb';
  _sqliteKey = 'pokevicio_sqlite_v2';
}
