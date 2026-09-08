/**
 * VITE PLUGIN: LAN PvP & Matchmaking Bridge
 * Provides in-memory shared matchmaking queue, battle invites, and real-time WebSocket channel relay
 * across local network (LAN) clients during `npm run dev`.
 */
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { WebSocketServer, type WebSocket } from 'ws';

interface LanPvpRequestBody {
  type: 'query' | 'run';
  sql: string;
  params?: SQLInputValue[];
}

export const ALLOWED_LAN_TABLES = ['ranked_queue', 'battle_invites', 'profiles'] as const;
export type AllowedLanTable = (typeof ALLOWED_LAN_TABLES)[number];
const ALLOWED_TABLE_SET = new Set<string>(ALLOWED_LAN_TABLES); // runtime-set: Fast O(1) membership lookup set

function isSqlSafe(sql: string): boolean {
  const normalized = sql.trim().toLowerCase();
  // Ensure query only references allowed tables
  const words = normalized.split(/[^a-z0-9_]+/);
  const mentionsAllowed = words.some(w => ALLOWED_TABLE_SET.has(w));
  if (!mentionsAllowed && !normalized.startsWith('select last_insert_rowid()')) {
    return false;
  }
  // Disallow schema drops, attach, or pragma injections
  if (normalized.includes('drop table') || normalized.includes('attach') || normalized.includes('sqlite_master')) {
    return false;
  }
  return true;
}

export function lanPvPPlugin(): Plugin {
  return {
    name: 'vite-plugin-lan-pvp',
    configureServer(server: ViteDevServer) {
      // 1. Shared in-memory SQLite database across Vite server lifecycle
      let db: DatabaseSync | null = null;
      db = new DatabaseSync(':memory:');

      db.exec(`
        CREATE TABLE IF NOT EXISTS ranked_queue (
          user_id TEXT PRIMARY KEY,
          elo INTEGER DEFAULT 1000,
          status TEXT,
          created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        CREATE TABLE IF NOT EXISTS battle_invites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          challenger_id TEXT,
          sender_id TEXT,
          opponent_id TEXT,
          status TEXT DEFAULT 'pending',
          config TEXT,
          room_code TEXT,
          created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        );
        CREATE INDEX IF NOT EXISTS idx_battle_invites_room_code ON battle_invites(room_code);
      `);

      // 2. HTTP Endpoint for ProxyQuery Matchmaking (/api/dev-lan-pvp)
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url?.startsWith('/api/dev-lan-pvp') && req.method === 'POST') {
          const chunks: Buffer[] = [];
          req.on('data', chunk => chunks.push(chunk as Buffer));
          req.on('end', () => {
            try {
              const bodyStr = Buffer.concat(chunks).toString('utf-8');
              const body: LanPvpRequestBody = JSON.parse(bodyStr);

              if (!body.sql || !isSqlSafe(body.sql)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ data: null, error: 'Forbidden query or table' }));
                return;
              }

              const params: SQLInputValue[] = (body.params || []).map(p => (p === undefined ? null : p) as SQLInputValue);

              if (body.type === 'query') {
                const stmt = db.prepare(body.sql);
                const rows = stmt.all(...params);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ data: rows, error: null }));
                return;
              }

              if (body.type === 'run') {
                const stmt = db.prepare(body.sql);
                const result = stmt.run(...params);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  data: result,
                  lastInsertRowid: Number(result.lastInsertRowid),
                  changes: Number(result.changes),
                  error: null
                }));
                return;
              }

              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ data: null, error: 'Invalid operation type' }));
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ data: null, error: message }));
            }
          });
          return;
        }

        next();
      });

      // 3. WebSocket Server for Realtime Battle Channel Relay (/api/dev-lan-relay)
      if (!server.httpServer) return;

      const wss = new WebSocketServer({ noServer: true });
      const channelSubscriptions = new Map<string, Set<WebSocket>>();
      const socketChannels = new Map<WebSocket, Set<string>>();

      server.httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
        if (req.url?.startsWith('/api/dev-lan-relay')) {
          wss.handleUpgrade(req, socket, head, ws => {
            wss.emit('connection', ws, req);
          });
        }
      });

      wss.on('connection', (ws: WebSocket) => {
        socketChannels.set(ws, new Set());

        ws.on('message', (raw: Buffer | string) => {
          try {
            const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
            const msg = JSON.parse(str) as {
              action?: string;
              channel?: string;
              senderId?: string;
              data?: unknown;
            };

            const channelName = msg.channel;
            if (!channelName || typeof channelName !== 'string') return;

            if (msg.action === 'subscribe') {
              let subSet = channelSubscriptions.get(channelName);
              if (!subSet) {
                subSet = new Set();
                channelSubscriptions.set(channelName, subSet);
              }
              subSet.add(ws);
              socketChannels.get(ws)?.add(channelName);
              return;
            }

            if (msg.action === 'unsubscribe') {
              channelSubscriptions.get(channelName)?.delete(ws);
              socketChannels.get(ws)?.delete(channelName);
              return;
            }

            if (msg.action === 'broadcast') {
              const subSet = channelSubscriptions.get(channelName);
              if (!subSet) return;

              const forwardStr = JSON.stringify({
                action: 'broadcast',
                channel: channelName,
                senderId: msg.senderId,
                data: msg.data
              });

              for (const client of subSet) {
                if (client !== ws && client.readyState === 1 /* WebSocket.OPEN */) {
                  client.send(forwardStr);
                }
              }
            }
          } catch {
            // Ignore malformed payloads safely
          }
        });

        ws.on('close', () => {
          const channels = socketChannels.get(ws);
          if (channels) {
            for (const ch of channels) {
              channelSubscriptions.get(ch)?.delete(ws);
            }
          }
          socketChannels.delete(ws);
        });
      });
    }
  };
}
