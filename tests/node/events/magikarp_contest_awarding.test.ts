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
      return stmt.all(...(params as string[])) as Record<string, unknown>[]; // open-record: Generic key-value data dictionary container
    }
    stmt.run(...(params as string[]));
    return [];
  }),
  persistSQLite: vi.fn(async () => {})
}));

import { emulateAwardEventAutomated, emulateClaimAward } from '@/logic/db/rpcEmulations/eventRpc.ts';
import { queryLocal } from '@/logic/db/sqliteEngine.ts';
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts';

describe('Magikarp Contest Automated Awarding & Claiming (SQLite RPC)', () => {
  beforeEach(async () => {
    memoryDb = new DatabaseSync(':memory:');

    // 1. Create table schemas
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

  it('ranks 4 participants by total_ivs, awards top 3, omits 4th, and processes claim', async () => {
    const mockSqliteDb = {} as SQLiteDatabase;

    // 2. Insert event configuration
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
      'hora_magikarp',
      'Hora de Pesca del Magikarp',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      '¡Captura el Magikarp con mejores IVs!'
    ]);

    // 3. Insert 4 players with different IVs
    const players = [
      { id: 'player_1', name: 'Entrenador_Oro', email: 'oro@test.com', ivs: 180 },
      { id: 'player_2', name: 'Entrenador_Plata', email: 'plata@test.com', ivs: 150 },
      { id: 'player_3', name: 'Entrenador_Bronce', email: 'bronce@test.com', ivs: 120 },
      { id: 'player_4', name: 'Entrenador_Cuarto', email: 'cuarto@test.com', ivs: 60 }
    ];

    for (const p of players) {
      const entryData = {
        species: 'magikarp',
        name: 'Magikarp',
        total_ivs: p.ivs,
        level: 15
      };

      await queryLocal(`
        INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `entry_${p.id}`,
        'hora_magikarp',
        p.id,
        p.name,
        p.email,
        `poke_${p.id}`,
        JSON.stringify(entryData),
        '2026-08-26T12:00:00Z'
      ]);
    }

    // 4. Run automated awarding
    const awardResult = await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp' });
    assert.strictEqual(awardResult.error, null);
    const awardData = awardResult.data as { ok?: boolean; success?: boolean }; // domain-ok: Open dynamic text or non-domain string payload
    assert.ok(awardData?.ok || awardData?.success);

    // 5. Verify competition_results table
    const resultRows = await queryLocal('SELECT * FROM competition_results WHERE event_id = ?', ['hora_magikarp']);
    assert.ok(resultRows.length > 0, 'Should create a row in competition_results');
    const resultRow = resultRows[0] as { winners: string };
    const winners = JSON.parse(resultRow.winners) as Array<{
      rank: string;
      player_id: string;
      player_name: string;
      score: number;
    }>;

    assert.strictEqual(winners.length, 3);
    assert.strictEqual(winners[0]?.player_id, 'player_1');
    assert.strictEqual(winners[0]?.rank, 'first');
    assert.strictEqual(winners[0]?.score, 180);

    assert.strictEqual(winners[1]?.player_id, 'player_2');
    assert.strictEqual(winners[1]?.rank, 'second');
    assert.strictEqual(winners[1]?.score, 150);

    assert.strictEqual(winners[2]?.player_id, 'player_3');
    assert.strictEqual(winners[2]?.rank, 'third');
    assert.strictEqual(winners[2]?.score, 120);

    // Verify player_4 is not in podium
    assert.ok(!winners.some(w => w.player_id === 'player_4'));

    // 6. Verify awards table
    const awards = (await queryLocal('SELECT * FROM awards WHERE event_id = ?', ['hora_magikarp'])) as unknown as Array<{
      id: string;
      winner_id: string;
      prize: string;
      claimed: number;
    }>;

    assert.strictEqual(awards.length, 3);
    const awardP1 = awards.find(a => a.winner_id === 'player_1');
    const awardP2 = awards.find(a => a.winner_id === 'player_2');
    const awardP3 = awards.find(a => a.winner_id === 'player_3');
    const awardP4 = awards.find(a => a.winner_id === 'player_4');

    assert.ok(awardP1);
    assert.ok(awardP2);
    assert.ok(awardP3);
    assert.strictEqual(awardP4, undefined);

    const prizeP1 = JSON.parse(awardP1.prize) as { amount: number };
    assert.strictEqual(prizeP1.amount, 50000);

    const prizeP2 = JSON.parse(awardP2.prize) as { amount: number };
    assert.strictEqual(prizeP2.amount, 25000);

    const prizeP3 = JSON.parse(awardP3.prize) as { amount: number };
    assert.strictEqual(prizeP3.amount, 10000);

    // 7. Test claiming an award
    const claimRes = await emulateClaimAward(mockSqliteDb, { p_award_id: awardP1.id });
    assert.strictEqual(claimRes.error, null);
    const claimData = claimRes.data as { ok?: boolean; prize?: { type: string; amount: number; rank?: string } }; // domain-ok: Open dynamic text or non-domain string payload
    assert.ok(claimData?.ok);
    assert.deepStrictEqual(claimData?.prize, { type: 'money', amount: 50000, rank: 'first' });

    // Verify award is now claimed in DB
    const claimedRows = await queryLocal('SELECT claimed, received_at FROM awards WHERE id = ?', [awardP1.id]);
    const claimedRow = claimedRows[0] as { claimed: number; received_at: string | null };
    assert.strictEqual(claimedRow.claimed, 1);
    assert.ok(claimedRow.received_at !== null);

    // Trying to claim again should be rejected
    const repeatClaim = await emulateClaimAward(mockSqliteDb, { p_award_id: awardP1.id });
    const repeatData = repeatClaim.data as { ok?: boolean }; // domain-ok: Open dynamic text or non-domain string payload
    assert.strictEqual(repeatData?.ok, false);

    // 8. Verify entries table was cleaned up
    const remainingEntries = await queryLocal('SELECT * FROM competition_entries WHERE event_id = ?', ['hora_magikarp']);
    assert.strictEqual(remainingEntries.length, 0);
  });

  it('handles contest with only 1 participant, creates 1st place only with correct stats and prize', async () => {
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
      'hora_magikarp_solo',
      'Hora Magikarp Solo',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Concurso individual'
    ]);

    const entryData = {
      species: 'magikarp',
      name: 'Magikarp',
      nickname: 'SoloChampion',
      total_ivs: 165,
      level: 15,
      ivs: { hp: 30, atk: 25, def: 28, spa: 27, spd: 25, spe: 30 }
    };

    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'entry_solo_1',
      'hora_magikarp_solo',
      'solo_player_1',
      'Entrenador_Solitario',
      'solo@test.com',
      'poke_solo_1',
      JSON.stringify(entryData),
      '2026-08-26T12:00:00Z'
    ]);

    const awardResult = await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp_solo' });
    assert.strictEqual(awardResult.error, null);

    const resultRows = await queryLocal('SELECT * FROM competition_results WHERE event_id = ?', ['hora_magikarp_solo']);
    assert.strictEqual(resultRows.length, 1);
    const resultRow = resultRows[0] as { winners: string };
    const winners = JSON.parse(resultRow.winners) as Array<{
      rank: string;
      player_id: string;
      player_name: string;
      score: number;
      entry_data: { nickname: string; total_ivs: number; ivs: Record<string, number> };
    }>;

    assert.strictEqual(winners.length, 1, 'Only 1 winner should be recorded');
    assert.strictEqual(winners[0]?.rank, 'first');
    assert.strictEqual(winners[0]?.player_id, 'solo_player_1');
    assert.strictEqual(winners[0]?.player_name, 'Entrenador_Solitario');
    assert.strictEqual(winners[0]?.score, 165);
    assert.strictEqual(winners[0]?.entry_data.nickname, 'SoloChampion');
    assert.strictEqual(winners[0]?.entry_data.total_ivs, 165);

    const awards = (await queryLocal('SELECT * FROM awards WHERE event_id = ?', ['hora_magikarp_solo'])) as unknown as Array<{
      winner_id: string;
      prize: string;
    }>;

    assert.strictEqual(awards.length, 1, 'Only 1 award should be generated');
    assert.strictEqual(awards[0]?.winner_id, 'solo_player_1');
    const prize = JSON.parse(awards[0]?.prize || '{}') as { amount: number };
    assert.strictEqual(prize.amount, 50000);
  });

  it('handles contest with only 2 participants, assigns 1st and 2nd places with correct stats and order', async () => {
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
      'hora_magikarp_duo',
      'Hora Magikarp Duo',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Concurso de 2 jugadores'
    ]);

    const participants = [
      {
        id: 'duo_p2',
        name: 'Segundo_Lugar',
        email: 'segundo@test.com',
        ivs: 140,
        nickname: 'Magikarp_Silver'
      },
      {
        id: 'duo_p1',
        name: 'Primer_Lugar',
        email: 'primero@test.com',
        ivs: 175,
        nickname: 'Magikarp_Gold'
      }
    ];

    for (const p of participants) {
      const entryData = {
        species: 'magikarp',
        name: 'Magikarp',
        nickname: p.nickname,
        total_ivs: p.ivs,
        level: 15
      };

      await queryLocal(`
        INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        `entry_${p.id}`,
        'hora_magikarp_duo',
        p.id,
        p.name,
        p.email,
        `poke_${p.id}`,
        JSON.stringify(entryData),
        '2026-08-26T12:00:00Z'
      ]);
    }

    const awardResult = await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp_duo' });
    assert.strictEqual(awardResult.error, null);

    const resultRows = await queryLocal('SELECT * FROM competition_results WHERE event_id = ?', ['hora_magikarp_duo']);
    assert.strictEqual(resultRows.length, 1);
    const winners = JSON.parse((resultRows[0] as { winners: string }).winners) as Array<{
      rank: string;
      player_id: string;
      player_name: string;
      score: number;
      entry_data: { nickname: string; total_ivs: number };
    }>;

    assert.strictEqual(winners.length, 2, 'Exactly 2 winners should be recorded in podium');
    // First place must be duo_p1 with 175 IVs
    assert.strictEqual(winners[0]?.rank, 'first');
    assert.strictEqual(winners[0]?.player_id, 'duo_p1');
    assert.strictEqual(winners[0]?.player_name, 'Primer_Lugar');
    assert.strictEqual(winners[0]?.score, 175);
    assert.strictEqual(winners[0]?.entry_data.nickname, 'Magikarp_Gold');

    // Second place must be duo_p2 with 140 IVs
    assert.strictEqual(winners[1]?.rank, 'second');
    assert.strictEqual(winners[1]?.player_id, 'duo_p2');
    assert.strictEqual(winners[1]?.player_name, 'Segundo_Lugar');
    assert.strictEqual(winners[1]?.score, 140);
    assert.strictEqual(winners[1]?.entry_data.nickname, 'Magikarp_Silver');

    const awards = (await queryLocal('SELECT * FROM awards WHERE event_id = ?', ['hora_magikarp_duo'])) as unknown as Array<{
      winner_id: string;
      prize: string;
    }>;

    assert.strictEqual(awards.length, 2, 'Only 2 awards should be generated');
    const firstAward = awards.find(a => a.winner_id === 'duo_p1');
    const secondAward = awards.find(a => a.winner_id === 'duo_p2');
    assert.ok(firstAward);
    assert.ok(secondAward);

    const firstPrize = JSON.parse(firstAward.prize) as { amount: number };
    const secondPrize = JSON.parse(secondAward.prize) as { amount: number };
    assert.strictEqual(firstPrize.amount, 50000);
    assert.strictEqual(secondPrize.amount, 25000);
  });

  it('automatically prunes competition_results to max 100 entries when new events are awarded', async () => {
    const mockSqliteDb = {} as SQLiteDatabase;

    const eventConfig = {
      species: 'magikarp',
      metric: 'total_ivs',
      hasCompetition: true,
      prizes: {
        first: { type: 'money', amount: 50000 }
      }
    };

    await queryLocal(`
      INSERT INTO events_config (id, name, icon, type, active, manual, config, description)
      VALUES (?, ?, ?, ?, 1, 0, ?, ?)
    `, [
      'hora_magikarp_prune',
      'Hora Magikarp Pruning Test',
      '🎣',
      'competition',
      JSON.stringify(eventConfig),
      'Test de purga de historial'
    ]);

    // Insert 105 mock historical results with distinct ended_at timestamps
    const TOTAL_HISTORICAL_RESULTS = 105;
    const MAX_CAP = 100;

    for (let i = 1; i <= TOTAL_HISTORICAL_RESULTS; i++) {
      const padIdx = String(i).padStart(3, '0');
      const timestamp = `2026-08-01T${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`;
      await queryLocal(`
        INSERT INTO competition_results (id, event_id, winners, ended_at)
        VALUES (?, ?, ?, ?)
      `, [
        `history_result_${padIdx}`,
        'hora_magikarp_old',
        JSON.stringify([{ rank: 'first', player_id: `player_${padIdx}`, player_name: `Trainer_${padIdx}`, score: 100 }]),
        timestamp
      ]);
    }

    const preCountRows = await queryLocal('SELECT COUNT(*) as cnt FROM competition_results');
    const preCount = (preCountRows[0] as { cnt: number }).cnt;
    assert.strictEqual(preCount, TOTAL_HISTORICAL_RESULTS);

    // Enroll a new participant and award the event
    await queryLocal(`
      INSERT INTO competition_entries (id, event_id, player_id, player_name, player_email, pokemon_uid, data, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'entry_prune_1',
      'hora_magikarp_prune',
      'player_prune_1',
      'Entrenador_Nuevo',
      'nuevo@test.com',
      'poke_prune_1',
      JSON.stringify({ species: 'magikarp', name: 'Magikarp', nickname: 'NewKarp', total_ivs: 180 }),
      '2026-08-26T12:00:00Z'
    ]);

    await emulateAwardEventAutomated(mockSqliteDb, { target_event_id: 'hora_magikarp_prune' });

    // Verify competition_results is pruned down to MAX_CAP (100)
    const postCountRows = await queryLocal('SELECT COUNT(*) as cnt FROM competition_results');
    const postCount = (postCountRows[0] as { cnt: number }).cnt;
    assert.strictEqual(postCount, MAX_CAP, 'Should prune database to exactly 100 competition_results');

    // Verify oldest 6 entries (history_result_001 to history_result_006) were deleted
    const oldestDeleted = await queryLocal('SELECT id FROM competition_results WHERE id = ?', ['history_result_001']);
    assert.strictEqual(oldestDeleted.length, 0, 'Oldest results must be purged from database');

    // Verify newest entry exists
    const newestSaved = await queryLocal('SELECT id FROM competition_results WHERE event_id = ?', ['hora_magikarp_prune']);
    assert.strictEqual(newestSaved.length, 1, 'Newest result must be preserved');
  });
});
