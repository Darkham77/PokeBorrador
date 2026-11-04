import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, type ESBuildOptions } from 'vite-plus';

import { fixPkmnSimPlugin } from './scripts/maintenance/vite-plugin-fix-pkmn-sim.ts';
import { plugins } from './vite.plugins.ts';
type ESBuildOptionsWithCharset = ESBuildOptions & {
  charset?: 'utf8';
};
const esbuildConfig: ESBuildOptionsWithCharset = {
  charset: 'utf8',
  legalComments: 'none',
  treeShaking: true,
  drop: process.env.NODE_ENV === 'production' ? ['debugger'] : [],
  pure:
    process.env.NODE_ENV === 'production' ? ['console.log', 'console.info', 'console.debug'] : []
};
// ─── Version System ───────────────────────────────────────────────────────────
// The developer's LOCAL build is the single source of truth for the version.
// Canonical application version derived from package.json (Single Source of Truth)
// managed via auditor-version (@francogp/auditor).
const isVitest = !!process.env.VITEST;
function getPackageVersion(): string {
  try {
    const pkgPath = path.resolve(import.meta.dirname, 'package.json');
    const parsed: unknown = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      typeof (parsed as Record<string, unknown>).version === 'string'
    ) {
      const ver = (
        parsed as {
          version: string;
        }
      ).version;
      return ver.startsWith('v') ? ver : `v${ver}`;
    }
  } catch {
    /* fallback to default */
  }
  return 'v0.6.0';
}
const appVersion: string = getPackageVersion();
// Detect if building on GitHub Actions for GitHub Pages
const isGithubActions = !!process.env.GITHUB_ACTIONS;
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE_URL || (isGithubActions && repoName ? `/${repoName}/` : '/');
interface ChunkRule {
  readonly patterns: readonly string[];
  readonly chunk: string;
}
const CHUNK_RULES: readonly ChunkRule[] = [
  {
    patterns: ['node_modules/vue', 'node_modules/pinia', 'node_modules/vue-router'],
    chunk: 'vendor-vue'
  },
  { patterns: ['node_modules/@supabase'], chunk: 'vendor-supabase' },
  { patterns: ['node_modules/gsap'], chunk: 'vendor-gsap' },
  { patterns: ['node_modules/sql.js'], chunk: 'vendor-sqljs' },
  { patterns: ['node_modules/@smogon/calc'], chunk: 'vendor-smogon-calc' },
  { patterns: ['src/logic/db/migrations_data'], chunk: 'db-migrations-data' },
  { patterns: ['node_modules/valibot'], chunk: 'vendor-valibot' },
  {
    patterns: ['src/data/pokemon/pokemonFeetDatabase', 'src/data/pokemon/feetCoordinatesData'],
    chunk: 'game-data-feet'
  },
  {
    patterns: ['src/data/pokemon/animatedSpriteDatabase', 'src/data/pokemon/animatedSpriteData'],
    chunk: 'game-data-sprites'
  },
  { patterns: ['src/data/pokemon/pokemonDB'], chunk: 'game-data-pokemon-db' },
  { patterns: ['src/data/pokemon/'], chunk: 'game-data-pokemon' },
  { patterns: ['src/data/battle/'], chunk: 'game-data-battle' },
  { patterns: ['src/data/inventory/'], chunk: 'game-data-items' },
  { patterns: ['src/data/world/', 'src/data/weather/'], chunk: 'game-data-world' },
  { patterns: ['src/data/player/', 'src/data/system/', 'src/data/ai/'], chunk: 'game-data-system' }
];
function resolveManualChunk(id: string): string | undefined {
  for (const rule of CHUNK_RULES) {
    if (rule.patterns.some((pattern) => id.includes(pattern))) {
      return rule.chunk;
    }
  }
  return undefined;
}
const LOCKED_SKILLS_IGNORE_PATTERNS = [
  '.agents/skills/algorithmic-art/**',
  '.agents/skills/canvas-design/**',
  '.agents/skills/ci-cd-and-automation/**',
  '.agents/skills/code-review/**',
  '.agents/skills/code-simplification/**',
  '.agents/skills/codebase-design/**',
  '.agents/skills/context-engineering/**',
  '.agents/skills/create-adaptable-composable/**',
  '.agents/skills/design-motion-principles/**',
  '.agents/skills/docker-patterns/**',
  '.agents/skills/domain-modeling/**',
  '.agents/skills/fallow/**',
  '.agents/skills/fallow-review/**',
  '.agents/skills/fallow-setup/**',
  '.agents/skills/find-skills/**',
  '.agents/skills/frontend-design/**',
  '.agents/skills/grill-with-docs/**',
  '.agents/skills/grilling/**',
  '.agents/skills/gsap-core/**',
  '.agents/skills/gsap-frameworks/**',
  '.agents/skills/gsap-performance/**',
  '.agents/skills/gsap-plugins/**',
  '.agents/skills/gsap-react/**',
  '.agents/skills/gsap-scrolltrigger/**',
  '.agents/skills/gsap-timeline/**',
  '.agents/skills/gsap-utils/**',
  '.agents/skills/handoff/**',
  '.agents/skills/implement-spec/**',
  '.agents/skills/improve-codebase-architecture/**',
  '.agents/skills/incremental-implementation/**',
  '.agents/skills/mcp-builder/**',
  '.agents/skills/performance-optimization/**',
  '.agents/skills/pinia/**',
  '.agents/skills/playwright-cli/**',
  '.agents/skills/ponytail/**',
  '.agents/skills/ponytail-audit/**',
  '.agents/skills/ponytail-debt/**',
  '.agents/skills/ponytail-gain/**',
  '.agents/skills/ponytail-help/**',
  '.agents/skills/ponytail-review/**',
  '.agents/skills/security-and-hardening/**',
  '.agents/skills/security-review/**',
  '.agents/skills/skill-creator/**',
  '.agents/skills/tdd/**',
  '.agents/skills/to-spec/**',
  '.agents/skills/valibot/**',
  '.agents/skills/vite/**',
  '.agents/skills/vitest/**',
  '.agents/skills/vue-best-practices/**',
  '.agents/skills/vue-debug-guides/**',
  '.agents/skills/vue-jsx-best-practices/**',
  '.agents/skills/vue-options-api-best-practices/**',
  '.agents/skills/vue-pinia-best-practices/**',
  '.agents/skills/vue-router-best-practices/**',
  '.agents/skills/vue-testing-best-practices/**',
  '.agents/skills/vueuse-functions/**',
  '.agents/skills/web-design-guidelines/**'
] as const;
// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins,
  define: {
    __BUILD_TIME__: JSON.stringify(appVersion.match(/build\.(\d{8}-\d{6})/)?.[1] || appVersion),
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      ...(isVitest
        ? {
            'virtual:pwa-register': path.resolve(
              import.meta.dirname,
              './tests/helpers/pwaRegisterMock.ts'
            )
          }
        : {})
    },
    dedupe: ['vue', 'pinia', 'vue-router']
  },
  worker: {
    format: 'es',
    plugins: () => [fixPkmnSimPlugin()],
    rollupOptions: {
      output: {
        manualChunks(id): string | undefined {
          if (
            id.includes('node_modules/@pkmn/sim/build/esm/data/learnsets') ||
            id.includes('@pkmn/sim/build/cjs/data/learnsets') ||
            id.includes('/learnsets')
          ) {
            return 'worker-vendor-pkmn-learnsets';
          }
          if (
            id.includes('node_modules/@pkmn/sim/build/esm/data/mods') ||
            id.includes('@pkmn/sim/build/cjs/data/mods') ||
            id.includes('/mods/')
          ) {
            return 'worker-vendor-pkmn-mods';
          }
          if (
            id.includes('node_modules/@pkmn/sim') ||
            id.includes('node_modules/@pkmn/sets') ||
            id.includes('pkmn_sim.js')
          ) {
            return 'worker-vendor-pkmn-sim';
          }
          if (id.includes('node_modules/@pkmn/randoms')) {
            return 'worker-vendor-randoms';
          }
          if (
            id.includes('src/data/pokemon/pokemonFeetDatabase') ||
            id.includes('src/data/pokemon/feetCoordinatesData')
          ) {
            return 'worker-game-data-feet';
          }
          if (
            id.includes('src/data/pokemon/animatedSpriteDatabase') ||
            id.includes('src/data/pokemon/animatedSpriteData')
          ) {
            return 'worker-game-data-sprites';
          }
          if (id.includes('src/data/pokemon/pokemonDB')) {
            return 'worker-game-data-pokemon-db';
          }
          if (id.includes('src/data/pokemon/')) {
            return 'worker-game-data-pokemon';
          }
          if (id.includes('src/data/battle/')) {
            return 'worker-game-data-battle';
          }
          return undefined;
        }
      }
    }
  },
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx,vue,js,jsx}']
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        charset: true,
        additionalData: `
          @use "@/styles/core/tools" as *;
        `
      }
    }
  },
  server: {
    port: 5173,
    allowedHosts: true,
    host: true,
    watch: {
      ignored: [
        '**/_raw-assets/**',
        '**/sprite_test/**',
        '**/database/backups/**',
        '**/scratch/**',
        '**/src/data/pokemon/spriteShadowOverrides.json',
        '**/src/data/pokemon/pokemonFeetDatabase.json',
        '**/src/data/pokemon/pokemonFeetDatabase.ts'
      ]
    },
    hmr:
      process.env.DEPLOY_SERVER_NAME ||
      process.env.VITE_HMR_PORT ||
      process.env.VITE_REVERSE_PROXY === 'true'
        ? {
            protocol: 'wss',
            clientPort: 443
          }
        : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        bypass: (req): string | undefined => {
          if (req.url?.includes('/api/dev-')) {
            return req.url;
          }
          return undefined;
        }
      }
    }
  },
  build: {
    target: 'esnext',
    cssMinify: 'lightningcss',
    cssCodeSplit: true,
    modulePreload: {
      polyfill: false
    },
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      treeshake: {
        moduleSideEffects: 'no-external',
        annotations: true,
        manualPureFunctions: ['console.log', 'console.info', 'console.debug']
      },
      onwarn(warning, warn): void {
        if (warning.code === 'EVAL' && warning.id?.includes('node_modules')) {
          return;
        }
        if (warning.code === 'INEFFECTIVE_DYNAMIC_IMPORT') {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: resolveManualChunk
      }
    }
  },
  esbuild: esbuildConfig,
  test: {
    // 1. Persistent Disk Transform Cache
    fsModuleCache: true,
    fsModuleCachePath: 'node_modules/.vitest-cache',
    sharedViteServer: true,
    // 2. CSS/Sass layout bypass in unit tests (layout tested exclusively in Playwright)
    css: false,
    // 3. Native Node.js worker execution args
    execArgv: [
      '--no-experimental-webstorage',
      '--no-warnings=ExperimentalWarning',
      '--allow-inspector'
    ],
    // 4. Thread-based worker pool (fast startup on Windows)
    pool: 'forks',
    fileParallelism: true,
    teardownTimeout: 10000,
    vmMemoryLimit: '1GB',
    coverage: {
      provider: 'v8',
      include: [
        'test_aventura/tests/**/*.{test,spec}.ts',
        'tests/**/*.{test,spec}.ts',
        'src/**/*.{ts,js}',
        'scripts/**/*.{ts,js}'
      ],
      exclude: ['src/**/*.vue', '**/*.d.ts', 'dist/**', 'scratch/**', 'node_modules/**'],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'scratch/coverage'
    },
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          pool: 'forks',
          environment: 'node',
          environmentOptions: {
            jsdom: {
              pretendToBeVisual: true,
              console: false
            }
          },
          include: [
            'tests/unit/**/*.{test,spec}.ts',
            'tests/integration/**/*.{test,spec}.ts',
            'src/**/*.{test,spec}.ts'
          ],
          setupFiles: ['./tests/vitest.setup.ts'],
          testTimeout: 120000
        }
      },
      {
        test: {
          name: 'node',
          globals: true,
          pool: 'forks',
          environment: 'node',
          include: [
            'tests/node/**/*.test.ts',
            'packages/auditor/tests/**/*.test.ts',
            'test_aventura/tests/**/*.{test,spec}.ts'
          ],
          exclude: ['tests/node/**/backup_migration_real.test.ts'],
          setupFiles: ['./tests/vitest.node.setup.ts'],
          testTimeout: 120000
        }
      },
      {
        test: {
          name: 'migrations',
          globals: true,
          pool: 'forks',
          environment: 'node',
          include: ['tests/node/**/backup_migration_real.test.ts'],
          setupFiles: ['./tests/vitest.node.setup.ts'],
          testTimeout: 300000
        }
      }
    ]
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true
    },
    jsPlugins: ['@francogp/auditor/domain-type-plugin'],
    rules: {
      '@francogp/domain-type/no-legacy-date': 'error',
      '@francogp/domain-type/no-double-cast-unknown': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'no-debugger': 'error',
      'no-else-return': 'error',
      'no-empty': [
        'error',
        {
          allowEmptyCatch: false
        }
      ],
      'max-depth': ['error', 4],
      'import/no-duplicates': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-self-compare': 'error',
      'no-eval': 'error',
      'vue/no-async-in-computed-properties': 'error',
      'vue/no-side-effects-in-computed-properties': 'error',
      'vue/no-export-in-script-setup': 'error',
      'vue/no-lifecycle-after-await': 'error',
      'vue/no-watch-after-await': 'error',
      'vue/prefer-import-from-vue': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/prefer-to-have-length': 'error',
      'vitest/valid-title': 'error',
      'import/no-self-import': 'error',
      'import/no-empty-named-blocks': 'error',
      'no-useless-catch': 'error',
      'no-useless-rename': 'error',
      'no-sparse-arrays': 'error',
      'no-shadow-restricted-names': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/no-useless-spread': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-unnecessary-template-expression': 'error',
      '@typescript-eslint/no-unnecessary-type-arguments': 'error',
      '@typescript-eslint/no-unnecessary-type-constraint': 'error',
      '@typescript-eslint/prefer-function-type': 'error',
      '@typescript-eslint/prefer-return-this-type': 'error',
      '@typescript-eslint/ban-tslint-comment': 'error',
      'import/no-mutable-exports': 'error',
      'no-extend-native': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'prefer-object-has-own': 'error',
      'no-useless-computed-key': 'error',
      'node/no-exports-assign': 'error',
      'import/no-webpack-loader-syntax': 'error',
      'import/no-dynamic-require': 'error',
      'import/no-amd': 'error',
      'import/no-named-default': 'error',
      'no-new-wrappers': 'error',
      'no-array-constructor': 'error',
      'no-caller': 'error',
      'unicorn/no-new-buffer': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'default-case-last': 'error',
      radix: 'error',
      'no-return-assign': 'error',
      'no-multi-assign': 'error',
      'no-sequences': 'error',
      'no-labels': 'error',
      'no-useless-call': 'error',
      yoda: 'error',
      'no-unneeded-ternary': 'error',
      'promise/no-new-statics': 'error',
      'promise/valid-params': 'error',
      'promise/no-return-in-finally': 'error',
      'node/no-new-require': 'error',
      'node/no-path-concat': 'error',
      'unicorn/no-unnecessary-array-flat-depth': 'error',
      'unicorn/no-unnecessary-array-splice-count': 'error',
      'unicorn/no-unreadable-iife': 'error',
      'unicorn/no-useless-switch-case': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/no-unnecessary-slice-end': 'error',
      'unicorn/explicit-timer-delay': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-math-min-max': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/prefer-prototype-methods': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-global-this': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'prefer-exponentiation-operator': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-rest-params': 'error',
      'vitest/no-duplicate-hooks': 'error',
      'vitest/no-test-prefixes': 'error',
      'vitest/no-test-return-statement': 'error',
      'vitest/prefer-to-contain': 'error',
      'vitest/prefer-to-be': 'error',
      'vitest/prefer-comparison-matcher': 'error',
      'vitest/no-import-node-test': 'error',
      'vitest/no-interpolation-in-snapshots': 'error',
      'vitest/prefer-expect-resolves': 'error',
      'vitest/prefer-mock-promise-shorthand': 'error',
      'vitest/prefer-mock-return-shorthand': 'error',
      'vitest/prefer-strict-equal': 'error',
      'vitest/prefer-to-be-truthy': 'error',
      'vitest/prefer-to-be-falsy': 'error',
      'vitest/prefer-to-be-object': 'error',
      'vitest/prefer-todo': 'error',
      'vue/no-expose-after-await': 'error',
      'vue/return-in-computed-property': 'error',
      'vue/no-import-compiler-macros': 'error',
      'vue/valid-next-tick': 'error',
      'vue/no-deprecated-destroyed-lifecycle': 'error',
      'vue/component-definition-name-casing': 'error',
      'vue/define-emits-declaration': 'error',
      'vue/define-props-declaration': 'error',
      'vue/next-tick-style': 'error',
      'vue/prop-name-casing': 'error',
      'vue/require-direct-export': 'error',
      'vue/require-typed-ref': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      'vue/no-required-prop-with-default': 'error',
      'vue/no-deprecated-model-definition': 'error',
      'no-useless-assignment': 'error',
      'unicode-bom': 'error',
      'typescript/prefer-as-const': 'error',
      'typescript/no-for-in-array': 'error',
      'typescript/no-duplicate-enum-values': 'error',
      'typescript/no-duplicate-type-constituents': 'error',
      'typescript/no-extra-non-null-assertion': 'error',
      'typescript/no-useless-empty-export': 'error',
      'oxc/const-comparisons': 'error',
      'oxc/missing-throw': 'error',
      'oxc/uninvoked-array-callback': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/prefer-set-size': 'error',
      'typescript/no-wrapper-object-types': 'error',
      'typescript/no-unnecessary-type-assertion': 'error',
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/no-aria-hidden-on-focusable': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      '@francogp/domain-type/no-boolean-literal-annotation': 'error',
      '@francogp/domain-type/no-broad-string-array': 'error',
      '@francogp/domain-type/watch-reactive-property-getter': 'error',
      '@francogp/domain-type/no-destructured-reactive': 'error',
      'no-console': [
        'error',
        {
          allow: ['warn', 'error']
        }
      ],
      '@francogp/domain-type/no-store-destructuring-without-storetorefs': 'error',
      '@francogp/domain-type/no-direct-state-mutation-outside-actions': 'error',
      '@francogp/domain-type/no-deprecated-router-next': 'error',
      '@francogp/domain-type/no-define-async-component-in-router': 'error',
      '@francogp/domain-type/no-window-location-navigation': 'error',
      '@francogp/domain-type/no-silent-promise-catch': 'error',
      '@francogp/domain-type/no-silent-mock-fallbacks': 'error',
      '@francogp/domain-type/strict-catch-narrowing': 'error',
      '@francogp/domain-type/dom-event-leak': 'error',
      '@francogp/domain-type/interval-leak': 'error',
      '@francogp/domain-type/no-boolean-trap-parameters': 'error',
      '@francogp/domain-type/no-massive-switch': 'error',
      '@francogp/domain-type/no-tautological-integration-mocks': 'error',
      '@francogp/domain-type/playwright-id-locators-only': 'error',
      '@francogp/domain-type/no-playwright-force-click': 'error',
      '@francogp/domain-type/no-test-timeout-inflation': 'error',
      '@francogp/domain-type/no-playwright-polling-waits': 'error',
      '@francogp/domain-type/script-setup-required': 'error',
      '@francogp/domain-type/vue-template-quote-escaping': 'error',
      '@francogp/domain-type/no-data-provider-in-template': 'error',
      '@francogp/domain-type/no-raw-html-injection': 'error',
      '@francogp/domain-type/no-insecure-random': 'error',
      '@francogp/domain-type/no-permissive-cors': 'error',
      '@francogp/domain-type/no-unvalidated-redirect': 'error',
      'promise/catch-or-return': 'error',
      'vitest/expect-expect': 'error',
      '@francogp/domain-type/no-record-string-key': 'error',
      '@francogp/domain-type/no-unbranded-id': 'error',
      '@francogp/domain-type/no-untyped-string-set-map': 'error',
      '@francogp/domain-type/no-naked-string-union': 'error',
      '@francogp/domain-type/valibot-schema-type-parity': 'error',
      '@francogp/domain-type/no-redundant-constant-alias': 'error',
      '@francogp/domain-type/no-literal-suffix-constant': 'error',
      '@francogp/domain-type/unsafe-path-concat': 'error',
      '@francogp/domain-type/unsanitized-env-argv-path': 'error',
      '@francogp/domain-type/untrusted-url-fetch': 'error',
      '@francogp/domain-type/hardcoded-slash-path': 'error',
      '@francogp/domain-type/no-hardcoded-secrets': 'error',
      '@francogp/domain-type/ephemeral-no-source-temp-references': 'error',
      '@francogp/domain-type/no-raw-local-storage': 'error',
      '@francogp/domain-type/no-raw-session-storage': 'error',
      '@francogp/domain-type/no-direct-process-argv': 'error',
      '@francogp/domain-type/no-banned-cli-parsers': 'error',
      '@francogp/domain-type/no-homebrew-flag-parsing': 'error',
      '@francogp/domain-type/no-cli-eval-bypass': 'error',
      '@francogp/domain-type/no-await-in-loops-query': 'error',
      '@francogp/domain-type/no-select-star-in-queries': 'error',
      '@francogp/domain-type/require-paginated-queries': 'error',
      '@francogp/domain-type/no-direct-database-instantiation': 'error',
      '@francogp/domain-type/require-storage-try-catch': 'error',
      '@francogp/domain-type/no-gsap-layout-properties': 'error',
      '@francogp/domain-type/gsap-named-timer-constants': 'error',
      '@francogp/domain-type/no-gsap-banned-ui-timers': 'error',
      '@francogp/domain-type/require-gsap-cleanup-on-unmount': 'error',
      '@francogp/domain-type/no-unscoped-component-selectors': 'error',
      '@francogp/domain-type/no-nested-scrolltrigger': 'error',
      '@francogp/domain-type/no-scrolltrigger-markers-production': 'error',
      '@francogp/domain-type/no-file-level-suppressions': 'error',
      '@francogp/domain-type/auditor-class-inheritance': 'error',
      '@francogp/domain-type/no-homebrew-file-walker': 'error',
      '@francogp/domain-type/auditor-rule-description-limit': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports'
        }
      ]
    },
    ignorePatterns: [
      'node_modules/**',
      'scratch/**',
      '.git/**',
      '.vscode/**',
      '.github/**',
      '.gemini/**',
      '.auditor/**',
      '.agents/**',
      'tmp/**',
      'volumes/**',
      'dist/**',
      'dev-dist/**',
      'build/**',
      'coverage/**',
      'test-results/**',
      '.vitest-cache/**',
      '.fallow/**',
      '.oxlintcache/**',
      '.stylelintcache/**',
      '.tsbuildinfo/**',
      '**/*.d.ts',
      'external/**',
      'src/logic/db/migrations_data.ts',
      ...LOCKED_SKILLS_IGNORE_PATTERNS
    ],
    plugins: ['vitest', 'node', 'promise', 'unicorn', 'typescript', 'vue', 'import', 'jsx-a11y'],
    overrides: [
      {
        files: [
          '**/tests/**',
          '**/test_aventura/tests/**',
          '**/scripts/e2e/**',
          '**/tests/integration/**'
        ],
        rules: {
          'typescript/explicit-function-return-type': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
          'vitest/prefer-to-be-truthy': 'off',
          'vitest/prefer-to-be-falsy': 'off',
          'vitest/prefer-strict-equal': 'off',
          'vitest/no-conditional-expect': 'off',
          'vitest/require-mock-type-parameters': 'off',
          'vitest/prefer-mock-return-shorthand': 'off',
          'vitest/expect-expect': 'off',
          'typescript/no-floating-promises': 'off',
          '@typescript-eslint/no-floating-promises': 'off',
          'no-console': 'off',
          'unicorn/prefer-global-this': 'off',
          'vue/require-typed-ref': 'off',
          '@francogp/domain-type/no-double-cast-unknown': 'off',
          '@francogp/domain-type/no-broad-string-array': 'off',
          '@francogp/domain-type/no-legacy-date': 'off',
          '@francogp/domain-type/no-raw-local-storage': 'off',
          '@francogp/domain-type/no-insecure-random': 'off',
          '@francogp/domain-type/no-select-star-in-queries': 'off',
          '@francogp/domain-type/require-paginated-queries': 'off',
          '@francogp/domain-type/no-untyped-string-set-map': 'off',
          '@francogp/domain-type/no-hardcoded-secrets': 'off',
          'typescript/consistent-type-assertions': 'off',
          'typescript/no-explicit-any': 'off',
          'typescript/explicit-member-accessibility': 'off',
          'typescript/await-thenable': 'off',
          'typescript/unbound-method': 'off',
          'typescript/require-array-sort-compare': 'off',
          'unicorn/no-new-array': 'off',
          'max-depth': 'off',
          'no-script-url': 'off',
          'typescript/no-implied-eval': 'off',
          'no-new-func': 'off',
          'no-unused-expressions': 'off',
          '@francogp/domain-type/unsafe-path-concat': 'off',
          '@francogp/domain-type/hardcoded-slash-path': 'off',
          '@francogp/domain-type/no-record-string-key': 'off',
          '@francogp/domain-type/ephemeral-no-source-temp-references': 'off',
          '@francogp/domain-type/no-direct-process-argv': 'off',
          '@francogp/domain-type/no-homebrew-flag-parsing': 'off',
          '@francogp/domain-type/no-file-level-suppressions': 'off',
          '@francogp/domain-type/auditor-class-inheritance': 'off',
          '@francogp/domain-type/no-homebrew-file-walker': 'off',
          '@francogp/domain-type/auditor-rule-description-limit': 'off',
          '@francogp/domain-type/require-storage-try-catch': 'off',
          '@francogp/domain-type/no-raw-session-storage': 'off',
          '@francogp/domain-type/no-silent-promise-catch': 'off',
          '@francogp/domain-type/no-await-in-loops-query': 'off',
          '@francogp/domain-type/no-literal-suffix-constant': 'off',
          '@francogp/domain-type/no-raw-html-injection': 'off',
          '@francogp/domain-type/no-tautological-integration-mocks': 'off',
          'unicorn/no-thenable': 'off'
        }
      },
      {
        files: ['**/scripts/**', '**/supabase/**'],
        rules: {
          'no-console': 'off',
          'unicorn/prefer-global-this': 'off',
          'typescript/no-floating-promises': 'off',
          '@typescript-eslint/no-floating-promises': 'off',
          'typescript/explicit-function-return-type': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
          '@francogp/domain-type/no-insecure-random': 'off',
          '@francogp/domain-type/no-broad-string-array': 'off',
          '@francogp/domain-type/no-raw-local-storage': 'off',
          '@francogp/domain-type/no-select-star-in-queries': 'off',
          '@francogp/domain-type/require-paginated-queries': 'off',
          '@francogp/domain-type/no-untyped-string-set-map': 'off',
          '@francogp/domain-type/no-direct-database-instantiation': 'off',
          '@francogp/domain-type/require-storage-try-catch': 'off',
          'max-depth': 'off',
          '@francogp/domain-type/unsafe-path-concat': 'off',
          '@francogp/domain-type/hardcoded-slash-path': 'off',
          '@francogp/domain-type/no-record-string-key': 'off',
          '@francogp/domain-type/no-direct-process-argv': 'off',
          '@francogp/domain-type/no-homebrew-flag-parsing': 'off',
          '@francogp/domain-type/no-homebrew-file-walker': 'off',
          '@francogp/domain-type/auditor-rule-description-limit': 'off',
          '@francogp/domain-type/no-raw-session-storage': 'off'
        }
      },
      {
        files: ['**/ui-demo/**'],
        rules: {
          'no-console': 'off',
          'unicorn/prefer-global-this': 'off',
          'typescript/explicit-function-return-type': 'off',
          '@typescript-eslint/explicit-function-return-type': 'off',
          '@francogp/domain-type/no-insecure-random': 'off',
          '@francogp/domain-type/no-broad-string-array': 'off',
          '@francogp/domain-type/no-gsap-layout-properties': 'off',
          '@francogp/domain-type/no-record-string-key': 'off'
        }
      },
      {
        files: ['vite.plugins.ts'],
        rules: {
          'no-console': 'off',
          'unicorn/prefer-global-this': 'off',
          'typescript/no-floating-promises': 'off',
          '@typescript-eslint/no-floating-promises': 'off'
        }
      },
      {
        files: ['src/logic/utils/logger.ts'],
        rules: {
          'no-console': 'off'
        }
      },
      {
        files: ['**/tests/integration/**'],
        rules: {
          '@francogp/domain-type/no-tautological-integration-mocks': 'error'
        }
      }
    ]
  },
  fmt: {
    ignorePatterns: [
      'node_modules/**',
      'scratch/**',
      '.git/**',
      '.vscode/**',
      '.github/**',
      '.gemini/**',
      '.auditor/**',
      '.agents/**',
      'tmp/**',
      'volumes/**',
      'dist/**',
      'dev-dist/**',
      'build/**',
      'coverage/**',
      'test-results/**',
      '.vitest-cache/**',
      '.fallow/**',
      '.oxlintcache/**',
      '.stylelintcache/**',
      '.tsbuildinfo/**',
      '**/*.d.ts',
      'package-lock.json',
      'external/**',
      'src/logic/db/migrations_data.ts',
      'src/data/**',
      ...LOCKED_SKILLS_IGNORE_PATTERNS
    ],
    singleQuote: true,
    semi: true,
    trailingComma: 'none',
    printWidth: 100,
    sortPackageJson: true,
    sortImports: true
  },
  staged: {
    '*': 'vp check --fix'
  },
  run: {
    cache: true
  }
});
