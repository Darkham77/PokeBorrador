import { Temporal } from '@js-temporal/polyfill'

import { createClient, type SupabaseClient, type RealtimeChannel, type User, type Session } from '@supabase/supabase-js';
import { ProxyQuery } from './proxyQuery';
import { initSQLite, persistSQLite, queryLocal } from './sqliteEngine';
import { DATABASE_MIGRATIONS } from './migrations_data';
import { useLoadingStore } from '@/stores/loading';
import { logger } from '../utils/logger';
import type { DBConfig, DBMode, DBRouterOptions, DBCompatibilityResponse, DBResponse } from '@/types/database';

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
  _timeOffset: number;

  constructor(config: DBConfig = { url: '', key: '' }, mode: DBMode = 'online', options: DBRouterOptions = {}) {
    this.config = config;
    this._realClient = null;
    this.mode = mode;
    this.options = options;
    this._initialized = false;
    this.currentSessionId = null;
    this.userSubscription = null;
    this._timeOffset = 0; // ms
    
    logger.info('DBRouter', `Initialized in STRICT ${mode.toUpperCase()} mode.`);
  }

  /**
   * Internal lazy initializer for Supabase client.
   */
  _ensureClient(): SupabaseClient | null {
    if (this._realClient) return this._realClient;
    
    const { url, key } = this.config;
    if (!url || !key) {
      logger.warn('DBRouter', 'Missing Supabase config. Online operations will fail.');
      return null;
    }

    try {
      logger.info('DBRouter', 'Lazily initializing Supabase client...');
      this._realClient = createClient(url, key);
      return this._realClient;
    } catch (err) {
      logger.error('DBRouter', 'Failed to initialize Supabase client:', (err as Error).message);
      return null;
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
    } catch (_e) {
      logger.error('DBRouter', `Invalid mock time format: ${dateStr}`);
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
    if (this.mode === 'offline' || !client) return;

    try {
      await client
        .from('profiles')
        .update({ current_session_id: sessionId })
        .eq('id', userId);
      logger.success('DBRouter', 'Session ID updated in DB.');
    } catch (err) {
      logger.error('DBRouter', 'Failed to set session ID:', (err as Error).message);
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
    logger.info('DBRouter', `Switching mode from ${this.mode} to ${mode.toUpperCase()}`);
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
      const { data, error } = await client.rpc('fn_get_server_time');
      if (!error && data) return Temporal.Instant.fromEpochMilliseconds(Number(data)).epochMilliseconds;
      
      // Fallback: use a fast select if RPC fails
      return Temporal.Now.instant().epochMilliseconds; 
    } catch (e) {
      logger.warn('DBRouter', 'getServerTime error, falling back to local.', (e as Error).message);
      return Temporal.Now.instant().epochMilliseconds;
    }
  }

  /**
   * Emulates Supabase RPC calls.
   */
  async rpc(name: string, params: Record<string, unknown> = {}): Promise<DBResponse> {
    if (this.mode === 'offline') {
      logger.debug('DBRouter', `Local RPC: ${name}`, params);
      const sqliteDb = await initSQLite();

      // Implement specific local logic for critical RPCs
      if (name === 'fn_report_passive_battle') {
        const { p_opponent_id, p_result, p_report_data } = params;
        if (sqliteDb && typeof sqliteDb.run === 'function') {
          sqliteDb.run(
            `INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data) VALUES (?, ?, ?, ?)`,
            ['local_user', p_opponent_id, p_result, JSON.stringify(p_report_data)]
          );
        }
        await persistSQLite();
        return { data: { success: true }, error: null };
      }

      // Default mock success for other RPCs in offline mode
      return { data: { success: true }, error: null };
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
      const user = localUser || { id: 'local_user', email: 'offline@pkv.io' } as User;
      const session = { access_token: 'mock', token_type: 'bearer', user, expires_at: 9999999999 } as unknown as Session;
      
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
   * Emulates Supabase Realtime Channels.
   */
  channel(name: string): RealtimeChannel {
    if (this.mode === 'offline') {
      const mockChannel = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on: (type: any, _filter: any, _callback: any) => {
          logger.info('DBRouter', `Mock Channel '${name}' subscribed to: ${type}`);
          return mockChannel; 
        },
        subscribe: (cb?: (status: string) => void) => {
          if (cb) setTimeout(() => cb('SUBSCRIBED'), 10);
          return { unsubscribe: () => {} };
        },
        send: (_args: unknown) => {
          return Promise.resolve('ok');
        },
        unsubscribe: () => {}
      };
      return mockChannel as unknown as RealtimeChannel;
    }

    const client = this.realClient;
    if (!client) {
      logger.warn('DBRouter', `Channel '${name}' requested but online client not ready. Returning mock.`);
      // Return a basic mock that doesn't do anything to avoid crashes
      const basicMock = {
        on: () => basicMock,
        subscribe: (cb?: (status: string) => void) => {
          if (cb) setTimeout(() => cb('SUBSCRIBED'), 10);
          return { unsubscribe: () => {} };
        },
        send: () => Promise.resolve('ok'),
        unsubscribe: () => {}
      } as unknown as RealtimeChannel;
      return basicMock;
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
  const loadingStore = useLoadingStore();
  loadingStore.start('db_compat', 'Verificando Versión...', 'Comprobando compatibilidad de DB', false)
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
      
      if (!error && data) rawValue = (data as { value: unknown }).value;
    }

    if (rawValue) {
      // Handle JSON strings (SQLite stores objects as JSON strings)
      if (typeof rawValue === 'string' && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
        try { rawValue = JSON.parse(rawValue); } catch (_e) { /* ignore */ }
      }
      
      const valObj = rawValue as Record<string, unknown> | null;
      dbVersion = (typeof rawValue === 'object' && valObj !== null && 'db_version' in valObj) 
        ? parseInt((valObj.db_version as string | number) + '' || '0') 
        : parseInt((rawValue as string | number) + '' || '0');
    }

    logger.info('DBRouter', `Compatibility Check: Client v${CLIENT_DB_VERSION} | DB v${dbVersion}`);

    const response: DBCompatibilityResponse = {
      compatible: true,
      client: CLIENT_DB_VERSION,
      db: dbVersion
    };

    if (router.mode !== 'offline' && CLIENT_DB_VERSION > dbVersion) {
      response.compatible = false;
      response.error = 'OUTDATED_SERVER';
    }

    loadingStore.finish('db_compat')
    return response;
  } catch (e: unknown) {
    loadingStore.finish('db_compat')
    logger.warn('DBRouter', 'Compatibility check failed, assuming compatible.', (e as Error).message);
    return { compatible: true, client: CLIENT_DB_VERSION, db: 0 };
  }
}
