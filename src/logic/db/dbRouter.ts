

// fallow-ignore-file unused-class-member

import { createClient, type SupabaseClient, type RealtimeChannel, type REALTIME_SUBSCRIBE_STATES, type User, type Session } from '@supabase/supabase-js';
import { ProxyQuery } from './proxyQuery.ts';
import { gsap } from 'gsap';
import { initSQLite, queryLocal, type LoadingStore } from './sqliteEngine.ts';
import { emulateOfflineRpc } from './sqliteRpcEmulation.ts';
import { DATABASE_MIGRATIONS } from './migrations_data.ts';
import { logger } from '../utils/logger.ts';
import type { DBConfig, DBMode, DBRouterOptions, DBCompatibilityResponse, DBResponse } from '@/types/system/database';

export type { DBCompatibilityResponse };

/**
 * Unified Data Persistence Layer with Strict Session Isolation.
 * Routes queries to Supabase (Cloud) OR SQLite (Local), NEVER both in the same session.
 */

export class DBRouter {
  config: DBConfig;
  _realClient: SupabaseClient | null;
  mode: DBMode;
  options: DBRouterOptions;
  _initialized: boolean;
  currentSessionId: string | null;
  userSubscription: RealtimeChannel | null;
  systemConfigSubscription: RealtimeChannel | null;
  _timeOffset: number;

  constructor(config: DBConfig = { url: '', key: '' }, mode: DBMode = 'online', options: DBRouterOptions = {}) {
    this.config = config;
    this._realClient = null;
    this.mode = mode;
    this.options = options;
    this._initialized = false;
    this.currentSessionId = null;
    this.userSubscription = null;
    this.systemConfigSubscription = null;
    this._timeOffset = 0; // ms
    this.getTimeOffset = this.getTimeOffset.bind(this);
    
    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');

    if (isE2E) {
      this.mode = 'offline';
      this.options.inMemory = true;
    }

  }

  /**
   * Updates the server configuration and resets the active client.
   * Used for switching between different official servers.
   */
  updateConfig(config: DBConfig): void {
    this.config = config;
    this._realClient = null; // Forces re-initialization on next call
    logger.info('DBRouter', `Server configuration updated: ${config.url}`);
  }

  /**
   * Internal lazy initializer for Supabase client.
   */
  _ensureClient(): SupabaseClient | null {
    if (this._realClient) return this._realClient;
    
    const { url, key } = this.config;
    if (!url || !key) {
      throw new Error('[DBRouter] Missing Supabase configuration (URL or API key). Online operations cannot proceed.');
    }

    try {
      logger.info('DBRouter', 'Lazily initializing Supabase client...');
      this._realClient = createClient(url, key, {
        realtime: {
          reconnectAfterMs: (tries) => {
const MAX_RECONNECT_INTERVAL_MS = 300000;
const INITIAL_RECONNECT_BACKOFF_MS = [1000, 2000, 5000] as const;
const DEFAULT_RECONNECT_BACKOFF_MS = 5000;

            if (tries > 3) return MAX_RECONNECT_INTERVAL_MS; // Intentar cada 5 minutos en lugar de cada pocos segundos
            return INITIAL_RECONNECT_BACKOFF_MS[tries - 1] || DEFAULT_RECONNECT_BACKOFF_MS;
          }
        }
      });
      return this._realClient;
    } catch (err) {
      throw new Error(`[DBRouter] Failed to initialize Supabase client: ${(err as Error).message}`);
    }
  }

  /**
   * Getter for the real Supabase client (Lazy).
   */
  get realClient(): SupabaseClient | null {
    if (this.mode === 'offline') return null;
    return this._ensureClient();
  }

  /**
   * Identifies if the instance is running in a local context.
   */
  get isLocal(): boolean {
    return this.mode === 'offline';
  }

