/**
 * tests/node/auditors/validate_save_persistence_parity.test.ts
 *
 * Unit tests for SavePersistenceParityAuditor AST parsing and persistence parity engine.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  SavePersistenceParityAuditor,
  extractInterfaceKeys,
  extractEphemeralKeys,
  extractObjectLiteralKeys,
  extractSchemaKeys
} from '../../../scripts/auditors/persistence/validate_save_persistence_parity.ts';
import { SharedAstContext } from '../../../scripts/lib/astContext.ts';

describe('SavePersistenceParityAuditor', () => {
  describe('extractInterfaceKeys', () => {
    it('extracts standard and readonly interface properties using AST', () => {
      const code = `
        export interface TestMission {
          readonly id: string;
          readonly startedAt: number;
          status?: string;
          count: number;
        }
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const keys = extractInterfaceKeys(sf, 'TestMission');

      expect(keys.has('id')).toBe(true);
      expect(keys.has('startedAt')).toBe(true);
      expect(keys.has('status')).toBe(true);
      expect(keys.has('count')).toBe(true);
      expect(keys.size).toBe(4);
    });

    it('returns empty set if interface is not present', () => {
      const code = `export interface OtherInterface { x: number; }`;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const keys = extractInterfaceKeys(sf, 'MissingInterface');

      expect(keys.size).toBe(0);
    });
  });

  describe('extractEphemeralKeys', () => {
    it('extracts union of string literal types from EphemeralGameStateKeys', () => {
      const code = `
        export type EphemeralGameStateKeys = 'battle' | 'isOverlayLoading' | 'overlayMessage';
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const keys = extractEphemeralKeys(sf);

      expect(keys.has('battle')).toBe(true);
      expect(keys.has('isOverlayLoading')).toBe(true);
      expect(keys.has('overlayMessage')).toBe(true);
      expect(keys.size).toBe(3);
    });
  });

  describe('extractObjectLiteralKeys', () => {
    it('extracts keys from object literals and resolves conditional spreads', () => {
      const code = `
        const obj = {
          fixedA: 1,
          fixedB: 'hello',
          ...(cond ? { spreadC: true } : {}),
          ...(otherCond ? { spreadD: 123 } : null)
        };
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      let extracted = new Set<string>();

      ts.forEachChild(sf, (node) => {
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
              extracted = extractObjectLiteralKeys(decl.initializer);
            }
          }
        }
      });

      expect(extracted.has('fixedA')).toBe(true);
      expect(extracted.has('fixedB')).toBe(true);
      expect(extracted.has('spreadC')).toBe(true);
      expect(extracted.has('spreadD')).toBe(true);
      expect(extracted.size).toBe(4);
    });
  });

  describe('extractSchemaKeys', () => {
    it('extracts keys from a Valibot object schema declaration', () => {
      const code = `
        export const sampleSchema = object({
          trainer: string(),
          level: number(),
          badges: optional(number())
        });
      `;
      const sf = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
      const { keys } = extractSchemaKeys(sf, 'sampleSchema');

      expect(keys.has('trainer')).toBe(true);
      expect(keys.has('level')).toBe(true);
      expect(keys.has('badges')).toBe(true);
      expect(keys.size).toBe(3);
    });
  });

  describe('SavePersistenceParityAuditor.execute with SharedAstContext', () => {
    it('executes parity audit cleanly on real codebase using SharedAstContext', async () => {
      const auditor = new SavePersistenceParityAuditor();
      const sharedAstContext = new SharedAstContext();

      const result = await auditor.execute(sharedAstContext);

      expect(result.status).toBe('passed');
      expect(result.findings).toHaveLength(0);
      expect(sharedAstContext.size).toBeGreaterThanOrEqual(4);
    });
  });
});
