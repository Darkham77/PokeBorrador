/**
 * tests/node/breeding/breeding_and_egg_hatch_suite.test.ts
 *
 * Consolidated Suite for Daycare Warehouse Persistence, Egg Natures, Moves Inheritance, and Debug Hatching.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { setActivePinia, createPinia } from 'pinia';
import { TABLES_SCHEMA } from '../../../src/logic/db/schema.ts';
import { DATABASE_MIGRATIONS } from '../../../src/logic/db/migrations_data.ts';
import { NATURES, toNatureId, isNatureId } from '../../../src/data/battle/natures.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import { useBreedingStore } from '../../../src/stores/breeding.ts';
import { useGameStore } from '../../../src/stores/game.ts';
import { eggFactory } from '../../../src/logic/breeding/eggFactory.ts';
import { inheritMoves } from '@/logic/breeding/breedingEngine';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import { useBreedingActions } from '@/stores/game/actions/breedingActions';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { DaycareEgg } from '../../../src/types/breeding/breeding.ts';
import type { GameState } from '@/types/system/game';
import type { Pokemon, PokemonEgg } from '@/types/pokemon/pokemon';
import type { SaveDataDto } from '@/logic/validation/schemas';

describe('Breeding Domain: Warehouse Persistence, Egg Natures & Hatching Suite', () => {
  describe('Daycare Warehouse Persistence & Egg Natures', () => {
    beforeEach(() => {
      setActivePinia(createPinia());
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    });

    it('RED: non-canonical Spanish/capitalized nature on egg fails makePokemon without migration', () => {
      const legacyNature = 'Serio';
      expect(() => toNatureId(legacyNature)).toThrow();
      expect(() => {
        makePokemon('lapras', 1, {
          nature: legacyNature as unknown as import('../../../src/data/battle/natures.ts').NatureId,
          obtainedMethod: 'egg'
        });
      }).toThrow();
    });

    it('synchronizes warehouseEggs with gameStore.state.daycareWarehouse on save and load', async () => {
      const gameStore = useGameStore();
      const breedingStore = useBreedingStore();

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

      gameStore.state.daycareWarehouse = [initialWarehouseEgg];

      await breedingStore.loadDaycare(true);

      expect(breedingStore.warehouseEggs.length).toBe(1);
      expect(breedingStore.warehouseEggs[0]?.species).toBe('lapras');

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

      expect(gameStore.state.daycareWarehouse).toBeDefined();
      expect(gameStore.state.daycareWarehouse?.length).toBe(2);
    });

    it('static SQL migration 20260907010000 normalizes legacy natures in eggs and daycareWarehouse and enables clean hatching', async () => {
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

      for (const migration of DATABASE_MIGRATIONS) {
        if (migration.sqlite_sql) {
          db.exec(migration.sqlite_sql);
        }
      }

      const row1 = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('kenviota_test_id') as { save_data: string };
      const migrated1 = JSON.parse(row1.save_data);

      expect(migrated1.eggs[0].nature).toBe('serious');
      expect(migrated1.eggs[1].nature).toBe('adamant');
      expect(migrated1.daycareWarehouse[0].nature).toBe('modest');
      expect(migrated1.daycareWarehouse[1].nature).toBe('bashful');

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

      const row2 = db.prepare('SELECT save_data FROM game_saves WHERE user_id = ?').get('kenviota_missing_wh_id') as { save_data: string };
      const migrated2 = JSON.parse(row2.save_data);
      expect(Array.isArray(migrated2.daycareWarehouse)).toBe(true);
      expect(migrated2.daycareWarehouse.length).toBe(0);

      const validationRes = validateSaveData(migrated1);
      expect(validationRes.success).toBe(true);
    });
  });

  describe('Stonjourner & Unreleased Pokemon in Debug Mode / Breeding', () => {
    let hadWindow = false;

    beforeEach(() => {
      setActivePinia(createPinia());
      hadWindow = typeof globalThis.window !== 'undefined';
      if (!hadWindow) {
        (globalThis as unknown as { window: unknown }).window = {
          location: { search: '' },
          __VITE_DEBUG__: {}
        };
      } else {
        (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};
      }
    });

    afterEach(() => {
      if (!hadWindow) {
        delete (globalThis as unknown as { window?: unknown }).window;
      } else if (typeof globalThis.window !== 'undefined') {
        delete (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__;
      }
    });

    it('inheritMoves does not assign high level-up moves to baby at level 1 if not an egg move or TM', () => {
      const pA: Partial<Pokemon> = {
        id: 'stonjourner',
        level: 50,
        moves: [
          { id: 'wideguard', name: 'Vastaguardia', pp: 10, maxPP: 10, type: 'rock', power: 0, acc: 100, cat: 'status' }
        ]
      };
      const pB: Partial<Pokemon> = {
        id: 'stonjourner',
        level: 50,
        moves: [
          { id: 'wideguard', name: 'Vastaguardia', pp: 10, maxPP: 10, type: 'rock', power: 0, acc: 100, cat: 'status' }
        ]
      };

      const inherited = inheritMoves(pA as Pokemon, pB as Pokemon, 'stonjourner');
      expect(inherited).not.toContain('wideguard');
    });

    it('allows hatching an egg of an unreleased Pokemon (Stonjourner) when debug mode is active', async () => {
      (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};

      const egg: PokemonEgg = {
        uid: 'egg-stonjourner-1',
        id: 'stonjourner',
        steps: 0,
        totalSteps: 250,
        ready: true,
        movesAtBirth: ['rockthrow', 'block']
      };

      const mockState: Partial<GameState> = {
        eggs: [egg],
        team: [],
        box: [],
        playerClass: 'entrenador'
      };

      const breedingActions = useBreedingActions(
        mockState as GameState,
        async () => {},
        (p) => {
          mockState.team?.push(p);
          return { success: true, target: 'team' };
        }
      );

      const hatched = await breedingActions.executeHatch(egg);
      expect(hatched).toBeDefined();
      expect(hatched.id).toBe('stonjourner');
      expect(hatched.level).toBe(1);
      expect(hatched.moves.length).toBeGreaterThan(0);
    });

    it('allows hatching an unreleased Pokemon even if movesAtBirth had an arbitrary move when debug mode is active', async () => {
      (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};

      const egg: PokemonEgg = {
        uid: 'egg-stonjourner-wideguard',
        id: 'stonjourner',
        steps: 0,
        totalSteps: 250,
        ready: true,
        movesAtBirth: ['wideguard']
      };

      const mockState: Partial<GameState> = {
        eggs: [egg],
        team: [],
        box: [],
        playerClass: 'entrenador'
      };

      const breedingActions = useBreedingActions(
        mockState as GameState,
        async () => {},
        (p) => {
          mockState.team?.push(p);
          return { success: true, target: 'team' };
        }
      );

      const hatched = await breedingActions.executeHatch(egg);
      expect(hatched).toBeDefined();
      expect(hatched.id).toBe('stonjourner');
      expect(hatched.moves.some(m => m?.id === 'wideguard')).toBe(true);
    });

    it('validates and sanitizes save data containing unreleased Pokemon when debug mode is active', () => {
      (globalThis.window as { __VITE_DEBUG__?: unknown }).__VITE_DEBUG__ = {};

      const testPokemon = makePokemon('stonjourner', 10, { bypassWhitelist: true });
      expect(testPokemon).not.toBeNull();

      const legality = checkPokemonLegality(testPokemon);
      expect(legality.isLegal).toBe(true);

      const validBaseSave = {
        trainer: 'Franco',
        gender: 'h',
        badges: 8,
        balls: 5,
        money: 1000,
        battleCoins: 50,
        trainerLevel: 14,
        trainerExp: 100,
        trainerExpNeeded: 200,
        inventory: { pokeball: 5, potion: 2 },
        team: [testPokemon!],
        box: [],
        eggs: [],
        pokedex: ['stonjourner'],
        seenPokedex: ['stonjourner'],
        defeatedGyms: ['pewter'],
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
          criminality: 0,
          kitCaptures: 0
        },
        warCoins: 0,
        warCoinsSpent: 0,
        lastPokemonCenterHeal: 0,
        playtime: 120
      } as unknown as SaveDataDto;

      const result = validateAndSanitize(validBaseSave);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.team?.[0]?.id).toBe('stonjourner');
        expect((result.data.team?.[0] as Pokemon)?.isIllegal).toBeFalsy();
      }
    });
  });

  describe('Daycare Egg Nature ID Canonical Standards Suite', () => {
    it('should strictly validate that toNatureId only accepts canonical Showdown NatureIds and throws on Spanish/invalid values', () => {
      for (const nature of NATURES) {
        expect(isNatureId(nature)).toBe(true);
        expect(toNatureId(nature)).toBe(nature);
      }

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

      for (const migration of DATABASE_MIGRATIONS) {
        if (migration.sqlite_sql) {
          db.exec(migration.sqlite_sql);
        }
      }

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
      const validPokemon = makePokemon('charmander', 1, {
        nature: 'adamant',
        obtainedMethod: 'egg'
      });

      expect(validPokemon).not.toBeNull();
      expect(validPokemon!.nature).toBe('adamant');
      expect(isNatureId(validPokemon!.nature)).toBe(true);

      expect(() => {
        makePokemon('charmander', 1, {
          nature: 'Serio' as unknown as import('@/data/battle/natures').NatureId,
          obtainedMethod: 'egg'
        });
      }).toThrow("[natures] Invalid NatureId: 'serio'");
    });

    it('should successfully create and claim pokemon eggs once save data has been migrated to canonical nature IDs (Angianemar Case)', async () => {
      const unmigratedEgg = {
        species: requirePokemonSpeciesId('bulbasaur'),
        nature: 'Serio' as unknown as string,
        steps: 1000,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        movesAtBirth: [],
        abilitySlot: 0,
        isShiny: false
      };

      expect(() => {
        eggFactory.createPokemonEgg({
          species: unmigratedEgg.species,
          nature: unmigratedEgg.nature as any,
          steps: unmigratedEgg.steps,
          ivs: unmigratedEgg.ivs,
          movesAtBirth: unmigratedEgg.movesAtBirth,
          abilitySlot: unmigratedEgg.abilitySlot,
          isShiny: unmigratedEgg.isShiny
        });
      }).toThrow("[natures] Invalid NatureId: 'Serio'");

      const migratedNature = 'serious';
      expect(isNatureId(migratedNature)).toBe(true);

      const egg = eggFactory.createPokemonEgg({
        species: unmigratedEgg.species,
        nature: toNatureId(migratedNature),
        steps: unmigratedEgg.steps,
        ivs: unmigratedEgg.ivs,
        movesAtBirth: unmigratedEgg.movesAtBirth,
        abilitySlot: unmigratedEgg.abilitySlot,
        isShiny: unmigratedEgg.isShiny
      });

      expect(egg.uid).toBeDefined();
      expect(egg.nature).toBe('serious');
      expect(egg.id).toBe('bulbasaur');
    });
  });
});