  /**
   * Time Mocking Methods (SECURITY: ONLY FOR OFFLINE MODE)
   */
  setTimeOffset(ms: number): void {
    this._timeOffset = ms;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('time-sync-update', { detail: { offset: ms } }));
    }
    logger.info('DBRouter', `Time offset set to: ${ms}ms`);
  }

  setMockTime(dateStr: string): void {
    try {
      const targetDate = Temporal.Instant.from(dateStr);
      const offset = targetDate.epochMilliseconds - Temporal.Now.instant().epochMilliseconds;
      this.setTimeOffset(offset);
    } catch (e) {
      throw new Error(`[DBRouter] Invalid mock time format '${dateStr}': ${(e as Error).message}`);
    }
  }

  resetTime(): void {
    this.setTimeOffset(0);
  }

  getTimeOffset(): number {
    return this._timeOffset || 0;
  }

  /**
   * Initializes session monitoring for Last-In-Wins logic.
   */
  async initSession(userId: string, sessionId: string): Promise<void> {
    logger.info('DBRouter', `Setting session to ${sessionId} for user ${userId}`);
    this.currentSessionId = sessionId;
    
    const client = this.realClient;
    if (this.mode === 'offline' || !client || userId === 'local_user' || userId.startsWith('local_')) return;

    try {
      await client
        .from('profiles')
        .update({ current_session_id: sessionId })
        .eq('id', userId);
      logger.success('DBRouter', 'Session ID updated in DB.');
    } catch (err) {
      throw new Error(`[DBRouter] Failed to set session ID in DB: ${(err as Error).message}`);
    }

    if (this.userSubscription) this.userSubscription.unsubscribe();
    
    this.userSubscription = client
      .channel(`session_lock:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload: { new?: { current_session_id?: string }, old?: { current_session_id?: string } }) => {
        const newSessionId = payload?.new?.current_session_id;
        const oldSessionId = payload?.old?.current_session_id;
        logger.debug('DBRouter', `RT Update: New=${newSessionId}, Old=${oldSessionId}, CurrentLocal=${this.currentSessionId}`);
        
        if (newSessionId && this.currentSessionId && newSessionId !== this.currentSessionId) {
          logger.warn('DBRouter', `SESSION CONFLICT DETECTED! DB:${newSessionId} !== Local:${this.currentSessionId}`);
          this.handleSessionConflict();
        }
      })
      .subscribe();

    this.initSystemConfigSubscription();
  }

  /**
   * Listens for server app_version updates in real-time.
   */
  initSystemConfigSubscription(): void {
    const client = this.realClient;
    if (this.mode === 'offline' || !client || this.systemConfigSubscription) return;

    try {
      this.systemConfigSubscription = client
        .channel('system_config_version')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'system_config',
          filter: 'key=eq.app_version'
        }, (payload: { new?: { value?: unknown } }) => {
          const rawVal = payload?.new?.value;
          const newServerVer = parseAppVersion(rawVal);
          const clientVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v0.5.0';
          if (newServerVer && clientVer && clientVer < newServerVer) {
            logger.warn('DBRouter', `Realtime update: New server version detected (${newServerVer}) > client (${clientVer}). Emitting PWA_NEED_REFRESH.`);
            import('../events/gameBus.ts').then(({ gameBus }) => {
              gameBus.emit('PWA_NEED_REFRESH');
            });
          }
        })
        .subscribe();
    } catch (e) {
      logger.warn('DBRouter', 'Failed to subscribe to system_config realtime updates:', e);
    }
  }

  handleSessionConflict(): void {
    logger.error('DBRouter', 'SESSION CONFLICT DETECTED!');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-conflict'));
    }
  }

  /**
   * Dynamically switches the router mode.
   * @param {String} mode - 'online' | 'offline'
   */
  setMode(mode: DBMode): void {
    if (this.mode === mode) return;
    logger.info('DBRouter', `Switching mode from ${this.mode} to ${mode.toUpperCase()}`); // text-ok
    this.mode = mode;
    
    if (mode === 'offline') {
      initSQLite(this.options);
    }
  }

  /**
   * Returns a ProxyQuery instance for the specified table.
   */
  from(table: string): ProxyQuery {
    return new ProxyQuery(this, table);
  }

  /**
   * Returns a reliable timestamp.
   * If offline, uses local Temporal.Now.instant().epochMilliseconds.
   * If online, fetches server time from Supabase.
   */
  async getServerTime(): Promise<number> {
    const baseTime = await this._getRawServerTime();
    // SECURITY: Offset is strictly for local/offline testing
    const offset = this.mode === 'offline' ? (this._timeOffset || 0) : 0;
    return baseTime + offset;
  }

  /** @private */
  async _getRawServerTime(): Promise<number> {
    if (this.mode === 'offline') {
      return Temporal.Now.instant().epochMilliseconds;
    }
    
    const client = this.realClient;
    if (!client) return Temporal.Now.instant().epochMilliseconds;

    try {
      // Prioritize a dedicated RPC for server time to avoid local clock manipulation
      const res = await client.rpc('fn_get_server_time') as { data: unknown; error: unknown };
      const { data, error } = res;
      if (!error && data) return Temporal.Instant.fromEpochMilliseconds(Number(data)).epochMilliseconds;
      
      throw new Error(`[DBRouter] fn_get_server_time RPC returned error: ${String(error)}`);
    } catch (e) {
      throw new Error(`[DBRouter] getServerTime RPC error: ${(e as Error).message}`);
    }
  }

  /**
   * Emulates Supabase RPC calls.
   */
  async rpc(name: string, params: Record<string, unknown> = {}): Promise<DBResponse> {
    if (this.mode === 'offline') {
      return emulateOfflineRpc(name, params);
    }

    const client = this.realClient;
    if (!client) return { data: null, error: 'Offline' };

    // Online mode: direct call to Supabase
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

  /**
   * Emulates Supabase Auth API.
   */
  get auth() {
    if (this.mode === 'offline') {
      const localUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('pokevicio_local_user') : null;
      const localUser = localUserStr ? JSON.parse(localUserStr) as User : null;
      const defaultUser: User = { id: 'local_user', email: 'offline@pkv.io', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' };
      const user = localUser || defaultUser;
      const session: Session = { access_token: 'mock', token_type: 'bearer', user, expires_at: 9999999999, expires_in: 9999999999, refresh_token: 'mock' };
      
      return {
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user, session }, error: null }),
        signUp: async () => ({ data: { user, session }, error: null }),
        getUser: async () => ({ data: { user }, error: null }),
        getSession: async () => ({ data: { session }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      };
    }
    
    const client = this.realClient;
    if (!client) {
      throw new Error('[DBRouter] Attempted to access Auth while online client is not initialized.');
    }

    return client.auth;
  }

  /**
   * Emulates Supabase Realtime Channels using BroadcastChannel in offline mode.
   */
  channel(name: string): RealtimeChannel {
    if (this.mode === 'offline') {
      const bc = new BroadcastChannel(name);
      const mock: Partial<RealtimeChannel> = {
        on(_type: unknown, _filter: unknown, cb: unknown) {
          bc.onmessage = (ev) => {
            if (ev.data && typeof ev.data === 'object') {
              (cb as (payload: unknown) => void)(ev.data);
            }
          };
          return mock as RealtimeChannel;
        },
        subscribe(cb?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void) {
          if (cb) gsap.delayedCall(0.01, () => cb('SUBSCRIBED' as REALTIME_SUBSCRIBE_STATES));
          return mock as RealtimeChannel;
        },
        async send(args: unknown) {
          bc.postMessage(args);
          return 'ok' as const;
        },
        async unsubscribe() { bc.close(); return 'ok' as const; }
      };
      return mock as RealtimeChannel;
    }

    const client = this.realClient;
    if (!client) {
      logger.warn('DBRouter', `Channel '${name}' requested but online client not ready. Returning mock.`);
      const noop: Partial<RealtimeChannel> = {
        on() { return noop as RealtimeChannel; },
        subscribe(cb?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void) {
          if (cb) gsap.delayedCall(0.01, () => cb('SUBSCRIBED' as REALTIME_SUBSCRIBE_STATES));
          return noop as RealtimeChannel;
        },
        async send() { return 'ok' as const; },
        async unsubscribe() { return 'ok' as const; }
      };
      return noop as RealtimeChannel;
    }

    return client.channel(name);
  }
}

/**
 * DB Compatibility Check
 * Ensures the client version is not greater than the DB version.
 */
// Use the last migration ID as the client version (Automated)
const lastMigration = DATABASE_MIGRATIONS.length > 0 ? DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1] : null;
export const CLIENT_DB_VERSION = lastMigration 
  ? parseInt(lastMigration.id.split('_')[0] || '0') 
  : 0;



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
    loadingStore.start('db_compat', 'Verificando Versión...', 'Comprobando compatibilidad de DB', false)
  }
  try {
    let dbVersion = 0;
    let rawValue: unknown = null;

    const client = router.realClient;
    if (router.mode === 'offline' || !client) {
      const results = await queryLocal("SELECT value FROM system_config WHERE key = 'db_version'");
      if (results.length > 0) rawValue = (results[0] as { value: unknown }).value;
    } else {
      const { data, error } = await client
        .from('system_config')
        .select('value')
        .eq('key', 'db_version')
        .single();
      
      if (error) {
        throw error;
      }
      if (data) rawValue = (data as { value: unknown }).value;
    }

    if (rawValue) {
      // Handle JSON strings (SQLite stores objects as JSON strings)
      if (typeof rawValue === 'string' && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
        try { rawValue = JSON.parse(rawValue); } catch (_e) { /* ignore */ }
      }
      
      const valObj = rawValue as Record<string, unknown> | null; // open-record
      const parsed = (typeof rawValue === 'object' && valObj !== null && 'db_version' in valObj) 
        ? parseInt((valObj.db_version as string | number) + '' || '0') 
        : parseInt((rawValue as string | number) + '' || '0');
      dbVersion = isNaN(parsed) ? 0 : parsed;
    }

    logger.info('DBRouter', `Compatibility Check: Client v${CLIENT_DB_VERSION} | DB v${dbVersion}`);

    const response: DBCompatibilityResponse = {
      compatible: true,
      client: CLIENT_DB_VERSION,
      db: dbVersion
    };

    if (router.mode !== 'offline' && (CLIENT_DB_VERSION > dbVersion || dbVersion === 0)) {
      response.compatible = false;
      response.error = 'OUTDATED_SERVER';
    }

    if (loadingStore) loadingStore.finish('db_compat')
    return response;
  } catch (e: unknown) {
    if (loadingStore) loadingStore.finish('db_compat')
    if (router.mode === 'offline') {
      logger.warn('DBRouter', 'Compatibility check offline lookup warning:', (e as Error).message);
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

declare const __APP_VERSION__: string;

export interface AppCompatibilityResponse {
  compatible: boolean;
  client: string;
  server: string;
  error?: 'OUTDATED_SERVER' | 'OUTDATED_CLIENT';
}

function parseAppVersion(val: unknown): string {
  if (!val) return '';
  try {
    const parsed: unknown = typeof val === 'string' ? JSON.parse(val) : val;
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      return (parsed as Record<string, string>).app_version || ''; // open-record
    }
    return '';
  } catch {
    return typeof val === 'string' ? val : '';
  }
}

export async function checkAppVersionCompatibility(router: DBRouter): Promise<AppCompatibilityResponse> {
  const clientVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v0.5.0';
  let serverVer = '';
  
  try {
    const client = router.realClient;
    if (router.mode === 'offline' || !client) {
      const results = await queryLocal("SELECT value FROM system_config WHERE key = 'app_version'");
      if (results.length > 0) {
        serverVer = parseAppVersion((results[0] as { value: unknown }).value);
      }
    } else {
      const { data, error } = await client
        .from('system_config')
        .select('value')
        .eq('key', 'app_version')
        .maybeSingle();
      if (!error && data && data.value) {
        serverVer = parseAppVersion(data.value);
      }
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
  if (import.meta.env.DEV && !(typeof process !== 'undefined' && process.env.VITEST)) {
    logger.warn('DBRouter', `[DEV] Mismatch de versión ignorado en modo desarrollo (Cliente: ${clientVer} vs Servidor: ${serverVer})`);
    return { compatible: true, client: clientVer, server: serverVer };
  }

  if (clientVer > serverVer) {
    return { compatible: false, client: clientVer, server: serverVer, error: 'OUTDATED_SERVER' };
  } else {
    return { compatible: false, client: clientVer, server: serverVer, error: 'OUTDATED_CLIENT' };
  }
}
