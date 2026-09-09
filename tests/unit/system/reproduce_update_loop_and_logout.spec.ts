/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePWA } from '@/composables/system/usePWA'
import { setupLocalStorageMock } from './localStorageMock.ts'

setupLocalStorageMock()

// Setup sessionStorage mock
let sessionStore: Record<string, string> = {}
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { sessionStore[key] = value.toString() }),
  removeItem: vi.fn((key: string) => { delete sessionStore[key] }),
  clear: vi.fn(() => { sessionStore = {} })
}
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })

// Mock Supabase
vi.mock('@/logic/db/supabase', async () => {
  const { mockSupabase } = await import('../../helpers/supabaseMock.ts')
  return {
    supabase: mockSupabase,
    switchServer: vi.fn()
  }
})

describe('PWA Update & Logout Redirection (Reproduction)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('handleUpdate MUST call authStore.logout even when gameStore.isReady is false', async () => {
    const authStore = useAuthStore()

    // Simulate logged in user with game NOT ready (e.g. version check blocked initGameSession)
    authStore.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { username: 'Trainer' }
    }

    const logoutSpy = vi.spyOn(authStore, 'logout').mockResolvedValue(undefined)

    const { handleUpdate } = usePWA()

    // Trigger update
    await handleUpdate()

    // Must call logout so the user is not left in an active session
    expect(logoutSpy).toHaveBeenCalled()
  })

  it('handleUpdate MUST redirect to /login instead of /', async () => {
    const authStore = useAuthStore()
    authStore.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { username: 'Trainer' }
    }
    vi.spyOn(authStore, 'logout').mockResolvedValue(undefined)

    const replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
        pathname: '/',
        replace: replaceSpy,
        reload: vi.fn()
      },
      configurable: true,
      writable: true
    })

    // Mock fetch to avoid ECONNREFUSED logs in test
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)

    const { handleUpdate } = usePWA()
    await handleUpdate()

    expect(replaceSpy).toHaveBeenCalled()
    const redirectedUrl = (replaceSpy.mock.calls[0] as unknown as string[])?.[0] ?? ''
    expect(redirectedUrl).toContain('/login')
  })
})
