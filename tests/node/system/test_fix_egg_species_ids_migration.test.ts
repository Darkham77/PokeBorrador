import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { safeParse } from 'valibot';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { saveDataSchema } from '../../../src/logic/validation/schemas.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import { toNatureId } from '../../../src/data/battle/natures.ts';

describe('Egg Migration and Sanitization Suite', () => {
  it('should fix egg.id and sanitize invalid/Spanish nature and egg fields across eggs and daycareWarehouse', () => {
    using db = new DatabaseSync(':memory:');

    // Create baseline tables
    for (const ddl of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
    }

    // Insert save with corrupted egg.id, legacy Spanish nature 'serio', missing totalSteps, etc.
    const mockSaveData = {
      trainer: 'ash',
      gender: 'h',
      badges: 8,
      balls: 50,
      money: 10000,
      battleCoins: 500,
      trainerLevel: 25,
      trainerExp: 1000,
      trainerExpNeeded: 5000,
      inventory: { pokeball: 10 },
      team: [
        {
          uid: 'pikachu_uid_1',
          id: 'pikachu',
          species: 'pikachu',
          name: 'Pikachu',
          level: 25,
          exp: 500,
          expNeeded: 100,
          hp: 60,
          maxHp: 60,
          atk: 50,
          def: 40,
          spa: 50,
          spd: 45,
          spe: 90,
          type: 'electric',
          ability: 'static',
          nature: 'serious',
          isShiny: false,
          moves: [{ id: 'thunderbolt', name: 'Thunderbolt', pp: 15, maxPP: 15 }]
        }
      ],
      box: [],
      eggs: [
        {
          uid: 'charmander-1775440869470',
          id: 'egg_705821f6',
          pokemonId: 'charmander',
          nature: 'serio',
          steps: 100,
          ready: false
        },
        {
          uid: 'togepi-1775440869471',
          id: 'egg_abcdef12',
          nature: 'firme',
          steps: 50,
          ready: false
        },
        {
          uid: '',
          id: 'pichu',
          nature: 'invalid_corrupted_nature',
          steps: 0,
          ready: true
        }
      ],
      daycareWarehouse: [
        {
          id: 'egg_dw_1',
          species: 'eevee',
          name: 'Huevo Pokémon',
          level: 1,
          isEgg: true,
          nature: 'timido',
          steps: 500
        }
      ],
      pokedex: ['pikachu'],
      seenPokedex: ['pikachu'],
      defeatedGyms: ['pewter'],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 3
    };

    // Verify that requirePokemonSpeciesId fails on the corrupted egg.id
    const firstEgg = mockSaveData.eggs[0]!;
    expect(() => requirePokemonSpeciesId(firstEgg.id)).toThrow('Invalid Pokemon species id');

    db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)').run(
      'user_ash_1',
      JSON.stringify(mockSaveData),
      'save_1',
      new Date().toISOString()
    );

    // Apply all registered migrations
    for (const migration of DATABASE_MIGRATIONS) {
      if (migration.sqlite_sql) {
        db.exec(migration.sqlite_sql);
      }
    }

    // Read back save
    const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('user_ash_1') as { save_data: string };
    const migratedSave = JSON.parse(row.save_data);

    // Verify egg species IDs are now valid species
    expect(migratedSave.eggs[0].id).toBe('charmander');
    expect(() => requirePokemonSpeciesId(migratedSave.eggs[0].id)).not.toThrow();
    expect(migratedSave.eggs[0].nature).toBe('serious');
    expect(() => toNatureId(migratedSave.eggs[0].nature)).not.toThrow();

    expect(migratedSave.eggs[1].id).toBe('togepi');
    expect(() => requirePokemonSpeciesId(migratedSave.eggs[1].id)).not.toThrow();
    expect(migratedSave.eggs[1].nature).toBe('adamant');
    expect(() => toNatureId(migratedSave.eggs[1].nature)).not.toThrow();

    // Verify corrupted nature is regenerated to 'serious'
    expect(migratedSave.eggs[2].nature).toBe('serious');
    expect(() => toNatureId(migratedSave.eggs[2].nature)).not.toThrow();

    // Verify daycareWarehouse egg nature was migrated
    expect(migratedSave.daycareWarehouse[0].nature).toBe('timid');
    expect(() => toNatureId(migratedSave.daycareWarehouse[0].nature)).not.toThrow();

    // Verify schema validation passes
    const validation = safeParse(saveDataSchema, migratedSave);
    expect(validation.success).toBe(true);
  });
});
