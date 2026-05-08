
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/logic/auth/loadService', () => ({
  loadBestSave: vi.fn()
}))

vi.mock('@/logic/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('Game Store - loadGame with Timeout & Retries', () => {
  let useGameStore
  let useAuthStore
  let useLoadingStore
  let loadBestSaveMock
  let originalReload

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.clearAllMocks()

    // Mock global de localStorage y sessionStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'online'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    })

    const sessionStoreMock = {}
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key) => sessionStoreMock[key] || null),
      setItem: vi.fn((key, val) => { sessionStoreMock[key] = val.toString() }),
      removeItem: vi.fn((key) => { delete sessionStoreMock[key] }),
      clear: vi.fn()
    })

    // Mock global de location.reload
    originalReload = window.location.reload
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      configurable: true
    })

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => true
    })

    // Importar dinámicamente los módulos
    const gameModule = await import('@/stores/game')
    const authModule = await import('@/stores/auth')
    const loadingModule = await import('@/stores/loading')
    const loadServiceModule = await import('@/logic/auth/loadService')

    useGameStore = gameModule.useGameStore
    useAuthStore = authModule.useAuthStore
    useLoadingStore = loadingModule.useLoadingStore
    loadBestSaveMock = loadServiceModule.loadBestSave
  })

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
    const authStore = useAuthStore()
    const loadingStore = useLoadingStore()

    authStore.user = { id: 'user123' }
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
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const loadingStore = useLoadingStore()

    authStore.user = { id: 'user123' }
    loadBestSaveMock.mockReturnValue(new Promise(() => {}))

    const loadPromise = gameStore.loadGame()

    // Avanzar tiempo suficiente para 2 intentos de 8s + 1.5s espera
    await vi.advanceTimersByTimeAsync(20000)
    await loadPromise

    expect(loadingStore.current.message).toBe('Red inestable...')
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('debe reintentar y dar timeout final si está offline esperando señal', async () => {
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const loadingStore = useLoadingStore()

    authStore.user = { id: 'user123' }
    
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false
    })

    const addEventSpy = vi.spyOn(window, 'addEventListener')
    loadBestSaveMock.mockReturnValue(new Promise(() => {}))

    const loadPromise = gameStore.loadGame()

    await vi.advanceTimersByTimeAsync(20000)
    await loadPromise

    expect(loadingStore.current.message).toBe('Sin conexión a Internet')
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function), { once: true })
  })

  it('debe evitar bucles infinitos de recarga si ya se recargó antes', async () => {
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const loadingStore = useLoadingStore()

    authStore.user = { id: 'user123' }
    
    // Simular que ya se recargó una vez
    sessionStorage.setItem('load_retry_count', '1')
    loadBestSaveMock.mockReturnValue(new Promise(() => {}))

    const loadPromise = gameStore.loadGame()

    await vi.advanceTimersByTimeAsync(20000)
    await loadPromise

    expect(loadingStore.current.message).toBe('Error de conexión')
    expect(window.location.reload).not.toHaveBeenCalled()
  })
})
