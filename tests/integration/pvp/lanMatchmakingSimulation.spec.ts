/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createServer, type Server } from 'node:http';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { WebSocketServer, WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';

describe('LAN PvP & Matchmaking Integration Simulation', () => {
  let server: Server;
  let serverPort: number;
  let db: DatabaseSync;
  let wss: WebSocketServer;
  const channelSubscriptions = new Map<string, Set<WebSocket>>();

  beforeEach(async () => {
    setActivePinia(createPinia());

    // 1. Initialize test in-memory SQLite broker
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
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      );
    `);

    // 2. Start lightweight HTTP + WebSocket test server reproducing lanPvPPlugin
    server = createServer((req, res) => {
      if (req.url?.startsWith('/api/dev-lan-pvp') && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(chunk as Buffer));
        req.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as {
              type: 'query' | 'run';
              sql: string;
              params?: SQLInputValue[];
            };
            const params: SQLInputValue[] = (body.params || []).map(p => (p === undefined ? null : p) as SQLInputValue);
            if (body.type === 'query') {
              const rows = db.prepare(body.sql).all(...params);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ data: rows, error: null }));
              return;
            }
            if (body.type === 'run') {
              const result = db.prepare(body.sql).run(...params);
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
            res.end(JSON.stringify({ data: null, error: 'Invalid type' }));
          } catch (err: unknown) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: null, error: String(err) }));
          }
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });

    wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, socket, head) => {
      if (req.url?.startsWith('/api/dev-lan-relay')) {
        wss.handleUpgrade(req, socket, head, ws => {
          wss.emit('connection', ws, req);
        });
      }
    });

    wss.on('connection', ws => {
      ws.on('message', raw => {
        try {
          const msg = JSON.parse(raw.toString('utf-8')) as {
            action?: string;
            channel?: string;
            senderId?: string;
            data?: unknown;
          };
          if (!msg.channel) return;
          if (msg.action === 'subscribe') {
            let set = channelSubscriptions.get(msg.channel);
            if (!set) {
              set = new Set();
              channelSubscriptions.set(msg.channel, set);
            }
            set.add(ws);
          } else if (msg.action === 'broadcast') {
            const set = channelSubscriptions.get(msg.channel);
            if (set) {
              const forwardStr = JSON.stringify(msg);
              for (const client of set) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(forwardStr);
                }
              }
            }
          }
        } catch {
          // ignore
        }
      });
    });

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => {
        serverPort = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    wss.close();
    channelSubscriptions.clear();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('coordinates matchmaking and battle channel exchange across simulated LAN network clients', async () => {
    const baseUrl = `http://127.0.0.1:${serverPort}`;

    // Helper to query LAN SQLite broker
    const lanQuery = async (type: 'query' | 'run', sql: string, params: unknown[] = []) => {
      const res = await fetch(`${baseUrl}/api/dev-lan-pvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sql, params })
      });
      return await res.json();
    };

    // 1. Player 1 (Ash) joins queue
    const ashInsert = await lanQuery(
      'run',
      'INSERT OR REPLACE INTO ranked_queue (user_id, elo, status) VALUES (?, ?, ?)',
      ['local_ash', 1250, 'searching']
    );
    expect(ashInsert.error).toBeNull();

    // Verify Ash is in the queue
    const queueCheck = await lanQuery('query', 'SELECT * FROM ranked_queue WHERE status = ?', ['searching']);
    expect(queueCheck.data).toHaveLength(1);
    expect(queueCheck.data[0].user_id).toBe('local_ash');

    // 2. Player 2 (Gary) searches and matches with Ash
    const matchRes = await lanQuery(
      'query',
      'SELECT * FROM ranked_queue WHERE user_id != ? ORDER BY created_at ASC LIMIT 1',
      ['local_gary']
    );
    expect(matchRes.data).toHaveLength(1);
    const matchedOpponent = matchRes.data[0];
    expect(matchedOpponent.user_id).toBe('local_ash');

    // Gary creates the match invite
    const inviteRes = await lanQuery(
      'run',
      'INSERT INTO battle_invites (challenger_id, sender_id, opponent_id, status, config) VALUES (?, ?, ?, ?, ?)',
      [
        'local_gary',
        'local_gary',
        matchedOpponent.user_id,
        'ranked_match',
        JSON.stringify({ format: '6v6', levelRule: 'flat50' })
      ]
    );
    expect(inviteRes.error).toBeNull();
    const inviteId = String(inviteRes.lastInsertRowid);

    // Gary removes both from queue
    await lanQuery('run', 'DELETE FROM ranked_queue WHERE user_id IN (?, ?)', ['local_ash', 'local_gary']);
    const queueAfterMatch = await lanQuery('query', 'SELECT * FROM ranked_queue');
    expect(queueAfterMatch.data).toHaveLength(0);

    // 3. Ash polls for invites and finds the match
    const ashInvitePoll = await lanQuery(
      'query',
      'SELECT * FROM battle_invites WHERE opponent_id = ? AND status = ?',
      ['local_ash', 'ranked_match']
    );
    expect(ashInvitePoll.data).toHaveLength(1);
    expect(String(ashInvitePoll.data[0].id)).toBe(inviteId);
    expect(ashInvitePoll.data[0].sender_id).toBe('local_gary');

    // 4. Realtime Battle Channel Relay Simulation
    const channelName = `pvp-${inviteId}`;
    const wsUrl = `ws://127.0.0.1:${serverPort}/api/dev-lan-relay`;

    const wsAsh = new WebSocket(wsUrl);
    const wsGary = new WebSocket(wsUrl);

    await Promise.all([
      new Promise(resolve => wsAsh.on('open', resolve)),
      new Promise(resolve => wsGary.on('open', resolve))
    ]);

    // Both subscribe to channel
    wsAsh.send(JSON.stringify({ action: 'subscribe', channel: channelName }));
    wsGary.send(JSON.stringify({ action: 'subscribe', channel: channelName }));

    // Wait a brief tick for server subscription map to populate
    await new Promise(r => setTimeout(r, 50));

    // Ash sends pvp_team broadcast
    const garyReceivedPromise = new Promise<Record<string, unknown>>(resolve => {
      wsGary.on('message', raw => {
        const msg = JSON.parse(raw.toString('utf-8'));
        if (msg.channel === channelName && msg.action === 'broadcast') {
          resolve(msg.data);
        }
      });
    });

    wsAsh.send(JSON.stringify({
      action: 'broadcast',
      channel: channelName,
      senderId: 'ash_client',
      data: {
        type: 'broadcast',
        event: 'pvp_team',
        payload: {
          trainerName: 'Ash',
          team: [{ species: 'pikachu', hp: 100 }]
        }
      }
    }));

    const garyReceived = await garyReceivedPromise;
    expect(garyReceived.event).toBe('pvp_team');
    expect((garyReceived.payload as Record<string, unknown>).trainerName).toBe('Ash');

    // Gary sends pvp_team broadcast back to Ash
    const ashReceivedPromise = new Promise<Record<string, unknown>>(resolve => {
      wsAsh.on('message', raw => {
        const msg = JSON.parse(raw.toString('utf-8'));
        if (msg.channel === channelName && msg.action === 'broadcast') {
          resolve(msg.data);
        }
      });
    });

    wsGary.send(JSON.stringify({
      action: 'broadcast',
      channel: channelName,
      senderId: 'gary_client',
      data: {
        type: 'broadcast',
        event: 'pvp_team',
        payload: {
          trainerName: 'Gary',
          team: [{ species: 'blastoise', hp: 160 }]
        }
      }
    }));

    const ashReceived = await ashReceivedPromise;
    expect(ashReceived.event).toBe('pvp_team');
    expect((ashReceived.payload as Record<string, unknown>).trainerName).toBe('Gary');

    wsAsh.close();
    wsGary.close();
  });
});
