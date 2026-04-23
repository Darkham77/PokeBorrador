// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'
import { useDebugStore } from '@/stores/debug'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { usePvPStore } from '@/stores/pvp'

// Stable mock object for chain calls
const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  single: vi.fn().mockResolvedValue({ data: { is_banned: false } })
}

// Mock Supabase
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
    }))
  }
}))

describe('Debug System (CLI-First)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    delete window.__VITE_DEBUG__
  })

  describe('Security & Access', () => {
    it('initializes window.__VITE_DEBUG__ only for authorized users (offline)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect(window.__VITE_DEBUG__).toBeDefined()
    })

    it('initializes window.__VITE_DEBUG__ only for authorized users (online admin)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'admin_id', role: 'admin' }
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect(window.__VITE_DEBUG__).toBeDefined()
    })

    it('removes window.__VITE_DEBUG__ for unauthorized users (online regular user)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'user_id', role: 'user' }
      
      const debug = useDebugStore()
      debug.updateGlobalProxy()
      
      expect(window.__VITE_DEBUG__).toBeUndefined()
    })

    it('triggers ban and logout if unauthorized execution is attempted', async () => {
      const auth = useAuthStore()
      auth.sessionMode = 'online'
      auth.user = { id: 'cheater_id', role: 'user' }
      const logoutSpy = vi.spyOn(auth, 'logout')
      
      const debug = useDebugStore()
      
      // Force registration (normally wouldn't happen for unauthorized but we test the securityCheck wrapper)
      debug.register({
        id: 'test-tool',
        command: 'testCmd',
        action: vi.fn()
      })
      
      // We manually simulate the proxy call that would be on window if it were exposed
      // but since it's NOT exposed for this user, we call securityCheck directly
      const result = debug.securityCheck()
      
      expect(result).toBe(false)
      expect(logoutSpy).toHaveBeenCalled()
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ is_banned: true }))
    })
  })

  describe('Command Execution & Parameters', () => {
    it('registers and executes commands with parameters (setMoney)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const game = useGameStore()
      const debug = useDebugStore()
      
      window.__VITE_DEBUG__.setMoney(5000)
      expect(game.state.money).toBe(5000)
    })

    it('registers and executes commands with parameters (setLevel)', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const game = useGameStore()
      const debug = useDebugStore()
      
      window.__VITE_DEBUG__.setLevel(25)
      expect(game.state.trainerLevel).toBe(25)
    })

    it('handles map dominance simulation', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const map = useMapStore()
      const debug = useDebugStore()
      
      // Initialize some maps
      map.maps = [{ id: 'route1' }, { id: 'route2' }]
      
      window.__VITE_DEBUG__.setDominance('poder')
      expect(map.mapWinners['route1'].winner_faction).toBe('poder')
      expect(map.mapWinners['route2'].winner_faction).toBe('poder')
    })

    it('handles time cycle simulation', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const map = useMapStore()
      const debug = useDebugStore()
      
      window.__VITE_DEBUG__.setCycle('night')
      expect(map.forcedCycle).toBe('night')
    })

    it('handles item addition', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const game = useGameStore()
      const debug = useDebugStore()
      
      window.__VITE_DEBUG__.addItem('Poke Ball', 50)
      expect(game.state.inventory['Poke Ball']).toBe(50)
    })
  })

  describe('Registration System', () => {
    it('prevents duplicate tool registration', () => {
      const debug = useDebugStore()
      const initialCount = debug.tools.length
      
      debug.register({ id: 'core-set-money', command: 'setMoney', action: () => {} })
      expect(debug.tools.length).toBe(initialCount)
    })

    it('updates global proxy when new tools are registered', () => {
      const auth = useAuthStore()
      auth.sessionMode = 'offline'
      const debug = useDebugStore()
      
      const testAction = vi.fn()
      debug.register({
        id: 'custom-tool',
        command: 'customCmd',
        action: testAction,
        category: 'misc'
      })
      
      expect(window.__VITE_DEBUG__.customCmd).toBeDefined()
      window.__VITE_DEBUG__.customCmd('hello')
      expect(testAction).toHaveBeenCalledWith('hello')
    })
  })
})
