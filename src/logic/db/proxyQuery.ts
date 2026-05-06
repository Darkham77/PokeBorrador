
import { initSQLite, queryLocal, persistSQLite } from './sqliteEngine';
import type { DBRouter } from './dbRouter';
import type { DBResponse, ProxyQueryChainItem } from '@/types/database';

/**
 * Chainable Query Builder for SQLite that mimics Supabase/PostgREST API.
 */

export class ProxyQuery {
  router: DBRouter;
  table: string;
  chain: ProxyQueryChainItem[];
  action: 'select' | 'upsert' | 'update' | 'delete' | 'insert';
  actionData: any;
  actionOpts: any;

  constructor(router: DBRouter, table: string) {
    this.router = router;
    this.table = table;
    this.chain = [];
    this.action = 'select'; // select, upsert, update, delete
    this.actionData = null;
    this.actionOpts = null;
  }

  select(cols: string = '*') { this.chain.push({ type: 'select', args: [cols] }); return this; }
  eq(c: string, v: any) { this.chain.push({ type: 'eq', args: [c, v] }); return this; }
  neq(c: string, v: any) { this.chain.push({ type: 'neq', args: [c, v] }); return this; }
  gt(c: string, v: any) { this.chain.push({ type: 'gt', args: [c, v] }); return this; }
  lt(c: string, v: any) { this.chain.push({ type: 'lt', args: [c, v] }); return this; }
  gte(c: string, v: any) { this.chain.push({ type: 'gte', args: [c, v] }); return this; }
  lte(c: string, v: any) { this.chain.push({ type: 'lte', args: [c, v] }); return this; }
  in(c: string, arr: any[]) { this.chain.push({ type: 'in', args: [c, arr] }); return this; }
  is(c: string, v: any) { this.chain.push({ type: 'is', args: [c, v] }); return this; }
  or(c: string) { this.chain.push({ type: 'or', args: [c] }); return this; }
  order(c: string, { ascending = false } = {}) { this.chain.push({ type: 'order', args: [c, { ascending }] }); return this; }
  limit(n: number) { this.chain.push({ type: 'limit', args: [n] }); return this; }
  match(obj: Record<string, any>) { this.chain.push({ type: 'match', args: [obj] }); return this; }

