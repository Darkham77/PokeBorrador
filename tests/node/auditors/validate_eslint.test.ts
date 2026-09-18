/**
 * tests/node/auditors/validate_eslint.test.ts
 *
 * Conformance, Zero-Warning Policy, and error-capture unit tests for EslintAuditor.
 */

import { describe, it, expect } from 'vitest';
import {
  EslintAuditor,
  parseEslintResults,
  ESLINT_RULES
} from '../../../scripts/auditors/architecture/validate_eslint.ts';

describe('validate_eslint (ESLint Code Hygiene Validator)', () => {
  it('instantiates with correct metadata complying with auditor-framework', () => {
    const auditor = new EslintAuditor();
    expect(auditor.id).toBe('validate_eslint');
    expect(auditor.name).toBe('ESLint Code Hygiene Validator');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.ruleIds).toEqual(ESLINT_RULES);
    expect(auditor.ruleDescriptions?.['eslint-violation']).toBeDefined();
    expect(auditor.ruleDescriptions?.['eslint-violation']?.length).toBeLessThanOrEqual(60);
  });

  describe('parseEslintResults', () => {
    it('returns empty array when input is empty or has no violations', () => {
      expect(parseEslintResults('')).toEqual([]);
      expect(parseEslintResults('[]')).toEqual([]);
      expect(parseEslintResults([])).toEqual([]);
      expect(parseEslintResults([{ filePath: 'src/clean.ts', messages: [] }])).toEqual([]);
    });

    it('elevates BOTH warnings (severity 1) and errors (severity 2) to severity: error (Zero-Warning Policy)', () => {
      const sampleJson = JSON.stringify([
        {
          filePath: '/repo/src/components/MyComp.vue',
          messages: [
            {
              ruleId: 'no-unused-vars',
              severity: 1, // ESLint Warning
              message: '\'unusedProp\' is defined but never used.',
              line: 14,
              column: 7
            },
            {
              ruleId: 'no-undef',
              severity: 2, // ESLint Error
              message: '\'undefinedVar\' is not defined.',
              line: 30,
              column: 3
            }
          ]
        }
      ]);

      const findings = parseEslintResults(sampleJson, '/repo');
      expect(findings.length).toBe(2);

      const f1 = findings[0]!;
      expect(f1.suiteId).toBe('validate_eslint');
      expect(f1.ruleId).toBe('eslint-violation');
      expect(f1.severity).toBe('error'); // Zero-warning: warning elevated to error
      expect(f1.file).toBe('src/components/MyComp.vue');
      expect(f1.line).toBe(14);
      expect(f1.context).toBe('no-unused-vars');
      expect(f1.message).toBe('[no-unused-vars] \'unusedProp\' is defined but never used.');

      const f2 = findings[1]!;
      expect(f2.severity).toBe('error');
      expect(f2.file).toBe('src/components/MyComp.vue');
      expect(f2.line).toBe(30);
      expect(f2.context).toBe('no-undef');
      expect(f2.message).toBe('[no-undef] \'undefinedVar\' is not defined.');
    });

    it('handles multiple files and formats relative POSIX paths cleanly', () => {
      const sample = [
        {
          filePath: '/repo/src/logic/math.ts',
          messages: [
            {
              ruleId: '@typescript-eslint/no-explicit-any',
              severity: 2,
              message: 'Unexpected any. Specify a different type.',
              line: 5,
              column: 12
            }
          ]
        },
        {
          filePath: '/repo/src/views/HomeView.vue',
          messages: [
            {
              ruleId: 'vue/multi-word-component-names',
              severity: 1,
              message: 'Component name "Home" should always be multi-word.',
              line: 1,
              column: 1
            }
          ]
        }
      ];

      const findings = parseEslintResults(sample, '/repo');
      expect(findings.length).toBe(2);
      expect(findings[0]?.file).toBe('src/logic/math.ts');
      expect(findings[0]?.severity).toBe('error');
      expect(findings[1]?.file).toBe('src/views/HomeView.vue');
      expect(findings[1]?.severity).toBe('error');
    });
  });
});
