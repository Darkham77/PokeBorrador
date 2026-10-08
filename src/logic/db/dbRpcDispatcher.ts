import type { SupabaseClient } from '@supabase/supabase-js';
import { emulateOfflineRpc } from './sqliteRpcEmulation.ts';
import type { SessionMode, DBResponse } from '@/types/system/database';

export async function executeRouterRpc(
  mode: SessionMode,
  client: SupabaseClient | null,
  name: string,
  params: Record<string, unknown> = {}
): Promise<DBResponse> {
  if (mode === 'offline') {
    return emulateOfflineRpc(name, params);
  }

  if (!client) return { data: null, error: 'Offline' };

  try {
    return await client.rpc(name, params) as DBResponse;
  } catch (err: unknown) {
    const errMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('failed to fetch')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db-connection-error'));
      }
    }
    throw err;
  }
}
