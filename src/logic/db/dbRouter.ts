


import { createClient, type SupabaseClient, type RealtimeChannel, type REALTIME_SUBSCRIBE_STATES, type User, type Session } from '@supabase/supabase-js';
import { ProxyQuery } from './proxyQuery.ts';
import { gsap } from 'gsap';
import { initSQLite } from './sqliteEngine.ts';
import { emulateOfflineRpc } from './sqliteRpcEmulation.ts';
import { lanRelayBridge } from './lanRelayBridge.ts';
import { parseAppVersion } from './dbCompatibility.ts';
import { logger } from '../utils/logger.ts';
import { GAME_TIMEZONE } from '../utils/timeUtils.ts';
import { cloneReactive } from '../utils/cloneUtils.ts';
import type { DBConfig, SessionMode, DBRouterOptions, DBCompatibilityResponse, DBResponse } from '@/types/system/database';

declare const __APP_VERSION__: string;

export type { DBCompatibilityResponse };

const MIN_TIMESTAMP_MS_STRING_LENGTH = 10;

/**
 * Unified Data Persistence Layer with Strict Session Isolation.
 * Routes queries to Supabase (Cloud) OR SQLite (Local), NEVER both in the same session.
 */

export class DBRouter {
  config: DBConfig;
  _realClient: SupabaseClient | null;
  mode: SessionMode;
  options: DBRouterOptions;
  _initialized: boolean;
  currentSessionId: string | null;
  userSubscription: RealtimeChannel | null;
  systemConfigSubscription: RealtimeChannel | null;
  _timeOffset: number;

