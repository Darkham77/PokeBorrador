import { initSQLite, queryLocal, execLocal, insertLocal } from './sqliteHandler';

/**
 * Supabase Proxy Logic
 * Intercepts Supabase calls and redirects them to SQLite if the primary server fails.
 */

// Simple local event bus for chat/realtime simulation
const localEvents = new EventTarget();

class SupabaseProxy {
  constructor(realClient) {
    this.realClient = realClient;
    this.isOffline = false;
    this._notifiedFailure = false;
  }

  from(table) {
    return new ProxyQuery(this, table);
  }

  async setOfflineMode(active) {
    console.log(`[Proxy] Manual Mode Switch: ${active ? 'LOCAL' : 'ONLINE'}`);
    this.isOffline = active;
    window.isOfflineMode = active;
    if (active) await initSQLite(); // Ensure SQLite is ready
  }

  notifyServerFailure() {
    if (this._notifiedFailure || this.isOffline) return;
    this._notifiedFailure = true;
    console.warn('[Proxy] Server failure detected. Showing banner.');
    if (typeof window.notify === 'function') {
      window.notify('El servidor Online no responde. Usando base de datos Local temporalmente.', '⚠️');
    }
  }

  get auth() {
    return this.realClient.auth;
  }

  channel(name) {
    if (this.isOffline) {
      console.log(`[Proxy] Offline: Mocking channel ${name}`);
      return {
        on: (type, filter, callback) => {
          // If 2 args (type, callback)
          const cb = typeof filter === 'function' ? filter : callback;
          localEvents.addEventListener('broadcast', (e) => {
            const { table, data } = e.detail;
            cb({ new: data, table });
          });
          return { subscribe: () => ({}) };
        },
        on_postgres_changes: function(opts, cb) { return this.on('postgres_changes', opts, cb); },
        subscribe: () => ({})
      };
    }
    return this.realClient.channel(name);
  }

  async rpc(name, params) {
    if (this.isOffline) {
      console.warn(`[Proxy] Offline: RPC ${name} not supported locally.`);
      // If it's the execute_trade RPC, we might want to simulate success for local-only players
      // but that requires complex logic. For now, we report error.
      return { data: null, error: { message: 'Offline mode' } };
    }
    return this.realClient.rpc(name, params);
  }
}

class ProxyQuery {
  constructor(proxy, table) {
    this.proxy = proxy;
    this.table = table;
    this.queryChain = []; // { type, args }
  }

  get client() { return this.proxy.realClient; }
  get isOffline() { return this.proxy.isOffline; }

  select(columns, options = {}) {
    this.queryChain.push({ type: 'select', args: [columns, options] });
    return this;
  }

  eq(col, val) {
    this.queryChain.push({ type: 'eq', args: [col, val] });
    return this;
  }
  
  neq(col, val) {
    this.queryChain.push({ type: 'neq', args: [col, val] });
    return this;
  }

  gt(col, val) {
    this.queryChain.push({ type: 'gt', args: [col, val] });
    return this;
  }

  gte(col, val) {
    this.queryChain.push({ type: 'gte', args: [col, val] });
    return this;
  }

  lt(col, val) {
    this.queryChain.push({ type: 'lt', args: [col, val] });
    return this;
  }

  lte(col, val) {
    this.queryChain.push({ type: 'lte', args: [col, val] });
    return this;
  }

  in(col, valArray) {
    this.queryChain.push({ type: 'in', args: [col, valArray] });
    return this;
  }

  ilike(col, val) {
    this.queryChain.push({ type: 'ilike', args: [col, val] });
    return this;
  }

  or(filter) {
    this.queryChain.push({ type: 'or', args: [filter] });
    return this;
  }

  order(col, opts) {
    this.queryChain.push({ type: 'order', args: [col, opts] });
    return this;
  }

  limit(num) {
    this.queryChain.push({ type: 'limit', args: [num] });
    return this;
  }

  async maybeSingle() {
    return this.execute('maybeSingle');
  }

  async single() {
    return this.execute('single');
  }

  async then(onFulfilled, onRejected) {
    try {
      const result = await this.execute();
      return onFulfilled ? onFulfilled(result) : result;
    } catch (err) {
      return onRejected ? onRejected(err) : Promise.reject(err);
    }
  }

  async execute(finalMethod = null) {
    if (!this.isOffline) {
      try {
        let q = this.client.from(this.table);
        for (const step of this.queryChain) {
          q = q[step.type](...step.args);
        }
        const result = finalMethod ? await q[finalMethod]() : await q;
        if (result.error) throw result.error;
        return result;
      } catch (e) {
        console.warn(`[Proxy] Cloud error in ${this.table}, switching to local:`, e);
        this.proxy.notifyServerFailure();
        this.proxy.isOffline = true;
        window.isOfflineMode = true; 
      }
    }
    return this.executeLocal(finalMethod);
  }

