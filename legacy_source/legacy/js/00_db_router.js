/**
 * DBRouter - Unified Data Persistence Layer
 * Routes queries to Supabase (Cloud) or SQLite (Local Browser DB).
 */

(function() {
  // --- SQLite Handler Logic (Global Version) ---
  let sqliteDb = null;
  let initPromise = null;

  async function initSQLite() {
    if (sqliteDb) return sqliteDb;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        console.log('[SQLite] Loading WASM library...');
        const SQL = await window.initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });

        const savedData = localStorage.getItem('pokevicio_sqlite');
        if (savedData) {
          try {
            const binaryString = window.atob(savedData);
            const uint8Array = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }
            sqliteDb = new SQL.Database(uint8Array);
            console.log('[SQLite] Database loaded from localStorage');
          } catch (e) {
            console.error('[SQLite] Failed to load, creating new one', e);
            sqliteDb = new SQL.Database();
          }
        } else {
          sqliteDb = new SQL.Database();
          console.log('[SQLite] New database created');
        }

        const schema = `
          CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, username TEXT, email TEXT, trainer_level INTEGER DEFAULT 1, player_class TEXT, faction TEXT);
          CREATE TABLE IF NOT EXISTS game_saves (user_id TEXT PRIMARY KEY, save_data TEXT, updated_at TEXT);
          CREATE TABLE IF NOT EXISTS friendships (id INTEGER PRIMARY KEY AUTOINCREMENT, requester_id TEXT, addressee_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')));
          CREATE TABLE IF NOT EXISTS battle_invites (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, opponent_id TEXT, status TEXT, created_at TEXT DEFAULT (datetime('now')));
          CREATE TABLE IF NOT EXISTS ranked_queue (user_id TEXT PRIMARY KEY, elo INTEGER DEFAULT 1000, status TEXT, created_at TEXT DEFAULT (datetime('now')));
          CREATE TABLE IF NOT EXISTS global_chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id TEXT, sender_name TEXT, message TEXT, created_at TEXT DEFAULT (datetime('now')));
          CREATE TABLE IF NOT EXISTS passive_teams (user_id TEXT PRIMARY KEY, team_data TEXT, updated_at TEXT);
        `;
        sqliteDb.run(schema);
        persistSQLite();
        return sqliteDb;
      } catch (err) {
        console.error('[SQLite] Initialization failed:', err);
        throw err;
      }
    })();
    return initPromise;
  }

  function persistSQLite() {
    if (!sqliteDb) return;
    try {
      const binary = sqliteDb.export();
      let binaryString = "";
      const chunkSize = 8192;
      for (let i = 0; i < binary.length; i += chunkSize) {
        binaryString += String.fromCharCode.apply(null, binary.subarray(i, i + chunkSize));
      }
      localStorage.setItem('pokevicio_sqlite', window.btoa(binaryString));
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
        if (this.isOffline) return { data: null, error: { message: 'Offline mode' } };
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
          
          for (const s of this.chain) q = q[s.type](...s.args);
          const res = final ? await q[final]() : await q;
          if (res.error) throw res.error;
          return res;
        } catch (e) {
          console.warn(`[Router] Online failure in ${this.table}, switching to LOCAL`, e);
          this.router.setOfflineMode(true);
        }
      }
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

    async upsert(values, options) {
      const hasLocal = JSON.stringify(values).includes('local_');
      if (hasLocal && !this.router.isOffline) this.router.setOfflineMode(true);

      if (!this.router.isOffline) {
        try {
          const res = await this.router.realClient.from(this.table).upsert(values, options);
          if (res.error) throw res.error;
          return res;
        } catch (e) { this.router.setOfflineMode(true); }
      }
      await initSQLite();
      const rows = Array.isArray(values) ? values : [values];
      for (const row of rows) {
          const cols = Object.keys(row);
          const marks = cols.map(() => '?').join(',');
          const vals = cols.map(c => typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]);
          sqliteDb.run(`INSERT OR REPLACE INTO ${this.table} (${cols.join(',')}) VALUES (${marks})`, vals);
      }
      persistSQLite();
      return { data: values, error: null };
    }

    async update(values) {
        const hasLocal = JSON.stringify(values).includes('local_') || this.isLocalQuery();
        if (hasLocal && !this.router.isOffline) this.router.setOfflineMode(true);

        if (!this.router.isOffline) {
            try {
              let q = this.router.realClient.from(this.table).update(values);
              for (const s of this.chain) q = q[s.type](...s.args);
              const res = await q;
              if (res.error) throw res.error;
              return res;
            } catch (e) { this.router.setOfflineMode(true); }
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
        persistSQLite();
        return { data: values, error: null };
    }

    async delete() {
        if (this.isLocalQuery() && !this.router.isOffline) this.router.setOfflineMode(true);

        if (!this.router.isOffline) {
            try {
              let q = this.router.realClient.from(this.table).delete();
              for (const s of this.chain) q = q[s.type](...s.args);
              const res = await q;
              if (res.error) throw res.error;
              return res;
            } catch (e) { this.router.setOfflineMode(true); }
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
        persistSQLite();
        return { error: null };
    }
  }

  window.DBRouter = DBRouter;
})();
