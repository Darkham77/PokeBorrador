import { describe, it } from 'vitest';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { SQLiteQueryBuilder } from '../../../src/logic/db/sqliteQueryBuilder.ts';
import type { SQLiteDatabase, SQLiteResult } from '../../../src/logic/db/sqliteEngine.ts';

describe('SQLiteQueryBuilder .or() filter clause parsing & query resolution', () => {
  it('should correctly query chat messages with simple OR syntax', async () => {
    const rawDb = new DatabaseSync(':memory:');
    rawDb.exec(`
      CREATE TABLE chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId TEXT,
        senderName TEXT,
        message TEXT,
        type TEXT,
        created_at TEXT
      );
      INSERT INTO chat_messages (senderId, senderName, message, type, created_at)
      VALUES 
        ('local_franco', 'Franco', 'Hola Darkham', 'private:local_darkham', '2026-05-19T20:27:12.464Z'),
        ('local_darkham', 'Darkham', 'Hola Franco', 'private:local_franco', '2026-05-19T21:08:01.566Z'),
        ('local_angianemar', 'Angianemar', 'Hola Franco', 'private:local_franco', '2026-05-20T01:48:11.598Z');
    `);

    const mockDb = {
      run: (sql: string, params: unknown[] = []) => rawDb.prepare(sql).run(...(params as (string | number | bigint | null | Uint8Array)[])),
      exec: (sql: string, params: unknown[] = []): SQLiteResult[] => {
        const stmt = rawDb.prepare(sql);
        const rows = stmt.all(...(params as (string | number | bigint | null | Uint8Array)[])) as Record<string, unknown>[]; // open-record
        if (!rows.length) return [];
        const columns = Object.keys(rows[0]!);
        const values = rows.map(r => columns.map(c => r[c]));
        return [{ columns, values }];
      },
      export: () => new Uint8Array(),
      prepare: (sql: string) => rawDb.prepare(sql)
    } as unknown as SQLiteDatabase;

    const qb = new SQLiteQueryBuilder('chat_messages', () => mockDb, async () => {});

    // Query for local_darkham's perspective (messages involving local_darkham)
    const myId = 'local_darkham';
    const messages = await qb
      .select('*')
      .or(`type.eq.private:${myId},senderId.eq.${myId}`)
      .order('created_at', { ascending: true });

    assert.strictEqual(messages.length, 2, 'Should find exactly 2 messages involving local_darkham');
    assert.strictEqual(messages[0]!['message'], 'Hola Darkham');
    assert.strictEqual(messages[1]!['message'], 'Hola Franco');
  });

  it('should correctly query friendship relations with nested and() inside or() syntax', async () => {
    const rawDb = new DatabaseSync(':memory:');
    rawDb.exec(`
      CREATE TABLE friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id TEXT,
        addressee_id TEXT,
        status TEXT
      );
      INSERT INTO friendships (requester_id, addressee_id, status)
      VALUES 
        ('local_franco', 'local_darkham', 'accepted'),
        ('local_franco', 'local_angianemar', 'accepted'),
        ('local_yarzu', 'local_mata7', 'accepted');
    `);

    const mockDb = {
      run: (sql: string, params: unknown[] = []) => rawDb.prepare(sql).run(...(params as (string | number | bigint | null | Uint8Array)[])),
      exec: (sql: string, params: unknown[] = []): SQLiteResult[] => {
        const stmt = rawDb.prepare(sql);
        const rows = stmt.all(...(params as (string | number | bigint | null | Uint8Array)[])) as Record<string, unknown>[]; // open-record
        if (!rows.length) return [];
        const columns = Object.keys(rows[0]!);
        const values = rows.map(r => columns.map(c => r[c]));
        return [{ columns, values }];
      },
      export: () => new Uint8Array(),
      prepare: (sql: string) => rawDb.prepare(sql)
    } as unknown as SQLiteDatabase;

    const qb = new SQLiteQueryBuilder('friendships', () => mockDb, async () => {});

    const u1 = 'local_darkham';
    const u2 = 'local_franco';
    const friendship = await qb
      .select('*')
      .or(`and(requester_id.eq.${u1},addressee_id.eq.${u2}),and(requester_id.eq.${u2},addressee_id.eq.${u1})`);

    assert.strictEqual(friendship.length, 1, 'Should find bidirectional friendship');
    assert.strictEqual(friendship[0]!['status'], 'accepted');
  });
});
