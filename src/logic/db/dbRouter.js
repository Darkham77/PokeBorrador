/**
 * src/logic/db/dbRouter.js
 * Unified Data Persistence Layer with Strict Session Isolation.
 * Routes queries to Supabase (Cloud) OR SQLite (Local), NEVER both in the same session.
 */
import { ProxyQuery } from './proxyQuery';
import { initSQLite, persistSQLite, queryLocal, getRawSqlite } from './sqliteEngine';

export class DBRouter {
  /**
   * @param {Object} supabaseClient - The initialized Supabase client.
   * @param {String} mode - 'online' | 'offline'
   * @param {Object} options - Options for local DB (e.g., { inMemory: true })
   */
  constructor(supabaseClient, mode = 'online', options = {}) {
    this.realClient = supabaseClient;
    this.mode = mode;
    this.options = options;
    this._initialized = false;
    this.currentSessionId = null;
    this.userSubscription = null;
    
    console.log(`[DBRouter] Initialized in STRICT ${mode.toUpperCase()} mode.`);
    
    if (mode === 'offline') {
      initSQLite(options);
    }
  }

  /**
   * Initializes session monitoring for Last-In-Wins logic.
   */
  async initSession(userId, sessionId) {
    this.currentSessionId = sessionId;
    
    if (this.mode === 'offline' || !this.realClient) return;

    try {
      await this.realClient
        .from('profiles')
        .update({ current_session_id: sessionId })
        .eq('id', userId);
    } catch (err) {
      console.error('[DBRouter] Failed to set session ID:', err);
    }

    if (this.userSubscription) this.userSubscription.unsubscribe();
    
    this.userSubscription = this.realClient
      .channel(`session_lock:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload) => {
        const newSessionId = payload.new.current_session_id;
        if (newSessionId && newSessionId !== this.currentSessionId) {
          this.handleSessionConflict();
        }
      })
      .subscribe();
  }

  handleSessionConflict() {
    console.warn('[DBRouter] SESSION CONFLICT DETECTED!');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-conflict'));
    }
  }

  /**
   * Dynamically switches the router mode.
   * @param {String} mode - 'online' | 'offline'
   */
  setMode(mode) {
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
  from(table) {
    return new ProxyQuery(this, table);
  }

  /**
   * Returns a reliable timestamp.
   * If offline, uses local Date.now().
   * If online, fetches server time from Supabase.
   */
  async getServerTime() {
    if (this.mode === 'offline') {
      return Date.now();
    }
    
    try {
      // Prioritize a dedicated RPC for server time to avoid local clock manipulation
      const { data, error } = await this.realClient.rpc('fn_get_server_time');
      if (!error && data) return new Date(data).getTime();
      
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
  async rpc(name, params = {}) {
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

    // Online mode: direct call to Supabase
    return this.realClient.rpc(name, params);
  }

  /**
   * Emulates Supabase Auth API.
   */
  get auth() {
    if (this.mode === 'offline') {
      return {
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: { id: 'local_user', email: 'offline@pkv.io' } }, error: null }),
        getUser: async () => ({ data: { user: { id: 'local_user' } }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      };
    }
    return this.realClient.auth;
  }

  /**
   * Emulates Supabase Realtime Channels.
   */
  channel(name) {
    if (this.mode === 'offline') {
      return { 
        on: () => ({ subscribe: () => ({}) }), 
        subscribe: () => ({}) 
      };
    }
    return this.realClient.channel(name);
  }
}

/**
 * DB Compatibility Check
 * Ensures the client version is not greater than the DB version.
 */
export const CLIENT_DB_VERSION = 202604180100;

export async function checkDBCompatibility(router) {
  try {
    let dbVersion = 0;

    if (router.mode === 'offline' || !router.realClient) {
      const results = await queryLocal("SELECT value FROM config WHERE key = 'db_version'");
      if (results.length > 0) dbVersion = parseInt(results[0].value);
    } else {
      const { data, error } = await router.realClient
        .from('system_config')
        .select('value')
        .eq('key', 'db_version')
        .single();
      
      if (!error && data) {
        dbVersion = typeof data.value === 'object' ? data.value.db_version : parseInt(data.value);
      }
    }

    console.log(`[DBRouter] Compatibility Check: Client v${CLIENT_DB_VERSION} | DB v${dbVersion}`);

    if (router.mode !== 'offline' && CLIENT_DB_VERSION > dbVersion) {
      return { 
        compatible: false, 
        error: 'OUTDATED_SERVER', 
        client: CLIENT_DB_VERSION, 
        db: dbVersion 
      };
    }

    return { compatible: true };
  } catch (e) {
    console.warn('[DBRouter] Compatibility check failed, assuming compatible.', e);
    return { compatible: true };
  }
}
