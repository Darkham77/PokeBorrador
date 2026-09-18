/**
 * tests/node/auditors/validate_type_check.test.ts
 *
 * Conformance and error-capture unit tests for TypeCheckAuditor.
 */

import { describe, it, expect } from 'vitest';
import {
  TypeCheckAuditor,
  parseTypeScriptDiagnostics,
  TYPE_CHECK_RULES
} from '../../../scripts/auditors/architecture/validate_type_check.ts';

describe('validate_type_check (TypeScript & Vue SFC Type Check Auditor)', () => {
  it('instantiates with correct metadata complying with auditor-framework', () => {
    const auditor = new TypeCheckAuditor();
    expect(auditor.id).toBe('validate_type_check');
    expect(auditor.name).toBe('TypeScript & Vue Type Validator');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.ruleIds).toEqual(TYPE_CHECK_RULES);
    expect(auditor.ruleDescriptions?.['ts-compiler-error']).toBeDefined();
    expect(auditor.ruleDescriptions?.['ts-compiler-error']?.length).toBeLessThanOrEqual(60);
  });

  describe('parseTypeScriptDiagnostics', () => {
    it('returns empty array when output is empty or whitespace', () => {
      expect(parseTypeScriptDiagnostics('')).toEqual([]);
      expect(parseTypeScriptDiagnostics('   \n\n  ')).toEqual([]);
    });

    it('parses standard colon-separated TypeScript compiler diagnostics', () => {
      const rawOutput = 'src/components/MyComp.vue:42:15 - error TS2322: Type \'string\' is not assignable to type \'number\'.';
      const findings = parseTypeScriptDiagnostics(rawOutput, '/repo');

      expect(findings.length).toBe(1);
      const f = findings[0]!;
      expect(f.suiteId).toBe('validate_type_check');
      expect(f.ruleId).toBe('ts-compiler-error');
      expect(f.severity).toBe('error');
      expect(f.file).toBe('src/components/MyComp.vue');
      expect(f.line).toBe(42);
      expect(f.context).toBe('TS2322');
      expect(f.message).toBe('Type \'string\' is not assignable to type \'number\'.');
    });

    it('parses parenthesis-style TypeScript compiler diagnostics', () => {
      const rawOutput = 'src/logic/battle.ts(108,5): error TS2345: Argument of type \'null\' is not assignable to parameter of type \'string\'.';
      const findings = parseTypeScriptDiagnostics(rawOutput, '/repo');

      expect(findings.length).toBe(1);
      const f = findings[0]!;
      expect(f.file).toBe('src/logic/battle.ts');
      expect(f.line).toBe(108);
      expect(f.context).toBe('TS2345');
      expect(f.message).toBe('Argument of type \'null\' is not assignable to parameter of type \'string\'.');
    });

    it('handles multi-line continuation error messages properly', () => {
      const rawOutput = [
        'src/stores/myStore.ts:15:3 - error TS2322: Type \'{ a: string; }\' is not assignable to type \'{ a: number; }\'.',
        '  Types of property \'a\' are incompatible.',
        '    Type \'string\' is not assignable to type \'number\'.'
      ].join('\n');

      const findings = parseTypeScriptDiagnostics(rawOutput, '/repo');
      expect(findings.length).toBe(1);
      const f = findings[0]!;
      expect(f.file).toBe('src/stores/myStore.ts');
      expect(f.line).toBe(15);
      expect(f.context).toBe('TS2322');
      expect(f.message).toContain('Types of property \'a\' are incompatible.');
      expect(f.message).toContain('Type \'string\' is not assignable to type \'number\'.');
    });

    it('captures multiple independent errors across multiple files', () => {
      const rawOutput = [
        'src/fileA.ts:10:1 - error TS2304: Cannot find name \'x\'.',
        'src/fileB.ts:25:8 - error TS2551: Property \'foo\' does not exist on type \'Bar\'.'
      ].join('\n');

      const findings = parseTypeScriptDiagnostics(rawOutput, '/repo');
      expect(findings.length).toBe(2);
      expect(findings[0]?.file).toBe('src/fileA.ts');
      expect(findings[0]?.line).toBe(10);
      expect(findings[0]?.context).toBe('TS2304');
      expect(findings[1]?.file).toBe('src/fileB.ts');
      expect(findings[1]?.line).toBe(25);
      expect(findings[1]?.context).toBe('TS2551');
    });
  });
});
