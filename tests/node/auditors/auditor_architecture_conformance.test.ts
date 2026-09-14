/**
 * tests/node/auditors/auditor_architecture_conformance.test.ts
 * 
 * AUDITOR ARCHITECTURE CONFORMANCE META-TEST
 * Verifies that 100% of discovered sub-auditors in scripts/auditors/:
 *   1. Strictly inherit from BaseAuditor or FileScanAuditor.
 *   2. Zero custom recursive file walkers (getAllFiles, getAllVueFiles, scanDir, getFilesRecursively, walkSourceFiles).
 *   3. Align 100% with the dynamic auto-discovery engine in scripts/maintenance/auditScanner.ts.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { discoverAuditors } from '../../../scripts/maintenance/auditScanner.ts';
import { AUDIT_FAMILIES } from '../../../scripts/lib/auditContract.ts';

const AUDITORS_ROOT = path.resolve(process.cwd(), 'scripts/auditors');

function getSubAuditorFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_') && entry.name !== 'node_modules' && entry.name !== 'lib') {
        results.push(...getSubAuditorFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      if (
        (entry.name.startsWith('validate_') || entry.name.startsWith('audit_')) &&
        !entry.name.startsWith('_') &&
        !entry.name.startsWith('report_') &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.spec.')
      ) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

describe('Auditor Architecture Conformance', () => {
  const subAuditorFiles = getSubAuditorFiles(AUDITORS_ROOT);

  it('discovers at least 33 active sub-auditors in scripts/auditors/', () => {
    expect(subAuditorFiles.length).toBeGreaterThanOrEqual(33);
  });

  describe('OOP Inheritance Mandate', () => {
    for (const filePath of subAuditorFiles) {
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      const filename = path.basename(filePath);

      it(`${filename} strictly inherits from BaseAuditor or FileScanAuditor`, () => {
        const source = fs.readFileSync(filePath, 'utf-8');
        const hasBaseAuditor = /extends\s+BaseAuditor\b/.test(source);
        const hasFileScanAuditor = /extends\s+FileScanAuditor\b/.test(source);

        expect(
          hasBaseAuditor || hasFileScanAuditor,
          `Expected ${relPath} to inherit from BaseAuditor or FileScanAuditor`
        ).toBe(true);
      });
    }
  });

  describe('Zero Custom Directory Walker Mandate', () => {
    const FORBIDDEN_WALKER_PATTERNS = [
      /function\s+getAllFiles\b/,
      /function\s+getAllVueFiles\b/,
      /function\s+scanDir\b/,
      /function\s+getFilesRecursively\b/,
      /function\s+walkSourceFiles\b/,
      /const\s+getAllFiles\s*=/,
      /const\s+getAllVueFiles\s*=/,
      /const\s+scanDir\s*=/,
      /const\s+getFilesRecursively\s*=/,
      /const\s+walkSourceFiles\s*=/
    ];

    for (const filePath of subAuditorFiles) {
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      const filename = path.basename(filePath);

      it(`${filename} contains zero custom recursive file walkers`, () => {
        const source = fs.readFileSync(filePath, 'utf-8');

        for (const pattern of FORBIDDEN_WALKER_PATTERNS) {
          expect(
            pattern.test(source),
            `Found illegal custom recursive file walker matching ${pattern} in ${relPath}. Use BaseAuditor.context.collectFiles or collectRepositoryFiles instead.`
          ).toBe(false);
        }
      });
    }
  });

  describe('Dynamic Discovery Engine Parity', () => {
    it('discovers all sub-auditors dynamically with valid families and executable paths', async () => {
      const tasks = await discoverAuditors();
      expect(tasks.length).toBeGreaterThanOrEqual(27);

      for (const task of tasks) {
        expect(AUDIT_FAMILIES).toContain(task.family);
        expect(task.id).toBeTruthy();
        expect(task.name).toBeTruthy();
        expect(task.scriptPath).toBeTruthy();
        expect(fs.existsSync(task.scriptPath)).toBe(true);
      }

      // Check that every scanned file is present in discovered tasks
      const discoveredPaths = new Set(tasks.map(t => path.resolve(process.cwd(), t.scriptPath)));
      for (const filePath of subAuditorFiles) {
        expect(
          discoveredPaths.has(filePath),
          `Expected dynamic auto-discovery to include ${path.relative(process.cwd(), filePath)}`
        ).toBe(true);
      }
    });
  });

  describe('Auditor Identity & Human-Friendly Description Mandate', () => {
    const MAX_LENGTH = 60;

    for (const filePath of subAuditorFiles) {
      const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
      const filename = path.basename(filePath);

      it(`${filename} declares a concise, single-line description (<= ${MAX_LENGTH} chars)`, () => {
        const source = fs.readFileSync(filePath, 'utf-8');
        const descMatch = source.match(/description:\s*['"]([^'"]+)['"]/);

        expect(descMatch, `Expected ${relPath} to declare a 'description' property in super({...})`).toBeTruthy();
        const desc = descMatch![1]!;

        expect(desc.trim().length, `Description in ${relPath} cannot be empty`).toBeGreaterThan(0);
        expect(desc.length, `Description "${desc}" in ${relPath} exceeds ${MAX_LENGTH} characters (${desc.length} chars)`).toBeLessThanOrEqual(MAX_LENGTH);
        expect(desc.includes('\n'), `Description in ${relPath} must be a single line without newlines`).toBe(false);
      });

      it(`${filename} declares single-line ruleDescriptions under ${MAX_LENGTH} chars when present`, () => {
        const source = fs.readFileSync(filePath, 'utf-8');
        const ruleDescBlockMatch = source.match(/ruleDescriptions:\s*\{([^}]+)\}/);
        if (ruleDescBlockMatch) {
          const block = ruleDescBlockMatch[1]!;
          const ruleLines = block.match(/['"][a-zA-Z0-9_-]+['"]\s*:\s*['"]([^'"]+)['"]/g) || [];
          for (const line of ruleLines) {
            const valMatch = line.match(/:\s*['"]([^'"]+)['"]/);
            if (valMatch) {
              const ruleDesc = valMatch[1]!;
              expect(ruleDesc.length, `Rule description "${ruleDesc}" in ${relPath} exceeds ${MAX_LENGTH} characters`).toBeLessThanOrEqual(MAX_LENGTH);
              expect(ruleDesc.includes('\n'), `Rule description in ${relPath} cannot contain newlines`).toBe(false);
            }
          }
        }
      });
    }
  });

  describe('False Positive Eradication & Precision Tests', () => {
    it('noImportantOnTransforms ignores text-transform and catches transform', async () => {
      const { noImportantOnTransforms } = await import('../../../scripts/maintenance/audit_rules.ts');
      const r = new RegExp(noImportantOnTransforms.regex.source, noImportantOnTransforms.regex.flags);
      expect(r.test('text-transform: uppercase !important;')).toBe(false);
      r.lastIndex = 0;
      expect(r.test('transform: none !important;')).toBe(true);
      r.lastIndex = 0;
      expect(r.test('transform: translateY(-1px) !important;')).toBe(true);
    });

    it('noImportantOnFilters ignores backdrop-filter and catches element filter', async () => {
      const { noImportantOnFilters } = await import('../../../scripts/maintenance/audit_rules.ts');
      const r = new RegExp(noImportantOnFilters.regex.source, noImportantOnFilters.regex.flags);
      expect(r.test('-webkit-backdrop-filter: none !important;')).toBe(false);
      r.lastIndex = 0;
      expect(r.test('backdrop-filter: none !important;')).toBe(false);
      r.lastIndex = 0;
      expect(r.test('filter: none !important;')).toBe(true);
      r.lastIndex = 0;
      expect(r.test('filter: grayscale(1) !important;')).toBe(true);
    });
  });

  describe('Visual Column Alignment Tests', () => {
    it('status badges have identical visual character widths across all states', async () => {
      const { formatStatusBadge, getVisualWidth } = await import('../../../scripts/lib/unifiedTheme.ts');

      const passBadge = formatStatusBadge('passed');
      const failBadge = formatStatusBadge('failed');
      const warnBadge = formatStatusBadge('warning');
      const infoBadge = formatStatusBadge('info');

      // Monospace terminal display width must be exactly 11 for all badges:
      // [ ❌ FAIL ] (width 11) === [ ⚠️ WARN ] (width 11) === [ ✅ PASS ] (width 11) === [ ℹ️ INFO ] (width 11)
      expect(getVisualWidth(passBadge)).toBe(11);
      expect(getVisualWidth(failBadge)).toBe(11);
      expect(getVisualWidth(warnBadge)).toBe(11);
      expect(getVisualWidth(infoBadge)).toBe(11);
    });

    it('renderAuditTaskRow aligns column separators consistently across rows and metric lengths', async () => {
      const { renderAuditTaskRow, getVisualWidth } = await import('../../../scripts/lib/unifiedTheme.ts');

      const rowFail = renderAuditTaskRow({
        id: 'suite1',
        name: 'Project Architecture & Style Rules',
        description: 'Reglas de arquitectura y estilos de proyecto',
        durationMs: 1689,
        metrics: { 'Archivos': 2073 },
        status: 'failed',
        summary: { errors: 91, warnings: 5, info: 0 },
        family: 'architecture',
        findings: []
      });

      const rowWarn = renderAuditTaskRow({
        id: 'suite2',
        name: 'Mobile & Web Accessibility Auditor',
        description: 'Auditor de accesibilidad móvil y web',
        durationMs: 106,
        metrics: { 'Archivos': 309 },
        status: 'passed',
        summary: { errors: 0, warnings: 46, info: 0 },
        family: 'architecture',
        findings: []
      });

      const rowPass = renderAuditTaskRow({
        id: 'suite3',
        name: 'Sql Anti Patterns',
        description: 'Auditor de antipatrones SQL en persistencia',
        durationMs: 42,
        metrics: { 'Tables': 12 },
        status: 'passed',
        summary: { errors: 0, warnings: 0, info: 0 },
        family: 'persistence',
        findings: []
      });

      const rowLongMetric = renderAuditTaskRow({
        id: 'suite4',
        name: 'Typography Line-Height & Interlinear Rhythm Validator',
        description: 'Validador de ritmo interlineal y line-height',
        durationMs: 144,
        metrics: { 'Line-height rules analyzed': 104 },
        status: 'failed',
        summary: { errors: 1, warnings: 0, info: 0 },
        family: 'architecture',
        findings: []
      });

      const rowSuperLong = renderAuditTaskRow({
        id: 'suite5',
        name: 'Extremely Long Auditor Name That Needs Truncation Definitely',
        description: 'Auditor con nombre extenso para probar truncado visual',
        durationMs: 9999,
        metrics: { 'SuperLongMetricCategoryName': 999999 },
        status: 'failed',
        summary: { errors: 100, warnings: 99, info: 0 },
        family: 'architecture',
        findings: []
      });

      const getColWidths = (row: string) => row.split('│').map(col => getVisualWidth(col));

      const expectedWidths = [14, 40, 9, 18, 9, 7];
      expect(getColWidths(rowFail)).toEqual(expectedWidths);
      expect(getColWidths(rowWarn)).toEqual(expectedWidths);
      expect(getColWidths(rowPass)).toEqual(expectedWidths);
      expect(getColWidths(rowLongMetric)).toEqual(expectedWidths);
      expect(getColWidths(rowSuperLong)).toEqual(expectedWidths);
    });
  });
});

