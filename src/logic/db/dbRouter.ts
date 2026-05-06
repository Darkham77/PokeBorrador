
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ProxyQuery } from './proxyQuery';
import { initSQLite, persistSQLite, queryLocal } from './sqliteEngine';
import { DATABASE_MIGRATIONS } from './migrations_data';
import { useLoadingStore } from '@/stores/loading';
import type { DBConfig, DBMode, DBRouterOptions, DBCompatibilityResponse, DBResponse } from '@/types/database';

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
  userSubscription: any;
  _timeOffset: number;

  constructor(config: DBConfig = {}, mode: DBMode = 'online', options: DBRouterOptions = {}) {
    this.config = config;
    this._realClient = null;
    this.mode = mode;
    this.options = options;
    this._initialized = false;
    this.currentSessionId = null;
    this.userSubscription = null;
    this._timeOffset = 0; // ms
    
    console.log(`[DBRouter] Initialized in STRICT ${mode.toUpperCase()} mode.`);
  }

  /**
   * Internal lazy initializer for Supabase client.
   */
  _ensureClient(): SupabaseClient | null {
    if (this._realClient) return this._realClient;
    
    const { url, key } = this.config;
    if (!url || !key) {
      console.warn('[DBRouter] Missing Supabase config. Online operations will fail.');
      return null;
    }

    try {
      console.log('[DBRouter] Lazily initializing Supabase client...');
      this._realClient = createClient(url, key);
      return this._realClient;
    } catch (err) {
      console.error('[DBRouter] Failed to initialize Supabase client:', err);
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
    console.log(`[DBRouter] Time offset set to: ${ms}ms`);
  }

  setMockTime(dateStr: string): void {
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) return;
    const offset = targetDate.getTime() - Date.now();
    this.setTimeOffset(offset);
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
    this.currentSessionId = sessionId;
    
    const client = this.realClient;
    if (this.mode === 'offline' || !client) return;

    try {
      await client
        .from('profiles')
        .update({ current_session_id: sessionId })
        .eq('id', userId);
    } catch (err) {
      console.error('[DBRouter] Failed to set session ID:', err);
    }

    if (this.userSubscription) this.userSubscription.unsubscribe();
    
    this.userSubscription = client
      .channel(`session_lock:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload: any) => {
        const newSessionId = payload.new.current_session_id;
        if (newSessionId && newSessionId !== this.currentSessionId) {
          this.handleSessionConflict();
        }
      })
      .subscribe();
  }

  handleSessionConflict(): void {
    console.warn('[DBRouter] SESSION CONFLICT DETECTED!');
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
    console.log(`[DBRouter] Switching mode from ${this.mode} to ${mode.toUpperCase()}`);
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
   * If offline, uses local Date.now().
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
      return Date.now();
    }
    
    const client = this.realClient;
    if (!client) return Date.now();

    try {
      // Prioritize a dedicated RPC for server time to avoid local clock manipulation
      const { data, error } = await client.rpc('fn_get_server_time');
      if (!error && data) return new Date(data as string).getTime();
      
      // Fallback: use a fast select if RPC fails
      return Date.now(); 
    } catch (e) {
      console.warn('[DBRouter] getServerTime error, falling back to local.', e);
      return Date.now();
    }
  }

  /**
   * Emulates Supabase RPC calls.
   */
  async rpc(name: string, params: Record<string, any> = {}): Promise<DBResponse> {
    if (this.mode === 'offline') {
      console.log(`[DBRouter] Local RPC: ${name}`, params);
      const sqliteDb = await initSQLite();

      // Implement specific local logic for critical RPCs
      if (name === 'fn_report_passive_battle') {
        const { p_opponent_id, p_result, p_report_data } = params;
        sqliteDb.run(
          `INSERT INTO passive_battle_reports (user_id, opponent_id, result, report_data) VALUES (?, ?, ?, ?)`,
          ['local_user', p_opponent_id, p_result, JSON.stringify(p_report_data)]
        );
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
    } catch (err: any) {
      const errMsg = err.message?.toLowerCase() || '';
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
  get auth(): any {
    if (this.mode === 'offline') {
      const localUser = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('pokevicio_local_user') || 'null') : null;
      const user = localUser || { id: 'local_user', email: 'offline@pkv.io' };
      
      return {
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user }, error: null }),
        getUser: async () => ({ data: { user }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
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
  channel(name: string): any {
    if (this.mode === 'offline') {
      const mockChannel = {
        on: (type: string, _config: any, _callback: any) => {
          // If only 2 args provided, config is the callback
          console.log(`[DBRouter] Mock Channel '${name}' subscribed to:`, type);
          return mockChannel; // Chainable
        },
        subscribe: (cb: any) => {
          if (cb) setTimeout(() => cb('SUBSCRIBED'), 10);
          return { unsubscribe: () => {} };
        },
        send: (payload: any) => {
          console.log(`[DBRouter] Mock Channel '${name}' send:`, payload);
          return Promise.resolve('ok');
        }
      };
      return mockChannel;
    }

    const client = this.realClient;
    if (!client) {
      console.warn(`[DBRouter] Channel '${name}' requested but online client not ready. Returning mock.`);
      // Return a basic mock that doesn't do anything to avoid crashes
      return {
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
        send: () => Promise.resolve('ok')
      };
    }

    return client.channel(name);
  }
}

/**
 * DB Compatibility Check
 * Ensures the client version is not greater than the DB version.
 */
// Use the last migration ID as the client version (Automated)
export const CLIENT_DB_VERSION = DATABASE_MIGRATIONS.length > 0 
  ? parseInt(DATABASE_MIGRATIONS[DATABASE_MIGRATIONS.length - 1].id.split('_')[0]) 
  : 0;

export async function checkDBCompatibility(router: DBRouter): Promise<DBCompatibilityResponse> {
  const loadingStore = useLoadingStore() as any;
  loadingStore.start('db_compat', 'Verificando Versión...', 'Comprobando compatibilidad de DB', false)
  try {
    let dbVersion = 0;
    let rawValue: any = null;

    const client = router.realClient;
    if (router.mode === 'offline' || !client) {
      const results = await queryLocal("SELECT value FROM system_config WHERE key = 'db_version'");
      if (results.length > 0) rawValue = results[0].value;
    } else {
      const { data, error } = await client
        .from('system_config')
        .select('value')
        .eq('key', 'db_version')
        .single();
      
      if (!error && data) rawValue = data.value;
    }

    if (rawValue) {
      // Handle JSON strings (SQLite stores objects as JSON strings)
      if (typeof rawValue === 'string' && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
        try { rawValue = JSON.parse(rawValue); } catch (_e) { /* ignore */ }
      }
      
      dbVersion = typeof rawValue === 'object' && rawValue !== null 
        ? parseInt(rawValue.db_version || 0) 
        : parseInt(rawValue || 0);
    }

    console.log(`[DBRouter] Compatibility Check: Client v${CLIENT_DB_VERSION} | DB v${dbVersion}`);

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
  } catch (e) {
    loadingStore.finish('db_compat')
    console.warn('[DBRouter] Compatibility check failed, assuming compatible.', e);
    return { compatible: true, client: CLIENT_DB_VERSION, db: 0 };
  }
}
