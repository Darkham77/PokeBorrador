/**
 * LAN WebSocket Relay Bridge for development mode (`npm run dev`).
 * Connects to the Vite dev server's WebSocket relay on `/api/dev-lan-relay`
 * to forward realtime channel broadcasts across devices on the same local network.
 */
import { logger } from '../utils/logger.ts';

export const LAN_RELAY_ACTIONS = ['subscribe', 'unsubscribe', 'broadcast'] as const;
export type LanRelayAction = (typeof LAN_RELAY_ACTIONS)[number];

interface LanRelayMessage {
  action: LanRelayAction;
  channel: string; // domain-ok: Arbitrary realtime channel name
  senderId?: string; // infra-id-ok: Ephemeral WebSocket client instance identifier
  data?: unknown;
}

type ChannelListener = (payload: unknown) => void;

class LanRelayBridge {
  private ws: WebSocket | null = null;
  private readonly clientId: string;
  private readonly channelListeners = new Map<string, Set<ChannelListener>>();
  private isConnecting = false;

  constructor() {
    this.clientId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client_${Math.random().toString(36).substring(2)}`;
  }

  get isSupported(): boolean {
    return (
      Boolean(import.meta.env.DEV) &&
      import.meta.env.MODE !== 'test' &&
      typeof window !== 'undefined' &&
      typeof window.WebSocket !== 'undefined' &&
      !(window as { __VITEST__?: boolean }).__VITEST__ &&
      !(typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test'))
    );
  }

  private ensureConnected(): void {
    if (!this.isSupported || this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;

    this.isConnecting = true;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/api/dev-lan-relay`;
      const socket = new WebSocket(url);

      socket.onopen = () => {
        this.ws = socket;
        this.isConnecting = false;
        logger.info('LanRelayBridge', 'Connected to LAN WebSocket relay');
        for (const channel of this.channelListeners.keys()) {
          this.sendRaw({ action: 'subscribe', channel });
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(String(event.data)) as LanRelayMessage;
          if (msg.action === 'broadcast' && msg.channel && msg.senderId !== this.clientId) {
            const listeners = this.channelListeners.get(msg.channel);
            if (listeners) {
              for (const cb of listeners) {
                cb(msg.data);
              }
            }
          }
        } catch {
          // Ignore parse errors safely
        }
      };

      socket.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
      };

      socket.onerror = () => {
        this.ws = null;
        this.isConnecting = false;
      };
    } catch (err: unknown) {
      this.isConnecting = false;
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('LanRelayBridge', `Failed to initialize LAN relay: ${msg}`);
    }
  }

  subscribe(channel: string, listener: ChannelListener): () => void {
    if (!this.isSupported) return () => {};

    let set = this.channelListeners.get(channel);
    if (!set) {
      set = new Set();
      this.channelListeners.set(channel, set);
    }
    set.add(listener);

    this.ensureConnected();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendRaw({ action: 'subscribe', channel });
    }

    return () => {
      set?.delete(listener);
      if (set?.size === 0) {
        this.channelListeners.delete(channel);
        this.sendRaw({ action: 'unsubscribe', channel });
      }
    };
  }

  broadcast(channel: string, data: unknown): void {
    if (!this.isSupported) return;

    this.ensureConnected();
    this.sendRaw({
      action: 'broadcast',
      channel,
      senderId: this.clientId,
      data
    });
  }

  private sendRaw(msg: LanRelayMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

export const lanRelayBridge = new LanRelayBridge();
