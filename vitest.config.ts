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
    pool: 'threads',
    threads: {
      execArgv: ['--no-experimental-webstorage', '--no-warnings=ExperimentalWarning'],
    },
    forks: {
      execArgv: ['--no-experimental-webstorage', '--no-warnings=ExperimentalWarning'],
    },
    fileParallelism: true,
    teardownTimeout: 10000,
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
          environment: 'node',
          environmentMatchGlobs: [
            ['tests/unit/components/**', 'jsdom'],
            ['tests/unit/views/**', 'jsdom'],
            ['tests/unit/modals/**', 'jsdom'],
            ['tests/integration/**', 'jsdom'],
            ['tests/unit/battle/Battle*.spec.ts', 'jsdom'],
            ['tests/unit/battle/*anim*.spec.ts', 'jsdom'],
            ['tests/unit/battle/*trajectory*.spec.ts', 'jsdom'],
            ['tests/unit/battle/combat_camera.spec.ts', 'jsdom'],
            ['tests/unit/battle/struggle.spec.ts', 'jsdom'],
            ['tests/unit/battle/test_choice_items.spec.ts', 'jsdom'],
            ['tests/unit/battle/test_combatant_state.spec.ts', 'jsdom'],
            ['tests/unit/battle/battle_move_sync_isolation.spec.ts', 'jsdom'],
            ['tests/unit/inventory/**', 'jsdom'],
            ['tests/unit/pokemon/**', 'jsdom'],
            ['tests/unit/world/**', 'jsdom'],
            ['tests/unit/system/**', 'jsdom'],
            ['tests/unit/debug/**', 'jsdom'],
          ],
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
          setupFiles: ['./tests/vitest.node.setup.ts'],
          testTimeout: 60000,
        },
      },
    ],
  },
})