  constructor(config: DBConfig = { url: '', key: '' }, mode: SessionMode = 'online', options: DBRouterOptions = {}) {
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
    if (typeof window !== 'undefined') {
      window.__GET_DB_TIME_OFFSET__ = this.getTimeOffset;
    }
    
    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
    const e2eDriver = (typeof window !== 'undefined' && window.__E2E_DRIVER__) ||
                      (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER) ||
                      'sqlite';

    if (isE2E) {
      if (e2eDriver === 'postgres') {
        this.mode = 'online';
        if (!this.config.url) {
          this.config = {
            url: 'http://127.0.0.1:54321',
            key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjI1MDAwMDAwMDB9.bWuWcdy1ICtTs7Zq7TNjum7G0VIS5je9rFlzshoeBLA'
          };
        }
      } else {
        this.mode = 'offline';
        this.options.inMemory = true;
      }
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

    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
    const e2eDriver = (typeof window !== 'undefined' && window.__E2E_DRIVER__) ||
                      (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER) ||
                      'sqlite';
    const isE2EPostgres = isE2E && e2eDriver === 'postgres';

    try {
      logger.info('DBRouter', 'Lazily initializing Supabase client...');
      this._realClient = createClient(url, key, {
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
      const clean = dateStr.trim();
      const num = Number(clean);
      let targetDate: Temporal.Instant;
      if (!isNaN(num) && clean.length >= MIN_TIMESTAMP_MS_STRING_LENGTH && !clean.includes('-') && !clean.includes('T')) {
        targetDate = Temporal.Instant.fromEpochMilliseconds(num);
      } else {
        try {
          targetDate = Temporal.Instant.from(clean);
        } catch {
          const isoClean = clean.replace(' ', 'T');
          targetDate = Temporal.PlainDateTime.from(isoClean).toZonedDateTime(GAME_TIMEZONE).toInstant();
        }
      }
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
  setMode(mode: SessionMode): void {
    if (this.mode === mode) return;
    logger.info('DBRouter', `Switching mode from ${this.mode} to ${mode.toUpperCase()}`); // text-ok: UI text display localization string
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
      if (!error && data) {
        if (typeof data === 'string') {
          return Temporal.Instant.from(data).epochMilliseconds;
        }
        if (typeof data === 'number' && Number.isFinite(data)) {
          return Temporal.Instant.fromEpochMilliseconds(data).epochMilliseconds;
        }
      }
      
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
    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
    const e2eDriver = (typeof window !== 'undefined' && window.__E2E_DRIVER__) ||
                      (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER) ||
                      'sqlite';
    const isE2EPostgres = isE2E && e2eDriver === 'postgres';

    if (this.mode === 'offline' || isE2EPostgres) {
      const localUserStr = typeof localStorage !== 'undefined' ? localStorage.getItem('pokevicio_local_user') : null;
      const localUser = localUserStr ? JSON.parse(localUserStr) as User : null;
      const defaultUser: User | null = isE2EPostgres ? null : {
        id: 'local_user',
        email: 'offline@pkv.io',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: ''
      };
      const user = localUser || defaultUser;
      const session: Session | null = user ? {
        access_token: 'mock',
        token_type: 'bearer',
        user,
        expires_at: 9999999999,
        expires_in: 9999999999,
        refresh_token: 'mock'
      } : null;
      
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
      const listeners: Array<{
        type: string;
        event?: string;
        cb: (payload: unknown) => void;
      }> = [];
      const seenMsgUids = new Set<string>();
      const MAX_SEEN_IDS = 100;

      const dispatchPayload = (rawPayload: unknown) => {
        if (!rawPayload || typeof rawPayload !== 'object') return;
        const msg = rawPayload as { type?: string; event?: string; payload?: unknown; _msgUid?: string };
        if (msg._msgUid) {
          if (seenMsgUids.has(msg._msgUid)) return;
          seenMsgUids.add(msg._msgUid);
          if (seenMsgUids.size > MAX_SEEN_IDS) {
            const first = seenMsgUids.values().next().value;
            if (first) seenMsgUids.delete(first);
          }
        }
        for (const listener of listeners) {
          if (listener.type && msg.type && listener.type !== msg.type) continue;
          if (listener.event && msg.event && listener.event !== msg.event) continue;
          listener.cb(msg);
        }
      };

      bc.onmessage = (ev: MessageEvent) => {
        dispatchPayload(ev.data);
      };

      const unsubscribeLan = lanRelayBridge.subscribe(name, (networkData: unknown) => {
        dispatchPayload(networkData);
      });

      const mock: Partial<RealtimeChannel> = {
        on(type: unknown, filter: unknown, cb: unknown) {
          const filterObj = (filter && typeof filter === 'object') ? filter as { event?: string } : {};
          listeners.push({
            type: String(type || ''),
            event: filterObj.event,
            cb: cb as (payload: unknown) => void
          });
          return mock as RealtimeChannel;
        },
        subscribe(cb?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void) {
          if (cb) gsap.delayedCall(0.01, () => cb('SUBSCRIBED' as REALTIME_SUBSCRIBE_STATES));
          return mock as RealtimeChannel;
        },
        async send(args: unknown) {
          let sanitized: Record<string, unknown>;
          try {
            sanitized = cloneReactive(args) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
          } catch {
            sanitized = (typeof args === 'object' && args !== null)
              ? { ...(args as Record<string, unknown>) } // open-record: Generic key-value data dictionary container
              : { payload: args };
          }
          if (!sanitized._msgUid) {
            sanitized._msgUid = `${Math.random().toString(36).substring(2)}_${Temporal.Now.instant().epochMilliseconds}`;
          }
          try {
            bc.postMessage(sanitized);
          } catch (postErr) {
            logger.warn('DBRouter', 'Failed to postMessage on BroadcastChannel:', postErr);
          }
          lanRelayBridge.broadcast(name, sanitized);
          return 'ok' as const;
        },
        async unsubscribe() {
          unsubscribeLan();
          bc.close();
          return 'ok' as const;
        }
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

export {
  CLIENT_DB_VERSION,
  checkDBCompatibility,
  checkAppVersionCompatibility,
  type AppCompatibilityResponse
} from './dbCompatibility.ts';

