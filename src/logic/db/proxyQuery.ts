
// fallow-ignore-file unused-class-member

import { initSQLite, queryLocal, persistSQLite } from './sqliteEngine.ts';
import type { DBRouter } from './dbRouter.ts';
import type { DBResponse, ProxyQueryChainItem } from '@/types/system/database';
import { logger } from '../utils/logger.ts';

/**
 * Chainable Query Builder for SQLite that mimics Supabase/PostgREST API.
 */

export class ProxyQuery {
  router: DBRouter;
  table: string;
  chain: ProxyQueryChainItem[];
  action: 'select' | 'upsert' | 'update' | 'delete' | 'insert';
  actionData: unknown;
  actionOpts: unknown;

  constructor(router: DBRouter, table: string) {
    this.router = router;
    this.table = table;
    this.chain = [];
    this.action = 'select'; // select, upsert, update, delete
    this.actionData = null;
    this.actionOpts = null;
  }

  select(cols: string = '*', opts: { count?: 'exact' | 'planned' | 'estimated' | null, head?: boolean } = {}) { 
    this.chain.push({ type: 'select', args: [cols, opts] }); 
    return this; 
  }
  eq(c: string, v: unknown) { this.chain.push({ type: 'eq', args: [c, v] }); return this; }
  neq(c: string, v: unknown) { this.chain.push({ type: 'neq', args: [c, v] }); return this; }
  gt(c: string, v: unknown) { this.chain.push({ type: 'gt', args: [c, v] }); return this; }
  lt(c: string, v: unknown) { this.chain.push({ type: 'lt', args: [c, v] }); return this; }
  gte(c: string, v: unknown) { this.chain.push({ type: 'gte', args: [c, v] }); return this; }
  lte(c: string, v: unknown) { this.chain.push({ type: 'lte', args: [c, v] }); return this; }
  in(c: string, arr: unknown[]) { this.chain.push({ type: 'in', args: [c, arr] }); return this; }
  is(c: string, v: unknown) { this.chain.push({ type: 'is', args: [c, v] }); return this; }
  not(c: string, op: string, v: unknown) { this.chain.push({ type: 'not', args: [c, op, v] }); return this; }
  or(c: string) { this.chain.push({ type: 'or', args: [c] }); return this; }
  order(c: string, opts: { ascending?: boolean } = {}) { this.chain.push({ type: 'order', args: [c, opts] }); return this; }
  limit(n: number) { this.chain.push({ type: 'limit', args: [n] }); return this; }
  match(obj: Record<string, unknown>) { this.chain.push({ type: 'match', args: [obj] }); return this; }
  ilike(c: string, v: string) { this.chain.push({ type: 'ilike', args: [c, v] }); return this; }

  upsert(data: unknown, opts?: unknown) {
    this.action = 'upsert';
    this.actionData = data;
    this.actionOpts = opts;
    return this;
  }

