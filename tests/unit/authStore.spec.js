/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/logic/supabase'

// Mock de Supabase
vi.mock('@/logic/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { db_version: 1 }, error: null }))
        }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }))
  }
}))

// Mock de localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString() }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('debe iniciar sesión local correctamente (Protocolo ASH)', async () => {
    const auth = useAuthStore()
    await auth.localLogin('ASH')
    
    expect(auth.user.user_metadata.username).toBe('ASH')
    expect(auth.sessionMode).toBe('offline')
    expect(localStorage.getItem('pokevicio_local_user')).toContain('ASH')
  })

  it('debe registrar usuarios nuevos en Supabase', async () => {
    const auth = useAuthStore()
    supabase.auth.signUp.mockResolvedValue({ 
      data: { user: { id: 'new_uuid', email: 'test@pkv.io' } }, 
      error: null 
    })

    await auth.signup('test@pkv.io', 'pass123', 'TrainerTest')
    
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@pkv.io',
      password: 'pass123',
      options: { data: { username: 'TrainerTest' } }
    })
    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('debe activar el monitoreo de sesión al iniciar sesión online', async () => {
    const auth = useAuthStore()
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user123' }, session: { access_token: 'tok' } },
      error: null
    })

    await auth.login('test@pkv.io', 'pass123')
    
    expect(auth.sessionMode).toBe('online')
    expect(supabase.channel).toHaveBeenCalledWith('session_check_user123')
  })

  it('debe resetear el estado al cerrar sesión', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user123' }
    auth.sessionConflict = true
    
    await auth.logout()
    
    expect(auth.user).toBeNull()
    expect(auth.sessionConflict).toBe(false)
    expect(localStorage.getItem('pokevicio_local_user')).toBeNull()
  })
})
