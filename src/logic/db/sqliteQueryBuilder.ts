// fallow-ignore-file unused-class-member
/**
 * src/logic/db/sqliteQueryBuilder.ts
 * 
 * Query Builder implementation for SQLite in-memory and persisted storage.
 */

import type { SQLiteDatabase, SQLiteResult } from './sqliteEngine.ts';

export interface QueryFilter {
  col: string;
  val: unknown;
  op: string;
}

export interface QueryBuilder {
  _table: string;
  _filters: QueryFilter[];
  _limit: number | null;
  _order: string | null;
  _select: string;
  select: (fields: string) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  neq: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, vals: unknown[]) => QueryBuilder;
  order: (col: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (n: number) => QueryBuilder;
  single: () => Promise<{ data: Record<string, unknown> | null, error: string | null }>;
  then: (resolve?: (val: Record<string, unknown>[]) => void) => Promise<Record<string, unknown>[]>;
  insert: (payload: unknown) => Promise<{ data: unknown, error: string | null }>;
  update: (payload: Record<string, unknown>) => Promise<{ data: Record<string, unknown>, error: string | null }>;
  delete: () => Promise<{ data: boolean, error: string | null }>;
  rpc: (_fn: string, _params: unknown) => Promise<{ data: boolean, error: string | null }>;
}

export class SQLiteQueryBuilder implements QueryBuilder {
  _table: string;
  _filters: QueryFilter[] = [];
  _limit: number | null = null;
  _order: string | null = null;
  _select: string = '*';
  private getDb: () => SQLiteDatabase | null;
  private persist: () => Promise<void>;

  constructor(table: string, getDb: () => SQLiteDatabase | null, persist: () => Promise<void>) {
    this._table = table;
    this.getDb = getDb;
    this.persist = persist;
  }

  select(fields: string): QueryBuilder {
    this._select = fields;
    return this;
  }

  eq(col: string, val: unknown): QueryBuilder {
    this._filters.push({ col, val, op: '=' });
    return this;
  }

  neq(col: string, val: unknown): QueryBuilder {
    this._filters.push({ col, val, op: '!=' });
    return this;
  }

  in(col: string, vals: unknown[]): QueryBuilder {
    this._filters.push({ col, val: vals, op: 'IN' });
    return this;
  }

  order(col: string, { ascending = true } = {}): QueryBuilder {
    this._order = `${col} ${ascending ? 'ASC' : 'DESC'}`;
    return this;
  }

  limit(n: number): QueryBuilder {
    this._limit = n;
    return this;
  }

  async single() {
    const res = await this.then();
    return { data: res[0] || null, error: null };
  }

  async then(resolve?: (val: Record<string, unknown>[]) => void): Promise<Record<string, unknown>[]> {
    const db = this.getDb();
    if (!db) return [];
    let sql = `SELECT ${this._select} FROM ${this._table}`;
    const params: unknown[] = [];
    if (this._filters.length) {
      sql += ' WHERE ' + this._filters.map((f: QueryFilter) => {
        if (f.op === 'IN') {
          const placeholders = (f.val as unknown[]).map(() => '?').join(','); // open-record
          (f.val as unknown[]).forEach((v) => params.push(v)); // open-record
          return `${f.col} IN (${placeholders})`;
        }
        params.push(f.val);
        return `${f.col} ${f.op} ?`;
      }).join(' AND ');
    }
    if (this._order) sql += ` ORDER BY ${this._order}`;
    if (this._limit) sql += ` LIMIT ${this._limit}`;
    
    const res: SQLiteResult[] = db.exec(sql, params);
    if (!res || res.length === 0) {
      if (resolve) resolve([]);
      return [];
    }
    const result = res[0]!;
    const data = result.values.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {}; // open-record
      result.columns.forEach((col: string, i: number) => {
        obj[col] = row[i]; // open-record
      });
      return obj;
    });
    if (resolve) resolve(data);
    return data;
  }

  async insert(payload: unknown) {
    const db = this.getDb();
    if (!db) return { data: payload, error: 'DB not ready' };
    const items = Array.isArray(payload) ? payload : [payload];
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const r = item as Record<string, unknown>; // open-record
      const cols = Object.keys(r);
      const vals = Object.values(r);
      const sql = `INSERT INTO ${this._table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
      db.run(sql, vals);
    }
    await this.persist();
    return { data: payload, error: null };
  }

  async update(payload: Record<string, unknown>) {
    const db = this.getDb();
    if (!db) return { data: payload, error: 'DB not ready' };
    const cols = Object.keys(payload);
    const vals = Object.values(payload);
    let sql = `UPDATE ${this._table} SET ` + cols.map(c => `${c} = ?`).join(',');
    const params = [...vals];
    if (this._filters.length) {
      sql += ' WHERE ' + this._filters.map((f: QueryFilter) => { params.push(f.val); return `${f.col} ${f.op} ?`; }).join(' AND ');
    }
    db.run(sql, params);
    await this.persist();
    return { data: payload, error: null };
  }

  async delete() {
    const db = this.getDb();
    if (!db) return { data: false, error: 'DB not ready' };
    let sql = `DELETE FROM ${this._table}`;
    const params: unknown[] = [];
    if (this._filters.length) {
      sql += ' WHERE ' + this._filters.map((f: QueryFilter) => { params.push(f.val); return `${f.col} ${f.op} ?`; }).join(' AND ');
    }
    db.run(sql, params);
    await this.persist();
    return { data: true, error: null };
  }

  async rpc(_fn: string, _params: unknown) {
    return { data: true, error: null };
  }
}
