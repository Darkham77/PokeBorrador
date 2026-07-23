/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.ts'
import { setupLocalStorageMock } from './localStorageMock.ts'
import { supabase } from '@/logic/db/supabase'
import type { User } from '@supabase/supabase-js'

// Mock de Supabase
vi.mock('@/logic/db/supabase', async () => {
  const { mockSupabase } = await import('../../helpers/supabaseMock.ts')
  return {
    supabase: mockSupabase
  }
})

vi.mock('@/stores/game', () => ({
  useGameStore: () => ({
    isReady: false,
    save: vi.fn()
  })
}))

setupLocalStorageMock()

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('debe iniciar sesión local correctamente (Protocolo ASH)', async () => {
    const auth = useAuthStore()
    await auth.localLogin('ASH')
    
    expect(auth.user?.user_metadata?.username).toBe('ASH')
    expect(auth.sessionMode).toBe('offline')
    expect(localStorage.getItem('pokevicio_local_user')).toContain('ASH')
  })

  it('debe registrar usuarios nuevos en Supabase', async () => {
    const auth = useAuthStore()
    ;(supabase.auth.signUp as Mock).mockResolvedValue({ 
      data: { user: { id: 'new_uuid', email: 'test@pkv.io', user_metadata: { username: 'TrainerTest' } } as unknown as User }, 
      error: null 
    })

    await auth.signup('test@pkv.io', 'pass123', 'TrainerTest', 'h')
    
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@pkv.io',
      password: 'pass123',
      options: { data: { username: 'TrainerTest', gender: 'h' } }
    })
    expect(supabase.from).toHaveBeenCalledWith('profiles')
  })

  it('debe activar el monitoreo de sesión al iniciar sesión online', async () => {
    const auth = useAuthStore()
    ;(supabase.auth.signInWithPassword as Mock).mockResolvedValue({
      data: { user: { id: 'user123', user_metadata: { username: 'TrainerTest' } } as unknown as User, session: { access_token: 'tok' } },
      error: null
    })

    await auth.login('test@pkv.io', 'pass123')
    
    expect(auth.sessionMode).toBe('online')
    expect(supabase.channel).toHaveBeenCalledWith('session_check_user123')
  })

  it('debe resetear el estado al cerrar sesión', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user123', user_metadata: { username: 'TrainerTest' } } as unknown as NonNullable<typeof auth.user>
    auth.sessionConflict = true
    
    await auth.logout(true)
    
    expect(auth.user).toBeNull()
    expect(auth.sessionConflict).toBe(false)
    expect(localStorage.getItem('pokevicio_local_user')).toBeNull()
  })
})
