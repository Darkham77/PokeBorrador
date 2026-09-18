

import { initSQLite, queryLocal, persistSQLite, type SQLiteDatabase } from './sqliteEngine.ts';
import type { DBRouter } from './dbRouter.ts';
import type { DBResponse, ProxyQueryChainItem, SqlProxyAction, SqlProxyCountMode } from '@/types/system/database';
import { logger } from '../utils/logger.ts';
import { isLanDevPvP, executeLanDev } from './proxyQueryLanDev.ts';
import {
  hydrateLocalRows,
  buildSelectWhereAndParams,
  buildOrderAndLimit,
  extractSelectOptions,
  formatLocalResult,
  executeAllUpsertRows,
  resolveUpsertSelectResult
} from './proxyQueryHelpers.ts';

export type DBQueryResultShape = 'single' | 'maybeSingle';

type Callable = (...args: unknown[]) => unknown;

function initOnlineActionQuery(
  q: unknown,
  action: SqlProxyAction,
  actionData: unknown,
  actionOpts: unknown
): unknown {
  if (action === 'upsert') {
    const fn = Reflect.get(q as object, 'upsert') as Callable;
    return Reflect.apply(fn, q, [actionData, actionOpts]);
  }
  if (action === 'insert') {
    const fn = Reflect.get(q as object, 'insert') as Callable;
    return Reflect.apply(fn, q, [actionData]);
  }
  if (action === 'update') {
    const updateFn = Reflect.get(q as object, 'update') as Callable;
    return Reflect.apply(updateFn, q, [actionData]);
  }
  if (action === 'delete') {
    const deleteFn = Reflect.get(q as object, 'delete') as Callable;
    return Reflect.apply(deleteFn, q, []);
  }
  return q;
}

function applyOnlineQueryChain(
  query: unknown,
  chain: ProxyQueryChainItem[]
): unknown {
  let curQ = query;
  for (const s of chain) {
    if (curQ && typeof curQ === 'object') {
      const fn = Reflect.get(curQ, s.type) as Callable | undefined;
      if (fn) {
        curQ = Reflect.apply(fn, curQ, s.args);
      }
    }
  }
  return curQ;
}

function applyOnlineFinal(
  query: unknown,
  final: DBQueryResultShape | null,
  action: SqlProxyAction
): unknown {
  if (!final || action === 'update' || action === 'delete') {
    return query;
  }
  if (query && typeof query === 'object') {
    const finalFn = Reflect.get(query, final) as Callable | undefined;
    if (finalFn) {
      return Reflect.apply(finalFn, query, []);
    }
  }
  return query;
}

function notifyOnlineNetworkError(err: unknown) {
  const errMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('failed to fetch')) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('db-connection-error'));
    }
  }
}

/**
 * Chainable Query Builder for SQLite that mimics Supabase/PostgREST API.
 */

export class ProxyQuery {
  router: DBRouter;
  table: string;
  chain: ProxyQueryChainItem[];
  action: SqlProxyAction;
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

