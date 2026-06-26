import { vi } from 'vitest'

/**
 * Creates a localStorage mock compatible with jsdom/vitest.
 * Call `setupLocalStorageMock()` at module level and the mock will be
 * installed on `window.localStorage` automatically.
 */
export function setupLocalStorageMock() {
  let store: Record<string, string> = {}
  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
  return localStorageMock
}
