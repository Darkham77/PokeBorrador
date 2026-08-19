import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

describe('Strict Schema Static SQLite Migration', () => {
  it('normalizes legacy or incomplete save data correctly via SQL', () => {
    using db = new DatabaseSync(':memory:');

    // Setup base table
    db.exec(`
      CREATE TABLE game_saves (
        user_id TEXT PRIMARY KEY,
        save_data TEXT,
        last_save_id TEXT,
        updated_at TEXT
      );
    `);

    // Insert legacy incomplete save
    const incompleteSave = {
      trainer: 'Ash',
      // Missing many canonical fields like badges, balls, money, pvpStats, classData, etc.
      team: [
        {
          uid: 'poke-1',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 25,
          hp: 60,
          maxHp: 60,
          atk: 55,
          def: 40,
          spa: 50,
          spd: 50,
          spe: 90,
          type: 'electric'
          // Missing ivs, evs, friendship, isShiny, nature
        }
      ]
    };

    db.exec(`
      INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at)
      VALUES ('user_1', '${JSON.stringify(incompleteSave)}', 'save_1', '2026-08-18T00:00:00.000Z');
    `);

    // Load and run the companion SQLite migration
    const migrationSqlPath = path.resolve('database/migrations/20260818080000_normalize_strict_schemas.sqlite.sql');
    const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');
    db.exec(migrationSql);

    // Retrieve migrated save
    const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('user_1') as { save_data: string };
    assert.ok(row, 'Row should exist in game_saves');
    const migrated = JSON.parse(row.save_data);

    // Assert top-level normalized fields
    assert.strictEqual(migrated.trainer, 'Ash');
    assert.strictEqual(migrated.gender, 'h');
    assert.strictEqual(migrated.badges, 0);
    assert.strictEqual(migrated.balls, 0);
    assert.strictEqual(migrated.money, 0);
    assert.strictEqual(migrated.battleCoins, 0);
    assert.strictEqual(migrated.trainerLevel, 1);
    assert.deepStrictEqual(migrated.inventory, {});
    assert.deepStrictEqual(migrated.eggs, []);
    assert.deepStrictEqual(migrated.pokedex, []);
    assert.deepStrictEqual(migrated.seenPokedex, []);
    assert.deepStrictEqual(migrated.pvpStats, { wins: 0, losses: 0, draws: 0 });
    assert.strictEqual(migrated.eloRating, 1000);
    assert.strictEqual(migrated.starterChosen, false);
    assert.ok(typeof migrated.classData === 'object');
    assert.strictEqual(migrated.classData.captureStreak, 0);

    db.close();
  });
});
