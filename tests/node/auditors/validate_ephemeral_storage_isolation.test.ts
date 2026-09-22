/**
 * tests/node/auditors/validate_ephemeral_storage_isolation.test.ts
 *
 * Dedicated unit test suite for EphemeralStorageIsolationAuditor:
 * - Forbidden temporary directories across all source trees (ephemeral-no-source-temp-dirs)
 * - Strict database root file and directory integrity (ephemeral-no-source-temp-dirs)
 * - Prohibition on ignoring source code temp in .gitignore (ephemeral-no-gitignore-source-temp)
 * - Prohibition on referencing source code temp paths in code (ephemeral-no-source-temp-references)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  EphemeralStorageIsolationAuditor,
  EPHEMERAL_STORAGE_RULES
} from '../../../scripts/auditors/architecture/validate_ephemeral_storage_isolation.ts';

describe('EphemeralStorageIsolationAuditor', () => {
  let tempDir: string;

  beforeEach(async () => {
    process.env.AUDIT_SUBPROCESS = 'true';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ephemeral-storage-test-'));
  });

  afterEach(async () => {
    delete process.env.AUDIT_SUBPROCESS;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Rule Configuration & Metadata Integrity', () => {
    it('declares all canonical rules in EPHEMERAL_STORAGE_RULES', () => {
      expect(EPHEMERAL_STORAGE_RULES).toContain('ephemeral-no-source-temp-dirs');
      expect(EPHEMERAL_STORAGE_RULES).toContain('ephemeral-no-gitignore-source-temp');
      expect(EPHEMERAL_STORAGE_RULES).toContain('ephemeral-no-source-temp-references');
    });

    it('initializes cleanly with projectRoot sandbox', () => {
      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      expect(auditor.id).toBe('validate_ephemeral_storage_isolation');
      expect(auditor.family).toBe('architecture');
      expect(auditor.name).toBe('Ephemeral Storage & Scratch Isolation Validator');
    });
  });

  describe('ephemeral-no-source-temp-dirs', () => {
    it('detects forbidden database/temp directory on disk', async () => {
      await fs.mkdir(path.join(tempDir, 'database', 'temp'), { recursive: true });

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-dirs');
      expect(violations.some(v => v.file?.includes('database/temp'))).toBe(true);
      expect(result.summary.errors).toBeGreaterThan(0);
    });

    it('detects forbidden temp directory inside src/', async () => {
      await fs.mkdir(path.join(tempDir, 'src', 'logic', 'temp'), { recursive: true });

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-dirs');
      expect(violations.some(v => v.file?.includes('src/logic/temp'))).toBe(true);
    });

    it('detects forbidden tmp_ prefix directory inside scripts/', async () => {
      await fs.mkdir(path.join(tempDir, 'scripts', 'tmp_fixtures'), { recursive: true });

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-dirs');
      expect(violations.some(v => v.file?.includes('scripts/tmp_fixtures'))).toBe(true);
    });

    it('detects unexpected temporary databases directly under database/ root', async () => {
      const dbDir = path.join(tempDir, 'database');
      await fs.mkdir(dbDir, { recursive: true });
      await fs.writeFile(path.join(dbDir, 'clean_template.db'), 'sqlite-binary');

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-dirs');
      expect(violations.some(v => v.file === 'database/clean_template.db')).toBe(true);
    });

    it('passes cleanly when database contains only canonical folders and allowed files', async () => {
      const dbDir = path.join(tempDir, 'database');
      await fs.mkdir(path.join(dbDir, 'migrations'), { recursive: true });
      await fs.mkdir(path.join(dbDir, 'backups'), { recursive: true });
      await fs.mkdir(path.join(dbDir, 'schemas'), { recursive: true });
      await fs.writeFile(path.join(dbDir, 'AGENTS.md'), '# DB Manual');
      await fs.writeFile(path.join(dbDir, 'poke_local.db'), 'seed-db');

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-dirs');
      expect(violations.length).toBe(0);
      expect(result.summary.errors).toBe(0);
    });
  });

  describe('ephemeral-no-gitignore-source-temp', () => {
    it('detects database/temp/ in .gitignore', async () => {
      await fs.writeFile(
        path.join(tempDir, '.gitignore'),
        `
node_modules/
scratch/
database/temp/
        `.trim()
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-gitignore-source-temp');
      expect(violations.some(v => v.file === '.gitignore')).toBe(true);
      expect(violations[0]?.message).toContain('database/temp');
    });

    it('detects src/temp in .gitignore', async () => {
      await fs.writeFile(
        path.join(tempDir, '.gitignore'),
        `
node_modules/
scratch/
src/temp/
        `.trim()
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-gitignore-source-temp');
      expect(violations.some(v => v.file === '.gitignore')).toBe(true);
    });

    it('permits clean .gitignore ignoring scratch/ and node_modules/', async () => {
      await fs.writeFile(
        path.join(tempDir, '.gitignore'),
        `
node_modules/
scratch/
dist/
.env
        `.trim()
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-gitignore-source-temp');
      expect(violations.length).toBe(0);
    });
  });

  describe('ephemeral-no-source-temp-references', () => {
    it('detects code referencing database/temp', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'brokenService.ts'),
        `const dbPath = 'database/temp/simulation.db';`
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-references');
      expect(violations.some(v => v.file === 'src/brokenService.ts')).toBe(true);
    });

    it('detects code referencing unisolated database/clean_template.db', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'brokenTemplate.ts'),
        `const template = 'database/clean_template.db';`
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-references');
      expect(violations.some(v => v.file === 'src/brokenTemplate.ts')).toBe(true);
    });

    it('permits isolated paths targeting scratch/database/clean_template.db', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'cleanService.ts'),
        `const template = 'scratch/database/clean_template.db';`
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-references');
      expect(violations.length).toBe(0);
      expect(result.summary.errors).toBe(0);
    });

    it('permits code with // scratch-ok escape hatch', async () => {
      const srcDir = path.join(tempDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      await fs.writeFile(
        path.join(srcDir, 'legacyDoc.ts'),
        `const path = 'database/temp/old.db'; // scratch-ok`
      );

      const auditor = new EphemeralStorageIsolationAuditor(tempDir);
      const result = await auditor.execute();

      const violations = result.findings.filter(f => f.ruleId === 'ephemeral-no-source-temp-references');
      expect(violations.length).toBe(0);
    });
  });
});
