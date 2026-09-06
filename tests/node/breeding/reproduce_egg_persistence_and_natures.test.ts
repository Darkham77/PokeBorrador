import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { setActivePinia, createPinia } from 'pinia';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { toNatureId } from '../../../src/data/battle/natures.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import { useBreedingStore } from '../../../src/stores/breeding.ts';
import { useGameStore } from '../../../src/stores/game.ts';
import type { DaycareEgg } from '../../../src/types/breeding/breeding.ts';

describe('Tier 1: Reproduction Test - Daycare Warehouse Persistence & Egg Natures', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('RED: non-canonical Spanish/capitalized nature on egg fails makePokemon without migration', () => {
    // Verifies that un-migrated egg with 'Serio' throws when hatched
    const legacyNature = 'Serio';
    expect(() => toNatureId(legacyNature)).toThrow();
    expect(() => {
      makePokemon('lapras', 1, {
        nature: legacyNature as unknown as import('../../../src/data/battle/natures.ts').NatureId,
        obtainedMethod: 'egg'
      });
    }).toThrow();
  });

  it('RED: breedingStore must synchronize warehouseEggs with gameStore.state.daycareWarehouse on save and load', async () => {
    const gameStore = useGameStore();
    const breedingStore = useBreedingStore();

    // 1. Given gameStore state already has daycareWarehouse from DB save (e.g. loaded from server)
    const initialWarehouseEgg: DaycareEgg = {
      id: 'egg_test_1',
      species: 'lapras',
      name: 'Huevo Pokémon',
      level: 1,
      isEgg: true,
      steps: 250,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      nature: 'bold',
      movesAtBirth: [],
      abilityIndex: 0,
      isShiny: false,
      cost: 2000
    };

    // Simulate save data coming from database into gameStore.state
    gameStore.state.daycareWarehouse = [initialWarehouseEgg];

    // 2. When loadDaycare is called (without any localStorage existing, e.g. new device/browser)
    await breedingStore.loadDaycare(true);

    // IN RED: breedingStore.warehouseEggs will be empty because it only read from localStorage!
    // IN GREEN: breedingStore.warehouseEggs must restore initialWarehouseEgg from gameStore.state.daycareWarehouse
    expect(breedingStore.warehouseEggs.length).toBe(1);
    expect(breedingStore.warehouseEggs[0]?.species).toBe('lapras');

    // 3. When a new egg is pushed and saved to warehouse
    const secondEgg: DaycareEgg = {
      id: 'egg_test_2',
      species: 'pinsir',
      name: 'Huevo Pokémon',
      level: 1,
      isEgg: true,
      steps: 260,
      ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
      nature: 'adamant',
      movesAtBirth: [],
      abilityIndex: 1,
      isShiny: false,
      cost: 2500
    };
    breedingStore.warehouseEggs.push(secondEgg);
    breedingStore.saveWarehouseEggs();

    // IN GREEN: gameStore.state.daycareWarehouse must contain both eggs
    expect(gameStore.state.daycareWarehouse).toBeDefined();
    expect(gameStore.state.daycareWarehouse?.length).toBe(2);
  });

  it('GREEN: static SQL migration 20260907010000 normalizes legacy natures in eggs and daycareWarehouse and enables clean hatching', async () => {
    const { DATABASE_MIGRATIONS } = await import('../../../src/logic/db/migrations_data.ts');
    const { validateSaveData } = await import('../../../src/logic/validation/schemas.ts');

    using db = new DatabaseSync(':memory:');

    for (const ddl of TABLES_SCHEMA) {
      db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
    }

    const unmigratedSave = {
      trainer: 'kenviota',
      gender: 'h',
      badges: 8,
      balls: 50,
      money: 100000,
      battleCoins: 500,
      trainerLevel: 25,
      trainerExp: 1000,
      trainerExpNeeded: 5000,
      inventory: { pokeball: 20 },
      team: [],
      box: [],
      pokedex: [],
      seenPokedex: [],
      defeatedGyms: [],
      starterChosen: true,
      eloRating: 1000,
      pvpStats: { wins: 0, losses: 0, draws: 0 },
      rankedMaxElo: 1000,
      passiveTeamActive: false,
      daycare_mission_refreshes: 3,
      boxCount: 4,
      classLevel: 1,
      classXP: 0,
      classData: {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: 0
      },
      eggs: [
        {
          uid: 'egg-kenviota-1',
          id: 'lapras',
          nature: 'Serio',
          steps: 200,
          ready: false,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
        },
        {
          uid: 'egg-kenviota-2',
          id: 'pinsir',
          nature: 'Firme',
          steps: 150,
          ready: false,
          ivs: { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 }
        }
      ],
      daycareWarehouse: [
        {
          id: 'w-egg-1',
          species: 'lapras',
          name: 'Huevo Pokémon',
          level: 1,
          isEgg: true,
          steps: 250,
          ivs: { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 },
          nature: 'Modesta',
          movesAtBirth: [],
          abilityIndex: 0,
          isShiny: false,
          cost: 2000
        },
        {
          id: 'w-egg-2',
          species: 'ditto',
          name: 'Huevo Pokémon',
          level: 1,
          isEgg: true,
          steps: 100,
          ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
          nature: 'Tímido',
          movesAtBirth: [],
          abilityIndex: 0,
          isShiny: false,
          cost: 1500
        }
      ]
    };

    db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)').run(
      'kenviota_test_id',
      JSON.stringify(unmigratedSave),
      'save_kenviota_1',
      new Date().toISOString()
    );

    // Also insert a save where daycareWarehouse was undefined (like Kenviota on server_franco)
    const saveWithMissingWarehouse = {
      ...unmigratedSave,
      trainer: 'kenviota_server_franco',
      daycareWarehouse: undefined
    };
    db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)').run(
      'kenviota_missing_wh_id',
      JSON.stringify(saveWithMissingWarehouse),
      'save_kenviota_2',
      new Date().toISOString()
    );

    // Apply all registered migrations
    for (const migration of DATABASE_MIGRATIONS) {
      if (migration.sqlite_sql) {
        db.exec(migration.sqlite_sql);
      }
    }

    // Verify first save: natures migrated in both eggs and daycareWarehouse
    const row1 = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('kenviota_test_id') as { save_data: string };
    const migrated1 = JSON.parse(row1.save_data);

    expect(migrated1.eggs[0].nature).toBe('serious');
    expect(migrated1.eggs[1].nature).toBe('adamant');
    expect(migrated1.daycareWarehouse[0].nature).toBe('modest');
    expect(migrated1.daycareWarehouse[1].nature).toBe('bashful');

    // Both eggs can hatch cleanly via makePokemon without throwing
    const hatched1 = makePokemon(migrated1.eggs[0].id, 1, {
      nature: migrated1.eggs[0].nature,
      obtainedMethod: 'egg'
    });
    expect(hatched1).not.toBeNull();
    expect(hatched1?.nature).toBe('serious');

    const hatched2 = makePokemon(migrated1.eggs[1].id, 1, {
      nature: migrated1.eggs[1].nature,
      obtainedMethod: 'egg'
    });
    expect(hatched2).not.toBeNull();
    expect(hatched2?.nature).toBe('adamant');

    // Verify second save: missing daycareWarehouse is initialized to empty array
    const row2 = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('kenviota_missing_wh_id') as { save_data: string };
    const migrated2 = JSON.parse(row2.save_data);
    expect(Array.isArray(migrated2.daycareWarehouse)).toBe(true);
    expect(migrated2.daycareWarehouse.length).toBe(0);

    // Verify validation passes cleanly
    const validationRes = validateSaveData(migrated1);
    expect(validationRes.success).toBe(true);
  });
});
