import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Vitest config for tests/node/ — pure logic tests running in a real Node.js
 * environment (no DOM, no jsdom). Gains @/ alias resolution and Vite transform
 * caching that the old `node --experimental-strip-types` runner lacked.
 */
export default defineConfig({
  cacheDir: '.vitest-cache/node',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    globals: true,
    pool: 'forks',
    fileParallelism: true,
    teardownTimeout: 2000,
    include: ['tests/node/**/*.test.ts'],
    testTimeout: 60000,
    coverage: {
      provider: 'v8',
      include: ['src/**', 'scripts/**'],
      exclude: ['src/**/*.vue', 'external/**'],
    },
  },
})
