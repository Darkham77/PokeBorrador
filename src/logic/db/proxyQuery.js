/**
 * src/logic/db/proxyQuery.js
 * Chainable Query Builder for SQLite that mimics Supabase/PostgREST API.
 */
import { initSQLite, queryLocal, getRawSqlite, persistSQLite } from './sqliteEngine';

export class ProxyQuery {
  constructor(router, table) {
    this.router = router;
    this.table = table;
    this.chain = [];
    this.action = 'select'; // select, upsert, update, delete
    this.actionData = null;
    this.actionOpts = null;
  }

  select(cols = '*') { this.chain.push({ type: 'select', args: [cols] }); return this; }
  eq(c, v) { this.chain.push({ type: 'eq', args: [c, v] }); return this; }
  neq(c, v) { this.chain.push({ type: 'neq', args: [c, v] }); return this; }
  gt(c, v) { this.chain.push({ type: 'gt', args: [c, v] }); return this; }
  lt(c, v) { this.chain.push({ type: 'lt', args: [c, v] }); return this; }
  gte(c, v) { this.chain.push({ type: 'gte', args: [c, v] }); return this; }
  lte(c, v) { this.chain.push({ type: 'lte', args: [c, v] }); return this; }
  in(c, arr) { this.chain.push({ type: 'in', args: [c, arr] }); return this; }
  order(c, { ascending = false } = {}) { this.chain.push({ type: 'order', args: [c, { ascending }] }); return this; }
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
  
  // compatibility with 'await q'
  async then(onFulfilled, onRejected) {
    try {
      const res = await this.execute();
      return onFulfilled ? onFulfilled(res) : res;
    } catch (err) {
      if (onRejected) return onRejected(err);
      throw err;
    }
  }

  async execute(final = null) {
    // If router is Online, use Supabase
    if (this.router.mode === 'online') {
      try {
        let q = this.router.realClient.from(this.table);
        
        if (this.action === 'upsert') return await q.upsert(this.actionData, this.actionOpts);
        
        if (this.action === 'update') {
          this.chain.forEach(s => { q = q[s.type](...s.args); });
          return await q.update(this.actionData);
        }
        
        if (this.action === 'delete') {
          this.chain.forEach(s => { q = q[s.type](...s.args); });
          return await q.delete();
        }

        // Default: select
        this.chain.forEach(s => { q = q[s.type](...s.args); });
        return final ? await q[final]() : await q;
      } catch (err) {
        console.error(`[DBRouter] Online query failed for table ${this.table}:`, err);
        // Special case: if it's a network error, the AuthStore should handle a generic 'online_error' event
        throw err;
      }
    }

    // Otherwise, use SQLite
    return this.executeLocal(final);
  }

  async executeLocal(final = null) {
    const sqliteDb = await initSQLite();
    
    if (this.action === 'upsert') return this._executeLocalUpsert(sqliteDb);
    if (this.action === 'update') return this._executeLocalUpdate(sqliteDb);
    if (this.action === 'delete') return this._executeLocalDelete(sqliteDb);

    // Default: select
    let sql = `SELECT * FROM ${this.table}`; // Simplistic, cols not used yet
    const where = [];
    const params = [];

    this.chain.forEach(s => {
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
        Object.entries(s.args[0]).forEach(([k, v]) => {
          where.push(`${k} = ?`);
          params.push(v);
        });
      }
    });

    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    
    // Order and Limit
    this.chain.forEach(s => {
      if (s.type === 'order') sql += ` ORDER BY ${s.args[0]} ${s.args[1].ascending ? 'ASC' : 'DESC'}`;
      if (s.type === 'limit') sql += ` LIMIT ${s.args[0]}`;
    });

    const data = queryLocal(sql, params);
    
    // Auto-parse JSON fields (known to be JSON in this project)
    data.forEach(row => {
      if (row.save_data && typeof row.save_data === 'string') try { row.save_data = JSON.parse(row.save_data); } catch(e){}
      if (row.team_data && typeof row.team_data === 'string') try { row.team_data = JSON.parse(row.team_data); } catch(e){}
      if (row.data && typeof row.data === 'string') try { row.data = JSON.parse(row.data); } catch(e){}
    });

    if (final === 'single') return { data: data[0] || null, error: data.length === 0 ? { message: 'Not found' } : null };
    if (final === 'maybeSingle') return { data: data[0] || null, error: null };
    return { data, error: null };
  }

  async _executeLocalUpsert(sqliteDb) {
    const values = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
    for (const row of values) {
      const cols = Object.keys(row);
      const marks = cols.map(() => '?').join(',');
      const vals = cols.map(c => typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]);
      sqliteDb.run(`INSERT OR REPLACE INTO ${this.table} (${cols.join(',')}) VALUES (${marks})`, vals);
    }
    await persistSQLite();
    return { data: this.actionData, error: null };
  }

  async _executeLocalUpdate(sqliteDb) {
    const setClause = Object.keys(this.actionData).map(k => `${k} = ?`).join(',');
    const params = Object.values(this.actionData).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
    
    const where = [];
    this.chain.forEach(s => {
      if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
      if (s.type === 'match') {
        Object.entries(s.args[0]).forEach(([k, v]) => {
          where.push(`${k} = ?`); params.push(v);
        });
      }
    });

    let sql = `UPDATE ${this.table} SET ${setClause}`;
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    sqliteDb.run(sql, params);
    await persistSQLite();
    return { data: this.actionData, error: null };
  }

  async _executeLocalDelete(sqliteDb) {
    const params = [];
    const where = [];
    this.chain.forEach(s => {
      if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
    });
    
    let sql = `DELETE FROM ${this.table}`;
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    sqliteDb.run(sql, params);
    await persistSQLite();
    return { error: null };
  }
}