  upsert(data: any, opts?: any) {
    this.action = 'upsert';
    this.actionData = data;
    this.actionOpts = opts;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  async maybeSingle(): Promise<DBResponse> { return this.execute('maybeSingle'); }
  async single(): Promise<DBResponse> { return this.execute('single'); }
  
  // compatibility with 'await q'
  async then(onFulfilled?: (value: DBResponse) => any, onRejected?: (reason: any) => any): Promise<any> {
    try {
      const res = await this.execute();
      return onFulfilled ? onFulfilled(res) : res;
    } catch (err) {
      if (onRejected) return onRejected(err);
      throw err;
    }
  }

  async execute(final: 'single' | 'maybeSingle' | null = null): Promise<DBResponse> {
    // If router is Online, use Supabase
    if (this.router.mode === 'online') {
      const client = this.router.realClient;
      if (!client) throw new Error('[DBRouter] Online client not available.');

      try {
        let q: any = client.from(this.table);
        
        if (this.action === 'upsert') return await q.upsert(this.actionData, this.actionOpts);
        if (this.action === 'insert') return await q.insert(this.actionData);
        
        if (this.action === 'update') {
          q = q.update(this.actionData);
          this.chain.forEach(s => { q = q[s.type](...s.args); });
          return await q;
        }
        
        if (this.action === 'delete') {
          q = q.delete();
          this.chain.forEach(s => { q = q[s.type](...s.args); });
          return await q;
        }

        // Default: select
        this.chain.forEach(s => { q = q[s.type](...s.args); });
        return final ? await q[final]() : await q;
      } catch (err: any) {
        console.error(`[DBRouter] Online query failed for table ${this.table}:`, err);
        
        // Detect network errors (fetch failures)
        const errMsg = err.message?.toLowerCase() || '';
        if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('failed to fetch')) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-connection-error'));
          }
        }
        
        throw err;
      }
    }

    // Otherwise, use SQLite
    return this.executeLocal(final);
  }

  async executeLocal(final: 'single' | 'maybeSingle' | null = null): Promise<DBResponse> {
    try {
      const sqliteDb = await initSQLite();
      
      if (this.action === 'upsert') return await this._executeLocalUpsert(sqliteDb);
      if (this.action === 'insert') return await this._executeLocalUpsert(sqliteDb); // Reusing upsert for simplicity in local mode
      if (this.action === 'update') return await this._executeLocalUpdate(sqliteDb);
      if (this.action === 'delete') return await this._executeLocalDelete(sqliteDb);

      // Default: select
      let sql = `SELECT * FROM ${this.table}`; // Simplistic, cols not used yet
      const where: string[] = [];
      const params: any[] = [];

      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
        if (s.type === 'neq') { where.push(`${s.args[0]} != ?`); params.push(s.args[1]); }
        if (s.type === 'gt') { where.push(`${s.args[0]} > ?`); params.push(s.args[1]); }
        if (s.type === 'lt') { where.push(`${s.args[0]} < ?`); params.push(s.args[1]); }
        if (s.type === 'gte') { where.push(`${s.args[0]} >= ?`); params.push(s.args[1]); }
        if (s.type === 'lte') { where.push(`${s.args[0]} <= ?`); params.push(s.args[1]); }
        if (s.type === 'in') {
          const marks = (s.args[1] as any[]).map(() => '?').join(',');
          where.push(`${s.args[0]} IN (${marks})`);
          params.push(...s.args[1]);
        }
        if (s.type === 'is') {
          if (s.args[1] === null) where.push(`${s.args[0]} IS NULL`);
          else { where.push(`${s.args[0]} IS ?`); params.push(s.args[1]); }
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

      const data = await queryLocal(sql, params);
      
      // Auto-parse JSON fields (known to be JSON in this project)
      data.forEach((row: any) => {
        if (row.save_data && typeof row.save_data === 'string') try { row.save_data = JSON.parse(row.save_data); } catch(_e){ /* ignore */ }
        if (row.team_data && typeof row.team_data === 'string') try { row.team_data = JSON.parse(row.team_data); } catch(_e){ /* ignore */ }
        if (row.data && typeof row.data === 'string') try { row.data = JSON.parse(row.data); } catch(_e){ /* ignore */ }
        if (row.config && typeof row.config === 'string') try { row.config = JSON.parse(row.config); } catch(_e){ /* ignore */ }
        if (row.schedule && typeof row.schedule === 'string') try { row.schedule = JSON.parse(row.schedule); } catch(_e){ /* ignore */ }
      });

      if (final === 'single') return { data: data[0] || null, error: data.length === 0 ? { message: 'Not found' } : null };
      if (final === 'maybeSingle') return { data: data[0] || null, error: null };
      return { data, error: null };
    } catch (e) {
      console.error(`[ProxyQuery] executeLocal critical failure:`, e);
      return { data: null, error: e };
    }
  }

  async _executeLocalUpsert(sqliteDb: any): Promise<DBResponse> {
    try {
      const values = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      for (const row of values) {
        const cols = Object.keys(row);
        const marks = cols.map(() => '?').join(',');
        const vals = cols.map(c => typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]);
        sqliteDb.run(`INSERT OR REPLACE INTO ${this.table} (${cols.join(',')}) VALUES (${marks})`, vals);
      }
      await persistSQLite();
      return { data: this.actionData, error: null };
    } catch (e) {
      console.error(`[ProxyQuery] Upsert/Insert failed for ${this.table}:`, e);
      return { data: null, error: e };
    }
  }

  async _executeLocalUpdate(sqliteDb: any): Promise<DBResponse> {
    try {
      const setClause = Object.keys(this.actionData).map(k => `${k} = ?`).join(',');
      const params = Object.values(this.actionData).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
      
      const where: string[] = [];
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
    } catch (e) {
      console.error(`[ProxyQuery] Update failed for ${this.table}:`, e);
      return { data: null, error: e };
    }
  }

  async _executeLocalDelete(sqliteDb: any): Promise<DBResponse> {
    try {
      const params: any[] = [];
      const where: string[] = [];
      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
      });
      
      let sql = `DELETE FROM ${this.table}`;
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      sqliteDb.run(sql, params);
      await persistSQLite();
      return { data: null, error: null };
    } catch (e) {
      console.error(`[ProxyQuery] Delete failed for ${this.table}:`, e);
      return { data: null, error: e };
    }
  }
}
