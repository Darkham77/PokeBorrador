
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
      environment: 'node',
      environmentMatchGlobs: [
        ['tests/unit/components/helpers/**', 'node'],
        ['tests/unit/components/**/!(*Helper).spec.ts', 'jsdom'],
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
      ],
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
      exclude: ['tests/node/**/backup_migration_real.test.ts'],
      testTimeout: 60000,
      cache: { dir: '.vitest-cache/node' },
    },
  },
  {
    extends: './vite.config.ts',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'migrations',
      globals: true,
      environment: 'node',
      pool: 'forks',
      threads: {
        execArgv: ['--no-experimental-webstorage', '--no-warnings=ExperimentalWarning'],
      },
      forks: {
        execArgv: ['--no-experimental-webstorage', '--no-warnings=ExperimentalWarning'],
      },
      include: ['tests/node/**/backup_migration_real.test.ts'],
      setupFiles: ['./tests/vitest.node.setup.ts'],
      testTimeout: 120000,
      cache: { dir: '.vitest-cache/migrations' },
    },
  },
])
