/**
 * tests/node/auditors/validate_fallow_config.test.ts
 *
 * Unit tests for ValidateFallowConfigAuditor & Fallow Configuration Hygiene.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  ValidateFallowConfigAuditor,
  isSymbolExportedInContent
} from '../../../scripts/auditors/architecture/validate_fallow_config.ts';

describe('ValidateFallowConfigAuditor', () => {
  describe('isSymbolExportedInContent', () => {
    it('detects standard typescript exports correctly', () => {
      const code = `
        export const MY_CONST = 100;
        export let myVar = 200;
        export function calculateScore() { return 1; }
        export async function fetchData() { return 2; }
        export type DomainId = string;
        export interface DomainConfig { id: string; }
        export enum DomainStatus { ACTIVE, INACTIVE }
        export class EngineService {}
      `;

      expect(isSymbolExportedInContent(code, 'MY_CONST')).toBe(true);
      expect(isSymbolExportedInContent(code, 'myVar')).toBe(true);
      expect(isSymbolExportedInContent(code, 'calculateScore')).toBe(true);
      expect(isSymbolExportedInContent(code, 'fetchData')).toBe(true);
      expect(isSymbolExportedInContent(code, 'DomainId')).toBe(true);
      expect(isSymbolExportedInContent(code, 'DomainConfig')).toBe(true);
      expect(isSymbolExportedInContent(code, 'DomainStatus')).toBe(true);
      expect(isSymbolExportedInContent(code, 'EngineService')).toBe(true);
    });

    it('detects export blocks and export type blocks', () => {
      const code = `
        const a = 1;
        type B = number;
        export { a, B as AliasedB };
        export type { SomeType };
      `;

      expect(isSymbolExportedInContent(code, 'a')).toBe(true);
      expect(isSymbolExportedInContent(code, 'AliasedB')).toBe(true);
      expect(isSymbolExportedInContent(code, 'SomeType')).toBe(true);
    });

    it('detects default export for Vue and standard default exports', () => {
      expect(isSymbolExportedInContent('<template><div>Hello</div></template>', 'default', true)).toBe(true);
      expect(isSymbolExportedInContent('export default function() {}', 'default', false)).toBe(true);
    });

    it('returns false for unexported symbols and absent tokens', () => {
      const code = `
        const privateHelper = () => true;
        let internalState = 42;
      `;

      expect(isSymbolExportedInContent(code, 'privateHelper')).toBe(false);
      expect(isSymbolExportedInContent(code, 'internalState')).toBe(false);
      expect(isSymbolExportedInContent(code, 'completelyNonExistent')).toBe(false);
    });
  });

  describe('Auditor Rules Execution (RED scenarios)', () => {
    it('detects missing configuration file', async () => {
      const auditor = new ValidateFallowConfigAuditor('/non/existent/path/.fallowrc.json');
      await auditor.runAudit();
      expect(auditor.getCountsByRule().get('fallow-config-missing')).toBeGreaterThanOrEqual(1);
    });

    it('detects invalid JSON syntax', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallow-test-'));
      const configPath = path.join(tempDir, '.fallowrc.json');
      fs.writeFileSync(configPath, '{ invalid json: syntax }', 'utf-8');

      try {
        const auditor = new ValidateFallowConfigAuditor(configPath);
        await auditor.runAudit();
        expect(auditor.getCountsByRule().get('fallow-config-syntax')).toBeGreaterThanOrEqual(1);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('detects banned entry globs that suppress dead code', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallow-test-'));
      const configPath = path.join(tempDir, '.fallowrc.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          entry: ['src/main.ts', 'src/components/**/*.vue'],
          ignoreExports: []
        }),
        'utf-8'
      );

      try {
        const auditor = new ValidateFallowConfigAuditor(configPath);
        await auditor.runAudit();
        expect(auditor.getCountsByRule().get('fallow-banned-entry-glob')).toBeGreaterThanOrEqual(1);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('detects stale non-existent files in ignoreExports', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallow-test-'));
      const configPath = path.join(tempDir, '.fallowrc.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          entry: ['src/main.ts'],
          ignoreExports: [
            {
              file: 'src/non/existent/legacy_file.ts',
              exports: ['LegacyExport']
            }
          ]
        }),
        'utf-8'
      );

      try {
        const auditor = new ValidateFallowConfigAuditor(configPath);
        await auditor.runAudit();
        expect(auditor.getCountsByRule().get('fallow-stale-file')).toBeGreaterThanOrEqual(1);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('detects stale unexported symbols in ignoreExports', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallow-test-'));
      const configPath = path.join(tempDir, '.fallowrc.json');
      // package.json is guaranteed to exist at projectRoot
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          entry: ['src/main.ts'],
          ignoreExports: [
            {
              file: 'package.json',
              exports: ['NON_EXISTENT_SYMBOL_XYZ']
            }
          ]
        }),
        'utf-8'
      );

      try {
        const auditor = new ValidateFallowConfigAuditor(configPath);
        await auditor.runAudit();
        expect(auditor.getCountsByRule().get('fallow-stale-export')).toBeGreaterThanOrEqual(1);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Repository Clean Conformance (GREEN scenario)', () => {
    it('passes cleanly for the actual repository .fallowrc.json with 0 violations', async () => {
      const auditor = new ValidateFallowConfigAuditor();
      await auditor.runAudit();
      for (const [ruleId, count] of auditor.getCountsByRule().entries()) {
        expect(count, `Expected 0 violations for rule ${ruleId} in repository .fallowrc.json`).toBe(0);
      }
      expect(auditor.getFilesScanned()).toBeGreaterThan(100);
    });
  });
});
