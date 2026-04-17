import { describe, it, expect, vi } from 'vitest'
import { loadBestSave } from '@/logic/auth/loadService'

// Mocking localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Auth Load Service (Migration v2)', () => {
  const mockUser = { id: 'test_user', email: 'test@pkv.io' };
  
  it('should prefer local save if significantly newer than cloud', async () => {
    localStorageMock.clear();
    const cloudSave = {
      save_data: { trainer: 'CloudHero', money: 100 },
      updated_at: new Date(Date.now() - 10000).toISOString(),
      last_save_id: 'cloud_v1'
    };
    
    const localSave = {
      trainer: 'LocalHero',
      money: 500,
      _last_updated: Date.now()
    };
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(localSave));

    const dbMock = {
      mode: 'online',
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: cloudSave, error: null })
          })
        })
      })
    };

    const result = await loadBestSave(mockUser, dbMock);
    expect(result.data.trainer).toBe('LocalHero');
    expect(result.isNewerThanCloud).toBe(true);
  });

  it('should backfill genders for legacy pokemon', async () => {
    localStorageMock.clear();
    const legacySave = {
      trainer: 'OldTimer',
      team: [
        { id: 'pikachu', level: 5 } // Missing gender and UID
      ],
      _last_updated: Date.now()
    };
    
    const dbMock = { mode: 'offline' };
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(legacySave));

    const result = await loadBestSave(mockUser, dbMock);
    expect(result.data.team[0].gender).toBeDefined();
    expect(result.data.team[0].uid).toBeDefined();
  });

  it('should sanitize duplicate UIDs', async () => {
    localStorageMock.clear();
    const corruptedSave = {
      trainer: 'CloneMaster',
      team: [
        { id: 'bulbasaur', uid: 'same_id' },
        { id: 'squirtle', uid: 'same_id' }
      ],
      _last_updated: Date.now()
    };
    
    const dbMock = { mode: 'offline' };
    localStorageMock.setItem('pokemon_local_save_test_user', JSON.stringify(corruptedSave));

    const result = await loadBestSave(mockUser, dbMock);
    // Sanitize in loadService/saveService removes the second duplicate
    expect(result.data.team.length).toBe(1);
    expect(result.issues).toContain('Duplicado de UID detectado: same_id (squirtle) en equipo');
  });
});
