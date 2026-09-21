/**
 * tests/node/auditors/constantAnalyzer.test.ts
 *
 * Unit tests for constantAnalyzer AST extraction and duplicate constant detection.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  extractConstantsFromSource,
  detectDuplicateConstants,
  IGNORED_CONSTANT_NAMES
} from '../../../scripts/maintenance/analyzers/constantAnalyzer.ts';
import { SharedAstContext } from '../../../scripts/lib/astContext.ts';

describe('constantAnalyzer', () => {
  describe('extractConstantsFromSource', () => {
    it('extracts top-level SCREAMING_SNAKE_CASE constants', () => {
      const code = `
        export const MAX_RETRY_COUNT = 5;
        const DEFAULT_TIMEOUT_MS = 3000;
        export const NOT_A_CONST = 'hello';
        let MUTABLE_VAR = 123;
        const x = 1;
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const decls = extractConstantsFromSource(sf, 'src/test.ts');

      expect(decls.map(d => d.name)).toEqual(['MAX_RETRY_COUNT', 'DEFAULT_TIMEOUT_MS', 'NOT_A_CONST']);
      expect(decls[0]!.valueStr).toBe('5');
      expect(decls[0]!.isExported).toBe(true);
      expect(decls[1]!.valueStr).toBe('3000');
      expect(decls[1]!.isExported).toBe(false);
    });

    it('extracts multi-line object and array initializers completely', () => {
      const code = `
        export const BATTLE_CONFIG_DATA = {
          maxTurns: 100,
          allowForfeit: true,
          weatherDuration: 5
        };
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const decls = extractConstantsFromSource(sf, 'src/battleConfig.ts');

      expect(decls).toHaveLength(1);
      expect(decls[0]!.name).toBe('BATTLE_CONFIG_DATA');
      expect(decls[0]!.valueStr).toContain('maxTurns: 100');
      expect(decls[0]!.valueStr).toContain('allowForfeit: true');
    });

    it('filters out generic ignored constant names', () => {
      const code = `
        export const NAME = 'generic';
        export const CONFIG = {};
        export const SPECIAL_GAME_CONFIG = { active: true };
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const decls = extractConstantsFromSource(sf, 'src/sample.ts');

      expect(IGNORED_CONSTANT_NAMES.has('NAME')).toBe(true);
      expect(IGNORED_CONSTANT_NAMES.has('CONFIG')).toBe(true);
      expect(decls).toHaveLength(1);
      expect(decls[0]!.name).toBe('SPECIAL_GAME_CONFIG');
    });
  });

  describe('detectDuplicateConstants with SharedAstContext', () => {
    it('executes without throwing on empty or clean files list', async () => {
      const sharedAstContext = new SharedAstContext();
      const violations = await detectDuplicateConstants([], sharedAstContext);

      expect(violations).toHaveLength(0);
    });
  });
});
