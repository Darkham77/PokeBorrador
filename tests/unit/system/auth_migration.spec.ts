

/**
 * tests/unit/auth_migration.spec.ts
 * Verifies the migration logic between Local and Cloud saves using isolated DBRouter.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadBestSave } from '@/logic/auth/loadService'
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts'
import type { DBRouter } from '@/logic/db/dbRouter'
import type { AuthUser } from '@/types/auth/auth'

// Mocking localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => { store[key] = value.toString(); },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function createMockSaveData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    trainer: 'Hero',
    gender: 'h',
    badges: 0,
    balls: 5,
    money: 1000,
    battleCoins: 0,
    trainerLevel: 1,
    trainerExp: 0,
    trainerExpNeeded: 100,
    inventory: {},
    team: [],
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
    playtime: 0,
    ...overrides
  };
}

describe('Auth Load Service (Migration v2)', () => {
  const mockUser = { id: 'test_user', email: 'test@pkv.io', db_version: 3, user_metadata: { username: 'test_user' } } as unknown as AuthUser;
  let db: DBRouter;

  beforeEach(async () => {
    db = await createTestDBRouter();
    localStorageMock.clear();
  });

  afterEach(() => {
    cleanupTestDB();
  });

  it('should prefer local save if significantly newer than cloud', async () => {
    const cloudSave = {
      save_data: createMockSaveData({ trainer: 'CloudHero', money: 100 }),
      updated_at: Temporal.Instant.fromEpochMilliseconds(Temporal.Now.instant().epochMilliseconds - 86400000).toString(),
      last_save_id: 'cloud_v1'
    };
    
    const localSave = createMockSaveData({
      trainer: 'LocalHero',
      money: 500,
      _last_updated: Temporal.Now.instant().epochMilliseconds
    });
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(localSave));

    // Force online mode and mock the internal Supabase client
    db.mode = 'online';
    vi.spyOn(db.realClient as unknown as Record<string, (...args: unknown[]) => unknown>, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: cloudSave, error: null })
        })
      })
    } as unknown as ReturnType<(...args: unknown[]) => unknown>);

    const result = await loadBestSave(mockUser, db);
    expect(result.data!.trainer).toBe('LocalHero');
    expect(result.isNewerThanCloud).toBe(true);
  });

  it('should reject unmigrated pokemon with missing mandatory keys (fail-fast without fallbacks)', async () => {
    const invalidSave = createMockSaveData({
      trainer: 'OldTimer',
      team: [
        { id: 'pikachu', species: 'pikachu', name: 'Pikachu', level: 5, exp: 0, expNeeded: 100, hp: 35, maxHp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90, type: 'electric', status: '', isShiny: false, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }], ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'hardy', ability: 'static' } // Missing uid
      ],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    });
    
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(invalidSave));

    await expect(loadBestSave(mockUser, db)).rejects.toThrow('Carga abortada por datos corruptos o inválidos');
  });

  it('should sanitize duplicate UIDs', async () => {
    const corruptedSave = createMockSaveData({
      trainer: 'CloneMaster',
      team: [
        { id: 'bulbasaur', species: 'bulbasaur', name: 'Bulbasaur', uid: 'same_id', level: 5, exp: 0, expNeeded: 100, hp: 45, maxHp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45, type: 'grass', status: '', isShiny: false, vigor: 100, maxVigor: 100, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }], ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'hardy', ability: 'overgrow' },
        { id: 'squirtle', species: 'squirtle', name: 'Squirtle', uid: 'same_id', level: 5, exp: 0, expNeeded: 100, hp: 44, maxHp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43, type: 'water', status: '', isShiny: false, vigor: 100, maxVigor: 100, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }], ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'hardy', ability: 'torrent' }
      ],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    });
    
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(corruptedSave));

    const result = await loadBestSave(mockUser, db);
    // Sanitize in loadService/saveService removes the second duplicate
    expect(result.data!.team.length).toBe(1);
    expect(result.issues).toContain('Duplicado de UID detectado: same_id (Squirtle) en equipo');
  });

  it('should auto-migrate local user with db_version < 3 in offline mode without throwing', async () => {
    const legacyUser = { id: 'local_ash', email: 'ash@local', db_version: 2, user_metadata: { username: 'ash' } } as unknown as AuthUser;
    const legacySave = createMockSaveData({
      trainer: 'ash',
      _last_updated: Temporal.Now.instant().epochMilliseconds
    });
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_local_ash', JSON.stringify(legacySave));

    const result = await loadBestSave(legacyUser, db);
    expect(legacyUser.db_version).toBe(3);
    expect(result.data).toBeDefined();
  });
});
