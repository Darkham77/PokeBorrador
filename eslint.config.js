import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    name: 'pokevicio/core-rules',
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Reglas Vue 3 & Block Order
      'vue/multi-word-component-names': 'off',
      'vue/block-order': ['error', { 'order': ['script', 'template', 'style'] }],
      'vue/no-required-prop-with-default': 'error',
      'vue/no-deprecated-model-definition': 'error',
      'vue/no-deprecated-delete-set': 'error',

      // Variables no utilizadas & TypeScript
      'no-unused-vars': 'off', // Turn off default
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          'assertionStyle': 'as',
          'objectLiteralTypeAssertions': 'never'
        }
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
          message: 'Está ESTRICTAMENTE PROHIBIDO usar doble casteo (as unknown as). Usa guardas de tipo, augmentations de interfaz o tipado estricto.'
        },
        {
          selector: 'NewExpression[callee.name="Date"]',
          message: 'El uso de new Date() está ESTRICTAMENTE PROHIBIDO. Usa la API moderna Temporal (Temporal.Now.instant() / Temporal.Instant).'
        },
        {
          selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
          message: 'El uso de Date.now() está ESTRICTAMENTE PROHIBIDO. Usa Temporal.Now.instant().epochMilliseconds o performance.now().'
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

      // ESLint 10 Core New Rules
      'no-unassigned-vars': 'error',
      'no-useless-assignment': 'error',
      'preserve-caught-error': 'error',

      // Calidad general
      'no-console': 'off',
      'no-undef': 'off', // TS ya maneja el chequeo de no-undef
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2025,
      },
    },
  },
  globalIgnores([
    'dist/**',
    'dev-dist/**',
    'auditor_fault_suite/**',
    'node_modules/**',
    'scratch/**',
    'tmp/**',
    '.agents/**',
    'external/**',
    'supabase/**',
    'tests/**',
    'test aventura/**',
    'vitest.config.ts',
  ]),
);
