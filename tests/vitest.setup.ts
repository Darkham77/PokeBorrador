import { vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { setupTestTeamGenerators, setupTemporalMock } from './helpers/setupTestEnvironment.ts'

setupTestTeamGenerators()

/**
 * tests/vitest.setup.ts
 * Global setup for Vitest environment.
 */

process.removeAllListeners('warning')
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning' || warning.message?.includes('--localstorage-file')) {
    return
  }
  console.warn(warning.name, warning.message)
})

const activeDelayedCalls = new Set<NodeJS.Timeout | number>()

// Initialize Pinia for all tests
beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  for (const timer of activeDelayedCalls) {
    clearTimeout(timer)
  }
  activeDelayedCalls.clear()
})

// Mock Temporal.Now to work with Vitest fake timers (which mock Date.now)
setupTemporalMock()


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
if (typeof window !== 'undefined') {
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
}

// Mock Canvas 2D context for JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
    if (contextId === '2d') {
      return {
        measureText: (text: string) => ({ width: (text || '').length * 8 }),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
      }
    }
    return null
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext

  HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mock')
}

// Mock Location.reload for JSDOM navigation
if (typeof window !== 'undefined' && window.location) {
  try {
    vi.spyOn(window.location, 'reload').mockImplementation(() => {})
  } catch {
    // Ignore if not spyable
  }
}

// GSAP Global Mock for stable unit testing
// This prevents infinite loops in JSDOM while adhering to the project's GSAP MANDATE.
vi.mock('gsap', () => {
  const createMockTween = () => ({
    kill: vi.fn(),
    eventCallback: vi.fn().mockReturnThis(),
    progress: vi.fn().mockReturnValue(1),
    isActive: vi.fn().mockReturnValue(false),
    totalDuration: vi.fn().mockReturnValue(0.01),
    pause: vi.fn().mockReturnThis(),
    play: vi.fn().mockReturnThis()
  });

  const triggerSyncComplete = (vars: Record<string, unknown>) => {
    if (typeof vars.onComplete === 'function' && (!vars.duration || Number(vars.duration) < 5)) {
      vars.onComplete();
    }
  };

  const gsapMock = {
    to: (_target: unknown, vars: Record<string, unknown>) => {
      triggerSyncComplete(vars);
      return createMockTween();
    },
    fromTo: (_target: unknown, _fromVars: Record<string, unknown>, toVars: Record<string, unknown>) => {
      triggerSyncComplete(toVars);
      return createMockTween();
    },
    from: (_target: unknown, vars: Record<string, unknown>) => {
      triggerSyncComplete(vars);
      return createMockTween();
    },
    delayedCall: (delay: number, callback: () => void) => {
      let timerId: NodeJS.Timeout | number | null = null
      timerId = setTimeout(() => {
        if (timerId !== null) activeDelayedCalls.delete(timerId)
        if (typeof callback === 'function') callback()
      }, delay * 1000)
      if (typeof timerId === 'object' && timerId && 'unref' in timerId) {
        (timerId as NodeJS.Timeout).unref()
      }
      activeDelayedCalls.add(timerId)
      return { 
        kill: () => {
          if (timerId !== null) {
            clearTimeout(timerId)
            activeDelayedCalls.delete(timerId)
          }
        },
        eventCallback: vi.fn().mockReturnThis(),
        progress: vi.fn().mockReturnThis(),
        pause: vi.fn().mockReturnThis(),
        play: vi.fn().mockReturnThis()
      }
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
      set: vi.fn().mockReturnThis(),
      add: vi.fn().mockReturnThis(),
      play: vi.fn().mockReturnThis(),
      pause: vi.fn().mockReturnThis(),
      kill: vi.fn().mockReturnThis(),
      addLabel: vi.fn().mockReturnThis(),
      eventCallback: vi.fn().mockReturnThis(),
      progress: vi.fn().mockReturnValue(1),
      isActive: vi.fn().mockReturnValue(false),
      totalDuration: vi.fn().mockReturnValue(0.01),
    }),
    utils: {
      clamp: (min: number, max: number, v?: number) => v !== undefined ? Math.min(Math.max(v, min), max) : (val: number) => Math.min(Math.max(val, min), max),
      toArray: (val: unknown) => Array.isArray(val) ? val : [val],
      random: (min: number, max: number) => Math.random() * (max - min) + min,
      interpolate: (a: number, b: number, p: number) => a + (b - a) * p,
      unitize: (fn: (val: string) => number | string, unit = 'px') => (v: string) => `${fn(v)}${unit}`,
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
