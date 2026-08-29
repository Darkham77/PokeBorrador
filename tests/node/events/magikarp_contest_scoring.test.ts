import { describe, it, vi, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

let memoryDb: DatabaseSync;

vi.mock('@/logic/db/sqliteEngine.ts', () => ({
  queryLocal: vi.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();
    const isSelect = trimmed.toUpperCase().startsWith('SELECT');
    const stmt = memoryDb.prepare(sql);
    if (isSelect) {
      return stmt.all(...(params as string[])) as Record<string, unknown>[]; // open-record
    }
    stmt.run(...(params as string[]));
    return [];
  }),
  persistSQLite: vi.fn(async () => {})
}));

import { emulateAwardEventAutomated } from '@/logic/db/rpcEmulations/eventRpc.ts';
import { isNewEntryBetter } from '@/logic/events/eventEngine.ts';
import { queryLocal } from '@/logic/db/sqliteEngine.ts';
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts';

describe('Magikarp Contest Scoring & Tiebreaker Rules', () => {
  beforeEach(async () => {
    memoryDb = new DatabaseSync(':memory:');

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS events_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        type TEXT,
        active INTEGER DEFAULT 0,
        manual INTEGER DEFAULT 0,
        schedule TEXT,
        config TEXT,
        description TEXT,
        last_awarded_at TEXT,
        updated_at TEXT
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS competition_entries (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        category_id TEXT DEFAULT 'ivs',
        player_id TEXT,
        player_name TEXT NOT NULL,
        player_email TEXT NOT NULL,
        pokemon_uid TEXT,
        data TEXT NOT NULL,
        submitted_at TEXT,
        UNIQUE(event_id, category_id, player_id)
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS awards (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        winner_id TEXT,
        winner_name TEXT NOT NULL,
        winner_email TEXT NOT NULL,
        prize TEXT NOT NULL,
        awarded_at TEXT,
        claimed INTEGER DEFAULT 0,
        claimed_at TEXT,
        received_at TEXT
      );
    `);

    await queryLocal(`
      CREATE TABLE IF NOT EXISTS competition_results (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        winners TEXT NOT NULL,
        ended_at TEXT
      );
    `);
  });

  it('ranks ties with Shiny priority over Non-Shiny, even if Non-Shiny was captured earlier', async () => {
    const mockSqliteDb = {} as SQLiteDatabase;

    const eventConfig = {
      species: 'magikarp',
      metric: 'total_ivs',
      hasCompetition: true,
      prizes: {
        first: { type: 'money', amount: 50000 },
        second: { type: 'money', amount: 25000 }
      }
    };

    await queryLocal(`
      INSERT INTO events_config (id, name, icon, type, active, manual, config, description)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `, [
      'hora_magikarp_shiny_tie',
      'Hora Magikarp Shiny Tie',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Test de desempate Shiny vs Normal'
    ]);

    const p1Data = {
      species: 'magikarp',
      name: 'Magikarp',
      nickname: 'Normal_Old',
      total_ivs: 150,
      is_shiny: false,
      obtained_at: 100000
    };

    const p2Data = {
      species: 'magikarp',
      name: 'Magikarp',
      nickname: 'Shiny_New',
      total_ivs: 150,
      is_shiny: true,
      obtained_at: 200000
    };

    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'entry_p1',
      'hora_magikarp_shiny_tie',
      'user_normal',
      'Trainer_Normal',
      'normal@test.com',
      'poke_norm',
      JSON.stringify(p1Data),
      '2026-08-26T12:00:00Z'
    ]);

    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'entry_p2',
      'hora_magikarp_shiny_tie',
      'user_shiny',
      'Trainer_Shiny',
      'shiny@test.com',
      'poke_shiny',
      JSON.stringify(p2Data),
      '2026-08-26T12:05:00Z'
    ]);

    const res = await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp_shiny_tie' });
    assert.strictEqual(res.error, null);

    const resultRows = await queryLocal('SELECT * FROM competition_results WHERE event_id = ?', ['hora_magikarp_shiny_tie']);
    const winners = JSON.parse((resultRows[0] as { winners: string }).winners) as Array<{
      rank: string;
      player_id: string;
      score: number;
    }>;

    assert.strictEqual(winners.length, 2);
    assert.strictEqual(winners[0]?.rank, 'first');
    assert.strictEqual(winners[0]?.player_id, 'user_shiny');
    assert.strictEqual(winners[0]?.score, 150);

    assert.strictEqual(winners[1]?.rank, 'second');
    assert.strictEqual(winners[1]?.player_id, 'user_normal');
    assert.strictEqual(winners[1]?.score, 150);
  });

  it('ranks ties between same shiny status by oldest capture date (obtained_at ASC)', async () => {
    const mockSqliteDb = {} as SQLiteDatabase;

    const eventConfig = {
      species: 'magikarp',
      metric: 'total_ivs',
      hasCompetition: true,
      prizes: {
        first: { type: 'money', amount: 50000 },
        second: { type: 'money', amount: 25000 },
        third: { type: 'money', amount: 10000 }
      }
    };

    await queryLocal(`
      INSERT INTO events_config (id, name, icon, type, active, manual, config, description)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `, [
      'hora_magikarp_date_tie',
      'Hora Magikarp Date Tie',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Test de desempate por fecha de captura'
    ]);

    const entries = [
      { id: 'user_young', ivs: 140, is_shiny: false, obtained_at: 300000, name: 'Trainer_Young' },
      { id: 'user_old', ivs: 140, is_shiny: false, obtained_at: 100000, name: 'Trainer_Old' },
      { id: 'user_mid', ivs: 140, is_shiny: false, obtained_at: 200000, name: 'Trainer_Mid' }
    ];

    for (const p of entries) {
      await queryLocal(`
        INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `entry_${p.id}`,
        'hora_magikarp_date_tie',
        p.id,
        p.name,
        `${p.id}@test.com`,
        `poke_${p.id}`,
        JSON.stringify({ species: 'magikarp', name: 'Magikarp', total_ivs: p.ivs, is_shiny: p.is_shiny, obtained_at: p.obtained_at }),
        '2026-08-26T12:00:00Z'
      ]);
    }

    const res = await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp_date_tie' });
    assert.strictEqual(res.error, null);

    const resultRows = await queryLocal('SELECT * FROM competition_results WHERE event_id = ?', ['hora_magikarp_date_tie']);
    const winners = JSON.parse((resultRows[0] as { winners: string }).winners) as Array<{
      rank: string;
      player_id: string;
      score: number;
    }>;

    assert.strictEqual(winners.length, 3);
    assert.strictEqual(winners[0]?.player_id, 'user_old');
    assert.strictEqual(winners[0]?.rank, 'first');

    assert.strictEqual(winners[1]?.player_id, 'user_mid');
    assert.strictEqual(winners[1]?.rank, 'second');

    assert.strictEqual(winners[2]?.player_id, 'user_young');
    assert.strictEqual(winners[2]?.rank, 'third');
  });

  it('ensures higher metric score always beats lower score regardless of shiny or capture date', async () => {
    const mockSqliteDb = {} as SQLiteDatabase;

    const eventConfig = {
      species: 'magikarp',
      metric: 'total_ivs',
      hasCompetition: true,
      prizes: {
        first: { type: 'money', amount: 50000 },
        second: { type: 'money', amount: 25000 }
      }
    };

    await queryLocal(`
      INSERT INTO events_config (id, name, icon, type, active, manual, config, description)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `, [
      'hora_magikarp_score_priority',
      'Hora Magikarp Score Priority',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Test de prioridad absoluta de puntuacion'
    ]);

    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'entry_p1',
      'hora_magikarp_score_priority',
      'user_high_normal',
      'Trainer_High',
      'high@test.com',
      'poke_high',
      JSON.stringify({ species: 'magikarp', name: 'Magikarp', total_ivs: 160, is_shiny: false, obtained_at: 500000 }),
      '2026-08-26T12:00:00Z'
    ]);

    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'entry_p2',
      'hora_magikarp_score_priority',
      'user_shiny_lower',
      'Trainer_Shiny',
      'shiny@test.com',
      'poke_shiny_low',
      JSON.stringify({ species: 'magikarp', name: 'Magikarp', total_ivs: 150, is_shiny: true, obtained_at: 100000 }),
      '2026-08-26T12:05:00Z'
    ]);

    const res = await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp_score_priority' });
    assert.strictEqual(res.error, null);

    const resultRows = await queryLocal('SELECT * FROM competition_results WHERE event_id = ?', ['hora_magikarp_score_priority']);
    const winners = JSON.parse((resultRows[0] as { winners: string }).winners) as Array<{
      rank: string;
      player_id: string;
      score: number;
    }>;

    assert.strictEqual(winners[0]?.player_id, 'user_high_normal');
    assert.strictEqual(winners[0]?.rank, 'first');
    assert.strictEqual(winners[0]?.score, 160);

    assert.strictEqual(winners[1]?.player_id, 'user_shiny_lower');
    assert.strictEqual(winners[1]?.rank, 'second');
    assert.strictEqual(winners[1]?.score, 150);
  });

  it('validates isNewEntryBetter hierarchy for Shiny and capture date tiebreakers', () => {
    assert.strictEqual(
      isNewEntryBetter({ total_ivs: 100 }, { total_ivs: 110 }),
      true,
      'Higher score must beat lower score'
    );
    assert.strictEqual(
      isNewEntryBetter({ total_ivs: 110 }, { total_ivs: 100 }),
      false,
      'Lower score must not beat higher score'
    );

    assert.strictEqual(
      isNewEntryBetter(
        { total_ivs: 150, is_shiny: false, obtained_at: 1000 },
        { total_ivs: 150, is_shiny: true, obtained_at: 2000 }
      ),
      true,
      'New Shiny must beat existing non-shiny on tie even if newer capture'
    );
    assert.strictEqual(
      isNewEntryBetter(
        { total_ivs: 150, is_shiny: true, obtained_at: 2000 },
        { total_ivs: 150, is_shiny: false, obtained_at: 1000 }
      ),
      false,
      'New non-shiny must not beat existing Shiny on tie'
    );

    assert.strictEqual(
      isNewEntryBetter(
        { total_ivs: 150, is_shiny: false, obtained_at: 2000 },
        { total_ivs: 150, is_shiny: false, obtained_at: 1000 }
      ),
      true,
      'New older capture must beat existing newer capture on tie'
    );
    assert.strictEqual(
      isNewEntryBetter(
        { total_ivs: 150, is_shiny: false, obtained_at: 1000 },
        { total_ivs: 150, is_shiny: false, obtained_at: 2000 }
      ),
      false,
      'New newer capture must not beat existing older capture on tie'
    );
  });
});
