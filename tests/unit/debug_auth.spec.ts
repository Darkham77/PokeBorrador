

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useDebugStore } from '@/stores/debug'
import type { AuthUser } from '@/types/auth'
import { mockLocalStorage } from '../helpers/debugSetup.ts'
import { mockChain } from '../helpers/supabaseMock.ts'

vi.mock('@/logic/supabase', async () => {
  const { mockSupabase } = await import('../helpers/supabaseMock.ts')
  return {
    supabase: mockSupabase
  }
})

mockLocalStorage()

describe('Debug System (Security & Auth)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    delete (window as unknown as Record<string, unknown>).__VITE_DEBUG__
  })

  describe('Security & Access', () => {
    it('initializes window.__VITE_DEBUG__ only for authorized users (offline)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeDefined()
    })

    it('removes window.__VITE_DEBUG__ even for admin users if online', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'admin_id', role: 'admin', user_metadata: { username: 'admin_id' } } as unknown as AuthUser
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeUndefined()
    })

    it('removes window.__VITE_DEBUG__ for unauthorized users (online regular user)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'user_id', role: 'user', user_metadata: { username: 'user_id' } } as unknown as AuthUser
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeUndefined()
    })

    it('triggers ban and logout if unauthorized execution is attempted', async () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'cheater_id', role: 'user', user_metadata: { username: 'cheater_id' } } as unknown as AuthUser
      const logoutSpy = vi.spyOn(auth, 'logout')
      
      const debug = useDebugStore()
      
      debug.register({
        id: 'test-tool',
        command: 'testCmd',
        action: vi.fn()
      })
      
      const result = debug.securityCheck()
      
      expect(result).toBe(false)
      expect(logoutSpy).toHaveBeenCalled()
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ is_banned: true }))
    })

    it('ensures window.__VITE_DEBUG__ is undefined when no user is logged in (online)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = null
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeUndefined()
    })

    it('ensures login/auth commands are NEVER registered in debug store', () => {
      const debug = useDebugStore()
      const authTools = debug.tools.filter(t => 
        t.command.toLowerCase().includes('login') || 
        t.command.toLowerCase().includes('auth') ||
        t.command.toLowerCase().includes('signup')
      )
      expect(authTools).toHaveLength(0)
    })
  })
})
