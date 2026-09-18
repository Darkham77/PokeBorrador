import type { DBResponse, ProxyQueryChainItem, SqlProxyAction } from '@/types/system/database';
import type { DBQueryResultShape } from './proxyQuery.ts';
import { logger } from '../utils/logger.ts';
import {
  buildSelectWhereAndParams,
  buildOrderAndLimit,
  hydrateLocalRows,
  formatLocalResult
} from './proxyQueryHelpers.ts';

export function isLanDevPvP(table: string): boolean {
  return (
    (table === 'ranked_queue' || table === 'battle_invites') &&
    Boolean(import.meta.env.DEV) &&
    import.meta.env.MODE !== 'test' &&
    typeof window !== 'undefined' &&
    !(window as { __VITEST__?: boolean }).__VITEST__ &&
    !(typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test'))
  );
}

async function executeLanDevSelect(
  table: string,
  chain: ProxyQueryChainItem[],
  final: DBQueryResultShape | null = null
): Promise<DBResponse> {
  const { where, params } = buildSelectWhereAndParams(chain);
  let sql = `SELECT * FROM ${table}`;
  if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
  sql += buildOrderAndLimit(chain);

  const res = await fetch('/api/dev-lan-pvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'query', sql, params })
  });
  const json = await res.json() as { data: Record<string, unknown>[]; error: unknown };
  if (json.error) return { data: null, error: json.error };

  const data = json.data || [];
  hydrateLocalRows(table, data);
  return formatLocalResult(data, final);
}

export async function executeLanDev(
  table: string,
  action: SqlProxyAction,
  actionData: unknown,
  chain: ProxyQueryChainItem[],
  final: DBQueryResultShape | null = null
): Promise<DBResponse> {
  try {
    if (action === 'upsert' || action === 'insert') {
      return await executeLanDevUpsert(table, actionData, chain, final);
    }
    if (action === 'update') {
      return await executeLanDevUpdate(table, actionData, chain);
    }
    if (action === 'delete') {
      return await executeLanDevDelete(table, chain);
    }
    return await executeLanDevSelect(table, chain, final);
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error('ProxyQuery', `LAN Dev Query failure: ${errorMsg}`);
    return { data: null, error: e };
  }
}

async function executeLanDevUpsertRows(
  table: string,
  actionData: unknown
): Promise<number | undefined> {
  const values = Array.isArray(actionData) ? actionData : [actionData];
  let lastInsertedRowId: number | undefined = undefined;
  for (const row of values) {
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    const cols = Object.keys(r);
    const marks = cols.map(() => '?').join(',');
    const vals = cols.map(c => r[c] === undefined || r[c] === null ? null : typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c]);
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${marks})`;
    const res = await fetch('/api/dev-lan-pvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'run', sql, params: vals })
    });
    const json = await res.json() as { lastInsertRowid?: number; error?: unknown };
    if (json.error) throw json.error;
    lastInsertedRowId = json.lastInsertRowid;
  }
  return lastInsertedRowId;
}

async function queryLanDevRowById(table: string, rowid: number | undefined): Promise<Record<string, unknown>[]> {
  if (rowid === null || rowid === undefined) return [];
  const res = await fetch('/api/dev-lan-pvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'query',
      sql: `SELECT * FROM ${table} WHERE rowid = ?`,
      params: [rowid]
    })
  });
  const json = await res.json() as { data?: Record<string, unknown>[]; error?: unknown };
  return json.data || [];
}

async function executeLanDevUpsert(
  table: string,
  actionData: unknown,
  chain: ProxyQueryChainItem[],
  final: DBQueryResultShape | null = null
): Promise<DBResponse> {
  try {
    const lastInsertedRowId = await executeLanDevUpsertRows(table, actionData);
    if (chain.some(s => s.type === 'select')) {
      const rows = await queryLanDevRowById(table, lastInsertedRowId);
      hydrateLocalRows(table, rows);
      return formatLocalResult(rows, final);
    }
    return { data: actionData, error: null };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error('ProxyQuery', `LAN Dev Upsert failure: ${errorMsg}`);
    return { data: null, error: e };
  }
}

async function executeLanDevUpdate(
  table: string,
  actionData: unknown,
  chain: ProxyQueryChainItem[]
): Promise<DBResponse> {
  try {
    const data = actionData as Record<string, unknown>; // open-record: Generic key-value data dictionary container
    const setClause = Object.keys(data).map(k => `${k} = ?`).join(',');
    const params: unknown[] = Object.values(data).map(v => v === undefined || v === null ? null : typeof v === 'object' ? JSON.stringify(v) : v);
    const where: string[] = []; // no-domain: Non-domain utility collection or data structure
    chain.forEach(s => {
      if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1] ?? null); }
    });
    let sql = `UPDATE ${table} SET ${setClause}`;
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    const res = await fetch('/api/dev-lan-pvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'run', sql, params })
    });
    const json = await res.json() as { error?: unknown };
    if (json.error) return { data: null, error: json.error };
    return { data: actionData, error: null };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error('ProxyQuery', `LAN Dev Update failure: ${errorMsg}`);
    return { data: null, error: e };
  }
}

async function executeLanDevDelete(
  table: string,
  chain: ProxyQueryChainItem[]
): Promise<DBResponse> {
  try {
    const params: unknown[] = [];
    const where: string[] = []; // no-domain: Non-domain utility collection or data structure
    chain.forEach(s => {
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
    let sql = `DELETE FROM ${table}`;
    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;
    const res = await fetch('/api/dev-lan-pvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'run', sql, params })
    });
    const json = await res.json() as { error?: unknown };
    if (json.error) return { data: null, error: json.error };
    return { data: null, error: null };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error('ProxyQuery', `LAN Dev Delete failure: ${errorMsg}`);
    return { data: null, error: e };
  }
}
