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

// GSAP Global Mock for stable unit testing
// This prevents infinite loops in JSDOM while adhering to the project's GSAP MANDATE.
vi.mock('gsap', () => {
  const gsapMock = {
    to: (_target: unknown, vars: Record<string, unknown>) => {
      if (typeof vars.onComplete === 'function') vars.onComplete();
      return { 
        kill: vi.fn(), 
        eventCallback: vi.fn().mockReturnThis(),
        progress: vi.fn().mockReturnThis(),
        pause: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis()
      };
    },
    fromTo: (_target: unknown, _fromVars: Record<string, unknown>, toVars: Record<string, unknown>) => {
      if (typeof toVars.onComplete === 'function') toVars.onComplete();
      return { 
        kill: vi.fn(), 
        eventCallback: vi.fn().mockReturnThis(),
        progress: vi.fn().mockReturnThis(),
        pause: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis()
      };
    },
    delayedCall: (delay: number, callback: () => void) => {
      // Map to native setTimeout so Vitest fake timers can control it
      // Return a fake Tween-like object with a kill() method
      const timerId = setTimeout(callback, delay * 1000);
      return { 
        kill: () => clearTimeout(timerId),
        eventCallback: vi.fn().mockReturnThis(),
        progress: vi.fn().mockReturnThis(),
        pause: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis()
      };
    },
    context: (fn: (self: {
      add: (addFn: () => void) => unknown;
      revert: () => void;
      kill: () => void;
      selector: (selector: string) => Element[];
    }) => void) => {
      const self = {
        add: (addFn: () => void) => {
          addFn();
          return self;
        },
        revert: vi.fn(),
        kill: vi.fn(),
        selector: vi.fn(() => [] as Element[])
      };
      if (typeof fn === 'function') fn(self);
      return self;
    },
    killTweensOf: vi.fn(),
    set: vi.fn(),
    registerPlugin: vi.fn(),
    timeline: vi.fn().mockReturnValue({
      to: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      play: vi.fn().mockReturnThis(),
      pause: vi.fn().mockReturnThis(),
      kill: vi.fn().mockReturnThis(),
      addLabel: vi.fn().mockReturnThis(),
      eventCallback: vi.fn().mockReturnThis(),
      progress: vi.fn().mockReturnThis(),
    }),
    utils: {
      clamp: (min: number, max: number, v?: number) => v !== undefined ? Math.min(Math.max(v, min), max) : (val: number) => Math.min(Math.max(val, min), max),
      toArray: (val: unknown) => Array.isArray(val) ? val : [val],
      random: (min: number, max: number) => Math.random() * (max - min) + min,
      interpolate: (a: number, b: number, p: number) => a + (b - a) * p,
    }
  };
  return { gsap: gsapMock, default: gsapMock };
});

// Silenciar warnings de ResizeObserver en tests si es necesario
// window.addEventListener('error', e => {
//   if (e.message === 'ResizeObserver loop limit exceeded') {
//     e.stopImmediatePropagation()
//   }
// })
