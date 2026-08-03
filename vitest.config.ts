import { defineConfig } from 'vitest/config'

/**
 * vitest.config.ts — root Vitest config with multi-project workspace.
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
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**', 'scripts/**'],
      exclude: ['src/**/*.vue', 'external/**'],
    },
    projects: [
      {
        extends: './vite.config.ts',
        cacheDir: '.vitest-cache/unit',
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          include: [
            'tests/unit/**/*.{test,spec}.ts',
            'tests/integration/**/*.{test,spec}.ts',
            'src/**/*.{test,spec}.ts',
          ],
          setupFiles: ['./tests/vitest.setup.ts'],
          testTimeout: 60000,
        },
      },
      {
        extends: './vitest.node.config.ts',
        cacheDir: '.vitest-cache/node',
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
          testTimeout: 60000,
        },
      },
    ],
  },
})
