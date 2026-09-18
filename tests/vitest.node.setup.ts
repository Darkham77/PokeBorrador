import { setupTestTeamGenerators, setupTemporalMock } from './helpers/setupTestEnvironment.ts'

setupTestTeamGenerators()

/**
 * tests/vitest.node.setup.ts
 * Global setup for Node.js environment Vitest tests.
 */
process.removeAllListeners('warning')
process.on('warning', (warning) => {
  if (warning.name === 'ExperimentalWarning' || warning.message?.includes('--localstorage-file')) {
    return
  }
  console.warn(warning.name, warning.message)
})

// Mock Temporal.Now to work with Vitest fake timers (which mock Date.now)
setupTemporalMock()

// Provide in-memory WebStorage fallback for Node test runner (with --no-experimental-webstorage)
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size; }
  } as Storage;
}

if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = createMemoryStorage();
}
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createMemoryStorage();
}

