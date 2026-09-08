import type { DBResponse, ProxyQueryChainItem, SqlProxyAction } from '@/types/system/database';
import type { DBQueryResultShape } from './proxyQuery.ts';
import { logger } from '../utils/logger.ts';

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

    // SELECT
    let sql = `SELECT * FROM ${table}`;
    const where: string[] = []; // no-domain: Non-domain utility collection or data structure
    const params: unknown[] = [];

    chain.forEach(s => {
      if (s.type === 'eq') { where.push(`${s.args[0]} = ?`); params.push(s.args[1]); }
      if (s.type === 'neq') { where.push(`${s.args[0]} != ?`); params.push(s.args[1]); }
      if (s.type === 'gt') { where.push(`${s.args[0]} > ?`); params.push(s.args[1]); }
      if (s.type === 'lt') { where.push(`${s.args[0]} < ?`); params.push(s.args[1]); }
      if (s.type === 'gte') { where.push(`${s.args[0]} >= ?`); params.push(s.args[1]); }
      if (s.type === 'lte') { where.push(`${s.args[0]} <= ?`); params.push(s.args[1]); }
      if (s.type === 'in') {
        const arr = (s.args[1] as unknown[]) || []; // open-record: Generic key-value data dictionary container
        const marks = arr.map(() => '?').join(',');
        where.push(`${s.args[0]} IN (${marks})`);
        params.push(...arr);
      }
    });

    if (where.length > 0) sql += ` WHERE ${where.join(' AND ')}`;

    chain.forEach(s => {
      if (s.type === 'order') {
        const opts = s.args[1] as { ascending?: boolean };
        sql += ` ORDER BY ${s.args[0]} ${opts.ascending ? 'ASC' : 'DESC'}`;
      }
      if (s.type === 'limit') sql += ` LIMIT ${s.args[0]}`;
    });

    const res = await fetch('/api/dev-lan-pvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'query', sql, params })
    });
    const json = await res.json() as { data: Record<string, unknown>[]; error: unknown };
    if (json.error) return { data: null, error: json.error };

    const data = json.data || [];
    data.forEach((row: Record<string, unknown>) => {
      if (table === 'battle_invites' && row.id !== undefined && row.id !== null) {
        row.id = String(row.id);
      }
      if (row.config && typeof row.config === 'string') {
        try { row.config = JSON.parse(row.config); } catch (_e) { /* ignore */ }
      }
    });

    if (final === 'single') return { data: data[0] || null, error: data.length === 0 ? { message: 'Not found' } : null };
    if (final === 'maybeSingle') return { data: data[0] || null, error: null };
    return { data, error: null };
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logger.error('ProxyQuery', `LAN Dev Query failure: ${errorMsg}`);
    return { data: null, error: e };
  }
}

async function executeLanDevUpsert(
  table: string,
  actionData: unknown,
  chain: ProxyQueryChainItem[],
  final: DBQueryResultShape | null = null
): Promise<DBResponse> {
  try {
    const values = Array.isArray(actionData) ? actionData : [actionData];
    let lastInsertedRowId: unknown = null;
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
      if (json.error) return { data: null, error: json.error };
      lastInsertedRowId = json.lastInsertRowid;
    }

    const hasSelect = chain.some(s => s.type === 'select');
    if (hasSelect) {
      let rows: Record<string, unknown>[] = [];
      if (lastInsertedRowId !== null && lastInsertedRowId !== undefined) {
        const res = await fetch('/api/dev-lan-pvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'query',
            sql: `SELECT * FROM ${table} WHERE rowid = ?`,
            params: [lastInsertedRowId]
          })
        });
        const json = await res.json() as { data?: Record<string, unknown>[]; error?: unknown };
        rows = json.data || [];
      }
      rows.forEach((row: Record<string, unknown>) => {
        if (table === 'battle_invites' && row.id !== undefined && row.id !== null) {
          row.id = String(row.id);
        }
        if (row.config && typeof row.config === 'string') {
          try { row.config = JSON.parse(row.config); } catch (_e) { /* ignore */ }
        }
      });
      if (final === 'single') return { data: rows[0] || null, error: rows.length === 0 ? { message: 'Not found' } : null };
      if (final === 'maybeSingle') return { data: rows[0] || null, error: null };
      return { data: Array.isArray(actionData) ? rows : (rows[0] || null), error: null };
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
