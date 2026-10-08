import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { gsap } from 'gsap';
import { lanRelayBridge } from './lanRelayBridge.ts';
import { logger } from '../utils/logger.ts';
import { cloneReactive } from '../utils/cloneUtils.ts';

const MOCK_CHANNEL_SUBSCRIBE_DELAY_SEC = 0.01 as const;
const MAX_SEEN_IDS = 100 as const;

export function createOfflineRealtimeChannel(name: string): RealtimeChannel {
  const bc = new BroadcastChannel(name);
  const listeners: Array<{
    type: string;
    event?: string;
    cb: (payload: unknown) => void;
  }> = [];
  const seenMsgUids = new Set<string>();

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
    on(eventType: unknown, filter: unknown, cb: unknown) { // domain-ok: Open dynamic text or non-domain string payload
      const filterObj = (filter && typeof filter === 'object') ? (filter as { event?: string }) : {};
      listeners.push({
        type: String(eventType || ''),
        event: filterObj.event,
        cb: cb as (payload: unknown) => void
      });
      return mock as RealtimeChannel;
    },
    subscribe(cb?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void) {
      if (cb) gsap.delayedCall(MOCK_CHANNEL_SUBSCRIBE_DELAY_SEC, () => cb('SUBSCRIBED' as REALTIME_SUBSCRIBE_STATES));
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

export function createNoopRealtimeChannel(name: string): RealtimeChannel {
  logger.warn('DBRouter', `Channel '${name}' requested but online client not ready. Returning mock.`);
  const noop: Partial<RealtimeChannel> = {
    on() { return noop as RealtimeChannel; },
    subscribe(cb?: (status: REALTIME_SUBSCRIBE_STATES, err?: Error) => void) {
      if (cb) gsap.delayedCall(MOCK_CHANNEL_SUBSCRIBE_DELAY_SEC, () => cb('SUBSCRIBED' as REALTIME_SUBSCRIBE_STATES));
      return noop as RealtimeChannel;
    },
    async send() { return 'ok' as const; },
    async unsubscribe() { return 'ok' as const; }
  };
  return noop as RealtimeChannel;
}
