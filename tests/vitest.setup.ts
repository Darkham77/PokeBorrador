import { vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { Temporal } from '@js-temporal/polyfill'

// Force Temporal polyfill in tests to allow Vitest's vi.useFakeTimers() to work
// (Native Temporal in Node 26+ is not currently mocked by Vitest)
Object.defineProperty(globalThis, 'Temporal', {
  value: Temporal,
  writable: true,
  configurable: true
});

/**
 * tests/vitest.setup.ts
 * Global setup for Vitest environment.
 */

// Initialize Pinia for all tests
beforeEach(() => {
  setActivePinia(createPinia())
})

// Mock ResizeObserver (Missing in JSDOM)
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(global, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true
})

// Mock IntersectionObserver (Missing in JSDOM)
class IntersectionObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.defineProperty(global, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  writable: true
})
// Mock matchMedia (Missing in JSDOM)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Silenciar warnings de ResizeObserver en tests si es necesario
// window.addEventListener('error', e => {
//   if (e.message === 'ResizeObserver loop limit exceeded') {
//     e.stopImmediatePropagation()
//   }
// })
