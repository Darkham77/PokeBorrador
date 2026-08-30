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

export interface RawClause {
  sql: string;
  params: unknown[];
}

function parseSingleFilter(expr: string, params: unknown[]): string {
  const firstDot = expr.indexOf('.');
  if (firstDot === -1) return '';
  const col = expr.slice(0, firstDot);
  const rest = expr.slice(firstDot + 1);
  const secondDot = rest.indexOf('.');
  if (secondDot === -1) return '';
  const opName = rest.slice(0, secondDot);
  const valStr = rest.slice(secondDot + 1);

  let op = '=';
  if (opName === 'eq') op = '=';
  else if (opName === 'neq') op = '!=';
  else if (opName === 'gt') op = '>';
  else if (opName === 'gte') op = '>=';
  else if (opName === 'lt') op = '<';
  else if (opName === 'lte') op = '<=';
  else if (opName === 'like' || opName === 'ilike') op = 'LIKE';
  else if (opName === 'is') op = 'IS';

  if (valStr === 'null') {
    params.push(null);
  } else if (valStr === 'true') {
    params.push(1);
  } else if (valStr === 'false') {
    params.push(0);
  } else {
    params.push(valStr);
  }
  return `"${col}" ${op} ?`;
}

function parseOrClause(orString: string, params: unknown[]): string {
  const parts: string[] = []; // no-domain
  let depth = 0;
  let current = '';
  for (let i = 0; i < orString.length; i++) {
    const char = orString[i];
    if (char === '(') depth++;
    else if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  const parsedParts = parts.map(part => {
    if (part.startsWith('and(') && part.endsWith(')')) {
      const inner = part.slice(4, -1);
      const innerParts = inner.split(',');
      const innerSql = innerParts.map(p => parseSingleFilter(p.trim(), params)).filter(Boolean).join(' AND ');
      return `(${innerSql})`;
    } else if (part.startsWith('or(') && part.endsWith(')')) {
      const inner = part.slice(3, -1);
      return `(${parseOrClause(inner, params)})`;
    } else {
      return parseSingleFilter(part, params);
    }
  }).filter(Boolean);

  return parsedParts.length > 0 ? `(${parsedParts.join(' OR ')})` : '';
}

export interface QueryBuilder {
  _table: string;
  _filters: QueryFilter[];
  _rawClauses: RawClause[];
  _limit: number | null;
  _order: string | null;
  _select: string;
  select: (fields: string) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  neq: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, vals: unknown[]) => QueryBuilder;
  or: (clause: string) => QueryBuilder;
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
  _rawClauses: RawClause[] = [];
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

  or(clause: string): QueryBuilder {
    const params: unknown[] = [];
    const sql = parseOrClause(clause, params);
    if (sql) {
      this._rawClauses.push({ sql, params });
    }
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
    const whereParts: string[] = []; // no-domain

    if (this._filters.length) {
      whereParts.push(...this._filters.map((f: QueryFilter) => {
        if (f.op === 'IN') {
          const placeholders = (f.val as unknown[]).map(() => '?').join(','); // open-record
          (f.val as unknown[]).forEach((v) => params.push(v)); // open-record
          return `"${f.col}" IN (${placeholders})`;
        }
        params.push(f.val);
        return `"${f.col}" ${f.op} ?`;
      }));
    }

    if (this._rawClauses.length) {
      for (const rc of this._rawClauses) {
        whereParts.push(rc.sql);
        params.push(...rc.params);
      }
    }

    if (whereParts.length) {
      sql += ' WHERE ' + whereParts.join(' AND ');
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
      const sql = `INSERT INTO ${this._table} (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
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
    let sql = `UPDATE ${this._table} SET ` + cols.map(c => `"${c}" = ?`).join(',');
    const params = [...vals];
    const whereParts: string[] = []; // no-domain
    if (this._filters.length) {
      whereParts.push(...this._filters.map((f: QueryFilter) => { params.push(f.val); return `"${f.col}" ${f.op} ?`; }));
    }
    if (this._rawClauses.length) {
      for (const rc of this._rawClauses) {
        whereParts.push(rc.sql);
        params.push(...rc.params);
      }
    }
    if (whereParts.length) {
      sql += ' WHERE ' + whereParts.join(' AND ');
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
    const whereParts: string[] = []; // no-domain
    if (this._filters.length) {
      whereParts.push(...this._filters.map((f: QueryFilter) => { params.push(f.val); return `"${f.col}" ${f.op} ?`; }));
    }
    if (this._rawClauses.length) {
      for (const rc of this._rawClauses) {
        whereParts.push(rc.sql);
        params.push(...rc.params);
      }
    }
    if (whereParts.length) {
      sql += ' WHERE ' + whereParts.join(' AND ');
    }
    db.run(sql, params);
    await this.persist();
    return { data: true, error: null };
  }

  async rpc(_fn: string, _params: unknown) {
    return { data: true, error: null };
  }
}

