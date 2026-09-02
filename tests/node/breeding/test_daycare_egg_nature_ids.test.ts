import { describe, it, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { eggFactory } from '../../../src/logic/breeding/eggFactory.ts';
import { NATURES, toNatureId, isNatureId } from '../../../src/data/battle/natures.ts';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';

describe('Daycare Egg Nature ID Canonical Standards Suite', () => {
  it('should strictly validate that toNatureId only accepts canonical Showdown NatureIds and throws on Spanish/invalid values', () => {
    // Canonical Showdown NatureIds must pass
    for (const nature of NATURES) {
      expect(isNatureId(nature)).toBe(true);
      expect(toNatureId(nature)).toBe(nature);
    }

    // Spanish or non-canonical strings must fail loudly without runtime fallbacks
    expect(() => toNatureId('Serio')).toThrow("[natures] Invalid NatureId: 'Serio'");
    expect(() => toNatureId('Firme')).toThrow("[natures] Invalid NatureId: 'Firme'");
    expect(() => toNatureId('Tímido')).toThrow("[natures] Invalid NatureId: 'Tímido'");
    expect(() => toNatureId('serio')).toThrow("[natures] Invalid NatureId: 'serio'");
    expect(() => toNatureId('invalid_nature')).toThrow("[natures] Invalid NatureId: 'invalid_nature'");
  });

  it('should create DaycareEgg and PokemonEgg strictly with canonical NatureIds', () => {
    const validEgg = eggFactory.createDaycareEgg({
      species: 'charmander',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      nature: 'adamant',
      movesAtBirth: ['tackle'],
      abilityIndex: 0,
      isShiny: false,
      cost: 2000
    });

    expect(validEgg.nature).toBe('adamant');
    expect(isNatureId(validEgg.nature)).toBe(true);

    const validPokemonEgg = eggFactory.createPokemonEgg({
      species: 'charmander',
      nature: 'serious',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
    });

    expect(validPokemonEgg.nature).toBe('serious');
    expect(isNatureId(validPokemonEgg.nature!)).toBe(true);

    // Creating with non-canonical Spanish nature must throw loudly
    expect(() => {
      eggFactory.createDaycareEgg({
        species: 'charmander',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        nature: 'Serio',
        movesAtBirth: ['tackle'],
        abilityIndex: 0,
        isShiny: false,
        cost: 2000
      });
    }).toThrow("[natures] Invalid NatureId: 'Serio'");
  });

  it('should migrate legacy Spanish natures in save_data eggs to pure Showdown NatureIds via static migration', () => {
    using db = new DatabaseSync(':memory:');

    // Create baseline tables
    for (const ddl of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
    }

    const mockSaveWithSpanishNatures = {
      trainer: 'ash',
      gender: 'h',
      badges: 8,
      money: 50000,
      team: [],
      box: [],
      eggs: [
        {
          uid: 'egg-1',
          id: 'charmander',
          nature: 'Serio',
          steps: 100,
          ready: false
        },
        {
          uid: 'egg-2',
          id: 'squirtle',
          nature: 'Firme',
          steps: 150,
          ready: false
        },
        {
          uid: 'egg-3',
          id: 'bulbasaur',
          nature: 'Modesta',
          steps: 200,
          ready: false
        },
        {
          uid: 'egg-4',
          id: 'pikachu',
          nature: 'jolly',
          steps: 250,
          ready: false
        }
      ],
      pokedex: [],
      starterChosen: true
    };

    db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)').run(
      'user_nature_test',
      JSON.stringify(mockSaveWithSpanishNatures),
      'save_nature_1',
      new Date().toISOString()
    );

    // Apply all registered migrations
    for (const migration of DATABASE_MIGRATIONS) {
      if (migration.sqlite_sql) {
        db.exec(migration.sqlite_sql);
      }
    }

    // Read back save
    const row = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('user_nature_test') as { save_data: string };
    const migratedSave = JSON.parse(row.save_data);

    expect(migratedSave.eggs[0].nature).toBe('serious');
    expect(() => toNatureId(migratedSave.eggs[0].nature)).not.toThrow();

    expect(migratedSave.eggs[1].nature).toBe('adamant');
    expect(() => toNatureId(migratedSave.eggs[1].nature)).not.toThrow();

    expect(migratedSave.eggs[2].nature).toBe('modest');
    expect(() => toNatureId(migratedSave.eggs[2].nature)).not.toThrow();

    expect(migratedSave.eggs[3].nature).toBe('jolly');
    expect(() => toNatureId(migratedSave.eggs[3].nature)).not.toThrow();
  });

  it('should instantiate Pokemon from hatched egg strictly with canonical NatureId and throw on non-canonical nature', async () => {
    const { makePokemon } = await import('../../../src/logic/pokemon/pokemonFactory.ts');

    const validPokemon = makePokemon('charmander', 1, {
      nature: 'adamant',
      obtainedMethod: 'egg'
    });

    expect(validPokemon).not.toBeNull();
    expect(validPokemon!.nature).toBe('adamant');
    expect(isNatureId(validPokemon!.nature)).toBe(true);

    // Creating with non-canonical nature throws loudly
    expect(() => {
      makePokemon('charmander', 1, {
        nature: 'Serio',
        obtainedMethod: 'egg'
      });
    }).toThrow("[natures] Invalid NatureId: 'serio'");
  });
});
