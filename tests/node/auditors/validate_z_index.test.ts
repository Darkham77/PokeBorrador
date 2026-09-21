/**
 * tests/node/auditors/validate_z_index.test.ts
 *
 * Unit tests for ZIndexAuditor.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ZIndexAuditor } from '../../../scripts/auditors/architecture/validate_z_index.ts';

describe('ZIndexAuditor', () => {
  let tempDir: string;
  let scssFile: string;

  beforeEach(async () => {
    process.env.AUDIT_SUBPROCESS = 'true';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'zindex-test-'));
    scssFile = path.join(tempDir, '_base.scss');
  });

  afterEach(async () => {
    delete process.env.AUDIT_SUBPROCESS;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('passes when all z-layers match the scss file', async () => {
    const validScss = `
      :root {
        --z-base: 0;
        --z-map-floor: 10;
        --z-low: 50;
        --z-map-spawns: 50;
        --z-hud: 1000;
        --z-navigation: 5000;
        --z-overlay: 10000;
        --z-modal: 11000;
        --z-modal-step: 10;
        --z-tooltip: 15000;
        --z-toast: 20000;
        --z-max: 100000;
        --z-critical: 999999;
      }
    `;
    await fs.writeFile(scssFile, validScss, 'utf-8');

    const auditor = new ZIndexAuditor(scssFile);
    const result = await auditor.execute();

    expect(result.summary.errors).toBe(0);
    expect(result.status).toBe('passed');
  });

  it('detects missing variable in scss file', async () => {
    await fs.writeFile(scssFile, ':root { --z-base: 0; }', 'utf-8');

    const auditor = new ZIndexAuditor(scssFile);
    const result = await auditor.execute();

    expect(result.summary.errors).toBeGreaterThan(0);
    const missing = result.findings.find(e => e.ruleId === 'z-index-missing-var');
    expect(missing).toBeDefined();
  });

  it('detects mismatch in value between TS and scss', async () => {
    await fs.writeFile(scssFile, ':root { --z-base: 999; }', 'utf-8');

    const auditor = new ZIndexAuditor(scssFile);
    const result = await auditor.execute();

    const mismatch = result.findings.find(e => e.ruleId === 'z-index-mismatch');
    expect(mismatch).toBeDefined();
  });
});
