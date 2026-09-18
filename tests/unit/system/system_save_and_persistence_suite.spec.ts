/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setupLocalStorageMock } from './localStorageMock.ts';
import { serializeState, saveGame } from '@/logic/auth/saveService';
import { loadBestSave } from '@/logic/auth/loadService';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer';
import { isOPFSSupported, saveToOPFS, loadFromOPFS } from '@/logic/db/opfsHelper';
import { TABLES_SCHEMA } from '@/logic/db/schema';
import { DATABASE_MIGRATIONS } from '@/logic/db/migrations_data';
import { splitSQLStatements, translatePostgresToSqlite } from '@/logic/db/sqlTranslator';
import { INITIAL_STATE } from '@/stores/gameInitialState';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { GameState } from '@/types/system/game';
import type { BattleState } from '@/types/battle/battle';
import type { DBRouter } from '@/logic/db/dbRouter';
import type { AuthUser } from '@/types/auth/auth';
import type { SaveDataDto } from '@/logic/validation/schemas';

vi.mock('@/logic/utils/opfsStorage', () => ({
  readOpfsFile: vi.fn(() => Promise.resolve(null)),
  writeOpfsFile: vi.fn(() => Promise.resolve())
}));

setupLocalStorageMock();

const BACKUP_FIXTURE_PATH = path.resolve(process.cwd(), 'tests/node/fixtures/server_franco_backup_fixture.json');

function requirePokemon(id: Parameters<typeof makePokemon>[0], level: number) {
  const p = makePokemon(id, level);
  if (!p) throw new Error(`Pokemon creation failed for ${id}`);
  return p;
}

function createValidGameState(): GameState {
  return {
    trainer: 'Ash',
    gender: 'h',
    badges: 0,
    balls: 5,
    money: 1000,
    battleCoins: 0,
    trainerLevel: 1,
    trainerExp: 0,
    trainerExpNeeded: 100,
    inventory: {},
    team: [{
      uid: 'test-poke-1',
      id: 'pikachu',
      species: 'pikachu',
      name: 'Pikachu',
      level: 5,
      exp: 0,
      expNeeded: 100,
      hp: 35,
      maxHp: 35,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 50,
      spe: 90,
      type: 'electric',
      status: '',
      isShiny: false,
      vigor: 100,
      maxVigor: 100,
      moves: [{ id: 'quickattack', name: 'Ataque Rápido', pp: 30, maxPP: 30, type: 'normal', cat: 'physical' }],
      ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: 'hardy',
      ability: 'static'
    }],
    box: [],
    eggs: [],
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
    warCoins: 0,
    warCoinsSpent: 0,
    lastPokemonCenterHeal: 0,
    playtime: 0
  } as unknown as GameState;
}

function migrateBackupSaves(filePath: string): Array<{ user_id: string; save_data: string }> {
  if (!fs.existsSync(filePath)) return [];

  const rawBackup = fs.readFileSync(filePath, 'utf8');
  const backupData = JSON.parse(rawBackup) as { data?: { game_saves?: Array<{ user_id: string; save_data: unknown; last_save_id?: string; updated_at?: string }> } };
  const gameSaves = backupData.data?.game_saves || [];
  if (gameSaves.length === 0) return [];

  using db = new DatabaseSync(':memory:');
  for (const ddl of TABLES_SCHEMA) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${ddl}`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT)`);
  db.exec('BEGIN TRANSACTION;');

  const insertSave = db.prepare('INSERT INTO game_saves (user_id, save_data, last_save_id, updated_at) VALUES (?, ?, ?, ?)');
  for (const save of gameSaves) {
    const dataStr = typeof save.save_data === 'string' ? save.save_data : JSON.stringify(save.save_data);
    insertSave.run(save.user_id, dataStr, save.last_save_id || '', save.updated_at || '');
  }

  for (const migration of DATABASE_MIGRATIONS) {
    if (migration.sqlite_sql !== undefined) {
      if (migration.sqlite_sql.trim()) {
        try {
          db.exec(migration.sqlite_sql);
        } catch {
          const statements = splitSQLStatements(migration.sqlite_sql);
          for (const stmt of statements) {
            if (!stmt.trim()) continue;
            try {
              db.exec(stmt);
            } catch (stmtErr: unknown) {
              const msg = (stmtErr as Error).message.toLowerCase();
              const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
              const isMissing = msg.includes('no such column');
              if (!isDuplicate && !isMissing) {
                throw stmtErr;
              }
            }
          }
        }
      }
    } else {
      const statements = splitSQLStatements(migration.sql);
      for (const stmt of statements) {
        if (stmt.trim()) {
          const sql = translatePostgresToSqlite(stmt);
          if (sql) {
            try {
              db.exec(sql);
            } catch (stmtErr: unknown) {
              const msg = (stmtErr as Error).message.toLowerCase();
              const isDuplicate = msg.includes('duplicate column name') || msg.includes('already exists');
              const isMissing = msg.includes('no such column');
              if (!isDuplicate && !isMissing) {
                throw stmtErr;
              }
            }
          }
        }
      }
    }
  }

  db.exec('COMMIT;');

  const selectSaves = db.prepare('SELECT user_id, save_data FROM game_saves');
  return selectSaves.all() as { user_id: string; save_data: string }[];
}

