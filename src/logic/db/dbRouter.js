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
   */
  constructor(supabaseClient, mode = 'online') {
    this._realClient = supabaseClient;
    this.mode = mode;
    this._initialized = false;
    
    console.log(`[DBRouter] Initialized in STRICT ${mode.toUpperCase()} mode.`);
    
    if (mode === 'offline') {
      initSQLite();
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
      const { data, error } = await this._realClient.rpc('fn_get_server_time');
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
    return this._realClient.rpc(name, params);
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
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      };
    }
    return this._realClient.auth;
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
    return this._realClient.channel(name);
  }
}