  select(cols: string = '*', opts: { count?: SqlProxyCountMode | null, head?: boolean } = {}) { 
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

  async execute(final: DBQueryResultShape | null = null): Promise<DBResponse> {
    if (this.router.mode === 'online') {
      return this.executeOnline(final);
    }
    return this.executeLocal(final);
  }

  private async executeOnline(final: DBQueryResultShape | null = null): Promise<DBResponse> {
    const client = this.router.realClient;
    if (!client) throw new Error('[DBRouter] Online client not available.');

    try {
      const q = client.from(this.table);
      const actionQ = initOnlineActionQuery(q, this.action, this.actionData, this.actionOpts);
      const chainedQ = applyOnlineQueryChain(actionQ, this.chain);
      const finalQ = applyOnlineFinal(chainedQ, final, this.action);
      return await (finalQ as Promise<DBResponse>);
    } catch (err: unknown) {
      logger.error('DBRouter', `Online query failed for table ${this.table}: ${(err as Error).message}`);
      notifyOnlineNetworkError(err);
      throw err;
    }
  }

  async executeLocal(final: DBQueryResultShape | null = null): Promise<DBResponse> {
    if (isLanDevPvP(this.table)) {
      return executeLanDev(this.table, this.action, this.actionData, this.chain, final);
    }

    try {
      const sqliteDb = await initSQLite();
      if (!sqliteDb) return { data: null, error: 'Database not initialized' };
      
      if (this.action === 'upsert' || this.action === 'insert') {
        return await this._executeLocalUpsert(sqliteDb, final);
      }
      if (this.action === 'update') return await this._executeLocalUpdate(sqliteDb);
      if (this.action === 'delete') return await this._executeLocalDelete(sqliteDb);

      return await this._executeLocalSelect(final);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logger.error('ProxyQuery', `executeLocal critical failure: ${errorMsg}`);
      return { data: null, error: e };
    }
  }

  private async _executeLocalSelect(final: DBQueryResultShape | null): Promise<DBResponse> {
    const { where, params } = buildSelectWhereAndParams(this.chain);
    let sql = `SELECT * FROM ${this.table}`;
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    sql += buildOrderAndLimit(this.chain);

    const selectOpts = extractSelectOptions(this.chain);
    let count: number | undefined = undefined;

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
    hydrateLocalRows(this.table, data);
    return formatLocalResult(data, final, count);
  }

  async _executeLocalUpsert(sqliteDb: SQLiteDatabase, final: DBQueryResultShape | null = null): Promise<DBResponse> {
    try {
      const lastInsertedRowId = await executeAllUpsertRows(sqliteDb, this.table, this.actionData);
      if (this.chain.some(s => s.type === 'select')) {
        return await resolveUpsertSelectResult(this.table, lastInsertedRowId, final, this.actionData);
      }
      return { data: this.actionData, error: null };
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logger.error('ProxyQuery', `Upsert/Insert failed for ${this.table}: ${errorMsg}`);
      return { data: null, error: e };
    }
  }

  async _executeLocalUpdate(sqliteDb: SQLiteDatabase): Promise<DBResponse> {
    try {
      const data = this.actionData as Record<string, unknown>; // open-record: Generic key-value data dictionary container
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(',');
      const params: unknown[] = Object.values(data).map(v => v === undefined || v === null ? null : typeof v === 'object' ? JSON.stringify(v) : v);
      
      const where: string[] = []; // no-domain: Non-domain utility collection or data structure
      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1] ?? null); }
        if (s.type === 'match') {
          Object.entries(s.args[0] as Record<string, unknown>).forEach(([k, v]) => { // open-record: Generic key-value data dictionary container
            where.push(`${k} = ?`); params.push(v ?? null);
          });
        }
      });

      let sql = `UPDATE ${this.table} SET ${setClause}`;
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      sqliteDb.run(sql, params);
      await persistSQLite();
      return { data: this.actionData, error: null };
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logger.error('ProxyQuery', `Update failed for ${this.table}: ${errorMsg}`);
      return { data: null, error: e };
    }
  }

  async _executeLocalDelete(sqliteDb: SQLiteDatabase): Promise<DBResponse> {
    try {
      const params: unknown[] = [];
      const where: string[] = []; // no-domain: Non-domain utility collection or data structure
      this.chain.forEach(s => {
        if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
        if (s.type === 'in') {
          const list = s.args[1];
          if (Array.isArray(list) && list.length > 0) {
            const marks = list.map(() => '?').join(',');
            where.push(`${s.args[0]} IN (${marks})`);
            params.push(...list);
          }
        }
      });
      
      let sql = `DELETE FROM ${this.table}`;
      if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
      sqliteDb.run(sql, params);
      await persistSQLite();
      return { data: null, error: null };
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      logger.error('ProxyQuery', `Delete failed for ${this.table}: ${errorMsg}`);
      return { data: null, error: e };
    }
  }

}

