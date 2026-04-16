/**
 * src/logic/db/sqliteEngine.js
 * SQL.js (SQLite WASM) Engine with IndexedDB Persistence
 */

let _sqliteDb = null;
let _initPromise = null;

const TABLES_SCHEMA = [
  "profiles (id TEXT PRIMARY KEY, username TEXT, email TEXT, trainer_level INTEGER DEFAULT 1, player_class TEXT, faction TEXT)",
  "game_saves (user_id TEXT PRIMARY KEY, save_data TEXT, updated_at TEXT)",
  "friendships (id INTEGER PRIMARY KEY AUTOINCREMENT, requester_id TEXT, addressee_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "battle_invites (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, opponent_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "ranked_queue (user_id TEXT PRIMARY KEY, elo INTEGER DEFAULT 1000, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "global_chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, sender_name TEXT, message TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "passive_teams (user_id TEXT PRIMARY KEY, team_data TEXT, updated_at TEXT)",
  "passive_battle_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, opponent_id TEXT, result TEXT, report_data TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "awards (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, status TEXT, data TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "competition_results (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT, user_id TEXT, rank INTEGER, score INTEGER, reward_claimed BOOLEAN DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))",
  "daycare_slots (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, pokemon_id TEXT, slot_index INTEGER, deposited_at TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "daycare_upgrades (player_id TEXT PRIMARY KEY, egg_capacity INTEGER DEFAULT (1), slot_boost INTEGER DEFAULT (0), updated_at TEXT DEFAULT (datetime('now')))",
  "pokedex_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT, pokemon_id INTEGER, status TEXT, created_at TEXT DEFAULT (datetime('now')))",
  "war_user_points (user_id TEXT, week_id TEXT, map_id TEXT, points INTEGER, PRIMARY KEY (user_id, week_id, map_id))",
  "war_factions (user_id TEXT PRIMARY KEY, faction TEXT)",
  "war_points (week_id TEXT, map_id TEXT, faction TEXT, points INTEGER, PRIMARY KEY (week_id, map_id, faction))",
  "war_dominance (week_id TEXT, map_id TEXT, winner_faction TEXT, union_points INTEGER, poder_points INTEGER, PRIMARY KEY (week_id, map_id))"
];

async function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pokevicio_idb', 1);
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

/**
 * Persists current SQLite DB to IndexedDB.
 */
export async function persistSQLite() {
  if (!_sqliteDb) return;
  try {
    const binary = _sqliteDb.export();
    await setToIDB('pokevicio_sqlite_v2', binary);
    console.log('[SQLite] Persistence successful (IndexedDB)');
  } catch (e) { console.error('[SQLite] Persistence failed', e); }
}

/**
 * Initializes and returns the local SQLite database.
 */
export async function initSQLite() {
  if (_sqliteDb) return _sqliteDb;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      console.log('[SQLite] Initializing WASM library...');
      // initSqlJs is expected to be global from index.html (legacy script)
      // but in modular Vite it could be imported. For now we use the global via window.
      if (!window.initSqlJs) {
        throw new Error('initSqlJs is not loaded in window. Verify index.html.');
      }

      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });

      const binaryData = await getFromIDB('pokevicio_sqlite_v2');

      if (binaryData) {
        _sqliteDb = new SQL.Database(binaryData);
        console.log('[SQLite] Database loaded from IndexedDB');
      } else {
        _sqliteDb = new SQL.Database();
        console.log('[SQLite] New database created');
      }

      // Initialize schemas
      TABLES_SCHEMA.forEach(tableDef => {
        try {
          _sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${tableDef};`);
        } catch (e) {
          console.error(`[SQLite] Error creating table: ${tableDef.split(' ')[0]}`, e);
        }
      });

      await persistSQLite();
      return _sqliteDb;
    } catch (err) {
      console.error('[SQLite] Initialization failed:', err);
      _initPromise = null;
      throw err;
    }
  })();
  return _initPromise;
}

/**
 * Executes a SELECT query and returns the results as an array of objects.
 */
export function queryLocal(sql, params = []) {
  if (!_sqliteDb) {
    console.warn('[SQLite] queryLocal called but DB is not initialized.');
    return [];
  }
  const stmt = _sqliteDb.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

/**
 * Returns the raw sqliteDb instance for direct SQL execution.
 */
export function getRawSqlite() {
  return _sqliteDb;
}
