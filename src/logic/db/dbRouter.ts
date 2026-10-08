import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { ProxyQuery } from './proxyQuery.ts';
import { initSQLite } from './sqliteEngine.ts';
import { logger } from '../utils/logger.ts';
import type { DBConfig, SessionMode, DBRouterOptions, DBCompatibilityResponse, DBResponse } from '@/types/system/database';
import { createOfflineAuthApi } from './dbOfflineAuth.ts';
import { createOfflineRealtimeChannel, createNoopRealtimeChannel } from './dbOfflineRealtime.ts';
import { DBTimeCoordinator } from './dbTimeCoordinator.ts';
import { DBSessionCoordinator } from './dbSessionCoordinator.ts';
import { resolveInitialDbSession, createSupabaseClient } from './dbClientFactory.ts';
import { executeRouterRpc } from './dbRpcDispatcher.ts';

export type { DBCompatibilityResponse };

/**
 * Unified Data Persistence Layer with Strict Session Isolation.
 * Routes queries to Supabase (Cloud) OR SQLite (Local), NEVER both in the same session.
 */
export class DBRouter {
  config: DBConfig;
  _realClient: SupabaseClient | null = null;
  mode: SessionMode;
  options: DBRouterOptions;
  _initialized = false;
  private _timeCoord = new DBTimeCoordinator();
  private _sessionCoord = new DBSessionCoordinator();

  constructor(config: DBConfig = { url: '', key: '' }, mode: SessionMode = 'online', options: DBRouterOptions = {}) {
    this.options = options;
    const initial = resolveInitialDbSession(config, mode, options);
    this.config = initial.config;
    this.mode = initial.mode;
    this.getTimeOffset = this.getTimeOffset.bind(this);
  }

  get currentSessionId(): string | null {
    return this._sessionCoord.currentSessionId;
  }

  set currentSessionId(v: string | null) {
    this._sessionCoord.currentSessionId = v;
  }

  get userSubscription(): RealtimeChannel | null {
    return this._sessionCoord.userSubscription;
  }

  set userSubscription(v: RealtimeChannel | null) {
    this._sessionCoord.userSubscription = v;
  }

  get systemConfigSubscription(): RealtimeChannel | null {
    return this._sessionCoord.systemConfigSubscription;
  }

  set systemConfigSubscription(v: RealtimeChannel | null) {
    this._sessionCoord.systemConfigSubscription = v;
  }

  get _timeOffset(): number {
    return this._timeCoord.timeOffset;
  }

  set _timeOffset(v: number) {
    this._timeCoord.setTimeOffset(v);
  }

  updateConfig(config: DBConfig): void {
    this.config = config;
    this._realClient = null;
    logger.info('DBRouter', `Server configuration updated: ${config.url}`);
  }

  _ensureClient(): SupabaseClient | null {
    if (!this._realClient) {
      this._realClient = createSupabaseClient(this.config);
    }
    return this._realClient;
  }

  get realClient(): SupabaseClient | null {
    return this.mode === 'offline' ? null : this._ensureClient();
  }

  get isLocal(): boolean {
    return this.mode === 'offline';
  }

  setTimeOffset(ms: number): void {
    this._timeCoord.setTimeOffset(ms);
  }

  setMockTime(dateStr: string): void {
    this._timeCoord.setMockTime(dateStr);
  }

  resetTime(): void {
    this._timeCoord.resetTime();
  }

  getTimeOffset(): number {
    return this._timeCoord.getTimeOffset();
  }

  async initSession(userId: string, sessionId: string): Promise<void> {
    await this._sessionCoord.initSession(userId, sessionId, this.mode, this.realClient);
  }

  initSystemConfigSubscription(): void {
    this._sessionCoord.initSystemConfigSubscription(this.mode, this.realClient);
  }

  handleSessionConflict(): void {
    this._sessionCoord.handleSessionConflict();
  }

  setMode(mode: SessionMode): void {
    if (this.mode === mode) return;
    logger.info('DBRouter', `Switching mode from ${this.mode} to ${mode.toUpperCase()}`); // text-ok: UI text display localization string
    this.mode = mode;

    if (mode === 'offline') {
      initSQLite(this.options);
    }
  }

  from(table: string): ProxyQuery {
    return new ProxyQuery(this, table);
  }

  async getServerTime(): Promise<number> {
    return this._timeCoord.getServerTime(this.mode, this.realClient);
  }

  async _getRawServerTime(): Promise<number> {
    return this._timeCoord._getRawServerTime(this.mode, this.realClient);
  }

  async rpc(name: string, params: Record<string, unknown> = {}): Promise<DBResponse> {
    return executeRouterRpc(this.mode, this.realClient, name, params);
  }

  get auth() {
    const isE2E = (typeof window !== 'undefined' && Boolean(window.__E2E__)) ||
                  (typeof process !== 'undefined' && process.env.VITE_E2E === 'true');
    const e2eDriver = (typeof window !== 'undefined' && window.__E2E_DRIVER__) ||
                      (typeof process !== 'undefined' && process.env.SIM_DB_DRIVER) ||
                      'sqlite';
    const isE2EPostgres = isE2E && e2eDriver === 'postgres';

    if (this.mode === 'offline' || isE2EPostgres) {
      return createOfflineAuthApi(isE2EPostgres);
    }

    const client = this.realClient;
    if (!client) {
      throw new Error('[DBRouter] Attempted to access Auth while online client is not initialized.');
    }

    return client.auth;
  }

  channel(name: string): RealtimeChannel {
    if (this.mode === 'offline') {
      return createOfflineRealtimeChannel(name);
    }

    const client = this.realClient;
    return client ? client.channel(name) : createNoopRealtimeChannel(name);
  }
}

export {
  checkDBCompatibility,
  checkAppVersionCompatibility,
  type AppCompatibilityResponse
} from './dbCompatibility.ts';
