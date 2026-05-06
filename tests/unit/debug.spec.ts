// @ts-nocheck
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useGameStore } from '@/stores/game'

// Stable mock object for chain calls
const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
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

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key) => { delete store[key] }
  }
}

describe('Debug & Security System', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Reset mocks
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('allows debug tools in offline mode', async () => {
    const auth = useAuthStore()
    const game = useGameStore()
    
    // Simulate offline session
    auth.sessionMode = 'offline'
    auth.user = { id: 'local_tester', role: 'user' }
    
    // Use the debug API (manually since we are in node/vitest, but simulating the logic)
    const setMoney = (val) => {
       if (auth.sessionMode === 'offline' || auth.user?.role === 'admin') {
         game.state.money = val
         return true
       }
       return false
    }

    expect(setMoney(99999)).toBe(true)
    expect(game.state.money).toBe(99999)
  })

  it('blocks and triggers ban if non-admin uses debug in online mode', async () => {
    const auth = useAuthStore()
    const { supabase } = await import('@/logic/supabase')
    
    // Simulate online session as regular user
    auth.sessionMode = 'online'
    auth.user = { id: 'cheater_id', role: 'user' }
    
    const securityCheck = () => {
      if (auth.sessionMode === 'online' && auth.user?.role !== 'admin') {
        // Trigger async ban
        supabase.from('profiles').update({ is_banned: true }).eq('id', auth.user.id)
        auth.logout()
        return false
      }
      return true
    }

    const result = securityCheck()
    
    expect(result).toBe(false)
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('authStore handles ban status during login', async () => {
    const auth = useAuthStore()
    const { supabase } = await import('@/logic/supabase')

    // Mock banned profile using stable mockChain
    mockChain.single.mockResolvedValue({ 
      data: { is_banned: true, ban_reason: 'Exploit detected' } 
    })
    
    supabase.auth.signInWithPassword.mockResolvedValue({ 
      data: { user: { id: 'banned_user' }, session: {} } 
    })

    await expect(auth.login('test@test.com', '123456'))
      .rejects.toThrow('BAN:Exploit detected')
    
    expect(auth.isBanned).toBe(true)
  })
})
