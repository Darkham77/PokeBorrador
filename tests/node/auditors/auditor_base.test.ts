/**
 * tests/node/auditors/auditor_base.test.ts
 *
 * Dedicated unit test suite for auditorBase.ts core infrastructure:
 * - CANONICAL_IGNORE_DIRS, ALWAYS_IGNORE_DIRS, and CODE_ONLY_IGNORE_DIRS integrity
 * - isPathIgnored behavior with unignoreDirs and wildcard extraIgnorePatterns
 * - collectRepositoryFiles single-file support and directory unignoring
 * - BaseAuditor projectRoot isolation for safe, reproducible testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  ALWAYS_IGNORE_DIRS,
  CODE_ONLY_IGNORE_DIRS,
  CANONICAL_IGNORE_DIRS,
  isPathIgnored,
  collectRepositoryFiles,
  BaseAuditor
} from '../../../scripts/lib/auditorBase.ts';

describe('auditorBase infrastructure', () => {
  describe('SSoT Ignore Sets Integrity', () => {
    it('defines ALWAYS_IGNORE_DIRS with build artifacts, logs, and caches', () => {
      expect(ALWAYS_IGNORE_DIRS.has('node_modules')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('.git')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('.tsbuildinfo')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('.vitest-cache')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('coverage')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('results')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('dist')).toBe(true);
      expect(ALWAYS_IGNORE_DIRS.has('scratch')).toBe(true);
    });

    it('defines CODE_ONLY_IGNORE_DIRS for documentation and static raw assets', () => {
      expect(CODE_ONLY_IGNORE_DIRS.has('docs')).toBe(true);
      expect(CODE_ONLY_IGNORE_DIRS.has('.agents')).toBe(true);
      expect(CODE_ONLY_IGNORE_DIRS.has('public')).toBe(true);
      expect(CODE_ONLY_IGNORE_DIRS.has('_raw-assets')).toBe(true);
    });

    it('unifies all sets into CANONICAL_IGNORE_DIRS', () => {
      for (const dir of ALWAYS_IGNORE_DIRS) {
        expect(CANONICAL_IGNORE_DIRS.has(dir)).toBe(true);
      }
      for (const dir of CODE_ONLY_IGNORE_DIRS) {
        expect(CANONICAL_IGNORE_DIRS.has(dir)).toBe(true);
      }
    });
  });

  describe('isPathIgnored', () => {
    it('ignores default canonical directories in paths', () => {
      expect(isPathIgnored('node_modules/foo/bar.js')).toBe(true);
      expect(isPathIgnored('dist/bundle.js')).toBe(true);
      expect(isPathIgnored('coverage/lcov.info')).toBe(true);
      expect(isPathIgnored('scripts/e2e/results/simulation.log')).toBe(true);
      expect(isPathIgnored('.tsbuildinfo/build.json')).toBe(true);
    });

    it('ignores docs and .agents by default for standard code auditors', () => {
      expect(isPathIgnored('docs/plans/feature.md')).toBe(true);
      expect(isPathIgnored('.agents/skills/fallow/SKILL.md')).toBe(true);
      expect(isPathIgnored('public/favicon.ico')).toBe(true);
    });

    it('allows documentation auditors to unignore specific directories via unignoreDirs', () => {
      const unignores = ['docs', '.agents'];
      expect(isPathIgnored('docs/plans/feature.md', [], unignores)).toBe(false);
      expect(isPathIgnored('.agents/skills/fallow/SKILL.md', [], unignores)).toBe(false);

      // But still strictly ignores node_modules and results
      expect(isPathIgnored('node_modules/foo/docs/index.md', [], unignores)).toBe(true);
      expect(isPathIgnored('scripts/e2e/results/docs.md', [], unignores)).toBe(true);
    });

    it('supports glob wildcard extraIgnorePatterns', () => {
      expect(isPathIgnored('src/components/temp.vue', ['**/temp.vue'])).toBe(true);
      expect(isPathIgnored('database/seeds/dummy.sql', ['database/seeds/**'])).toBe(true);
      expect(isPathIgnored('src/components/Real.vue', ['database/seeds/**'])).toBe(false);
    });
  });

  describe('collectRepositoryFiles & projectRoot isolation', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'auditor-base-test-'));
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
      await fs.mkdir(path.join(tempDir, 'node_modules/some-pkg'), { recursive: true });

      await fs.writeFile(path.join(tempDir, 'src/main.ts'), 'console.log("hello");');
      await fs.writeFile(path.join(tempDir, 'docs/readme.md'), '# Readme');
      await fs.writeFile(path.join(tempDir, 'node_modules/some-pkg/index.js'), 'module.exports = {};');
      await fs.writeFile(path.join(tempDir, 'AGENTS.md'), '# Global Rules');
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('scans single file without throwing ENOTDIR', () => {
      const singleFilePath = path.join(tempDir, 'AGENTS.md');
      const files = collectRepositoryFiles(
        singleFilePath,
        tempDir,
        [],
        new Set(['.md']),
        ['docs']
      );
      expect(files).toHaveLength(1);
      expect(files[0]).toBe(singleFilePath);
    });

    it('skips ignored directories and respects unignoreDirs in file discovery', () => {
      const codeFiles = collectRepositoryFiles(
        tempDir,
        tempDir,
        [],
        new Set(['.ts', '.js', '.md'])
      );
      // node_modules and docs should be ignored by default
      const relPaths = codeFiles.map(f => path.relative(tempDir, f).replace(/\\/g, '/'));
      expect(relPaths).toContain('src/main.ts');
      expect(relPaths).toContain('AGENTS.md');
      expect(relPaths).not.toContain('docs/readme.md');
      expect(relPaths.some(p => p.includes('node_modules'))).toBe(false);

      // With docs unignored
      const docFiles = collectRepositoryFiles(
        tempDir,
        tempDir,
        [],
        new Set(['.md']),
        ['docs']
      );
      const docRelPaths = docFiles.map(f => path.relative(tempDir, f).replace(/\\/g, '/'));
      expect(docRelPaths).toContain('docs/readme.md');
      expect(docRelPaths).toContain('AGENTS.md');
    });

    it('BaseAuditor scopes collection to custom projectRoot', async () => {
      class TestAuditor extends BaseAuditor<'test-rule'> {
        constructor(root: string) {
          super({
            id: 'test_auditor',
            name: 'Test Auditor',
            description: 'Test auditor for projectRoot verification',
            family: 'architecture',
            ruleIds: ['test-rule'],
            roots: ['src'],
            allowedExtensions: new Set(['.ts']),
            projectRoot: root
          });
        }

        public override async runAudit(): Promise<void> {
          const files = this.context.collectFiles(this.roots, this.allowedExtensions);
          this.filesScannedCount = files.length;
          this.context.setMetric('Total Files Scanned', files.length);
        }
      }

      process.env.AUDIT_SUBPROCESS = 'true';
      const auditor = new TestAuditor(tempDir);
      const result = await auditor.execute();
      delete process.env.AUDIT_SUBPROCESS;

      expect(result.metrics?.['Total Files Scanned']).toBe(1);
      expect(auditor.getFilesScanned()).toBe(1);
    });
  });
});
