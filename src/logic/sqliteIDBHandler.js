/**
 * SQLite Handler for Browser-Side Emulation
 * Uses sql.js (WebAssembly) to provide a local SQL database.
 * Persists to IndexedDB to survive page refreshes.
 * 
 * IMPORTANT: If you modify the local schema (tables array) or CRUD methods here, 
 * you MUST update the DBRouter (src/logic/dbRouter.js) to keep Online/Offline parity.
 */

let db = null;
let initPromise = null;
let isMigrating = false;
export let isNewDatabase = false;

// ── IndexedDB Helpers ────────────────────────────────────────────────────────
async function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pokevicio_idb', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('keyval')) {
        db.createObjectStore('keyval');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromIDB(key) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('keyval', 'readonly');
      const store = transaction.objectStore('keyval');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch { return null; }
}

async function setToIDB(key, value) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('keyval', 'readwrite');
      const store = transaction.objectStore('keyval');
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) { console.error('[SQLite] IDB Save Error:', e); }
}

export async function initSQLite() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });

      // 1. Intentar cargar desde IndexedDB (Nuevo Sistema v2)
      let binaryData = await getFromIDB('pokevicio_sqlite_v2');
      
      // 2. Fallback / Migración desde localStorage (Viejo Sistema)
      if (!binaryData) {
        const legacyData = localStorage.getItem('pokevicio_sqlite');
        if (legacyData) {
            console.log('[SQLite] Migrating data from localStorage to IndexedDB...');
            isMigrating = true;
            try {
                if (legacyData.startsWith('[')) {
                    binaryData = new Uint8Array(JSON.parse(legacyData));
                } else {
                    const binaryString = window.atob(legacyData);
                    binaryData = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        binaryData[i] = binaryString.charCodeAt(i);
                    }
                }
                // Guardar inmediatamente en IDB
                await setToIDB('pokevicio_sqlite_v2', binaryData);
            } catch (e) { console.error('[SQLite] Migration failed:', e); }
        }
      }

      if (binaryData) {
        db = new SQL.Database(binaryData);
        isNewDatabase = false;
        console.log('[SQLite] Database loaded from IndexedDB');
      } else {
        db = new SQL.Database();
        isNewDatabase = true;
        console.log('[SQLite] New database created');
      }

      const tables = [
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

      tables.forEach(tableDef => {
        try {
          db.run(`CREATE TABLE IF NOT EXISTS ${tableDef};`);
        } catch (e) {
          console.error(`[SQLite] Error creating table: ${tableDef.split(' ')[0]}`, e);
        }
      });

      // Nuevo Sistema de Migraciones Estructuradas
      db.run(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));`);
      
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

      console.log('[SQLite] Running migrations...');
      runMigrations(db, DATABASE_MIGRATIONS);
      
      // Force Version Sync: Ensure local DB matches the latest client-defined migration
      try {
        const latestMig = DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1];
        const latestVer = latestMig.id.split('_')[0];
        db.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('db_version', '${latestVer}')`);
        console.log(`[SQLite] Local DB Version synchronized to: ${latestVer}`);
      } catch (e) {
        console.error('[SQLite] Failed to sync db_version:', e);
      }

      seedSQLite();
      await persistSQLite();

      // Limpieza Post-Migración
      if (isMigrating) {
        console.log('[SQLite] Migration complete. Cleaning up localStorage...');
        localStorage.removeItem('pokevicio_sqlite');
      }

      return db;
    } catch (err) {
      console.error('[SQLite] Initialization failed:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Runs sequential migrations and tracks them in _migrations table.
 */
function runMigrations(db, migrations) {
  migrations.forEach(m => {
    try {
      // 1. Check if already applied via _migrations table
      const applied = db.exec(`SELECT 1 FROM _migrations WHERE id = '${m.id}'`);
      if (applied.length > 0) return;

      // 2. Double check via schema info (Check-then-Apply) if defined
      if (m.check) {
        const info = db.exec(`PRAGMA table_info(${m.check.table})`);
        const exists = info[0] && info[0].values.some(row => row[1] === m.check.column);
        if (exists) {
          db.run(`INSERT OR IGNORE INTO _migrations (id) VALUES ('${m.id}')`);
          return;
        }
      }

      // 3. Apply migration
      console.log(`[SQLite Migration] Applying: ${m.id}`);
      // Split by semicolon and execute individually to avoid multiple statement issues in some environments
      m.sql.split(';').filter(s => s.trim()).forEach(stmt => {
        db.run(stmt);
      });

      // 4. Mark as applied
      db.run(`INSERT INTO _migrations (id) VALUES ('${m.id}')`);

      // 5. Auto-establish version (Safety Guard)
      const version = m.id.split('_')[0];
      if (/^\d+$/.test(version)) {
        db.run(`INSERT OR REPLACE INTO config (key, value) VALUES ('db_version', '${version}')`);
      }
    } catch (e) {
      console.warn(`[SQLite Migration] Failed to apply ${m.id}:`, e);
    }
  });
}

function seedSQLite() {
  const check = db.exec("SELECT COUNT(*) FROM events_config");
  if (check[0].values[0][0] === 0) {
    console.log('[SQLite] Seeding initial data...');
    db.run("INSERT INTO events_config (name, icon, type, is_active, config) VALUES (?, ?, ?, ?, ?)", [
      'Hora Magikarp', '🐟', 'fishing', 1, JSON.stringify({ target: 'Magikarp', weight: 'giant' })
    ]);
    db.run("INSERT INTO events_config (name, icon, type, is_active, config) VALUES (?, ?, ?, ?, ?)", [
      'Doble Experiencia', '✨', 'exp_boost', 1, JSON.stringify({ multiplier: 2 })
    ]);
    db.run("INSERT OR IGNORE INTO ranked_rules_config (id, season_name, config) VALUES (?, ?, ?)", [
      'current', 'Temporada Local 1', JSON.stringify({ min_level: 5, max_level: 50 })
    ]);
    // Seeding events and maps only

    const kantoMaps = [
      'route1', 'route2', 'forest', 'route22', 'route3', 'mt_moon', 'route4', 'route24', 'route25',
      'route5', 'route6', 'route11', 'diglett_cave', 'route9', 'rock_tunnel', 'route10', 'power_plant',
      'route8', 'pokemon_tower', 'route12', 'route13', 'safari_zone', 'seafoam_islands', 'mansion',
      'route14', 'route15', 'route23', 'victory_road', 'cerulean_cave'
    ];
    
    const weekId = '2026-W14'; 
    kantoMaps.forEach((mapId, index) => {
      const winner = (index % 5 === 0) ? 'union' : (index % 5 === 1 ? 'poder' : null);
      db.run("INSERT OR IGNORE INTO war_dominance (id, map_id, week_id, winner_faction, faction, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [
        `${mapId}_${weekId}`, mapId, weekId, winner, winner || 'neutral', new Date().toISOString()
      ]);
      db.run("INSERT OR IGNORE INTO war_points (map_id, week_id, faction, points, updated_at) VALUES (?, ?, ?, ?, ?)", [
        mapId, weekId, 'union', index * 10, new Date().toISOString()
      ]);
      db.run("INSERT OR IGNORE INTO war_points (map_id, week_id, faction, points, updated_at) VALUES (?, ?, ?, ?, ?)", [
        mapId, weekId, 'poder', index * 5, new Date().toISOString()
      ]);
    });
  }
}

export async function queryLocal(sql, params = []) {
  await initSQLite();
  if (!db) return [];
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (e) {
    console.error(`[SQLite Error] Query: ${sql}`, e);
    // If it's a version mismatch or table missing, we might need to handle it
    return [];
  }
}

export async function execLocal(sql, params = []) {
  await initSQLite();
  if (!db) return;
  db.run(sql, params);
  persistSQLite();
}

export async function insertLocal(table, values) {
  await initSQLite();
  if (!db) return null;
  const cols = Object.keys(values);
  const placeholders = cols.map(() => '?').join(', ');
  const vals = cols.map(c => {
    const v = values[c];
    return (v && typeof v === 'object') ? JSON.stringify(v) : v;
  });
  
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
  db.run(sql, vals);
  
  let lastId;
  try {
    lastId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  } catch { lastId = values.id || values.user_id; }
  
  persistSQLite();
  return { id: lastId, ...values };
}

async function persistSQLite() {
  if (!db) return;
  try {
    const binary = db.export();
    if (!binary || binary.length === 0) return;
    
    await setToIDB('pokevicio_sqlite_v2', binary);
    console.log(`[SQLite] Database persisted successfully (${binary.length} bytes into IndexedDB)`);
  } catch (e) {
    console.error('[SQLite] CRITICAL: Failed to persist database to IndexedDB!', e);
  }
}
