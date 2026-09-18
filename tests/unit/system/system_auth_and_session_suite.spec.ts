/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth.ts';
import { setupLocalStorageMock } from './localStorageMock.ts';
import { supabase } from '@/logic/db/supabase';
import type { User } from '@supabase/supabase-js';
import { loadBestSave } from '@/logic/auth/loadService';
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts';
import type { DBRouter } from '@/logic/db/dbRouter';
import type { AuthUser } from '@/types/auth/auth';
import { useLoginHandlers } from '@/views/auth/useLoginHandlers';
import { usePWA } from '@/composables/system/usePWA';

// Mock Supabase
vi.mock('@/logic/db/supabase', async () => {
  const { mockSupabase } = await import('../../helpers/supabaseMock.ts');
  return {
    supabase: mockSupabase,
    switchServer: vi.fn(),
  };
});

setupLocalStorageMock();

// Setup sessionStorage mock
let sessionStore: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { sessionStore[key] = value.toString(); }),
  removeItem: vi.fn((key: string) => { delete sessionStore[key]; }),
  clear: vi.fn(() => { sessionStore = {}; })
};
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });

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

describe('System Auth, Session & Migration Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Auth Store Core Operations', () => {
    it('debe iniciar sesión local correctamente (Protocolo ASH)', async () => {
      const auth = useAuthStore();
      await auth.localLogin('ASH');
      
      expect(auth.user?.user_metadata?.username).toBe('ASH');
      expect(auth.sessionMode).toBe('offline');
      expect(localStorage.getItem('pokevicio_local_user')).toContain('ASH');
    });

    it('debe registrar usuarios nuevos en Supabase', async () => {
      const auth = useAuthStore();
      (supabase.auth.signUp as Mock).mockResolvedValue({ 
        data: { user: { id: 'new_uuid', email: 'test@pkv.io', user_metadata: { username: 'TrainerTest' } } as unknown as User }, 
        error: null 
      });

      await auth.signup('test@pkv.io', 'pass123', 'TrainerTest', 'h');
      
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@pkv.io',
        password: 'pass123',
        options: { data: { username: 'TrainerTest', gender: 'h' } }
      });
      expect(supabase.from).toHaveBeenCalledWith('profiles');
    });

    it('debe activar el monitoreo de sesión al iniciar sesión online', async () => {
      const auth = useAuthStore();
      (supabase.auth.signInWithPassword as Mock).mockResolvedValue({
        data: { user: { id: 'user123', user_metadata: { username: 'TrainerTest' } } as unknown as User, session: { access_token: 'tok' } },
        error: null
      });

      await auth.login('test@pkv.io', 'pass123');
      
      expect(auth.sessionMode).toBe('online');
      expect(supabase.channel).toHaveBeenCalledWith('session_check_user123');
    });

    it('debe resetear el estado al cerrar sesión', async () => {
      const auth = useAuthStore();
      auth.user = { id: 'user123', user_metadata: { username: 'TrainerTest' } } as unknown as NonNullable<typeof auth.user>;
      auth.sessionConflict = true;
      
      await auth.logout(true);
      
      expect(auth.user).toBeNull();
      expect(auth.sessionConflict).toBe(false);
      expect(localStorage.getItem('pokevicio_local_user')).toBeNull();
    });
  });

  describe('Auth Load Service (Migration v2)', () => {
    const mockUser = { id: 'test_user', email: 'test@pkv.io', db_version: 3, user_metadata: { username: 'test_user' } } as unknown as AuthUser;
    let db: DBRouter;

    beforeEach(async () => {
      db = await createTestDBRouter();
    });

    afterEach(() => {
      cleanupTestDB();
    });

    it('should prefer database cloud save over local cache to protect rollbacks and migrations', async () => {
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
      localStorage.setItem('pokemon_local_save_test_user', JSON.stringify(localSave));

      db.mode = 'online';
      vi.spyOn(db.realClient as unknown as Record<string, (...args: unknown[]) => unknown>, 'from').mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: cloudSave, error: null })
          })
        })
      } as unknown as ReturnType<(...args: unknown[]) => unknown>);

      const result = await loadBestSave(mockUser, db);
      expect(result.data!.trainer).toBe('CloudHero');
      expect(result.data!.money).toBe(100);
      expect(result.isNewerThanCloud).toBe(false);
    });

    it('should reject unmigrated pokemon with missing mandatory keys (fail-fast without fallbacks)', async () => {
      const invalidSave = createMockSaveData({
        trainer: 'OldTimer',
        team: [
          { id: 'pikachu', species: 'pikachu', name: 'Pikachu', level: 5, exp: 0, expNeeded: 100, hp: 35, maxHp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90, type: 'electric', status: '', isShiny: false, moves: [{ id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35, type: 'normal', cat: 'physical' }], ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, nature: 'hardy', ability: 'static' }
        ],
        _last_updated: Temporal.Now.instant().epochMilliseconds
      });
      
      db.mode = 'offline';
      localStorage.setItem('pokemon_local_save_test_user', JSON.stringify(invalidSave));

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
      localStorage.setItem('pokemon_local_save_test_user', JSON.stringify(corruptedSave));

      const result = await loadBestSave(mockUser, db);
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
      localStorage.setItem('pokemon_local_save_local_ash', JSON.stringify(legacySave));

      const result = await loadBestSave(legacyUser, db);
      expect(legacyUser.db_version).toBe(3);
      expect(result.data).toBeDefined();
    });
  });

  describe('Login Handlers & Validation Composables', () => {
    it('validates required fields before calling login', async () => {
      const loginMock = vi.fn().mockResolvedValue(undefined);
      const mockAuthStore = {
        isOnline: true,
        login: loginMock,
        signup: vi.fn(),
        localLogin: vi.fn(),
      } as any;

      const routerMock = { replace: vi.fn() } as any;
      const email = ref('');
      const password = ref('');
      const username = ref('');
      const gender = ref<'h' | 'm'>('h');
      const selectedServerId = ref('server-1');
      const serverStatus = ref<'checking' | 'online' | 'offline'>('online');
      const serverStatusDetail = ref('');
      const error = ref<string | null>(null);
      const success = ref<string | null>(null);
      const loading = ref(false);
      const authTab = ref('login');
      const getFriendlyErrorMessage = vi.fn((err: unknown) => String(err));

      const handlers = useLoginHandlers({
        authStore: mockAuthStore,
        router: routerMock,
        email,
        password,
        username,
        gender,
        selectedServerId,
        serverStatus,
        serverStatusDetail,
        error,
        success,
        loading,
        authTab,
        getFriendlyErrorMessage,
      });

      await handlers.handleLogin();
      expect(loginMock).not.toHaveBeenCalled();
      expect(error.value).toBeTruthy();

      email.value = 'valid@example.com';
      password.value = 'validpassword123';
      await handlers.handleLogin();
      expect(loginMock).toHaveBeenCalledWith('valid@example.com', 'validpassword123');
      expect(routerMock.replace).toHaveBeenCalledWith('/');
    });

    it('validates username for local login', async () => {
      const localLoginMock = vi.fn().mockResolvedValue(undefined);
      const mockAuthStore = {
        isOnline: false,
        login: vi.fn(),
        signup: vi.fn(),
        localLogin: localLoginMock,
      } as any;

      const routerMock = { replace: vi.fn() } as any;
      const email = ref('');
      const password = ref('');
      const username = ref('Ash');
      const gender = ref<'h' | 'm'>('h');
      const selectedServerId = ref('');
      const serverStatus = ref<'checking' | 'online' | 'offline'>('offline');
      const serverStatusDetail = ref('');
      const error = ref<string | null>(null);
      const success = ref<string | null>(null);
      const loading = ref(false);
      const authTab = ref('local');
      const getFriendlyErrorMessage = vi.fn();

      const handlers = useLoginHandlers({
        authStore: mockAuthStore,
        router: routerMock,
        email,
        password,
        username,
        gender,
        selectedServerId,
        serverStatus,
        serverStatusDetail,
        error,
        success,
        loading,
        authTab,
        getFriendlyErrorMessage,
      });

      await handlers.handleLocalLogin();
      expect(localLoginMock).toHaveBeenCalledWith('Ash');
      expect(routerMock.replace).toHaveBeenCalledWith('/');
    });
  });

  describe('PWA Update & Logout Redirection', () => {
    it('handleUpdate MUST call authStore.logout even when gameStore.isReady is false', async () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { username: 'Trainer' }
      };

      const logoutSpy = vi.spyOn(authStore, 'logout').mockResolvedValue(undefined);
      const { handleUpdate } = usePWA();
      await handleUpdate();

      expect(logoutSpy).toHaveBeenCalled();
    });

    it('handleUpdate MUST redirect to /login instead of /', async () => {
      const authStore = useAuthStore();
      authStore.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { username: 'Trainer' }
      };
      vi.spyOn(authStore, 'logout').mockResolvedValue(undefined);

      const replaceSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'http://localhost:3000',
          pathname: '/',
          replace: replaceSpy,
          reload: vi.fn()
        },
        configurable: true,
        writable: true
      });

      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);

      const { handleUpdate } = usePWA();
      await handleUpdate();

      expect(replaceSpy).toHaveBeenCalled();
      const redirectedUrl = (replaceSpy.mock.calls[0] as unknown as string[])?.[0] ?? '';
      expect(redirectedUrl).toContain('/login');
    });
  });
});
