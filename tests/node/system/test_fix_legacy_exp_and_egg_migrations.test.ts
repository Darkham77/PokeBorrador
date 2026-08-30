import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { safeParse } from 'valibot';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { saveDataSchema } from '../../../src/logic/validation/schemas.ts';

describe('Fix Legacy expNeeded and Egg IDs Migration Test', () => {
  it('should fix expNeeded null on level 100 pokemon and numeric egg ids so they pass saveDataSchema validation', () => {
    using db = new DatabaseSync(':memory:');

    // Create tables
    for (const ddl of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
    }

    // Insert a problematic save with expNeeded: null on level 100 pokemon and numeric egg id
    const mockSaveData = {
      trainer: 'TestTrainer',
      gender: 'h',
      badges: 8,
      balls: 50,
      money: 10000,
      battleCoins: 500,
      trainerLevel: 50,
      trainerExp: 1000,
      trainerExpNeeded: 5000,
      inventory: { pokeball: 10 },
      team: [
        {
          uid: 'test_dragonite_uid',
          id: 'dragonite',
          species: 'dragonite',
          name: 'Dragonite',
          level: 100,
          exp: 0,
          expNeeded: null, // Legacy null value
          hp: 300,
          maxHp: 300,
          atk: 250,
          def: 200,
          spa: 220,
          spd: 220,
          spe: 200,
          type: 'dragon',
          type2: 'flying',
          ability: 'innerfocus',
          isShiny: false,
          moves: [{ id: 'outrage', name: 'Outrage', pp: 10, maxPP: 10 }]
        }
      ],
      box: [
        {
          uid: 'test_snorlax_uid',
          id: 'snorlax',
          species: 'snorlax',
          name: 'Snorlax',
          level: 100,
          exp: 0,
          expNeeded: null, // Legacy null value
          hp: 400,
          maxHp: 400,
          atk: 200,
          def: 150,
          spa: 150,
          spd: 250,
          spe: 80,
          type: 'normal',
          ability: 'immunity',
          isShiny: false,
          moves: [{ id: 'bodyslam', name: 'Body Slam', pp: 15, maxPP: 15 }]
        }
      ],
      eggs: [
        {
          uid: 'test_egg_uid',
          id: 1775440869470.7927, // Legacy numeric id
          steps: 100,
          ready: false
        }
      ],
      pokedex: ['dragonite', 'snorlax'],
      seenPokedex: ['dragonite', 'snorlax'],
      defeatedGyms: ['pewter'],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 3
    };

    // Before migration: safeParse must fail because of expNeeded: null and numeric egg id
    const beforeCheck = safeParse(saveDataSchema, mockSaveData);
    expect(beforeCheck.success).toBe(false);

    db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)').run(
      'mock_user_1',
      JSON.stringify(mockSaveData),
      'save_1',
      new Date().toISOString()
    );

    // Apply migrations
    for (const migration of DATABASE_MIGRATIONS) {
      if (migration.sqlite_sql) {
        db.exec(migration.sqlite_sql);
      }
    }

    // Read back save
    const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('mock_user_1') as { save_data: string };
    const migratedSave = JSON.parse(row.save_data);

    // Verify expNeeded is now 0 (number) on team and box
    expect(migratedSave.team[0].expNeeded).toBe(0);
    expect(typeof migratedSave.team[0].expNeeded).toBe('number');

    expect(migratedSave.box[0].expNeeded).toBe(0);
    expect(typeof migratedSave.box[0].expNeeded).toBe('number');

    // Verify egg id is now string
    expect(typeof migratedSave.eggs[0].id).toBe('string');

    // Verify full schema compliance
    const afterCheck = safeParse(saveDataSchema, migratedSave);
    if (!afterCheck.success) {
      console.log('After check issues:', afterCheck.issues.map(i => ({ path: i.path?.map(p => p.key).join('.'), msg: i.message, expected: i.expected, received: i.received, input: i.input })));
    }
    expect(afterCheck.success).toBe(true);
  });
});
