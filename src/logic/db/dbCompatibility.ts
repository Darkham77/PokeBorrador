import { CLIENT_DB_VERSION } from './migrations_version.ts';
import { logger } from '../utils/logger.ts';
import type { DBRouter } from './dbRouter.ts';
import type { DBCompatibilityResponse } from '@/types/system/database';
import type { LoadingStore } from './sqliteEngine.ts';

declare const __APP_VERSION__: string;

/**
 * DB Compatibility Check
 * Ensures the client version is not greater than the DB version.
 */

function isE2EEnvironment(): boolean {
  return (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
         (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
}

async function getOptionalLoadingStore(): Promise<LoadingStore | null> {
  try {
    if (typeof window !== 'undefined') {
      const { useLoadingStore } = await import('../../stores/loading.ts');
      return useLoadingStore();
    }
  } catch (err) {
    logger.debug('DBCompatibility', 'LoadingStore no disponible en este contexto:', err);
  }
  return null;
}

function parseDbVersionValue(rawValue: unknown): number {
  if (!rawValue) return 0;
  let parsedRaw = rawValue;
  if (typeof parsedRaw === 'string' && (parsedRaw.startsWith('{') || parsedRaw.startsWith('['))) {
    try {
      parsedRaw = JSON.parse(parsedRaw);
    } catch (err) {
      logger.warn('DBCompatibility', 'Fallo al parsear rawValue JSON:', err);
    }
  }

  const valObj = parsedRaw as Record<string, unknown> | null; // open-record: Generic key-value data dictionary container
  const parsed = (typeof parsedRaw === 'object' && valObj !== null && 'db_version' in valObj)
    ? parseInt((valObj.db_version as string | number) + '' || '0')
    : parseInt((parsedRaw as string | number) + '' || '0');
  return isNaN(parsed) ? 0 : parsed;
}

function handleCompatError(e: unknown, routerMode: string): DBCompatibilityResponse {
  if (isE2EEnvironment() || routerMode === 'offline') {
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

export async function checkDBCompatibility(router: DBRouter): Promise<DBCompatibilityResponse> {
  const loadingStore = await getOptionalLoadingStore();
  if (loadingStore) {
    loadingStore.start('db_compat', 'Verificando Versión...', 'Comprobando compatibilidad de DB', false);
  }

  try {
    const { data, error } = await router
      .from('system_config')
      .select('value')
      .eq('key', 'db_version')
      .maybeSingle();

    if (error) throw error;

    const rawValue = data ? (data as { value: unknown }).value : null;
    const dbVersion = parseDbVersionValue(rawValue);

    logger.info('DBRouter', `Compatibility Check: Client v${CLIENT_DB_VERSION} | DB v${dbVersion}`);

    const isE2E = isE2EEnvironment();
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
    return handleCompatError(e, router.mode);
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

function isDevBypassAllowed(): boolean {
  return Boolean(
    import.meta.env.DEV &&
    import.meta.env.MODE !== 'test' &&
    !(typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test'))
  );
}

export async function checkAppVersionCompatibility(router: DBRouter): Promise<AppCompatibilityResponse> {
  const clientVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v0.5.0';
  if (isE2EEnvironment()) {
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

  if (clientVer === serverVer || isDevBypassAllowed()) {
    if (clientVer !== serverVer) {
      logger.warn('DBRouter', `[DEV] Mismatch de versión ignorado en modo desarrollo (Cliente: ${clientVer} vs Servidor: ${serverVer})`);
    }
    return { compatible: true, client: clientVer, server: serverVer };
  }

  return {
    compatible: false,
    client: clientVer,
    server: serverVer,
    error: clientVer > serverVer ? 'OUTDATED_SERVER' : 'OUTDATED_CLIENT'
  };
}
