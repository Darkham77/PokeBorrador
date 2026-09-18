/**
 * src/logic/db/proxyQueryHelpers.ts
 *
 * Modular helper utilities for ProxyQuery local execution (SQLite query construction,
 * parameter mapping, row hydration, and response formatting).
 */

import { persistSQLite, queryLocal, type SQLiteDatabase } from './sqliteEngine.ts';
import type { DBResponse, ProxyQueryChainItem } from '@/types/system/database';
import type { DBQueryResultShape } from './proxyQuery.ts';

// ─── Row Hydration ────────────────────────────────────────────────────────────

const JSON_COLUMNS = [
  'save_data',
  'team_data',
  'data',
  'config',
  'schedule',
  'asset_data'
] as const;

function hydrateLocalRow(table: string, row: Record<string, unknown>): void {
  if (table === 'battle_invites' && row.id !== undefined && row.id !== null) {
    row.id = String(row.id);
  }
  for (const col of JSON_COLUMNS) {
    const val = row[col];
    if (typeof val === 'string') {
      try {
        row[col] = JSON.parse(val);
      } catch (_e) { // catch-ok: Fallback to raw string if JSON parsing fails
      }
    }
  }
}

export function hydrateLocalRows(table: string, rows: Record<string, unknown>[]): void {
  for (const row of rows) {
    hydrateLocalRow(table, row);
  }
}

// ─── SQL Where Clause & Parameter Construction ────────────────────────────────

function parseAndSubClauses(cleanClause: string, params: unknown[]): string[] {
  const subFilters = cleanClause.split(',');
  const andClauses: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const f of subFilters) {
    const parts = f.split('.');
    if (parts.length >= 3 && parts[1] === 'eq') {
      const col = parts[0];
      const val = parts.slice(2).join('.');
      andClauses.push(`${col} = ?`);
      params.push(val);
    }
  }
  return andClauses;
}

function parseAndOrFilter(filterStr: string, params: unknown[]): string {
  const clauses = filterStr.split(/\),?/);
  const orClauses: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const clause of clauses) {
    const cleanClause = clause.replace(/and\(/g, '').trim();
    if (!cleanClause) continue;
    const andClauses = parseAndSubClauses(cleanClause, params);
    if (andClauses.length > 0) {
      orClauses.push(`(${andClauses.join(' AND ')})`);
    }
  }
  return orClauses.length > 0 ? `(${orClauses.join(' OR ')})` : '';
}

function parseSimpleOrFilter(filterStr: string, params: unknown[]): string {
  const subFilters = filterStr.split(',');
  const subClauses: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const f of subFilters) {
    const parts = f.split('.');
    if (parts.length < 3) continue;
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
  return subClauses.length > 0 ? `(${subClauses.join(' OR ')})` : '';
}

function parseOrFilterClause(filterStr: string, params: unknown[]): string {
  if (filterStr.includes('and(')) {
    return parseAndOrFilter(filterStr, params);
  }
  return parseSimpleOrFilter(filterStr, params);
}

const COMPARISON_OPERATORS: Record<string, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<='
};

function handleInFilter(args: unknown[], where: string[], params: unknown[]): void {
  const arr = Array.isArray(args[1]) ? args[1] : [];
  const marks = arr.map(() => '?').join(',');
  where.push(`${args[0]} IN (${marks})`);
  params.push(...arr);
}

function handleIsFilter(args: unknown[], where: string[], params: unknown[]): void {
  if (args[1] === null) {
    where.push(`${args[0]} IS NULL`);
  } else {
    where.push(`${args[0]} IS ?`);
    params.push(args[1]);
  }
}

function handleNotFilter(args: unknown[], where: string[], params: unknown[]): void {
  const [colNot, opNot, valNot] = args as [string, string, unknown];
  if (opNot === 'eq') {
    where.push(`${colNot} <> ?`);
    params.push(valNot);
  } else if (opNot === 'is' && valNot === null) {
    where.push(`${colNot} IS NOT NULL`);
  }
}

function handleMatchFilter(args: unknown[], where: string[], params: unknown[]): void {
  for (const [k, v] of Object.entries(args[0] as Record<string, unknown>)) { // open-record: Generic key-value data dictionary container
    where.push(`${k} = ?`);
    params.push(v);
  }
}

function handleIlikeFilter(args: unknown[], where: string[], params: unknown[]): void {
  where.push(`${args[0]} LIKE ?`);
  params.push((args[1] as string).replace(/\*/g, '%'));
}

