/**
 * SQLite Handler for Browser-Side Emulation
 * Uses sql.js (WebAssembly) to provide a local SQL database.
 * Persists to localStorage to survive page refreshes.
 */

let db = null;
let initPromise = null;

export async function initSQLite() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const SQL = await window.initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });

      const savedData = localStorage.getItem('pokevicio_sqlite');
      if (savedData) {
        try {
          let uint8Array;
          if (savedData.startsWith('[')) {
            uint8Array = new Uint8Array(JSON.parse(savedData));
          } else {
            // Robust Base64 to Uint8Array (Synchronous for stability)
            const binaryString = window.atob(savedData);
            uint8Array = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
          }
          db = new SQL.Database(uint8Array);
          console.log('[SQLite] Database loaded from localStorage');
        } catch (e) {
          console.error('[SQLite] Failed to load saved database, creating new one', e);
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
        console.log('[SQLite] New database created');
      }

      // Rest of the logic (Schema, etc.)
  const schema = `
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT,
      created_at TEXT,
      current_session_id TEXT,
      nick_style TEXT,
      avatar_style TEXT,
      trainer_level INTEGER DEFAULT 1,
      player_class TEXT,
      faction TEXT
    );

    CREATE TABLE IF NOT EXISTS game_saves (
      user_id TEXT PRIMARY KEY,
      save_data TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id TEXT,
      addressee_id TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS battle_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT,
      opponent_id TEXT,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trade_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS passive_teams (
      user_id TEXT PRIMARY KEY,
      team_data TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ranked_queue (
      user_id TEXT PRIMARY KEY,
      elo INTEGER DEFAULT 1000,
      status TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      icon TEXT,
      type TEXT,
      config TEXT,
      is_active BOOLEAN,
      start_date TEXT,
      end_date TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT,
      sender_name TEXT,
      message TEXT,
      type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS global_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT,
      sender_name TEXT,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id TEXT,
      seller_name TEXT,
      listing_type TEXT,
      data TEXT,
      price INTEGER,
      status TEXT,
      buyer_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ranked_rules_config (
      id TEXT PRIMARY KEY,
      season_name TEXT,
      config TEXT
    );

    CREATE TABLE IF NOT EXISTS war_dominance (
      id TEXT PRIMARY KEY,
      map_id TEXT,
      week_id TEXT,
      winner_faction TEXT,
      faction TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS war_points (
      map_id TEXT,
      week_id TEXT,
      faction TEXT,
      points INTEGER DEFAULT 0,
      updated_at TEXT,
      PRIMARY KEY (map_id, week_id, faction)
    );

    CREATE TABLE IF NOT EXISTS war_user_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        map_id TEXT,
        week_id TEXT,
        points INTEGER DEFAULT 0,
        faction TEXT,
        updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS guardian_captures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        map_id TEXT,
        capture_date TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS eggs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT,
        egg_id TEXT,
        steps_remaining INTEGER DEFAULT 1000,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS awards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        winner_id TEXT,
        event_id INTEGER,
        award_type TEXT,
        data TEXT,
        claimed BOOLEAN DEFAULT 0,
        awarded_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competition_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        user_id TEXT,
        score INTEGER,
        data TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competition_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        winner_id TEXT,
        winners TEXT, -- JSON
        ended_at TEXT, -- Added for match
        data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS war_factions (
        user_id TEXT PRIMARY KEY,
        faction TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS war_defenders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        map_id TEXT,
        pokemon_uid TEXT,
        pokemon_data TEXT, -- JSON
        wins_count INTEGER DEFAULT 0,
        week_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
    );
  `;

      db.run(schema);
      ensureSchemaMigrations(db);
      seedSQLite();
      persistSQLite();

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
 * Ensures that existing local databases get new columns without data loss.
 */
function ensureSchemaMigrations(db) {
  const migrations = [
    { table: 'awards', column: 'winner_id', type: 'TEXT' },
    { table: 'awards', column: 'awarded_at', type: 'TEXT' },
    { table: 'guardian_captures', column: 'capture_date', type: 'TEXT' },
    { table: 'war_dominance', column: 'week_id', type: 'TEXT' },
    { table: 'war_dominance', column: 'winner_faction', type: 'TEXT' },
    { table: 'war_points', column: 'week_id', type: 'TEXT' },
    { table: 'competition_results', column: 'ended_at', type: 'TEXT' },
    { table: 'competition_results', column: 'winners', type: 'TEXT' }
  ];

  migrations.forEach(m => {
    try {
      const info = db.exec(`PRAGMA table_info(${m.table})`);
      const exists = info[0].values.some(row => row[1] === m.column);
      if (!exists) {
        console.log(`[SQLite Migration] Adding column ${m.column} to ${m.table}`);
        db.run(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
      }
    } catch (e) {
      console.warn(`[SQLite Migration] Failed to migrate ${m.table}.${m.column}:`, e);
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
      'current', 'Temporada Local 1', JSON.stringify({ min_level: 5, max_level: 100 })
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

export function queryLocal(sql, params = []) {
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
    return [];
  }
}

export function execLocal(sql, params = []) {
  if (!db) return;
  db.run(sql, params);
  persistSQLite();
}

export function insertLocal(table, values) {
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
  } catch(e) { lastId = values.id || values.user_id; }
  
  persistSQLite();
  return { id: lastId, ...values };
}

function persistSQLite() {
  if (!db) return;
  try {
    const binary = db.export();
    if (!binary || binary.length === 0) {
      console.warn('[SQLite] Database export returned empty data. Skipping persistence.');
      return;
    }
    
    // Robust Synchronous Base64 conversion (Prevents race conditions on refresh)
    // Using chunks to avoid stack limits while maintaining high performance
    let binaryString = "";
    const chunkSize = 8192;
    for (let i = 0; i < binary.length; i += chunkSize) {
      binaryString += String.fromCharCode.apply(null, binary.subarray(i, i + chunkSize));
    }
    const base64 = window.btoa(binaryString);
    
    localStorage.setItem('pokevicio_sqlite', base64);
    console.log(`[SQLite] Database persisted successfully (${binary.length} bytes)`);
  } catch (e) {
    console.error('[SQLite] CRITICAL: Failed to persist database to localStorage!', e);
  }
}
