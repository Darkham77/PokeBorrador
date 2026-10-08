import { logger } from '../utils/logger.ts';
import { parseAppVersion } from './dbCompatibility.ts';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { SessionMode } from '@/types/system/database';

declare const __APP_VERSION__: string;

export class DBSessionCoordinator {
  currentSessionId: string | null = null;
  userSubscription: RealtimeChannel | null = null;
  systemConfigSubscription: RealtimeChannel | null = null;

  async initSession(
    userId: string,
    sessionId: string,
    mode: SessionMode,
    client: SupabaseClient | null
  ): Promise<void> {
    logger.info('DBRouter', `Setting session to ${sessionId} for user ${userId}`);
    this.currentSessionId = sessionId;

    if (mode === 'offline' || !client || userId === 'local_user' || userId.startsWith('local_')) return;

    try {
      await client
        .from('profiles')
        .update({ current_session_id: sessionId })
        .eq('id', userId);
      logger.success('DBRouter', 'Session ID updated in DB.');
    } catch (err) {
      throw new Error(`[DBRouter] Failed to set session ID in DB: ${(err as Error).message}`, { cause: err });
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

    this.initSystemConfigSubscription(mode, client);
  }

  initSystemConfigSubscription(mode: SessionMode, client: SupabaseClient | null): void {
    if (mode === 'offline' || !client || this.systemConfigSubscription) return;

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
              gameBus.emit('OUTDATED_CLIENT_DETECTED', { client: clientVer, server: newServerVer });
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
}
