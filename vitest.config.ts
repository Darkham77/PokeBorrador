import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import * as compiler from 'vue/compiler-sfc'
import path from 'node:path'

function fixPkmnSimPlugin() {
  return {
    name: 'fix-pkmn-sim',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.includes('@pkmn/sim') || id.includes('@pkmn/sets') || id.includes('pkmn_sim.js')) {
        if (code.includes('static import(') || code.includes('static import (')) {
          return {
            code: code.replace(/static import\s*\(/g, 'static "import"('),
            map: null,
          }
        }
      }
      return null
    },
  }
}

// vitest.config.ts — Root Vitest 5 unified configuration.
// Projects:
//  - "unit"       -> tests/unit/ + tests/integration/ + src specs (jsdom, Pinia, GSAP mocks)
//  - "node"       -> tests/node/ (real Node.js environment, @/ aliases via shared Vite server)
//  - "migrations" -> tests/node/system/backup_migration_real.test.ts (isolated fork runner)
export default defineConfig({
  plugins: [
    fixPkmnSimPlugin(),
    vue({
      compiler,
      template: {
        compilerOptions: {
          hoistStatic: true,
          cacheHandlers: true,
          comments: false,
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'virtual:pwa-register': path.resolve(import.meta.dirname, './tests/helpers/pwaRegisterMock.ts'),
    },
    dedupe: ['vue', 'pinia', 'vue-router'],
  },
  test: {
    // 1. Persistent Disk Transform Cache
    fsModuleCache: true,
    fsModuleCachePath: 'node_modules/.vitest-cache',
    sharedViteServer: true,

    // 2. CSS/Sass layout bypass in unit tests (layout tested exclusively in Playwright)
    css: false,

    // 3. Native Node.js worker execution args
    execArgv: ['--no-experimental-webstorage', '--no-warnings=ExperimentalWarning'],

    // 4. Thread-based worker pool (fast startup on Windows)
    pool: 'forks',
    fileParallelism: true,
    teardownTimeout: 10000,
    vmMemoryLimit: '1GB',

    // 5. Unified V8 Coverage
    coverage: {
      provider: 'v8',
      include: ['src/**', 'scripts/**'],
      exclude: ['src/**/*.vue', 'external/**'],
    },

    // 6. Unified Inline Workspace Projects
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          pool: 'forks',
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
          environmentOptions: {
            jsdom: {
              pretendToBeVisual: true,
              console: false,
            },
          },
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
        test: {
          name: 'node',
          globals: true,
          pool: 'forks',
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
          exclude: ['tests/node/**/backup_migration_real.test.ts'],
          setupFiles: ['./tests/vitest.node.setup.ts'],
          testTimeout: 60000,
        },
      },
      {
        test: {
          name: 'migrations',
          globals: true,
          pool: 'forks',
          environment: 'node',
          include: ['tests/node/**/backup_migration_real.test.ts'],
          setupFiles: ['./tests/vitest.node.setup.ts'],
          testTimeout: 120000,
        },
      },
    ],
  },
})