function handleOrFilter(args: unknown[], where: string[], params: unknown[]): void {
  const orSql = parseOrFilterClause(args[0] as string, params);
  if (orSql) where.push(orSql);
}

type FilterHandler = (args: unknown[], where: string[], params: unknown[]) => void;

const COMPLEX_FILTER_HANDLERS: Record<string, FilterHandler> = {
  in: handleInFilter,
  is: handleIsFilter,
  not: handleNotFilter,
  match: handleMatchFilter,
  ilike: handleIlikeFilter,
  or: handleOrFilter
};

function applyStepFilter(step: ProxyQueryChainItem, where: string[], params: unknown[]): void {
  const compOp = COMPARISON_OPERATORS[step.type];
  if (compOp) {
    where.push(`${step.args[0]} ${compOp} ?`);
    params.push(step.args[1]);
    return;
  }
  const handler = COMPLEX_FILTER_HANDLERS[step.type];
  if (handler) {
    handler(step.args, where, params);
  }
}

export function buildSelectWhereAndParams(chain: ProxyQueryChainItem[]): { where: string[]; params: unknown[] } {
  const where: string[] = []; // no-domain: Non-domain utility collection or data structure
  const params: unknown[] = [];
  for (const step of chain) {
    applyStepFilter(step, where, params);
  }
  return { where, params };
}

// ─── Order, Limit & Select Options ───────────────────────────────────────────

export function buildOrderAndLimit(chain: ProxyQueryChainItem[]): string {
  let sql = '';
  for (const s of chain) {
    if (s.type === 'order') {
      const opts = s.args[1] as { ascending?: boolean } | undefined;
      sql += ` ORDER BY ${s.args[0]} ${opts?.ascending ? 'ASC' : 'DESC'}`;
    } else if (s.type === 'limit') {
      sql += ` LIMIT ${s.args[0]}`;
    }
  }
  return sql;
}

export interface LocalSelectOptions {
  count?: string;
  head?: boolean;
}

export function extractSelectOptions(chain: ProxyQueryChainItem[]): LocalSelectOptions {
  const selectItem = chain.find(s => s.type === 'select');
  return (selectItem?.args[1] as LocalSelectOptions) || {};
}

export function formatLocalResult(
  data: Record<string, unknown>[],
  final: DBQueryResultShape | null,
  count?: number
): DBResponse {
  if (final === 'single') {
    return {
      data: data[0] || null,
      error: data.length === 0 ? { message: 'Not found' } : null,
      count
    };
  }
  if (final === 'maybeSingle') {
    return { data: data[0] || null, error: null, count };
  }
  return { data, error: null, count };
}

// ─── Upsert Execution Helpers ─────────────────────────────────────────────────

function serializeSqliteValue(val: unknown): unknown {
  if (val === undefined || val === null) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

function executeSqliteUpsertRow(
  sqliteDb: SQLiteDatabase,
  table: string,
  row: Record<string, unknown> // open-record: Generic key-value data dictionary container
): unknown {
  const cols = Object.keys(row);
  const marks = cols.map(() => '?').join(',');
  const vals = cols.map(c => serializeSqliteValue(row[c]));
  sqliteDb.run(`INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${marks})`, vals);
  const idRes = sqliteDb.exec('SELECT last_insert_rowid()');
  return idRes[0]?.values[0]?.[0] ?? null;
}

export async function executeAllUpsertRows(
  sqliteDb: SQLiteDatabase,
  table: string,
  actionData: unknown
): Promise<unknown> {
  const values = Array.isArray(actionData) ? actionData : [actionData];
  let lastInsertedRowId: unknown = null;
  for (const row of values) {
    if (typeof row !== 'object' || row === null) continue;
    lastInsertedRowId = executeSqliteUpsertRow(sqliteDb, table, row as Record<string, unknown>); // open-record: Generic key-value data dictionary container
  }
  await persistSQLite();
  return lastInsertedRowId;
}

export async function resolveUpsertSelectResult(
  table: string,
  lastInsertedRowId: unknown,
  final: DBQueryResultShape | null,
  actionData: unknown
): Promise<DBResponse> {
  const rows = lastInsertedRowId !== null && lastInsertedRowId !== undefined
    ? await queryLocal(`SELECT * FROM ${table} WHERE rowid = ?`, [lastInsertedRowId])
    : [];
  hydrateLocalRows(table, rows);

  if (final === 'single') return { data: rows[0] || null, error: rows.length === 0 ? { message: 'Not found' } : null };
  if (final === 'maybeSingle') return { data: rows[0] || null, error: null };
  return { data: Array.isArray(actionData) ? rows : (rows[0] || null), error: null };
}
