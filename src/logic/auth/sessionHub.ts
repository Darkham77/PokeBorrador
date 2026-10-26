import { supabase } from '../db/supabase.ts';
import { gameBus } from '../events/gameBus.ts';
import { logger } from '../utils/logger.ts';
import { SESSION_ID } from './sessionId.ts';

/**
 * Session Hub - Multi-tab and Multi-device synchronization.
 * Implements "Last-In-Wins" logic for save-game locking.
 */

const sessionState: {
  channel: BroadcastChannel | null;
  userId: string | null;
  isLocked: boolean;
} = {
  channel: null,
  userId: null,
  isLocked: false
};

export function initSessionHub(userId: string): void {
  if (typeof globalThis.window === 'undefined') return;
  sessionState.userId = userId;
  logger.info('SessionHub', `Initializing for user ${userId} | Session: ${SESSION_ID}`);

  // 1. Local Synchronization (BroadcastChannel)
  if (!sessionState.channel) {
    sessionState.channel = new BroadcastChannel('pv_session_hub');
    sessionState.channel.onmessage = (event) => {
      const data = event.data as { type?: string; sessionId?: string } | null;
      if (data?.type === 'NEW_SESSION' && data.sessionId !== SESSION_ID) {
        logger.warn('SessionHub', 'Local session conflict detected!');
        triggerLock();
      }
    };
  }

  // Notify other tabs in this browser
  sessionState.channel.postMessage({ type: 'NEW_SESSION', sessionId: SESSION_ID });

  // 2. Global Synchronization (Supabase)
  if (supabase.mode === 'online') {
    supabase.initSession(userId, SESSION_ID).catch((err) => {
      logger.error('SessionHub', 'Error initializing global session', err);
    });

    // Listen for conflict event from DBRouter
    globalThis.addEventListener('session-conflict', () => {
      logger.warn('SessionHub', 'Global session conflict detected!');
      triggerLock();
    });
  }
}

function triggerLock(): void {
  if (sessionState.isLocked) return;
  sessionState.isLocked = true;

  logger.warn('SessionHub', 'WRITE PERMISSIONS REVOKED. Instance is now Read-Only.');

  // Notify UI via GameBus or Custom Event
  globalThis.dispatchEvent(new CustomEvent('pv-save-lock'));
  gameBus.emit('SESSION_LOCKED');
}

export function getSessionId(): `${string}-${string}-${string}-${string}-${string}` {
  return SESSION_ID;
}

export function isSaveLocked(): boolean {
  return sessionState.isLocked;
}

/**
 * Re-claims control of the session for the current tab.
 * Updates the database and notifies other tabs.
 */
export async function reclaimControl(): Promise<void> {
  if (!sessionState.userId) return;

  sessionState.isLocked = false;
  logger.info('SessionHub', 'Reclaiming control of the session...');

  if (supabase.mode === 'online') {
    await supabase.initSession(sessionState.userId, SESSION_ID);
  }

  if (sessionState.channel) {
    sessionState.channel.postMessage({ type: 'NEW_SESSION', sessionId: SESSION_ID });
  }

  // Notify UI
  globalThis.dispatchEvent(new CustomEvent('pv-save-unlock'));
}