  insert(data: unknown) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: unknown) {
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
  async then<T = DBResponse>(onFulfilled?: (value: DBResponse) => T | Promise<T>, onRejected?: (reason: unknown) => T | Promise<T>): Promise<T | DBResponse> {
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
        const q = client.from(this.table) as unknown as Record<string, (...args: unknown[]) => Promise<DBResponse>>;
        
        if (this.action === 'upsert') return await q.upsert!(this.actionData, this.actionOpts);
        if (this.action === 'insert') return await q.insert!(this.actionData);
        
        if (this.action === 'update') {
          let updQ = (q as unknown as Record<string, (d: unknown) => unknown>).update!(this.actionData) as Record<string, (...args: unknown[]) => unknown>;
          this.chain.forEach(s => { updQ = updQ[s.type]!(...s.args) as Record<string, (...args: unknown[]) => unknown>; });
          return await (updQ as unknown as Promise<DBResponse>);
        }
        
        if (this.action === 'delete') {
          let delQ = (q as unknown as Record<string, () => unknown>).delete!() as Record<string, (...args: unknown[]) => unknown>;
          this.chain.forEach(s => { delQ = delQ[s.type]!(...s.args) as Record<string, (...args: unknown[]) => unknown>; });
          return await (delQ as unknown as Promise<DBResponse>);
        }

        // Default: select
        let selQ = q as Record<string, (...args: unknown[]) => unknown>;
        this.chain.forEach(s => { 
          selQ = selQ[s.type]!(...s.args) as Record<string, (...args: unknown[]) => unknown>; 
        });
        return final ? await (selQ as unknown as Record<string, () => Promise<DBResponse>>)[final]!() : await (selQ as unknown as Promise<DBResponse>);
      } catch (err: unknown) {
        logger.error('DBRouter', `Online query failed for table ${this.table}: ${(err as Error).message}`);
        
        // Detect network errors (fetch failures)
        const errMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();
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
      if (!sqliteDb) return { data: null, error: 'Database not initialized' };
      
      if (this.action === 'upsert') return await this._executeLocalUpsert(sqliteDb);
      if (this.action === 'insert') return await this._executeLocalUpsert(sqliteDb); // Reusing upsert for simplicity in local mode
      if (this.action === 'update') return await this._executeLocalUpdate(sqliteDb);
      if (this.action === 'delete') return await this._executeLocalDelete(sqliteDb);

      // Default: select
      let sql = `SELECT * FROM ${this.table}`; // Simplistic, cols not used yet
      const where: string[] = [];
      const params: unknown[] = [];

      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
        if (s.type === 'neq') { where.push(`${s.args[0]} != ?`); params.push(s.args[1]); }
        if (s.type === 'gt') { where.push(`${s.args[0]} > ?`); params.push(s.args[1]); }
        if (s.type === 'lt') { where.push(`${s.args[0]} < ?`); params.push(s.args[1]); }
        if (s.type === 'gte') { where.push(`${s.args[0]} >= ?`); params.push(s.args[1]); }
        if (s.type === 'lte') { where.push(`${s.args[0]} <= ?`); params.push(s.args[1]); }
        if (s.type === 'in') {
          const arr = (s.args[1] as unknown[]) || [];
          const marks = arr.map(() => '?').join(',');
          where.push(`${s.args[0]} IN (${marks})`);
          params.push(...arr);
        }
        if (s.type === 'is') {
          if (s.args[1] === null) where.push(`${s.args[0]} IS NULL`);
          else { where.push(`${s.args[0]} IS ?`); params.push(s.args[1]); }
        }
        if (s.type === 'not') {
          const [colNot, opNot, valNot] = s.args as [string, string, unknown];
          if (opNot === 'eq') {
            where.push(`${colNot} <> ?`);
            params.push(valNot);
          } else if (opNot === 'is' && valNot === null) {
            where.push(`${colNot} IS NOT NULL`);
          }
        }
        if (s.type === 'match') {
          Object.entries(s.args[0] as Record<string, unknown>).forEach(([k, v]) => {
            where.push(`${k} = ?`);
            params.push(v);
          });
        }
        if (s.type === 'ilike') {
          where.push(`${s.args[0]} LIKE ?`);
          params.push((s.args[1] as string).replace(/\*/g, '%'));
        }
        if (s.type === 'or') {
          const filterStr = s.args[0] as string;
          if (filterStr.includes('and(')) {
            const clauses = filterStr.split(/\),?/);
            const orClauses: string[] = [];
            clauses.forEach(clause => {
              const cleanClause = clause.replace(/and\(/g, '').trim();
              if (!cleanClause) return;
              const subFilters = cleanClause.split(',');
              const andClauses: string[] = [];
              subFilters.forEach(f => {
                const parts = f.split('.');
                if (parts.length >= 3) {
                  const col = parts[0];
                  const op = parts[1];
                  const val = parts.slice(2).join('.');
                  if (op === 'eq') {
                    andClauses.push(`${col} = ?`);
                    params.push(val);
                  }
                }
              });
              if (andClauses.length > 0) {
                orClauses.push(`(${andClauses.join(' AND ')})`);
              }
            });
            if (orClauses.length > 0) {
              where.push(`(${orClauses.join(' OR ')})`);
            }
          } else {
            const subFilters = filterStr.split(',');
            const subClauses: string[] = [];
            subFilters.forEach(f => {
              const parts = f.split('.');
              if (parts.length >= 3) {
                const col = parts[0];
                const op = parts[1];
                const val = parts.slice(2).join('.');
                if (op === 'eq') {
                  subClauses.push(`${col} = ?`);
                  params.push(val);
                } else if (op === 'neq') {
                  subClauses.push(`${col} != ?`);
                  params.push(val);
                }
              }
            });
            if (subClauses.length > 0) {
              where.push(`(${subClauses.join(' OR ')})`);
            }
          }
        }
      });

      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      
      // Order and Limit
      this.chain.forEach(s => {
        if (s.type === 'order') {
          const opts = s.args[1] as { ascending?: boolean };
          sql += ` ORDER BY ${s.args[0]} ${opts.ascending ? 'ASC' : 'DESC'}`;
        }
        if (s.type === 'limit') sql += ` LIMIT ${s.args[0]}`;
      });

      let count: number | undefined = undefined;
      const selectItem = this.chain.find(s => s.type === 'select');
      const selectOpts = (selectItem?.args[1] as { count?: string, head?: boolean }) || {};

      if (selectOpts.count) {
        let countSql = `SELECT COUNT(*) as total FROM ${this.table}`;
        if (where.length > 0) countSql += ` WHERE ${where.join(' AND ')}`;
        const countRes = await queryLocal(countSql, params);
        count = (countRes[0] as { total: number })?.total || 0;
      }

      if (selectOpts.head) {
        return { data: [], error: null, count };
      }

      const data = await queryLocal(sql, params);
      
      // Auto-parse JSON fields (known to be JSON in this project)
      data.forEach((row: Record<string, unknown>) => {
        if (row.save_data && typeof row.save_data === 'string') try { row.save_data = JSON.parse(row.save_data); } catch(_e){ /* ignore */ }
        if (row.team_data && typeof row.team_data === 'string') try { row.team_data = JSON.parse(row.team_data); } catch(_e){ /* ignore */ }
        if (row.data && typeof row.data === 'string') try { row.data = JSON.parse(row.data); } catch(_e){ /* ignore */ }
        if (row.config && typeof row.config === 'string') try { row.config = JSON.parse(row.config); } catch(_e){ /* ignore */ }
        if (row.schedule && typeof row.schedule === 'string') try { row.schedule = JSON.parse(row.schedule); } catch(_e){ /* ignore */ }
        if (row.asset_data && typeof row.asset_data === 'string') try { row.asset_data = JSON.parse(row.asset_data); } catch(_e){ /* ignore */ }
      });

      if (final === 'single') return { data: data[0] || null, error: data.length === 0 ? { message: 'Not found' } : null, count };
      if (final === 'maybeSingle') return { data: data[0] || null, error: null, count };
      return { data, error: null, count };
    } catch (e: unknown) {
      logger.error('ProxyQuery', `executeLocal critical failure: ${(e as Error).message}`);
      return { data: null, error: e };
    }
  }

  async _executeLocalUpsert(sqliteDb: { run: (sql: string, params: unknown[]) => void }): Promise<DBResponse> {
    try {
      const values = Array.isArray(this.actionData) ? this.actionData : [this.actionData];
      for (const row of values) {
        if (typeof row !== 'object' || row === null) continue;
        const r = row as Record<string, unknown>;
        const cols = Object.keys(r);
        const marks = cols.map(() => '?').join(',');
        const vals = cols.map(c => typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c]);
        sqliteDb.run(`INSERT OR REPLACE INTO ${this.table} (${cols.join(',')}) VALUES (${marks})`, vals);
      }
      await persistSQLite();
      return { data: this.actionData, error: null };
    } catch (e: unknown) {
      logger.error('ProxyQuery', `Upsert/Insert failed for ${this.table}: ${(e as Error).message}`);
      return { data: null, error: e };
    }
  }

  async _executeLocalUpdate(sqliteDb: { run: (sql: string, params: unknown[]) => void }): Promise<DBResponse> {
    try {
      const data = this.actionData as Record<string, unknown>;
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(',');
      const params: unknown[] = Object.values(data).map(v => typeof v === 'object' ? JSON.stringify(v) : v);
      
      const where: string[] = [];
      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
        if (s.type === 'match') {
          Object.entries(s.args[0] as Record<string, unknown>).forEach(([k, v]) => {
            where.push(`${k} = ?`); params.push(v);
          });
        }
      });

      let sql = `UPDATE ${this.table} SET ${setClause}`;
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      sqliteDb.run(sql, params);
      await persistSQLite();
      return { data: this.actionData, error: null };
    } catch (e: unknown) {
      logger.error('ProxyQuery', `Update failed for ${this.table}: ${(e as Error).message}`);
      return { data: null, error: e };
    }
  }

  async _executeLocalDelete(sqliteDb: { run: (sql: string, params: unknown[]) => void }): Promise<DBResponse> {
    try {
      const params: unknown[] = [];
      const where: string[] = [];
      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
      });
      
      let sql = `DELETE FROM ${this.table}`;
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      sqliteDb.run(sql, params);
      await persistSQLite();
      return { data: null, error: null };
    } catch (e: unknown) {
      logger.error('ProxyQuery', `Delete failed for ${this.table}: ${(e as Error).message}`);
      return { data: null, error: e };
    }
  }
}
