

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
      save_data: { trainer: 'CloudHero', money: 100, team: [], box: [], eggs: [] },
      updated_at: Temporal.Instant.fromEpochMilliseconds(Temporal.Now.instant().epochMilliseconds - 86400000).toString(),
      last_save_id: 'cloud_v1'
    };
    
    const localSave = {
      trainer: 'LocalHero',
      money: 500,
      team: [],
      box: [],
      eggs: [],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    };
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

  it('should backfill genders for legacy pokemon', async () => {
    const legacySave = {
      trainer: 'OldTimer',
      box: [],
      eggs: [],
      team: [
        { id: 'pikachu', level: 5, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] } // Missing gender and UID
      ],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    };
    
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(legacySave));

    const result = await loadBestSave(mockUser, db);
    expect(result.data!.team[0]!.gender).toBeDefined();
    expect(result.data!.team[0]!.uid).toBeDefined();
  });

  it('should sanitize duplicate UIDs', async () => {
    const corruptedSave = {
      trainer: 'CloneMaster',
      box: [],
      eggs: [],
      team: [
        { id: 'bulbasaur', name: 'Bulbasaur', uid: 'same_id', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'squirtle', name: 'Squirtle', uid: 'same_id', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] }
      ],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    };
    
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(corruptedSave));

    const result = await loadBestSave(mockUser, db);
    // Sanitize in loadService/saveService removes the second duplicate
    expect(result.data!.team.length).toBe(1);
    expect(result.issues).toContain('Duplicado de UID detectado: same_id (Squirtle) en equipo');
  });

  it('should patch team sizes greater than 6 by moving excess to box', async () => {
    const oversizedSave = {
      trainer: 'OversizedTeam',
      team: [
        { id: 'pikachu', level: 5, uid: 'p1', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'bulbasaur', level: 5, uid: 'p2', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'squirtle', level: 5, uid: 'p3', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'charmander', level: 5, uid: 'p4', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'pidgey', level: 5, uid: 'p5', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'rattata', level: 5, uid: 'p6', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] },
        { id: 'weedle', level: 5, uid: 'p7', moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }] }
      ],
      box: [],
      eggs: [],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    };
    
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(oversizedSave));

    const result = await loadBestSave(mockUser, db);
    expect(result.data!.team.length).toBe(6);
    expect(result.data!.box.length).toBe(1);
    expect(result.data!.box[0]!.id).toBe('weedle');
  });

  it('should auto-migrate local user with db_version < 3 in offline mode without throwing', async () => {
    const legacyUser = { id: 'local_ash', email: 'ash@local', db_version: 2, user_metadata: { username: 'ash' } } as unknown as AuthUser;
    const legacySave = {
      trainer: 'ash',
      team: [],
      box: [],
      eggs: [],
      _last_updated: Temporal.Now.instant().epochMilliseconds
    };
    db.mode = 'offline';
    localStorageMock.setItem('pokemon_local_save_local_ash', JSON.stringify(legacySave));

    const result = await loadBestSave(legacyUser, db);
    expect(legacyUser.db_version).toBe(3);
    expect(result.data).toBeDefined();
  });
});
