import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { setupLocalStorageMock } from '../system/localStorageMock.ts'
import { useMapLensStore, MAP_LENS_STORAGE_KEY } from '@/stores/mapLens'
import type { MapLens } from '@/types/map/mapLenses'

describe('useMapLensStore', () => {
  let storageMock: ReturnType<typeof setupLocalStorageMock>

  beforeEach(() => {
    setActivePinia(createPinia())
    storageMock = setupLocalStorageMock()
    storageMock.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    storageMock.clear()
  })

  it('initializes with "adventure" lens by default', () => {
    const store = useMapLensStore()
    expect(store.activeLens).toBe('adventure')
  })

  it('switches lens to "war" and persists in localStorage', () => {
    const store = useMapLensStore()
    store.setLens('war')
    expect(store.activeLens).toBe('war')
    expect(storageMock.setItem).toHaveBeenCalledWith(MAP_LENS_STORAGE_KEY, 'war')
  })

  it('restores stored lens from localStorage on init', () => {
    storageMock.setItem(MAP_LENS_STORAGE_KEY, 'war')
    const store = useMapLensStore()
    store.initFromStorage()
    expect(store.activeLens).toBe('war')
  })

  it('rejects invalid lens value with an error', () => {
    const store = useMapLensStore()
    expect(() => {
      store.setLens('invalid_lens' as unknown as MapLens)
    }).toThrow()
  })
})
