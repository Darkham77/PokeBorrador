/**
 * tests/node/auditors/validate_duplicate_constants.test.ts
 *
 * Comprehensive unit test suite for DuplicateConstantsAuditor and AST constant analysis.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';
import { DuplicateConstantsAuditor } from '../../../scripts/auditors/architecture/validate_duplicate_constants.ts';
import { SharedAstContext } from '../../../scripts/lib/astContext.ts';
import { extractConstantsFromSource, detectDuplicateConstants } from '../../../scripts/maintenance/analyzers/constantAnalyzer.ts';

describe('DuplicateConstantsAuditor', () => {
  let tempDir: string;

  beforeEach(async () => {
    process.env.AUDIT_SUBPROCESS = 'true';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'const-test-'));
  });

  afterEach(async () => {
    delete process.env.AUDIT_SUBPROCESS;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('instantiates cleanly with AST requirement conforming to auditor-framework', () => {
    const auditor = new DuplicateConstantsAuditor();
    expect(auditor.id).toBe('validate_duplicate_constants');
    expect(auditor.family).toBe('architecture');
    expect(auditor.requiresAst).toBe(true);
    expect(auditor.name).toBe('Duplicate Constants Validator');
  });

  it('extracts top-level const declarations using TypeScript AST', () => {
    const sourceCode = `
      export const BATTLE_ROUND_LIMIT = 50;
      export const SPECIAL_BONUS_MULTIPLIER = 2.5;
      const LOCAL_HELPER_THRESHOLD = 10;
      let mutableVar = 100;
    `;
    const sourceFile = ts.createSourceFile('test.ts', sourceCode, ts.ScriptTarget.Latest, true);
    const decls = extractConstantsFromSource(sourceFile, 'test.ts');

    expect(decls.length).toBe(3);
    expect(decls.some(d => d.name === 'BATTLE_ROUND_LIMIT')).toBe(true);
    expect(decls.some(d => d.name === 'SPECIAL_BONUS_MULTIPLIER')).toBe(true);
    expect(decls.some(d => d.name === 'LOCAL_HELPER_THRESHOLD')).toBe(true);
  });

  it('detects duplicate identical constants across separate files', async () => {
    const fileA = path.join(tempDir, 'moduleA.ts');
    const fileB = path.join(tempDir, 'moduleB.ts');

    await fs.writeFile(fileA, 'export const GLOBAL_SPECIAL_KEY = "SPECIAL_VALUE";\n', 'utf-8');
    await fs.writeFile(fileB, 'export const GLOBAL_SPECIAL_KEY = "SPECIAL_VALUE";\n', 'utf-8');

    const violations = await detectDuplicateConstants([fileA, fileB]);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.message).toContain('idéntico');
  });

  it('detects duplicate divergent constants across separate files', async () => {
    const fileA = path.join(tempDir, 'moduleA.ts');
    const fileB = path.join(tempDir, 'moduleB.ts');

    await fs.writeFile(fileA, 'export const DIVERGENT_TEST_KEY = 100;\n', 'utf-8');
    await fs.writeFile(fileB, 'export const DIVERGENT_TEST_KEY = 200;\n', 'utf-8');

    const violations = await detectDuplicateConstants([fileA, fileB]);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]!.message).toContain('diferentes');
  });

  it('runs audit using SharedAstContext on codebase without throwing', async () => {
    const auditor = new DuplicateConstantsAuditor();
    const astContext = new SharedAstContext();

    const result = await auditor.execute(astContext);

    expect(result.summary.errors).toBe(0);
    expect(result.status).toBe('passed');
  });
});
