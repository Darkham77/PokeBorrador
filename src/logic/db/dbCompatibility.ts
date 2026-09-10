import { CLIENT_DB_VERSION, LATEST_MIGRATION_ID } from './migrations_version.ts';
import { logger } from '../utils/logger.ts';
import type { DBRouter } from './dbRouter.ts';
import type { DBCompatibilityResponse } from '@/types/system/database';
import type { LoadingStore } from './sqliteEngine.ts';

declare const __APP_VERSION__: string;

/**
 * DB Compatibility Check
 * Ensures the client version is not greater than the DB version.
 */
export { CLIENT_DB_VERSION, LATEST_MIGRATION_ID };

export async function checkDBCompatibility(router: DBRouter): Promise<DBCompatibilityResponse> {
  let loadingStore: LoadingStore | null = null;
  try {
    if (typeof window !== 'undefined') {
      const { useLoadingStore } = await import('../../stores/loading.ts');
      loadingStore = useLoadingStore();
    }
  } catch (_) {
    // Fail silently in node test context
  }

  if (loadingStore) {
    loadingStore.start('db_compat', 'Verificando Versión...', 'Comprobando compatibilidad de DB', false);
  }
  try {
    let dbVersion = 0;
    let rawValue: unknown = null;

    const { data, error } = await router
      .from('system_config')
      .select('value')
      .eq('key', 'db_version')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (data) rawValue = (data as { value: unknown }).value;

    if (rawValue) {
      // Handle JSON strings (SQLite stores objects as JSON strings)
      if (typeof rawValue === 'string' && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
        try { rawValue = JSON.parse(rawValue); } catch (_e) { /* ignore */ }
      }
      
      const valObj = rawValue as Record<string, unknown> | null; // open-record: Generic key-value data dictionary container
      const parsed = (typeof rawValue === 'object' && valObj !== null && 'db_version' in valObj) 
        ? parseInt((valObj.db_version as string | number) + '' || '0') 
        : parseInt((rawValue as string | number) + '' || '0');
      dbVersion = isNaN(parsed) ? 0 : parsed;
    }

    logger.info('DBRouter', `Compatibility Check: Client v${CLIENT_DB_VERSION} | DB v${dbVersion}`);

    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');

    const response: DBCompatibilityResponse = {
      compatible: true,
      client: CLIENT_DB_VERSION,
      db: dbVersion
    };

    if (!isE2E && router.mode !== 'offline' && (CLIENT_DB_VERSION > dbVersion || dbVersion === 0)) {
      response.compatible = false;
      response.error = 'OUTDATED_SERVER';
    }

    if (loadingStore) loadingStore.finish('db_compat');
    return response;
  } catch (e: unknown) {
    if (loadingStore) loadingStore.finish('db_compat');
    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
    if (isE2E || router.mode === 'offline') {
      logger.warn('DBRouter', 'Compatibility check offline/E2E lookup warning:', (e as Error).message);
      return { compatible: true, client: CLIENT_DB_VERSION, db: CLIENT_DB_VERSION };
    }
    logger.error('DBRouter', 'Compatibility check failed.', (e as Error).message);
    return { 
      compatible: false, 
      client: CLIENT_DB_VERSION, 
      db: 0,
      error: 'OUTDATED_SERVER' 
    };
  }
}

export interface AppCompatibilityResponse {
  compatible: boolean;
  client: string;
  server: string;
  error?: 'OUTDATED_SERVER' | 'OUTDATED_CLIENT';
}

export function parseAppVersion(val: unknown): string {
  if (!val) return '';
  try {
    const parsed: unknown = typeof val === 'string' ? JSON.parse(val) : val;
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      return (parsed as Record<string, string>).app_version || ''; // open-record: Generic key-value data dictionary container
    }
    return '';
  } catch {
    return typeof val === 'string' ? val : '';
  }
}

export async function checkAppVersionCompatibility(router: DBRouter): Promise<AppCompatibilityResponse> {
  const clientVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v0.5.0';
  const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
  if (isE2E) {
    return { compatible: true, client: clientVer, server: clientVer };
  }
  let serverVer = '';
  
  try {
    const { data, error } = await router
      .from('system_config')
      .select('value')
      .eq('key', 'app_version')
      .maybeSingle();
    if (!error && data && (data as { value: unknown }).value) {
      serverVer = parseAppVersion((data as { value: unknown }).value);
    }
  } catch (e) {
    logger.error('DBRouter', 'App version check failed.', (e as Error).message);
  }

  if (!serverVer) {
    if (router.mode === 'offline') {
      return { compatible: true, client: clientVer, server: clientVer };
    }
    return { compatible: false, client: clientVer, server: 'v0.0.0', error: 'OUTDATED_SERVER' };
  }

  if (clientVer === serverVer) {
    return { compatible: true, client: clientVer, server: serverVer };
  }

  // Allow bypass in local development mode to prevent dev lockout, except during tests
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test' && !(typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test'))) {
    logger.warn('DBRouter', `[DEV] Mismatch de versión ignorado en modo desarrollo (Cliente: ${clientVer} vs Servidor: ${serverVer})`);
    return { compatible: true, client: clientVer, server: serverVer };
  }

  if (clientVer > serverVer) {
    return { compatible: false, client: clientVer, server: serverVer, error: 'OUTDATED_SERVER' };
  } else {
    return { compatible: false, client: clientVer, server: serverVer, error: 'OUTDATED_CLIENT' };
  }
}
