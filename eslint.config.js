import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import pluginSecurity from 'eslint-plugin-security';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  pluginSecurity.configs.recommended,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': 'off', // Turn off default
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          'assertionStyle': 'as',
          'objectLiteralTypeAssertions': 'never'
        }
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          'vars': 'all',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'argsIgnorePattern': '^_',
          'caughtErrors': 'all',
          'caughtErrorsIgnorePattern': '^_',
        },
      ],
      'no-console': 'off',
      'no-undef': 'off', // TS ya maneja el chequeo de no-undef
      'security/detect-object-injection': 'off',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'playwright.config.ts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  // Desactivar warnings de seguridad en scripts de utilidad y tests
  {
    files: [
      'scripts/**/*.ts',
      'scripts/**/*.js',
      'scripts/**/*.cjs',
      'tests/**/*.ts',
      'tests/**/*.js',
      'tests/**/*.spec.ts',
      'tests/**/*.test.ts',
      'vite.config.ts',
      'supabase/**/*.ts',
      'supabase/**/*.js'
    ],
    rules: {
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-unsafe-regex': 'off'
    }
  },
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'node_modules/**',
      'scratch/**',
      'tmp/**',
      '.agents/**',
      'external/**',
      'supabase/**',
      'tests/**',
      'test aventura/**',
      'vitest.config.ts',
      'vitest.node.config.ts',
      'vitest.workspace.ts',
    ],
  },
);
