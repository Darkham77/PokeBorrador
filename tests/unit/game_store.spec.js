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

describe('Game Store - loadGame with Timeout', () => {
  let useGameStore
  let useAuthStore
  let useLoadingStore
  let loadBestSaveMock
  let originalReload

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.clearAllMocks()

    // Mock global de localStorage antes de importar los stores
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'online'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
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

    // Importar dinámicamente los módulos para que usen los globales mockeados
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

  it('debe dar timeout si loadBestSave tarda más de 8 segundos y recargar si está online', async () => {
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const loadingStore = useLoadingStore()

    authStore.user = { id: 'user123' }
    
    loadBestSaveMock.mockReturnValue(new Promise(() => {}))

    const loadPromise = gameStore.loadGame()

    await vi.advanceTimersByTimeAsync(8500)
    await loadPromise

    expect(loadingStore.current.message).toBe('Red inestable...')
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('debe dar timeout si loadBestSave tarda más de 8 segundos y esperar señal si está offline', async () => {
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

    await vi.advanceTimersByTimeAsync(8500)
    await loadPromise

    expect(loadingStore.current.message).toBe('Sin conexión a Internet')
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function), { once: true })
  })
})
