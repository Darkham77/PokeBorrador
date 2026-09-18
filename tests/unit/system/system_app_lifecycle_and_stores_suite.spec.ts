/**
 * tests/unit/system/system_app_lifecycle_and_stores_suite.spec.ts
 * Cohesive domain suite consolidating app loading/session helpers, game store loading,
 * update store, error store, audio debouncing, and time utilities.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  resolveAppLoadingInfo,
  shouldShowLoadingOverlay,
  resolveUpdateOverlayMessage
} from '@/composables/system/appLoadingHelper.ts'
import { handleGlobalBlockEvent } from '@/composables/system/appSessionHelper.ts'
import { useErrorStore } from '@/stores/errorStore'
import { useAudioStore } from '@/stores/audio'
import * as engine from '@/logic/audio/audioEngine'
import { useUpdateStore } from '@/stores/update'
import { useAuthStore } from '@/stores/auth'
import { formatDisplayDate, formatChatTimestamp } from '@/logic/utils/timeUtils'
import { loadBestSave } from '@/logic/auth/loadService'
import { setupLocalStorageMock } from './localStorageMock.ts'

setupLocalStorageMock()

vi.mock('@/logic/auth/loadService', () => ({
  loadBestSave: vi.fn()
}))

vi.mock('gsap', () => {
  const delayedCall = (delay: number, callback: () => void) => {
    const timer = setTimeout(callback, delay * 1000)
    return {
      kill: () => clearTimeout(timer)
    }
  }
  return {
    default: { delayedCall },
    gsap: { delayedCall }
  }
})

describe('System App Lifecycle & Core Stores Suite', () => {
  describe('App Loading & Session Helpers', () => {
    describe('resolveAppLoadingInfo', () => {
      it('prioritizes loadingStoreActive when active', () => {
        const result = resolveAppLoadingInfo({
          loadingStoreActive: true,
          loadingStoreCurrent: { message: 'Descargando mapa...', subMessage: 'Ruta 1', isGlobal: true, icon: '🗺️' },
          authLoading: false,
          hasUser: true,
          isLoginPage: false,
          isStandaloneDevPage: false,
          isDataLoaded: true,
          isEngineReady: true,
          isOverlayLoading: false
        })

        expect(result.active).toBe(true)
        expect(result.msg).toBe('Descargando mapa...')
        expect(result.sub).toBe('Ruta 1')
        expect(result.global).toBe(true)
        expect(result.icon).toBe('🗺️')
      })

      it('handles auth loading state correctly', () => {
        const result = resolveAppLoadingInfo({
          loadingStoreActive: false,
          loadingStoreCurrent: null,
          authLoading: true,
          hasUser: false,
          isLoginPage: true,
          isStandaloneDevPage: false,
          isDataLoaded: false,
          isEngineReady: false,
          isOverlayLoading: false
        })

        expect(result.active).toBe(true)
        expect(result.msg).toBe('Iniciando sesión...')
        expect(result.sub).toBe('Conectando con el servidor')
        expect(result.global).toBe(false)
      })

      it('handles game engine boot sticky gate', () => {
        const result = resolveAppLoadingInfo({
          loadingStoreActive: false,
          loadingStoreCurrent: null,
          authLoading: false,
          hasUser: true,
          isLoginPage: false,
          isStandaloneDevPage: false,
          isDataLoaded: false,
          isEngineReady: false,
          isOverlayLoading: false
        })

        expect(result.active).toBe(true)
        expect(result.msg).toBe('Cargando datos...')
        expect(result.sub).toBe('Preparando entorno de juego')
        expect(result.icon).toBe('📂')
      })

      it('returns inactive state when everything is loaded and idle', () => {
        const result = resolveAppLoadingInfo({
          loadingStoreActive: false,
          loadingStoreCurrent: null,
          authLoading: false,
          hasUser: true,
          isLoginPage: false,
          isStandaloneDevPage: false,
          isDataLoaded: true,
          isEngineReady: true,
          isOverlayLoading: false
        })

        expect(result.active).toBe(false)
        expect(result.msg).toBe('')
      })
    })

    describe('shouldShowLoadingOverlay', () => {
      it('returns false for outdated modal types or standalone dev pages', () => {
        expect(
          shouldShowLoadingOverlay({
            updateModalType: 'db_outdated',
            isStandaloneDevPage: false,
            isUpdateAvailable: false,
            hasUser: true,
            isLoginPage: false,
            loadingActive: false,
            gameReady: true,
            isGateOpen: true
          })
        ).toBe(false)

        expect(
          shouldShowLoadingOverlay({
            updateModalType: null,
            isStandaloneDevPage: true,
            isUpdateAvailable: false,
            hasUser: true,
            isLoginPage: false,
            loadingActive: false,
            gameReady: true,
            isGateOpen: true
          })
        ).toBe(false)
      })

      it('returns true if update is available and user is logged in', () => {
        expect(
          shouldShowLoadingOverlay({
            updateModalType: null,
            isStandaloneDevPage: false,
            isUpdateAvailable: true,
            hasUser: true,
            isLoginPage: false,
            loadingActive: false,
            gameReady: true,
            isGateOpen: true
          })
        ).toBe(true)
      })

      it('evaluates gate open and ready states correctly', () => {
        expect(
          shouldShowLoadingOverlay({
            updateModalType: null,
            isStandaloneDevPage: false,
            isUpdateAvailable: false,
            hasUser: true,
            isLoginPage: false,
            loadingActive: false,
            gameReady: false,
            isGateOpen: true
          })
        ).toBe(true)

        expect(
          shouldShowLoadingOverlay({
            updateModalType: null,
            isStandaloneDevPage: false,
            isUpdateAvailable: false,
            hasUser: true,
            isLoginPage: false,
            loadingActive: false,
            gameReady: true,
            isGateOpen: true
          })
        ).toBe(false)
      })
    })

    describe('resolveUpdateOverlayMessage', () => {
      it('returns appropriate message depending on game ready state', () => {
        expect(resolveUpdateOverlayMessage(true)).toContain('partida guardada')
        expect(resolveUpdateOverlayMessage(false)).toContain('servidor')
      })
    })

    describe('handleGlobalBlockEvent', () => {
      it('stops propagation when clicking inside a modal container', () => {
        const modalEl = document.createElement('div')
        modalEl.className = 'base-modal-root'
        const innerButton = document.createElement('button')
        modalEl.appendChild(innerButton)
        document.body.appendChild(modalEl)

        const event = new MouseEvent('wheel', { bubbles: true, cancelable: true })
        const stopPropSpy = vi.spyOn(event, 'stopPropagation')
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        handleGlobalBlockEvent(event, true, false)
        expect(stopPropSpy).not.toHaveBeenCalled()

        Object.defineProperty(event, 'target', { value: innerButton })
        handleGlobalBlockEvent(event, true, false)
        expect(stopPropSpy).toHaveBeenCalled()
        expect(preventDefaultSpy).not.toHaveBeenCalled()

        document.body.removeChild(modalEl)
      })

      it('prevents default and stops immediate propagation when outside modal and modal is open', () => {
        const outsideEl = document.createElement('div')
        outsideEl.className = 'game-screen'
        document.body.appendChild(outsideEl)

        const event = new MouseEvent('wheel', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'target', { value: outsideEl })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
        const stopImmediateSpy = vi.spyOn(event, 'stopImmediatePropagation')

        handleGlobalBlockEvent(event, true, false)
        expect(preventDefaultSpy).toHaveBeenCalled()
        expect(stopImmediateSpy).toHaveBeenCalled()

        document.body.removeChild(outsideEl)
      })

      it('does nothing on standalone dev pages', () => {
        const outsideEl = document.createElement('div')
        const event = new MouseEvent('wheel', { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'target', { value: outsideEl })
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

        handleGlobalBlockEvent(event, true, true)
        expect(preventDefaultSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('Error Store', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should set the first error and clear it correctly', () => {
      const errorStore = useErrorStore()
      expect(errorStore.activeError).toBeNull()

      const testError = new Error('Prime Error')
      errorStore.setError(testError, { type: 'Test Error', source: 'test.ts', lineno: 10, colno: 5 })

      expect(errorStore.activeError).not.toBeNull()
      expect(errorStore.activeError!.message).toBe('Prime Error')
      expect(errorStore.activeError!.type).toBe('Test Error')
      expect(errorStore.activeError!.source).toBe('test.ts')
      expect(errorStore.activeError!.lineno).toBe(10)
      expect(errorStore.activeError!.colno).toBe(5)

      errorStore.clearError()
      expect(errorStore.activeError).toBeNull()
    })

    it('should accumulate subsequent errors in stack trace dynamically', () => {
      const errorStore = useErrorStore()
      const error1 = new Error('First Error')
      const error2 = new Error('Second Error')

      errorStore.setError(error1, { type: 'Type1', source: 'file1.ts', lineno: 1, colno: 2 })
      expect(errorStore.activeError!.message).toBe('First Error')

      errorStore.setError(error2, { type: 'Type2', source: 'file2.ts', lineno: 10, colno: 20 })
      expect(errorStore.activeError!.message).toBe('First Error')
    })

    it('should start listening from zero after clearing error', () => {
      const errorStore = useErrorStore()
      const error1 = new Error('First Error')
      const error2 = new Error('Second Error')

      errorStore.setError(error1, { type: 'Type1' })
      expect(errorStore.activeError!.message).toBe('First Error')

      errorStore.clearError()
      expect(errorStore.activeError).toBeNull()

      errorStore.setError(error2, { type: 'Type2' })
      expect(errorStore.activeError!.message).toBe('Second Error')
      expect(errorStore.activeError!.type).toBe('Type2')
    })
  })

  describe('Audio Store - Debouncing & Deduplication Shield', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      vi.restoreAllMocks()
    })

    function setupAudioContextMock() {
      const mockGain = { connect: vi.fn(), gain: { value: 1 } }
      const mockCtx = {
        state: 'running',
        createGain: vi.fn().mockReturnValue(mockGain),
        destination: {},
        resume: vi.fn().mockResolvedValue(undefined)
      }
      class MockAudioContext {
        state = 'running'
        createGain = mockCtx.createGain
        destination = mockCtx.destination
        resume = mockCtx.resume
      }
      (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext
    }

    it('debounces rapid identical sound calls within 60ms window', async () => {
      setupAudioContextMock()
      const audioStore = useAudioStore()
      const healSpy = vi.spyOn(engine, 'playHealSound').mockImplementation(() => {})

      await audioStore.play('heal')
      expect(healSpy).toHaveBeenCalledTimes(1)

      await audioStore.play('heal')
      expect(healSpy).toHaveBeenCalledTimes(1)

      await audioStore.play('heal')
      expect(healSpy).toHaveBeenCalledTimes(1)
    })

    it('allows different sound types to play concurrently without blocking each other', async () => {
      setupAudioContextMock()
      const audioStore = useAudioStore()
      const healSpy = vi.spyOn(engine, 'playHealSound').mockImplementation(() => {})
      const levelUpSpy = vi.spyOn(engine, 'playLevelUpSound').mockImplementation(() => {})

      await audioStore.play('heal')
      await audioStore.play('levelUp')

      expect(healSpy).toHaveBeenCalledTimes(1)
      expect(levelUpSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Centralized useUpdateStore', () => {
    let sessionStore: Record<string, string> = {}
    const sessionStorageMock = {
      getItem: vi.fn((key: string) => sessionStore[key] || null),
      setItem: vi.fn((key: string, value: string) => { sessionStore[key] = value.toString() }),
      removeItem: vi.fn((key: string) => { delete sessionStore[key] }),
      clear: vi.fn(() => { sessionStore = {} })
    }

    beforeEach(() => {
      setActivePinia(createPinia())
      sessionStore = {}
      Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true })
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

  describe('Time Utilities', () => {
    it('should format ISO dates to standard display format (GMT-3)', () => {
      const isoDate = '2026-05-15T15:00:00Z'
      const formatted = formatDisplayDate(isoDate)
      expect(formatted).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/)
    })

    it('should handle SQLite datetime("now") format correctly', () => {
      const sqliteDate = '2026-05-15 15:00:00'
      const formatted = formatDisplayDate(sqliteDate)
      expect(formatted).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/)
    })

    it('should return --- for invalid dates', () => {
      expect(formatDisplayDate(null)).toBe('---')
      expect(formatDisplayDate(undefined)).toBe('---')
      expect(formatDisplayDate('')).toBe('---')
      expect(formatDisplayDate('invalid')).toBe('---')
    })

    describe('formatChatTimestamp', () => {
      const nowZdt = Temporal.Instant.from('2026-08-30T17:48:00Z').toZonedDateTimeISO('America/Argentina/Buenos_Aires')

      it('should format today messages as HH:mm only', () => {
        const todayIso = '2026-08-30T17:46:00Z'
        expect(formatChatTimestamp(todayIso, nowZdt)).toBe('14:46')

        const earlierTodayIso = '2026-08-30T06:10:00Z'
        expect(formatChatTimestamp(earlierTodayIso, nowZdt)).toBe('03:10')
      })

      it('should format previous days as DD/MM/YYYY HH:mm', () => {
        const yesterdayIso = '2026-08-30T00:52:00Z'
        expect(formatChatTimestamp(yesterdayIso, nowZdt)).toBe('29/08/2026 21:52')

        const monthsAgoIso = '2026-05-15T18:00:00Z'
        expect(formatChatTimestamp(monthsAgoIso, nowZdt)).toBe('15/05/2026 15:00')
      })

      it('should format previous years as DD/MM/YYYY HH:mm', () => {
        const lastYearIso = '2025-12-25T21:30:00Z'
        expect(formatChatTimestamp(lastYearIso, nowZdt)).toBe('25/12/2025 18:30')
      })

      it('should handle epoch milliseconds for today and past days', () => {
        const epochToday = Temporal.Instant.from('2026-08-30T17:46:00Z').epochMilliseconds
        expect(formatChatTimestamp(epochToday, nowZdt)).toBe('14:46')

        const epochYesterday = Temporal.Instant.from('2026-08-30T00:52:00Z').epochMilliseconds
        expect(formatChatTimestamp(epochYesterday, nowZdt)).toBe('29/08/2026 21:52')
      })

      it('should handle SQLite timestamp strings without timezone (assumed UTC)', () => {
        const sqliteDate = '2026-08-29 21:52:00'
        expect(formatChatTimestamp(sqliteDate, nowZdt)).toBe('29/08/2026 18:52')
      })

      it('should return empty string for empty or invalid inputs', () => {
        expect(formatChatTimestamp(null, nowZdt)).toBe('')
        expect(formatChatTimestamp(undefined, nowZdt)).toBe('')
        expect(formatChatTimestamp('', nowZdt)).toBe('')
        expect(formatChatTimestamp('invalid', nowZdt)).toBe('')
      })
    })
  })

  describe('Game Store - loadGame with Timeout & Retries', () => {
    let useGameStore: () => ReturnType<typeof import('@/stores/game').useGameStore>
    let useAuthStoreLocal: () => ReturnType<typeof import('@/stores/auth').useAuthStore>
    let useLoadingStore: () => ReturnType<typeof import('@/stores/loading').useLoadingStore>
    let loadBestSaveMock: import('vitest').Mock
    let originalReload: () => void

    beforeEach(async () => {
      setActivePinia(createPinia())
      vi.useFakeTimers()
      vi.clearAllMocks()

      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => 'online'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      })

      const sessionStoreMock: Record<string, string> = {}
      vi.stubGlobal('sessionStorage', {
        getItem: vi.fn((key: string) => (sessionStoreMock[key] as string | undefined) || null),
        setItem: vi.fn((key: string, val: string | number) => { sessionStoreMock[key] = val.toString() }),
        removeItem: vi.fn((key: string) => { delete sessionStoreMock[key] }),
        clear: vi.fn()
      })

      originalReload = window.location.reload
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        configurable: true
      })

      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true
      })

      const gameModule = await import('@/stores/game')
      const authModule = await import('@/stores/auth')
      const loadingModule = await import('@/stores/loading')

      useGameStore = gameModule.useGameStore
      useAuthStoreLocal = authModule.useAuthStore
      useLoadingStore = loadingModule.useLoadingStore
      loadBestSaveMock = vi.mocked(loadBestSave) as unknown as import('vitest').Mock
    }, 30000)

    const runTimeoutSession = async () => {
      const gameStore = useGameStore()
      loadBestSaveMock.mockRejectedValue(new Error('LOAD_TIMEOUT'))
      const loadPromise = gameStore.loadGame()
      await vi.runAllTimersAsync()
      await loadPromise
    }

    afterEach(() => {
      vi.useRealTimers()
      vi.unstubAllGlobals()
      Object.defineProperty(window, 'location', {
        value: { reload: originalReload },
        configurable: true
      })
    })

    it('debe cargar el juego normalmente si loadBestSave responde rápido', async () => {
      const gameStore = useGameStore()
      const authStore = useAuthStoreLocal()
      const loadingStore = useLoadingStore()

      authStore.user = { id: 'user123', user_metadata: { username: 'User123' } } as unknown as NonNullable<typeof authStore.user>
      loadBestSaveMock.mockResolvedValue({
        data: { trainer: 'Ash' },
        issues: [],
        lastSaveId: 'save_123',
        isNewerThanCloud: false
      })

      const loadPromise = gameStore.loadGame()
      
      await vi.advanceTimersByTimeAsync(1000)
      await loadPromise

      expect(gameStore.isDataLoaded).toBe(true)
      expect(gameStore.state.trainer).toBe('Ash')
      expect(loadingStore.isActive).toBe(false)
    })

    it('debe reintentar y dar timeout final si loadBestSave tarda más de 8 segundos y recargar si está online', async () => {
      const authStore = useAuthStoreLocal()
      const loadingStore = useLoadingStore()

      authStore.user = { id: 'user123', user_metadata: { username: 'User123' } } as unknown as NonNullable<typeof authStore.user>
      await runTimeoutSession()

      expect(loadingStore.current!.message).toBe('Red inestable...')
      expect(window.location.reload).toHaveBeenCalledTimes(1)
    })

    it('debe reintentar y dar timeout final si está offline esperando señal', async () => {
      const authStore = useAuthStoreLocal()
      const loadingStore = useLoadingStore()

      authStore.user = { id: 'user123', user_metadata: { username: 'User123' } } as unknown as NonNullable<typeof authStore.user>
      
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false
      })

      const addEventSpy = vi.spyOn(window, 'addEventListener')
      await runTimeoutSession()

      expect(loadingStore.current!.message).toBe('Sin conexión a Internet')
      expect(window.location.reload).not.toHaveBeenCalled()
      expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function), { once: true })
    })

    it('debe evitar bucles infinitos de recarga si ya se recargó antes', async () => {
      const authStore = useAuthStoreLocal()
      const loadingStore = useLoadingStore()

      authStore.user = { id: 'user123', user_metadata: { username: 'User123' } } as unknown as NonNullable<typeof authStore.user>
      
      sessionStorage.setItem('load_retry_count', '1')
      await runTimeoutSession()

      expect(loadingStore.current!.message).toBe('Error de conexión')
      expect(window.location.reload).not.toHaveBeenCalled()
    })

    it('debe cerrar sesión y redirigir si se alcanzan 10 intentos fallidos', async () => {
      const authStore = useAuthStoreLocal()
      const loadingStore = useLoadingStore()

      authStore.user = { id: 'user123', user_metadata: { username: 'User123' } } as unknown as NonNullable<typeof authStore.user>
      authStore.logout = vi.fn().mockResolvedValue(undefined)
      
      sessionStorage.setItem('load_retry_count', '9')
      await runTimeoutSession()

      expect(loadingStore.current!.message).toBe('Error de conexión persistente')
      expect(authStore.logout).toHaveBeenCalled()
      expect(window.location.reload).not.toHaveBeenCalled()
      expect(sessionStorage.getItem('load_retry_count')).toBe('0')
    })
  })
})
