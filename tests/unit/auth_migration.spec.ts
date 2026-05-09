import { Temporal } from '@js-temporal/polyfill'

/**
 * tests/unit/auth_migration.spec.ts
 * Verifies the migration logic between Local and Cloud saves using isolated DBRouter.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadBestSave } from '@/logic/auth/loadService'
import { createTestDBRouter, cleanupTestDB } from '../dbTestHelper'
import type { DBRouter } from '@/logic/db/dbRouter'
import type { AuthUser } from '@/types/auth'

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
  const mockUser = { id: 'test_user', email: 'test@pkv.io', user_metadata: { username: 'test_user' } } as unknown as AuthUser;
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
      save_data: { trainer: 'CloudHero', money: 100 },
      updated_at: Temporal.Instant.fromEpochMilliseconds(Temporal.Now.instant().epochMilliseconds - 86400000).toString(),
      last_save_id: 'cloud_v1'
    };
    
    const localSave = {
      trainer: 'LocalHero',
      money: 500,
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
      team: [
        { id: 'pikachu', level: 5 } // Missing gender and UID
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
      team: [
        { id: 'bulbasaur', name: 'Bulbasaur', uid: 'same_id' },
        { id: 'squirtle', name: 'Squirtle', uid: 'same_id' }
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
});