describe('System Save & Persistence Domain Suite', () => {
  describe('serializeState - GameState & Active Battle Serialization', () => {
    it('should serialize activeBattle successfully when a battle is active', () => {
      const enemyPk = requirePokemon('rhydon', 50);
      const playerPk = requirePokemon('bulbasaur', 5);
      const activeBattle: BattleState = {
        player: playerPk,
        enemy: enemyPk,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        turnCount: 1,
        escapeAttempts: 0,
        weather: { type: 'clear', visual: 'clear', turns: -1 },
        isGym: true,
        gymId: 'pewter',
        isTrainer: true,
        trainerName: 'Brock',
        locationId: 'pewter_city',
        trainerSprite: 'brock',
        wasSearching: true,
        battleLogs: [{ id: '1', msg: '¡Combate iniciado!', type: 'log-info', side: 'enemy', icon: null, iconType: null }],
        over: false,
        enemyTeam: [enemyPk],
        participants: [playerPk.uid, enemyPk.uid]
      };

      const mockState: GameState = {
        ...INITIAL_STATE,
        starterChosen: true,
        team: [requirePokemon('bulbasaur', 5)],
        box: [],
        activeBattle
      };

      const serialized = serializeState(mockState);
      const battle = serialized.activeBattle as Record<string, unknown> | null;
      expect(battle).not.toBeNull();
      expect(battle?.['isGym']).toBe(true);
      expect(battle?.['gymId']).toBe('pewter');
      expect(battle?.['trainerName']).toBe('Brock');
      expect(battle?.['trainerSprite']).toBe('brock');
      expect(battle?.['wasSearching']).toBe(true);
      expect(battle?.['participants']).toEqual([playerPk.uid, enemyPk.uid]);
      expect((battle?.['battleLogs'] as unknown[])?.length).toBe(1);
      expect((battle?.['enemyTeam'] as Array<{ hp: number }>)?.[0]?.hp).toBeGreaterThan(0);
    });

    it('should return null for activeBattle if there is no active battle', () => {
      const mockState: GameState = {
        ...INITIAL_STATE,
        starterChosen: true,
        team: [requirePokemon('bulbasaur', 5)],
        box: [],
        activeBattle: null
      };

      const serialized = serializeState(mockState);
      expect(serialized.activeBattle).toBeNull();
    });

    it('should always serialize minigame as null to prevent minigame state persistence and anti-cheat abuse', () => {
      const enemyPk = requirePokemon('magikarp', 5);
      const playerPk = requirePokemon('bulbasaur', 5);
      const activeBattleWithMinigame: BattleState = {
        player: playerPk,
        enemy: enemyPk,
        playerTeamIndex: 0,
        enemyTeamIndex: 0,
        turnCount: 0,
        escapeAttempts: 0,
        weather: { type: 'clear', visual: 'clear', turns: -1 },
        isGym: false,
        isTrainer: false,
        locationId: 'route1',
        wasSearching: true,
        battleLogs: [],
        over: false,
        minigame: 'fishing',
        participants: [playerPk.uid]
      };

      const mockState: GameState = {
        ...INITIAL_STATE,
        starterChosen: true,
        team: [playerPk],
        box: [],
        activeBattle: activeBattleWithMinigame
      };

      const serialized = serializeState(mockState);
      const battle = serialized.activeBattle as Record<string, unknown> | null;
      expect(battle).not.toBeNull();
      expect(battle?.['minigame']).toBeNull();
    });

    it('should persist playerClass, faction, and class progression in serialized save data', () => {
      const mockState: GameState = {
        ...INITIAL_STATE,
        trainer: 'Ash',
        starterChosen: true,
        team: [requirePokemon('pikachu', 25)],
        box: [],
        playerClass: 'rocket',
        classLevel: 5,
        classXP: 1200,
        faction: 'poder',
        activeBattle: null
      };

      const serialized = serializeState(mockState);
      expect(serialized.playerClass).toBe('rocket');
      expect(serialized.classLevel).toBe(5);
      expect(serialized.classXP).toBe(1200);
      expect(serialized.faction).toBe('poder');
    });

    it('debe tener paridad contractual del 100% de propiedades entre INITIAL_STATE, serializeState y saveDataSchema', async () => {
      const { saveDataSchema } = await import('@/logic/validation/schemas');

      const serialized = serializeState(INITIAL_STATE);
      const serializedKeys = new Set(Object.keys(serialized));
      const schemaKeys = new Set(Object.keys(saveDataSchema.entries));

      const TRANSIENT_INITIAL_STATE_KEYS = new Set(['battle']);

      for (const key of Object.keys(INITIAL_STATE)) {
        if (TRANSIENT_INITIAL_STATE_KEYS.has(key)) continue;
        expect(
          serializedKeys.has(key),
          `La clave "${key}" de INITIAL_STATE no está siendo serializada en serializeState()`
        ).toBe(true);
      }

      for (const key of serializedKeys) {
        expect(
          schemaKeys.has(key),
          `La clave serializada "${key}" no existe en el esquema de validación saveDataSchema`
        ).toBe(true);
      }
    });
  });

  describe('OPFS Persistence Helper', () => {
    const originalNavigator = globalThis.navigator;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('detects OPFS support when navigator.storage.getDirectory is available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          storage: {
            getDirectory: vi.fn(),
          },
        },
        writable: true,
        configurable: true,
      });

      expect(isOPFSSupported()).toBe(true);
    });

    it('returns false for isOPFSSupported when storage API is missing', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      expect(isOPFSSupported()).toBe(false);
    });

    it('gracefully handles saveToOPFS when OPFS is unsupported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const data = new Uint8Array([1, 2, 3]);
      const success = await saveToOPFS('test_db', data);
      expect(success).toBe(false);
    });

    it('gracefully handles loadFromOPFS when file is missing', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await loadFromOPFS('non_existent_file');
      expect(result).toBeNull();
    });
  });

  describe('Database Isolation for Local User', () => {
    beforeEach(() => {
      window.localStorage.clear();
      vi.clearAllMocks();
    });

    it('should skip remote database queries in loadBestSave when db is online and user is local_user', async () => {
      const mockDb = {
        mode: 'online',
        from: vi.fn().mockImplementation(() => {
          throw new Error('Should not call db.from in online mode for local_user');
        })
      } as unknown as DBRouter;

      const user = { id: 'local_user', db_version: 3 } as AuthUser;

      const result = await loadBestSave(user, mockDb);
      expect(result.data).toBeNull();
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('should skip remote database queries in saveGame when db is online and user is local_user', async () => {
      const mockDb = {
        mode: 'online',
        rpc: vi.fn().mockImplementation(() => {
          throw new Error('Should not call db.rpc in online mode for local_user');
        }),
        from: vi.fn().mockImplementation(() => {
          throw new Error('Should not call db.from in online mode for local_user');
        })
      } as unknown as DBRouter;

      const user = { id: 'local_user', db_version: 3 } as AuthUser;
      const state = createValidGameState();

      const result = await saveGame(state, user, { db: mockDb, skipRemote: false });
      expect(result?.success).toBe(true);
      expect(result?.remote).toBe(false);
      expect(mockDb.rpc).not.toHaveBeenCalled();
      expect(mockDb.from).not.toHaveBeenCalled();
    });

    it('should prevent concurrent overlapping calls to saveGame', async () => {
      const { writeOpfsFile } = await import('@/logic/utils/opfsStorage');
      
      let resolveSave: (value: void) => void = () => {};
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });

      vi.mocked(writeOpfsFile).mockImplementationOnce(() => savePromise);

      const mockDb = {
        mode: 'online',
        rpc: vi.fn().mockResolvedValue({ data: { success: true, last_save_id: '123' } }),
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null })
            })
          })
        })
      } as unknown as DBRouter;

      const user = { id: 'test_user', email: 'test@example.com', db_version: 3 } as AuthUser;
      const state = createValidGameState();

      const firstSavePromise = saveGame(state, user, { db: mockDb, showNotif: false });
      const secondSavePromise = saveGame(state, user, { db: mockDb, showNotif: false });

      resolveSave();
      const [firstSaveResult, secondSaveResult] = await Promise.all([firstSavePromise, secondSavePromise]);
      expect(firstSaveResult?.success).toBe(true);
      expect(secondSaveResult?.success).toBe(true);
    });
  });

  describe('Backup Saves Serialization & Integrity Audit', () => {
    it('debe migrar, validar y serializar correctamente todos los saves del fixture sin pérdida de datos', () => {
      const saves = migrateBackupSaves(BACKUP_FIXTURE_PATH);
      expect(saves.length).toBeGreaterThan(0);

      let verifiedCount = 0;

      for (const row of saves) {
        const rawData = JSON.parse(row.save_data) as SaveDataDto;

        const sanitizeResult = validateAndSanitize(rawData);
        expect(
          sanitizeResult.valid,
          `Fallo al sanitizar save migrado de usuario ${row.user_id}: ${sanitizeResult.error}`
        ).toBe(true);

        if (!sanitizeResult.valid) continue;

        const loadedDto = sanitizeResult.data;
        const serialized = serializeState(loadedDto);

        const roundtripSanitize = validateAndSanitize(serialized);
        expect(
          roundtripSanitize.valid,
          `Fallo al validar save serializado para usuario ${row.user_id}: ${roundtripSanitize.error}`
        ).toBe(true);

        if (!roundtripSanitize.valid) continue;

        const roundtripData = roundtripSanitize.data;

        expect(roundtripData.trainer).toBe(loadedDto.trainer);
        expect(roundtripData.money).toBe(loadedDto.money);
        expect(roundtripData.battleCoins).toBe(loadedDto.battleCoins);
        expect(roundtripData.trainerLevel).toBe(loadedDto.trainerLevel);
        expect(roundtripData.trainerExp).toBe(loadedDto.trainerExp);
        expect(roundtripData.badges).toBe(loadedDto.badges);
        expect(roundtripData.balls).toBe(loadedDto.balls);
        expect(roundtripData.starterChosen).toBe(loadedDto.starterChosen);
        expect(roundtripData.team.length).toBe(loadedDto.team.length);
        expect(roundtripData.box.length).toBe(loadedDto.box.length);
        expect(roundtripData.pokedex.length).toBe(loadedDto.pokedex.length);
        expect(roundtripData.defeatedGyms).toEqual(loadedDto.defeatedGyms);
        expect(roundtripData.inventory).toEqual(loadedDto.inventory);

        if (loadedDto.playerClass) {
          expect(roundtripData.playerClass).toBe(loadedDto.playerClass);
        }
        if (loadedDto.faction) {
          expect(roundtripData.faction).toBe(loadedDto.faction);
        }

        expect(roundtripData.safariTicketSecs).toBe(loadedDto.safariTicketSecs || 0);
        expect(roundtripData.repelSecs).toBe(loadedDto.repelSecs || 0);
        expect(roundtripData.boxCount).toBe(loadedDto.boxCount);

        verifiedCount++;
      }

      expect(verifiedCount).toBe(saves.length);
    }, 300000);
  });
});
