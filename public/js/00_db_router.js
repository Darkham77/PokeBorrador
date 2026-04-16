/**
 * DBRouter - Unified Data Persistence Layer
 * Routes queries to Supabase (Cloud) or SQLite (Local Browser DB).
 */

(function() {
  // --- SQLite Handler Logic (Global Version) ---
  let sqliteDb = null;
  let initPromise = null;

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

  async function getFromIDB(key) {
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

  async function setToIDB(key, val) {
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

  async function initSQLite() {
    if (sqliteDb) return sqliteDb;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        if (typeof window.showLoading === 'function') window.showLoading('Iniciando Base de Datos...');
        console.log('[SQLite] Loading WASM library...');
        const SQL = await window.initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });

        // 1. Intentar cargar desde IndexedDB (Nuevo Sistema)
        let binaryData = await getFromIDB('pokevicio_sqlite_v2');
        
        // 2. Fallback / Migración desde localStorage (Viejo Sistema)
        if (!binaryData) {
          const legacyBase64 = localStorage.getItem('pokevicio_sqlite');
          if (legacyBase64) {
            console.log('[SQLite] Migrating legacy data from localStorage...');
            try {
              const binaryString = window.atob(legacyBase64);
              binaryData = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                binaryData[i] = binaryString.charCodeAt(i);
              }
              // Guardar en el nuevo sistema y limpiar el viejo
              await setToIDB('pokevicio_sqlite_v2', binaryData);
              localStorage.removeItem('pokevicio_sqlite');
            } catch (e) { console.error('[SQLite] Legacy migration failed', e); }
          }
        }

        if (binaryData) {
          sqliteDb = new SQL.Database(binaryData);
          window.isNewDatabase = false;
          console.log('[SQLite] Database loaded from IndexedDB');
        } else {
          sqliteDb = new SQL.Database();
          window.isNewDatabase = true;
          console.log('[SQLite] New database created');
        }

        const tables = [
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
        
        tables.forEach(tableDef => {
          try {
            sqliteDb.run(`CREATE TABLE IF NOT EXISTS ${tableDef};`);
          } catch (e) {
            console.error(`[SQLite] Error creating table: ${tableDef.split(' ')[0]}`, e);
          }
        });

        // Defensive check: Verification of critical tables
        try {
          sqliteDb.run("SELECT 1 FROM daycare_slots LIMIT 1;");
          console.log("[SQLite] Critical tables verified.");
        } catch (schemaErr) {
          console.error("[SQLite] Critical Table verification failed!", schemaErr);
        }
        
        persistSQLite();
        if (typeof window.hideLoading === 'function') window.hideLoading();
        return sqliteDb;
      } catch (err) {
        if (typeof window.hideLoading === 'function') window.hideLoading();
        console.error('[SQLite] Initialization failed:', err);
        throw err;
      }
    })();
    return initPromise;
  }

  async function persistSQLite() {
    if (!sqliteDb) return;
    try {
      const binary = sqliteDb.export();
      await setToIDB('pokevicio_sqlite_v2', binary);
      console.log('[SQLite] Persistence successful (IndexedDB)');
    } catch (e) { console.error('[SQLite] Persistence failed', e); }
  }

  function queryLocal(sql, params = []) {
    if (!sqliteDb) return [];
    const stmt = sqliteDb.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }

  // --- DB Router Core ---
  class DBRouter {
    constructor(realClient) {
      this.realClient = realClient;
      this.isOffline = false;
    }

    from(table) {
      return new ProxyQuery(this, table);
    }

    setOfflineMode(active) {
      this.isOffline = active;
      if (active) initSQLite();
    }

    get auth() {
      if (this.isOffline) {
        return {
          signOut: async () => ({ error: null }),
          signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Offline' } }),
          signUp: async () => ({ data: { user: null }, error: { message: 'Offline' } }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        };
      }
      return this.realClient.auth;
    }
    
    channel(name) {
        if (this.isOffline) return { on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) };
        return this.realClient.channel(name);
    }
    
    async rpc(name, params) {
        if (this.isOffline) {
            console.log(`[Router] Offline RPC: ${name}`, params);
            await initSQLite();

            if (name === 'add_war_points') {
                const { p_week_id, p_map_id, p_faction, p_points } = params;
                const current = queryLocal(`SELECT points FROM war_points WHERE week_id = ? AND map_id = ? AND faction = ?`, [p_week_id, p_map_id, p_faction]);
                const newPts = (current[0]?.points || 0) + p_points;
                sqliteDb.run(`INSERT OR REPLACE INTO war_points (week_id, map_id, faction, points) VALUES (?, ?, ?, ?)`, [p_week_id, p_map_id, p_faction, newPts]);
                await persistSQLite();
                return { data: null, error: null };
            }

            if (name === 'fn_report_passive_battle') {
                const { p_opponent_id, p_result, p_report_data } = params;
                sqliteDb.run(`INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data) VALUES (?, ?, ?, ?)`, 
                    [window.currentUser?.id || 'local_user', p_opponent_id, p_result, JSON.stringify(p_report_data)]);
                await persistSQLite();
                return { data: { success: true }, error: null };
            }

            if (name === 'fn_award_ranked_season_automated' || name === 'fn_award_event_automated') {
                // Simulación de éxito para reclamo de recompensas
                console.log(`[Router] Simulating reward claim for ${name}`);
                return { data: { success: true, message: 'Recompensa reclamada localmente' }, error: null };
            }

            if (name === 'execute_trade') {
                console.log("[Router] Simulating local trade execution");
                return { data: { success: true }, error: null };
            }

            return { data: null, error: { message: 'Offline mode' } };
        }
        return this.realClient.rpc(name, params);
    }
  }

  class ProxyQuery {
    constructor(router, table) {
      this.router = router;
      this.table = table;
      this.chain = [];
    }

    select(cols) { this.chain.push({ type: 'select', args: [cols] }); return this; }
    eq(c, v) { this.chain.push({ type: 'eq', args: [c, v] }); return this; }
    neq(c, v) { this.chain.push({ type: 'neq', args: [c, v] }); return this; }
    gt(c, v) { this.chain.push({ type: 'gt', args: [c, v] }); return this; }
    lt(c, v) { this.chain.push({ type: 'lt', args: [c, v] }); return this; }
    gte(c, v) { this.chain.push({ type: 'gte', args: [c, v] }); return this; }
    lte(c, v) { this.chain.push({ type: 'lte', args: [c, v] }); return this; }
    in(c, arr) { this.chain.push({ type: 'in', args: [c, arr] }); return this; }
    order(c, o) { this.chain.push({ type: 'order', args: [c, o] }); return this; }
    limit(n) { this.chain.push({ type: 'limit', args: [n] }); return this; }
    match(obj) { this.chain.push({ type: 'match', args: [obj] }); return this; }

    upsert(data, opts) {
        this.action = 'upsert';
        this.actionData = data;
        this.actionOpts = opts;
        return this;
    }

    update(data) {
        this.action = 'update';
        this.actionData = data;
        return this;
    }

    delete() {
        this.action = 'delete';
        return this;
    }

    async maybeSingle() { return this.execute('maybeSingle'); }
    async single() { return this.execute('single'); }
    async then(onF, onR) { const res = await this.execute(); return onF ? onF(res) : res; }

    async execute(final = null) {
      if (this.isLocalQuery() && !this.router.isOffline) {
          console.warn(`[Router] Automatic offline mode triggered for ${this.table} due to local_ ID detections.`);
          this.router.setOfflineMode(true);
      }

      if (!this.router.isOffline) {
        try {
          let q = this.router.realClient.from(this.table);
          if (this.action === 'upsert') return await q.upsert(this.actionData, this.actionOpts);
          if (this.action === 'update') {
              for (const s of this.chain) q = q[s.type](...s.args);
              return await q.update(this.actionData);
          }
          if (this.action === 'delete') {
              for (const s of this.chain) q = q[s.type](...s.args);
              return await q.delete();
          }
          
          for (const s of this.chain) q = q[s.type](...s.args);
          const res = final ? await q[final]() : await q;
          if (res.error) throw res.error;
          return res;
        } catch (e) {
          console.warn(`[Router] Online failure in ${this.table}`, e);
          throw e; // Propagar error para que el llamante maneje el reintento
        }
      }
      if (this.action === 'upsert') return this._executeUpsert(this.actionData, this.actionOpts);
      if (this.action === 'update') return this._executeUpdate(this.actionData);
      if (this.action === 'delete') return this._executeDelete();
      return this.executeLocal(final);
    }

    async executeLocal(final = null) {
      await initSQLite();
      let sql = `SELECT * FROM ${this.table}`;
      const where = [];
      const params = [];
      for (const s of this.chain) {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
        if (s.type === 'neq') { where.push(`${s.args[0]} != ?`); params.push(s.args[1]); }
        if (s.type === 'gt') { where.push(`${s.args[0]} > ?`); params.push(s.args[1]); }
        if (s.type === 'lt') { where.push(`${s.args[0]} < ?`); params.push(s.args[1]); }
        if (s.type === 'gte') { where.push(`${s.args[0]} >= ?`); params.push(s.args[1]); }
        if (s.type === 'lte') { where.push(`${s.args[0]} <= ?`); params.push(s.args[1]); }
        if (s.type === 'in') {
          const marks = s.args[1].map(() => '?').join(',');
          where.push(`${s.args[0]} IN (${marks})`);
          params.push(...s.args[1]);
        }
        if (s.type === 'match') {
          for (const k in s.args[0]) {
            where.push(`${k} = ?`);
            params.push(s.args[0][k]);
          }
        }
      }
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      
      // Simplistic order/limit
      for (const s of this.chain) {
        if (s.type === 'order') sql += ` ORDER BY ${s.args[0]} ${s.args[1]?.ascending ? 'ASC' : 'DESC'}`;
        if (s.type === 'limit') sql += ` LIMIT ${s.args[0]}`;
      }

      const data = queryLocal(sql, params);
      
      // Post-process JSON
      data.forEach(row => {
        if (row.save_data && typeof row.save_data === 'string') try { row.save_data = JSON.parse(row.save_data); } catch(e){}
        if (row.team_data && typeof row.team_data === 'string') try { row.team_data = JSON.parse(row.team_data); } catch(e){}
      });

      if (final === 'single') return { data: data[0] || null, error: data.length === 0 ? { message: 'Not found' } : null };
      if (final === 'maybeSingle') return { data: data[0] || null, error: null };
      return { data, error: null };
    }

    isLocalQuery() {
        // Search for local_ in all eq/in/match conditions
        return this.chain.some(s => {
            if (s.type === 'eq') return String(s.args[1]).includes('local_');
            if (s.type === 'in') return s.args[1].some(v => String(v).includes('local_'));
            if (s.type === 'match') return Object.values(s.args[0]).some(v => String(v).includes('local_'));
            return false;
        });
    }

    async _executeUpsert(values, options) {
      const hasLocal = JSON.stringify(values).includes('local_');
      if (hasLocal && !this.router.isOffline) this.router.setOfflineMode(true);

      if (!this.router.isOffline) {
        try {
          const res = await this.router.realClient.from(this.table).upsert(values, options);
          if (res.error) throw res.error;
          return res;
        } catch (e) {
          console.warn(`[Router] Online upsert failure in ${this.table}`, e);
          throw e; 
        }
      }
      await initSQLite();
      const rows = Array.isArray(values) ? values : [values];
      for (const row of rows) {
          const cols = Object.keys(row);
          const marks = cols.map(() => '?').join(',');
          const vals = cols.map(c => typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]);
          sqliteDb.run(`INSERT OR REPLACE INTO ${this.table} (${cols.join(',')}) VALUES (${marks})`, vals);
      }
      await persistSQLite();
      return { data: values, error: null };
    }

    async _executeUpdate(values) {
        const hasLocal = JSON.stringify(values).includes('local_') || this.isLocalQuery();
        if (hasLocal && !this.router.isOffline) this.router.setOfflineMode(true);

        if (!this.router.isOffline) {
            try {
              let q = this.router.realClient.from(this.table).update(values);
              for (const s of this.chain) q = q[s.type](...s.args);
              const res = await q;
              if (res.error) throw res.error;
              return res;
            } catch (e) {
              console.warn(`[Router] Online update failure in ${this.table}`, e);
              throw e;
            }
        }
        await initSQLite();
        // Update is complex locally, simplified for now:
        const setClause = Object.keys(values).map(k => `${k} = ?`).join(',');
        const params = Object.values(values).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
        
        const where = [];
        for (const s of this.chain) {
            if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
            if (s.type === 'match') {
                for (const k in s.args[0]) {
                    where.push(`${k} = ?`);
                    params.push(s.args[0][k]);
                }
            }
        }
        let sql = `UPDATE ${this.table} SET ${setClause}`;
        if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
        sqliteDb.run(sql, params);
        await persistSQLite();
        return { data: values, error: null };
    }

    async _executeDelete() {
        if (this.isLocalQuery() && !this.router.isOffline) this.router.setOfflineMode(true);

        if (!this.router.isOffline) {
            try {
              let q = this.router.realClient.from(this.table).delete();
              for (const s of this.chain) q = q[s.type](...s.args);
              const res = await q;
              if (res.error) throw res.error;
              return res;
            } catch (e) {
              console.warn(`[Router] Online delete failure in ${this.table}`, e);
              throw e;
            }
        }
        await initSQLite();
        const params = [];
        const where = [];
        for (const s of this.chain) {
            if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
        }
        let sql = `DELETE FROM ${this.table}`;
        if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
        sqliteDb.run(sql, params);
        await persistSQLite();
        return { error: null };
    }
  }

  window.DBRouter = DBRouter;
})();
