import { describe, it, expect } from 'vitest';
import {
  scanFileForIllegalHeaders,
  auditAuditHeaders,
  isPathIgnored
} from '@/../scripts/auditors/architecture/validate_audit_headers.ts';

describe('validate_audit_headers (Illegal Audit Headers & File-Level Suppressions Auditor)', () => {
  describe('scanFileForIllegalHeaders', () => {
    it('returns empty violations for clean files with valid code and inline comments', () => {
      const cleanCode = `
import { ref } from 'vue';

export const MY_VALUE = 42;
export function calculate(a: number, b: number): number {
  return a + b;
}
`;
      const violations = scanFileForIllegalHeaders('src/logic/math.ts', cleanCode);
      expect(violations).toEqual([]);
    });

    it('allows valid inline line-level escape hatches appended to code', () => {
      const codeWithInlineEscapes = [
        'const name = getRawName(); // ' + 'domain-ok: Open dynamic text or non-domain string payload',
        'let globalCache: Cache | null = null; // ' + 'singleton-ok: Global persistent singleton instance',
        'const shake = { x: -4 }; // ' + 'no-magic: Visual shake offset displacement'
      ].join('\n');
      const violations = scanFileForIllegalHeaders('src/logic/helpers.ts', codeWithInlineEscapes);
      expect(violations).toEqual([]);
    });

    it('detects // fallow-ignore-file headers anywhere in file', () => {
      const code = ['// ' + 'fallow-ignore-file security-sink', 'import fs from "node:fs";', 'export function readData() { return 1; }'].join('\n');
      const violations = scanFileForIllegalHeaders('src/logic/loader.ts', code);
      expect(violations.length).toBe(1);
      expect(violations[0]?.ruleId).toBe('file-level-fallow-ignore');
      expect(violations[0]?.line).toBe(1);
      expect(violations[0]?.severity).toBe('error');
    });

    it('detects multiple fallow-ignore-file rules on same or different lines', () => {
      const code = ['// ' + 'fallow-ignore-file security-sink unused-store-member', '// ' + 'fallow-ignore-file circular-dependencies', 'export const x = 1;'].join('\n');
      const violations = scanFileForIllegalHeaders('src/stores/myStore.ts', code);
      expect(violations.length).toBe(2);
      expect(violations[0]?.ruleId).toBe('file-level-fallow-ignore');
      expect(violations[1]?.ruleId).toBe('file-level-fallow-ignore');
    });

    it('detects file-level /* eslint-disable */ blocks', () => {
      const code = ['/*' + ' eslint-disable */', 'import { ref } from "vue";'].join('\n');
      const violations = scanFileForIllegalHeaders('src/views/MyView.vue', code);
      expect(violations.length).toBe(1);
      expect(violations[0]?.ruleId).toBe('file-level-eslint-disable');
      expect(violations[0]?.line).toBe(1);
    });

    it('detects file-level <!-- eslint-disable --> in Vue templates', () => {
      const code = ['<template>', '  <!-' + '- eslint-disable vue/no-v-html -->', '  <div v-html="rawContent" />', '</template>'].join('\n');
      const violations = scanFileForIllegalHeaders('src/components/MyComp.vue', code);
      expect(violations.length).toBe(1);
      expect(violations[0]?.ruleId).toBe('file-level-eslint-disable');
      expect(violations[0]?.line).toBe(2);
    });

    it('allows eslint-disable-next-line and eslint-disable-line', () => {
      const code = [
        '// ' + 'eslint-disable-next-line security/detect-non-literal-regexp',
        'const regex = new RegExp(input);',
        'const val = eval(code); // ' + 'eslint-disable-line no-eval'
      ].join('\n');
      const violations = scanFileForIllegalHeaders('src/logic/evaluator.ts', code);
      expect(violations).toEqual([]);
    });

    it('detects @ts-nocheck, @ts-ignore, and @ts-expect-error', () => {
      const code = [
        '// ' + '@ts-nocheck',
        '// ' + '@ts-ignore',
        'const a: number = "hello";',
        '// ' + '@ts-expect-error',
        'const b: string = 123;'
      ].join('\n');
      const violations = scanFileForIllegalHeaders('src/logic/badTypes.ts', code);
      expect(violations.length).toBe(3);
      expect(violations[0]?.ruleId).toBe('banned-ts-suppression');
      expect(violations[1]?.ruleId).toBe('banned-ts-suppression');
      expect(violations[2]?.ruleId).toBe('banned-ts-suppression');
    });

    it('detects standalone auditor escape hatches used as file headers', () => {
      const code = ['// ' + 'domain-ok', '// ' + 'singleton-ok', 'export const someData = 123;'].join('\n');
      const violations = scanFileForIllegalHeaders('src/logic/standaloneEscapes.ts', code);
      expect(violations.length).toBe(2);
      expect(violations[0]?.ruleId).toBe('header-auditor-escape');
      expect(violations[1]?.ruleId).toBe('header-auditor-escape');
    });
  });

  describe('Directory Ignore Governance (isPathIgnored)', () => {
    it('correctly ignores paths within canonical ignored directories', () => {
      expect(isPathIgnored('external/pokemon-showdown-code/client/src/battle.ts')).toBe(true);
      expect(isPathIgnored('node_modules/@pkmn/sim/index.js')).toBe(true);
      expect(isPathIgnored('dist/index.html')).toBe(true);
      expect(isPathIgnored('scratch/audit_report.txt')).toBe(true);
      expect(isPathIgnored('test aventura/old_script.ts')).toBe(true);
      expect(isPathIgnored('.agents/skills/fallow/SKILL.md')).toBe(true);
    });

    it('allows valid non-ignored source files', () => {
      expect(isPathIgnored('src/logic/battle/battle.ts')).toBe(false);
      expect(isPathIgnored('src/components/MyComponent.vue')).toBe(false);
      expect(isPathIgnored('scripts/auditors/architecture/validate_audit_headers.ts')).toBe(false);
    });

    it('respects extra directory ignore patterns', () => {
      const extraPatterns = ['supabase/**', 'scripts/e2e/fuzzer/**'];
      expect(isPathIgnored('supabase/migrations/001.sql', extraPatterns)).toBe(true);
      expect(isPathIgnored('scripts/e2e/fuzzer/core/runner.ts', extraPatterns)).toBe(true);
      expect(isPathIgnored('src/stores/player.ts', extraPatterns)).toBe(false);
    });
  });

  describe('auditAuditHeaders integration', () => {
    it('executes repository audit scanning and collects structured metrics', () => {
      const result = auditAuditHeaders();
      expect(result.filesScanned).toBeGreaterThan(100);
      expect(Array.isArray(result.violations)).toBe(true);
      expect(typeof result.passed).toBe('boolean');
    });
  });
});
