import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.ts';
import { isE2EEnvironment } from '../utils/env.ts';
import type { DBConfig, SessionMode, DBRouterOptions } from '../../types/system/database.ts';
import type { E2eDatabaseDriver } from '../../types/system/env.d.ts';

const MAX_RECONNECT_INTERVAL_MS = 300000 as const;
const INITIAL_RECONNECT_BACKOFF_MS = [1000, 2000, 5000] as const;
const DEFAULT_RECONNECT_BACKOFF_MS = 5000 as const;


function getE2EDriver(): E2eDatabaseDriver {
  if (typeof globalThis !== 'undefined' && globalThis.__E2E_DRIVER__) {
    return globalThis.__E2E_DRIVER__;
  }
  if (typeof window !== 'undefined' && window.__E2E_DRIVER__) {
    return window.__E2E_DRIVER__;
  }
  if (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER === 'postgres') {
    return 'postgres';
  }
  return 'sqlite';
}

export function resolveInitialDbSession(
  config: DBConfig,
  mode: SessionMode,
  options: DBRouterOptions
): { mode: SessionMode; config: DBConfig } {
  const isE2E = isE2EEnvironment();
  const e2eDriver = getE2EDriver();

  if (!isE2E) {
    return { mode, config };
  }

  if (e2eDriver === 'postgres') {
    const isLocalContainer = Boolean(config.url && (config.url.includes('127.0.0.1') || config.url.includes('localhost')));
    const finalConfig = isLocalContainer ? config : {
      url: 'http://127.0.0.1:54321',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjI1MDAwMDAwMDB9.bWuWcdy1ICtTs7Zq7TNjum7G0VIS5je9rFlzshoeBLA'
    };
    return { mode: 'online', config: finalConfig };
  }

  options.inMemory = true;
  return { mode: 'offline', config };
}

export function createSupabaseClient(config: DBConfig): SupabaseClient {
  const { url, key } = config;
  if (!url || !key) {
    throw new Error('[DBRouter] Missing Supabase configuration (URL or API key). Online operations cannot proceed.');
  }

  const isE2E = isE2EEnvironment();
  const e2eDriver = getE2EDriver();
  const isE2EPostgres = isE2E && e2eDriver === 'postgres';

  try {
    logger.info('DBRouter', 'Lazily initializing Supabase client...');
    return createClient(url, key, {
      ...(isE2EPostgres ? {
        accessToken: async () => {
          if (typeof localStorage !== 'undefined') {
            const token = localStorage.getItem('pokevicio_auth_token');
            if (token) return token;
          }
          return key;
        }
      } : {}),
      realtime: {
        reconnectAfterMs: (tries) => {
          if (tries > 3) return MAX_RECONNECT_INTERVAL_MS;
          return INITIAL_RECONNECT_BACKOFF_MS[tries - 1] || DEFAULT_RECONNECT_BACKOFF_MS;
        }
      }
    });
  } catch (err) {
    throw new Error(`[DBRouter] Failed to initialize Supabase client: ${(err as Error).message}`, { cause: err });
  }
}
