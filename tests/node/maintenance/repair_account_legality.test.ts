import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { repairAccountsInDatabase } from '../../../scripts/maintenance/repair_account_legality.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import type { SaveDataDto } from '../../../src/logic/validation/schemas.ts';

describe('repair_account_legality maintenance script test suite', () => {
  let tempDbPath: string;

  beforeEach(() => {
    setActivePinia(createPinia());
    tempDbPath = path.join(os.tmpdir(), `test_poke_repair_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
    using db = new DatabaseSync(tempDbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_saves (
        user_id TEXT PRIMARY KEY,
        save_data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const pika = makePokemon('pikachu', 50)!;
    pika.level = 150; // illegal level > 100
    pika.isIllegal = true;
    pika.illegalReasons = ['Nivel superior al límite'];

    const char = makePokemon('charizard', 50)!;
    char.moves[0] = { id: 'hydropump', name: 'Hydro Pump', pp: 5, maxPP: 5 } as unknown as typeof char.moves[0]; // illegal move for Charizard

    const bulba = makePokemon('bulbasaur', 5)!;

    const illegalSaveDataUser1 = {
      trainer: 'Player1',
      gender: 'h',
      badges: 0,
      balls: 10,
      money: 1000,
      battleCoins: 0,
      trainerLevel: 1,
      trainerExp: 0,
      trainerExpNeeded: 100,
      team: [pika],
      box: [char]
    } as unknown as SaveDataDto;

    const legalSaveDataUser2 = {
      trainer: 'Player2',
      gender: 'm',
      badges: 0,
      balls: 10,
      money: 500,
      battleCoins: 0,
      trainerLevel: 1,
      trainerExp: 0,
      trainerExpNeeded: 100,
      team: [bulba],
      box: []
    } as unknown as SaveDataDto;

    const insertStmt = db.prepare('INSERT INTO game_saves (user_id, save_data) VALUES (?, ?)');
    insertStmt.run('user_illegal_1', JSON.stringify(illegalSaveDataUser1));
    insertStmt.run('user_legal_2', JSON.stringify(legalSaveDataUser2));
  });

  afterEach(() => {
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // Ignored in cleanup
      }
    }
  });

  it('repairs a specific account when userId is provided', async () => {
    const summary = await repairAccountsInDatabase({
      userId: 'user_illegal_1',
      dbPath: tempDbPath,
      silent: true
    });

    expect(summary.accountsAudited).toBe(1);
    expect(summary.accountsRepaired).toBe(1);
    expect(summary.pokemonRepaired).toBeGreaterThanOrEqual(1);

    using db = new DatabaseSync(tempDbPath);
    const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('user_illegal_1') as { save_data: string };
    const saved = JSON.parse(row.save_data) as SaveDataDto;

    expect(saved.team?.[0]?.level).toBeLessThanOrEqual(100);
    expect(saved.team?.[0]?.isIllegal).toBe(false);
  });

  it('leaves other accounts untouched when targeting a specific account', async () => {
    const summary = await repairAccountsInDatabase({
      userId: 'user_legal_2',
      dbPath: tempDbPath,
      silent: true
    });

    expect(summary.accountsAudited).toBe(1);
    expect(summary.accountsRepaired).toBe(0);
    expect(summary.pokemonRepaired).toBe(0);
  });

  it('repairs all accounts sequentially when --all is enabled', async () => {
    const summary = await repairAccountsInDatabase({
      all: true,
      dbPath: tempDbPath,
      silent: true
    });

    expect(summary.accountsAudited).toBe(2);
    expect(summary.accountsRepaired).toBe(1);
    expect(summary.pokemonRepaired).toBeGreaterThanOrEqual(2);

    using db = new DatabaseSync(tempDbPath);
    const rows = db.prepare('SELECT user_id, save_data FROM game_saves ORDER BY user_id ASC').all() as Array<{ user_id: string; save_data: string }>;

    expect(rows).toHaveLength(2);

    const user1Data = JSON.parse(rows[0]!.save_data) as SaveDataDto;
    expect(user1Data.team?.[0]?.level).toBe(100);
    expect(user1Data.team?.[0]?.isIllegal).toBe(false);

    const user2Data = JSON.parse(rows[1]!.save_data) as SaveDataDto;
    expect(user2Data.team?.[0]?.id).toBe('bulbasaur');
  });

  it('throws a descriptive error when SQLite database does not exist', async () => {
    await expect(
      repairAccountsInDatabase({
        all: true,
        dbPath: 'non_existent_path.db',
        silent: true
      })
    ).rejects.toThrow(/No se encontró ninguna base de datos SQLite/);
  });
});

