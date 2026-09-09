/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUpdateStore } from '@/stores/update'
import { useAuthStore } from '@/stores/auth'
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

describe('Centralized useUpdateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.clearAllMocks()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
  })

  it('initializes with default up_to_date state', () => {
    const updateStore = useUpdateStore()
    expect(updateStore.status).toBe('up_to_date')
    expect(updateStore.modalType).toBeNull()
    expect(updateStore.isUpdateAvailable).toBe(false)
    expect(updateStore.isBlocked).toBe(false)
    expect(updateStore.isUpdating).toBe(false)
  })

  it('notifyOutdatedClient updates state and marks update available and blocked', () => {
    const updateStore = useUpdateStore()
    updateStore.notifyOutdatedClient({ client: 'v1.0.0', server: 'v1.1.0' })

    expect(updateStore.status).toBe('outdated_client')
    expect(updateStore.modalType).toBe('client_update')
    expect(updateStore.isUpdateAvailable).toBe(true)
    expect(updateStore.isBlocked).toBe(true)
    expect(updateStore.versionInfo).toEqual({ client: 'v1.0.0', server: 'v1.1.0' })
  })

  it('notifyOutdatedServer sets server_outdated modal and blocks interaction', () => {
    const updateStore = useUpdateStore()
    updateStore.notifyOutdatedServer({ client: 'v2.0.0', server: 'v1.9.0' })

    expect(updateStore.status).toBe('outdated_server')
    expect(updateStore.modalType).toBe('server_outdated')
    expect(updateStore.isUpdateAvailable).toBe(false)
    expect(updateStore.isBlocked).toBe(true)
  })

  it('notifyDbIncompatible sets db_outdated modal and blocks interaction', () => {
    const updateStore = useUpdateStore()
    updateStore.notifyDbIncompatible({ client: '20260416', server: '20260417', db: 20260417 })

    expect(updateStore.status).toBe('db_incompatible')
    expect(updateStore.modalType).toBe('db_outdated')
    expect(updateStore.isBlocked).toBe(true)
  })

  it('notifyChunkLoadError flags client_update', () => {
    const updateStore = useUpdateStore()
    updateStore.notifyChunkLoadError(new Error('Failed to fetch dynamically imported module'))

    expect(updateStore.status).toBe('outdated_client')
    expect(updateStore.modalType).toBe('client_update')
    expect(updateStore.isUpdateAvailable).toBe(true)
  })

  it('resetStatus restores clean state', () => {
    const updateStore = useUpdateStore()
    updateStore.notifyOutdatedClient({ client: 'v1', server: 'v2' })
    expect(updateStore.isBlocked).toBe(true)

    updateStore.resetStatus()
    expect(updateStore.status).toBe('up_to_date')
    expect(updateStore.modalType).toBeNull()
    expect(updateStore.isBlocked).toBe(false)
    expect(updateStore.versionInfo).toBeNull()
  })

  it('exitToLogin unconditionally logs out, sets block_autologin, and navigates to /login', async () => {
    const updateStore = useUpdateStore()
    const authStore = useAuthStore()

    const logoutSpy = vi.spyOn(authStore, 'logout').mockResolvedValue(undefined)
    const replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://pokevicio.com',
        pathname: '/game/map',
        replace: replaceSpy,
        reload: vi.fn()
      },
      configurable: true,
      writable: true
    })

    await updateStore.exitToLogin()

    expect(logoutSpy).toHaveBeenCalledWith(true, true)
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('block_autologin', 'true')
    expect(replaceSpy).toHaveBeenCalledWith('https://pokevicio.com/login')
  })

  it('executeCleanUpdate terminates worker, logs out with preventSave=true, and redirects to /login', async () => {
    const updateStore = useUpdateStore()
    const authStore = useAuthStore()

    authStore.user = {
      id: 'usr-123',
      email: 'trainer@pkmn.test',
      user_metadata: { username: 'Red' }
    }

    const terminateSpy = vi.fn()
    ;(window as unknown as { __showdownWorker__?: { terminate: () => void } }).__showdownWorker__ = {
      terminate: terminateSpy
    }

    const logoutSpy = vi.spyOn(authStore, 'logout').mockResolvedValue(undefined)
    const replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://pokevicio.com',
        pathname: '/',
        replace: replaceSpy,
        reload: vi.fn()
      },
      configurable: true,
      writable: true
    })

    await updateStore.executeCleanUpdate({ targetPath: 'login', forceNoSave: true })

    expect(terminateSpy).toHaveBeenCalled()
    expect(logoutSpy).toHaveBeenCalledWith(true, true)
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('block_autologin', 'true')
    expect(replaceSpy).toHaveBeenCalled()
    const finalUrl = (replaceSpy.mock.calls[0] as unknown as string[])?.[0] ?? ''
    expect(finalUrl).toContain('https://pokevicio.com/login?reload_t=')
  })
})
