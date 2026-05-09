import { Temporal } from '@js-temporal/polyfill'

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useDebugStore } from '@/stores/debug'
import type { AuthUser } from '@/types/auth'

// Stable mock object for chain calls
const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  eq: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  single: vi.fn().mockResolvedValue({ data: { is_banned: false } })
}

// Mock Supabase
let mockTimeOffset = 0
vi.mock('@/logic/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(() => mockChain),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    getTimeOffset: vi.fn(() => mockTimeOffset),
    setTimeOffset: vi.fn((ms) => { mockTimeOffset = ms }),
    setMockTime: vi.fn((d) => { mockTimeOffset = Temporal.Instant.fromEpochMilliseconds(d).epochMilliseconds - Temporal.Now.instant().epochMilliseconds }),
    resetTime: vi.fn(() => { mockTimeOffset = 0 }),
    rpc: vi.fn().mockResolvedValue({ data: { players_count: 10 }, error: null })
  }
}))

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {}
  global.localStorage = {
    getItem: (key: string): string | null => store[key] || null,
    setItem: (key: string, value: string): void => { store[key] = value.toString() },
    clear: (): void => { for (const key in store) delete store[key] },
    removeItem: (key: string): void => { delete store[key] },
    length: 0,
    key: (_index: number): string | null => null
  }
}

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

    it('initializes window.__VITE_DEBUG__ only for authorized users (online admin)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'admin_id', role: 'admin', user_metadata: { username: 'admin_id' } } as unknown as AuthUser
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect((window as unknown as Record<string, unknown>).__VITE_DEBUG__).toBeDefined()
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
