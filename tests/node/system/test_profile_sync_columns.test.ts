/**
 * tests/node/system/test_profile_sync_columns.test.ts
 *
 * Verifies that syncUserProfileData updates and inserts only valid columns
 * matching the exact SQLite profiles table schema.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { syncUserProfileData } from '../../../src/logic/auth/profileSyncHelper.ts';
import type { DBRouter } from '../../../src/logic/db/dbRouter.ts';
import type { AuthUser } from '../../../src/types/auth/auth.ts';
import type { SaveDataDto } from '../../../src/logic/validation/schemas.ts';
import { splitSQLStatements } from '../../../src/logic/db/sqlTranslator.ts';

const DB_PATH = path.resolve(process.cwd(), 'tests/fixtures/poke_local_ash.db');

describe('Profile Sync SQLite Column Parity', () => {
  it('updates and inserts profile fields matching exact SQLite schema columns without error', async () => {
    const tempDbPath = path.join(os.tmpdir(), `test_profile_sync_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    fs.copyFileSync(DB_PATH, tempDbPath);

    try {
      using db = new DatabaseSync(tempDbPath);

      // Run all migrations to ensure full schema
      const { DATABASE_MIGRATIONS } = await import('../../../src/logic/db/migrations_data.ts');
      const { translatePostgresToSqlite } = await import('../../../src/logic/db/sqlTranslator.ts');

      for (const migration of DATABASE_MIGRATIONS) {
        let alreadyApplied = false;
        try {
          const check = db.prepare('SELECT id FROM _migrations WHERE id = ?').get(migration.id);
          if (check) alreadyApplied = true;
        } catch (_) {
          // Table _migrations might not exist yet
        }

        if (alreadyApplied) continue;

        const sqlSource = migration.sqlite_sql !== undefined ? migration.sqlite_sql : migration.sql;
        const isSqliteSpec = migration.sqlite_sql !== undefined;
        const statements = splitSQLStatements(sqlSource);

        for (const stmt of statements) {
          if (stmt.trim()) {
            const sql = isSqliteSpec ? stmt : translatePostgresToSqlite(stmt);
            try {
              db.exec(sql);
            } catch {
              // Ignore individual migration statement errors
            }
          }
        }
      }

      // Inspect SQLite columns of profiles table
      const pragmaCols = db.prepare("PRAGMA table_info('profiles')").all() as Array<{ name: string }>;
      const existingColumnNames = new Set(pragmaCols.map(c => c.name));

      // Assert essential columns exist in snake_case
      assert.ok(existingColumnNames.has('capture_successes'), 'profiles table must contain capture_successes column');
      assert.ok(existingColumnNames.has('capture_attempts'), 'profiles table must contain capture_attempts column');
      assert.ok(!existingColumnNames.has('captureSuccesses'), 'profiles table must NOT contain camelCase captureSuccesses column');

      // Create a mock DBRouter executing against this SQLite database
      const mockDBRouter = {
        mode: 'offline',
        from: (table: string) => {
          return {
            select: (cols: string) => ({
              eq: (col: string, val: unknown) => ({
                maybeSingle: async () => {
                  const row = db.prepare(`SELECT ${cols} FROM ${table} WHERE ${col} = ?`).get(val as string);
                  return { data: row || null, error: null };
                }
              })
            }),
            update: (payload: Record<string, unknown>) => ({
              eq: async (col: string, val: unknown) => {
                // Verify all payload keys exist in table columns
                for (const key of Object.keys(payload)) {
                  assert.ok(
                    existingColumnNames.has(key),
                    `Update payload key "${key}" does not exist in SQLite "${table}" table columns!`
                  );
                }
                const setClause = Object.keys(payload).map(k => `${k} = ?`).join(', ');
                const params: Array<string | number | bigint | Uint8Array | null> = Object.values(payload).map(v => {
                  if (v === null || v === undefined) return null;
                  if (typeof v === 'object') return JSON.stringify(v);
                  return v as string | number;
                });
                params.push((val ?? null) as string | number | null);
                db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${col} = ?`).run(...params);
                return { data: payload, error: null };
              }
            }),
            insert: async (payload: Record<string, unknown>) => {
              // Verify all payload keys exist in table columns
              for (const key of Object.keys(payload)) {
                assert.ok(
                  existingColumnNames.has(key),
                  `Insert payload key "${key}" does not exist in SQLite "${table}" table columns!`
                );
              }
              const keys = Object.keys(payload);
              const placeholders = keys.map(() => '?').join(', ');
              const params: Array<string | number | bigint | Uint8Array | null> = Object.values(payload).map(v => {
                if (v === null || v === undefined) return null;
                if (typeof v === 'object') return JSON.stringify(v);
                return v as string | number;
              });
              db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`).run(...params);
              return { data: payload, error: null };
            }
          };
        }
      } as unknown as DBRouter;

      const existingProfile = db.prepare('SELECT id FROM profiles LIMIT 1').get() as { id: string } | undefined;
      const targetUserId = existingProfile?.id || 'local_ash';

      const testUser: AuthUser = {
        id: targetUserId,
        email: `${targetUserId}@local`,
        db_version: 3,
        user_metadata: { username: 'ash' }
      } as unknown as AuthUser;

      const mockSaveData: SaveDataDto = {
        trainer: 'ash',
        trainerLevel: 25,
        money: 5000,
        badges: 8,
        playerClass: 'entrenador',
        classLevel: 5,
        gender: 'h',
        playtime: 3600,
        rankedMaxElo: 1200,
        pvpStats: {
          wins: 10,
          losses: 2,
          draws: 1
        },
        classData: {
          captureStreak: 3,
          longestStreak: 5,
          reputation: 10,
          blackMarketSales: 0,
          criminality: 0
        },
        stats: {
          maxDamage: 150,
          totalBattles: 42,
          tradeVolume: 3,
          captureAttempts: 20,
          captureSuccesses: 15
        },
        team: [],
        box: []
      } as unknown as SaveDataDto;

      // 1. Test update path for existing user
      await syncUserProfileData(mockDBRouter, testUser, mockSaveData);

      const ashRow = db.prepare('SELECT capture_successes, capture_attempts, max_damage FROM profiles WHERE id = ?').get(targetUserId) as {
        capture_successes: number;
        capture_attempts: number;
        max_damage: number;
      } | undefined;
      assert.ok(ashRow, `Row for ${targetUserId} should exist in profiles`);
      assert.strictEqual(ashRow.capture_successes, 15);
      assert.strictEqual(ashRow.capture_attempts, 20);
      assert.strictEqual(ashRow.max_damage, 150);

      // 2. Test insert path for new user 'gary'
      const newGaryUser: AuthUser = {
        id: 'gary_new',
        email: 'gary@local',
        db_version: 3,
        user_metadata: { username: 'gary' }
      } as unknown as AuthUser;

      await syncUserProfileData(mockDBRouter, newGaryUser, mockSaveData);

      const garyRow = db.prepare('SELECT capture_successes, capture_attempts, max_damage FROM profiles WHERE id = ?').get('gary_new') as {
        capture_successes: number;
        capture_attempts: number;
        max_damage: number;
      };
      assert.strictEqual(garyRow.capture_successes, 15);
      assert.strictEqual(garyRow.capture_attempts, 20);
      assert.strictEqual(garyRow.max_damage, 150);
    } finally {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // Ignore unlink error
      }
    }
  });
});