  async executeLocal(finalMethod) {
    let sql = `SELECT * FROM ${this.table}`;
    const params = [];
    const where = [];

    const selectStep = this.queryChain.find(s => s.type === 'select');
    const selectOptions = selectStep?.args[1] || {};

    for (const step of this.queryChain) {
      switch (step.type) {
        case 'eq':
          where.push(`${step.args[0]} = ?`);
          params.push(step.args[1]);
          break;
        case 'neq':
          where.push(`${step.args[0]} != ?`);
          params.push(step.args[1]);
          break;
        case 'gt':
          where.push(`${step.args[0]} > ?`);
          params.push(step.args[1]);
          break;
        case 'gte':
          where.push(`${step.args[0]} >= ?`);
          params.push(step.args[1]);
          break;
        case 'lt':
          where.push(`${step.args[0]} < ?`);
          params.push(step.args[1]);
          break;
        case 'lte':
          where.push(`${step.args[0]} <= ?`);
          params.push(step.args[1]);
          break;
        case 'in':
          const placeholders = step.args[1].map(() => '?').join(', ');
          where.push(`${step.args[0]} IN (${placeholders})`);
          params.push(...step.args[1]);
          break;
        case 'ilike':
          where.push(`${step.args[0]} LIKE ?`);
          params.push(step.args[1].replace(/%/g, '%').replace(/\*/g, '%'));
          break;
        case 'or':
          console.warn(`[Proxy] Local OR filter not fully implemented, skipping: ${step.args[0]}`);
          break;
      }
    }

    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;

    const orderStep = this.queryChain.find(s => s.type === 'order');
    if (orderStep) {
      sql += ` ORDER BY ${orderStep.args[0]} ${orderStep.args[1]?.ascending ? 'ASC' : 'DESC'}`;
    }

    const limitStep = this.queryChain.find(s => s.type === 'limit');
    if (limitStep) sql += ` LIMIT ${limitStep.args[0]}`;

    // Handle count and head options
    let count = null;
    if (selectOptions.count) {
      let countSql = `SELECT COUNT(*) as count FROM ${this.table}`;
      if (where.length > 0) countSql += ` WHERE ${where.join(' AND ')}`;
      const countRes = queryLocal(countSql, params);
      count = countRes[0]?.count || 0;
    }

    let data = [];
    if (!selectOptions.head) {
      data = queryLocal(sql, params);
      data = data.map(row => {
        const newRow = { ...row };
        const jsonCols = [
          'config', 'data', 'schedule', 'save_data', 
          'offer_pokemon', 'offer_items', 'request_pokemon', 'request_items',
          'team_data', 'gymProgress', 'lastGymWins', 'lastGymAttempts',
          'stats', 'pvpStats', 'warDailyCap', 'warDailyCoins', 'warMyPtsLocal'
        ];
        jsonCols.forEach(k => {
          if (newRow[k] && typeof newRow[k] === 'string') {
            try { newRow[k] = JSON.parse(newRow[k]); } catch(e) {}
          }
        });
        return newRow;
      });
    }

    const isSingle = finalMethod === 'single' || finalMethod === 'maybeSingle';
    const resultData = isSingle ? (data[0] || null) : data;
    let error = null;

    if (finalMethod === 'single' && !resultData) {
      error = { message: 'JSON object requested, but no data was returned', code: 'PGRST116' };
    }

    return {
      data: resultData,
      count,
      error
    };
  }

  async insert(values) {
    if (!this.isOffline) {
      try {
        const res = await this.client.from(this.table).insert(values);
        if (res.error) throw res.error;
        return res;
      } catch (e) {
        console.warn(`[Proxy] Insert error in ${this.table}, switching to local:`, e);
        this.proxy.notifyServerFailure();
        this.proxy.isOffline = true;
      }
    }

    const data = insertLocal(this.table, values);
    localEvents.dispatchEvent(new CustomEvent('broadcast', { detail: { table: this.table, data } }));

    return {
      select: () => ({
        single: () => ({ data, error: null })
      }),
      data,
      error: null
    };
  }

  async upsert(values, options = {}) {
    if (!this.isOffline) {
      try {
        const res = await this.client.from(this.table).upsert(values, options);
        if (res.error) throw res.error;
        return res;
      } catch (e) {
        console.warn(`[Proxy] Upsert error in ${this.table}, switching to local:`, e);
        this.proxy.notifyServerFailure();
        this.proxy.isOffline = true;
        window.isOfflineMode = true;
      }
    }

    // Local Upsert (handled via insertLocal which uses INSERT OR REPLACE)
    const data = insertLocal(this.table, values);
    return { data, error: null };
  }

  async update(values) {
    if (!this.isOffline) {
      try {
        const res = await this.client.from(this.table).update(values);
        for (const step of this.queryChain) {
          res[step.type](...step.args);
        }
        const result = await res;
        if (result.error) throw result.error;
        return result;
      } catch (e) {
        console.warn(`[Proxy] Update error in ${this.table}, switching to local:`, e);
        this.proxy.notifyServerFailure();
        this.proxy.isOffline = true;
      }
    }

    // Local update fallback: for now we use a generic SQL update if where is simple
    let sql = `UPDATE ${this.table} SET `;
    const setClause = [];
    const params = [];
    
    Object.keys(values).forEach(k => {
      setClause.push(`${k} = ?`);
      const v = values[k];
      params.push(typeof v === 'object' ? JSON.stringify(v) : v);
    });
    sql += setClause.join(', ');

    const where = [];
    for (const step of this.queryChain) {
      if (step.type === 'eq') {
        where.push(`${step.args[0]} = ?`);
        params.push(step.args[1]);
      }
    }
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;

    execLocal(sql, params);

    return { data: null, error: null };
  }

  async delete() {
    if (!this.isOffline) {
      try {
        const res = await this.client.from(this.table).delete();
        for (const step of this.queryChain) {
          res[step.type](...step.args);
        }
        const result = await res;
        if (result.error) throw result.error;
        return result;
      } catch (e) {
        console.warn(`[Proxy] Delete error in ${this.table}, switching to local:`, e);
        this.proxy.notifyServerFailure();
        this.proxy.isOffline = true;
      }
    }

    let sql = `DELETE FROM ${this.table}`;
    const where = [];
    const params = [];
    for (const step of this.queryChain) {
      if (step.type === 'eq') {
        where.push(`${step.args[0]} = ?`);
        params.push(step.args[1]);
      }
    }
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    
    execLocal(sql, params);
    return { error: null };
  }
}

export function createResilientClient(realClient) {
  return new SupabaseProxy(realClient);
}

export const sb = createResilientClient(null); 
export default SupabaseProxy;
