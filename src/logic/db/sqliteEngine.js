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
  "events_config (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, icon TEXT, type TEXT, config TEXT, is_active BOOLEAN, start_date TEXT, end_date TEXT)",
  "chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, sender_name TEXT, message TEXT, type TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "market_listings (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id TEXT, seller_name TEXT, listing_type TEXT, data TEXT, price INTEGER, status TEXT, buyer_id TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "ranked_rules_config (id TEXT PRIMARY KEY, season_name TEXT, config TEXT)",
  "war_dominance (week_id TEXT, map_id TEXT, winner_faction TEXT, union_points INTEGER DEFAULT 0, poder_points INTEGER DEFAULT 0, resolved_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (week_id, map_id))",
  "war_points (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id TEXT, map_id TEXT, faction TEXT, points INTEGER DEFAULT 0, updated_at TEXT DEFAULT (datetime('now')), UNIQUE (week_id, map_id, faction))",
  "war_user_points (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, map_id TEXT, week_id TEXT, points INTEGER DEFAULT 0, faction TEXT, updated_at TEXT)",
  "guardian_captures (capture_date TEXT, map_id TEXT, user_id TEXT, winner_faction TEXT, pts_awarded INTEGER DEFAULT 150, captured_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (capture_date, map_id, user_id))",
  "eggs (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, egg_id TEXT, steps_remaining INTEGER DEFAULT 1000, created_at TEXT DEFAULT (datetime('now')))",
  "awards (id TEXT PRIMARY KEY, event_id TEXT, winner_email TEXT, winner_name TEXT, prize TEXT, awarded_at TEXT DEFAULT (datetime('now')), claimed BOOLEAN DEFAULT 0, claimed_at TEXT)",
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

const DATABASE_MIGRATIONS = [
  {
    id: '202604170835_add_role_to_profiles',
    sql: "ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user'; UPDATE config SET value = '202604170835' WHERE key = 'db_version';",
    check: { table: 'profiles', column: 'role' }
  },
  {
    id: '202604172000_create_claim_queue',
    sql: "CREATE TABLE IF NOT EXISTS claim_queue (id TEXT PRIMARY KEY, user_id TEXT, source_type TEXT, source_id TEXT, asset_data TEXT, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now'))); UPDATE config SET value = '202604172000' WHERE key = 'db_version';",
    check: { table: 'claim_queue', column: 'id' }
  },
  {
    id: '202604180100_add_db_version',
    sql: "INSERT OR IGNORE INTO config (key, value) VALUES ('db_version', '202604180100'); UPDATE config SET value = '202604180100' WHERE key = 'db_version';"
  }
];

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
  } catch (e) { return null; }
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
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });

      const binaryData = _isInMemory ? null : await getFromIDB(_sqliteKey);

      if (binaryData) {
        _sqliteDb = new SQL.Database(binaryData);
        console.log('[SQLite] Database loaded from IndexedDB');
      } else {
        _sqliteDb = new SQL.Database();
        console.log('[SQLite] New database created');
      }

      // 1. Initialize schemas
      TABLES_SCHEMA.forEach(tableDef => {
        try {
          _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${tableDef};`);
        } catch (e) {
          console.error(`[SQLite] Error creating table: ${tableDef.split(' ')[0]}`, e);
        }
      });

      // 2. Initialize migrations table
      _sqliteDb.run(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));`);

      // 3. Run migrations
      console.log('[SQLite] Running migrations...');
      runMigrationsInternal(_sqliteDb, DATABASE_MIGRATIONS);

      // 4. Force Version Sync
      try {
        const latestMig = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1];
        const latestVer = latestMig.id.split('_')[0];
        _sqliteDb.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('db_version', '${latestVer}')`);
        console.log(`[SQLite] Local DB Version synchronized to: ${latestVer}`);
      } catch (e) {
        console.error('[SQLite] Failed to sync db_version:', e);
      }

      if (!_isInMemory) await persistSQLite();
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

      console.log(`[SQLite Migration] Applying: ${m.id}`);
      m.sql.split(';').filter(s => s.trim()).forEach(stmt => db.run(stmt));
      db.run(`INSERT INTO _migrations (id) VALUES ('${m.id}')`);

      const version = m.id.split('_')[0];
      if (/^\d+$/.test(version)) {
        db.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('db_version', '${version}')`);
      }
    } catch (e) {
      console.warn(`[SQLite Migration] Failed to apply ${m.id}:`, e);
    }
  });
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
