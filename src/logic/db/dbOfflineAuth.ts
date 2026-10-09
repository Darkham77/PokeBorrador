import type { User, Session } from '@supabase/supabase-js';
import { safeStorage, LOCAL_STORAGE_KEYS } from '../utils/storage.ts';

const PERPETUAL_SESSION_EXPIRY_TIMESTAMP = 9999999999 as const;

export interface OfflineAuthApi {
  signOut: () => Promise<{ error: null }>;
  signInWithPassword: () => Promise<{ data: { user: User | null; session: Session | null }; error: null }>;
  signUp: () => Promise<{ data: { user: User | null; session: Session | null }; error: null }>;
  getUser: () => Promise<{ data: { user: User | null }; error: null }>;
  getSession: () => Promise<{ data: { session: Session | null }; error: null }>;
  onAuthStateChange: () => { data: { subscription: { unsubscribe: () => void } } };
}

export function createOfflineAuthApi(isE2EPostgres: boolean): OfflineAuthApi {
  const localUserStr = safeStorage.getItem(LOCAL_STORAGE_KEYS.LOCAL_USER);
  const localUser = localUserStr ? JSON.parse(localUserStr) as User : null;
  const defaultUser: User | null = isE2EPostgres ? null : {
    id: 'local_user',
    email: 'offline@pkv.io',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: ''
  };
  const user = localUser || defaultUser;
  const session: Session | null = user ? {
    access_token: 'mock',
    token_type: 'bearer',
    user,
    expires_at: PERPETUAL_SESSION_EXPIRY_TIMESTAMP,
    expires_in: PERPETUAL_SESSION_EXPIRY_TIMESTAMP,
    refresh_token: 'mock'
  } : null;

  return {
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user, session }, error: null }),
    signUp: async () => ({ data: { user, session }, error: null }),
    getUser: async () => ({ data: { user }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  };
}
