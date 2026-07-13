
/**
 * Vitest workspace — unified runner for all test suites.
 *
 * Projects:
 *  - "unit"  → tests/unit/ + tests/integration/ + src specs (jsdom, Pinia, GSAP mocks)
 *  - "node"  → tests/node/ (real Node.js environment, @/ aliases via vite-node)
 *
 * Run all:          vitest run
 * Run unit only:    vitest run --project unit
 * Run node only:    vitest run --project node
 * Coverage merged:  vitest run --coverage
 */
import { defineWorkspace } from 'vitest/config'
import path from 'node:path'

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'unit',
      environment: 'jsdom',
      include: [
        'tests/unit/**/*.{test,spec}.ts',
        'tests/integration/**/*.{test,spec}.ts',
        'src/**/*.{test,spec}.ts',
      ],
      setupFiles: ['./tests/vitest.setup.ts'],
      testTimeout: 60000,
      cache: { dir: '.vitest-cache/unit' },
    },
  },
  {
    extends: './vitest.node.config.ts',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'node',
      environment: 'node',
      include: ['tests/node/**/*.test.ts'],
      testTimeout: 60000,
      cache: { dir: '.vitest-cache/node' },
    },
  },
])
