/**
 * tests/node/auditors/validate_dox_integrity.test.ts
 *
 * Comprehensive unit test suite for DoxIntegrityAuditor and DOX hierarchy enforcement.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DoxIntegrityAuditor } from '../../../scripts/auditors/documentation/validate_dox_integrity.ts';

describe('DoxIntegrityAuditor', () => {
  let tempDir: string;

  beforeEach(async () => {
    process.env.AUDIT_SUBPROCESS = 'true';
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dox-test-'));
  });

  afterEach(async () => {
    delete process.env.AUDIT_SUBPROCESS;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('instantiates with correct metadata conforming to auditor-framework', () => {
    const auditor = new DoxIntegrityAuditor(tempDir);
    expect(auditor.id).toBe('validate_dox_integrity');
    expect(auditor.family).toBe('documentation');
    expect(auditor.name).toBe('DOX & AGENTS.md Integrity Validator');
  });

  it('detects missing root AGENTS.md file', async () => {
    const auditor = new DoxIntegrityAuditor(tempDir);
    const result = await auditor.execute();

    expect(result.summary.errors).toBeGreaterThan(0);
    const missingRoot = result.findings.find(e => e.ruleId === 'dox-missing-agents-md');
    expect(missingRoot).toBeDefined();
  });

  it('passes cleanly when root AGENTS.md and structure are fully valid', async () => {
    await fs.writeFile(path.join(tempDir, 'AGENTS.md'), '# Root AGENTS.md\nValid documentation.\n', 'utf-8');

    const auditor = new DoxIntegrityAuditor(tempDir);
    const result = await auditor.execute();

    expect(result.summary.errors).toBe(0);
    expect(result.status).toBe('passed');
  });

  it('detects absolute links in AGENTS.md as forbidden violations', async () => {
    const agentsWithAbsolute = '# Root AGENTS.md\n\n[Bad link](file:///C:/Users/Franco/test.ts)\n';
    await fs.writeFile(path.join(tempDir, 'AGENTS.md'), agentsWithAbsolute, 'utf-8');

    const auditor = new DoxIntegrityAuditor(tempDir);
    const result = await auditor.execute();

    expect(result.summary.errors).toBeGreaterThan(0);
    const absoluteLinkViolation = result.findings.find(e => e.ruleId === 'dox-absolute-link');
    expect(absoluteLinkViolation).toBeDefined();
  });

  it('detects broken links to non-existent files in AGENTS.md', async () => {
    const agentsWithBroken = '# Root AGENTS.md\n\n[Broken link](./non_existent_file.ts)\n';
    await fs.writeFile(path.join(tempDir, 'AGENTS.md'), agentsWithBroken, 'utf-8');

    const auditor = new DoxIntegrityAuditor(tempDir);
    const result = await auditor.execute();

    expect(result.summary.errors).toBeGreaterThan(0);
    const brokenLinkViolation = result.findings.find(e => e.ruleId === 'dox-broken-link');
    expect(brokenLinkViolation).toBeDefined();
  });

  it('detects missing AGENTS.md in directories containing source code files', async () => {
    await fs.writeFile(path.join(tempDir, 'AGENTS.md'), '# Root AGENTS.md\n\n- [sub/](./sub/AGENTS.md)\n', 'utf-8');
    const subDir = path.join(tempDir, 'sub');
    await fs.mkdir(subDir, { recursive: true });
    await fs.writeFile(path.join(subDir, 'example.ts'), 'export const x = 1;\n', 'utf-8');

    const auditor = new DoxIntegrityAuditor(tempDir);
    const result = await auditor.execute();

    expect(result.summary.errors).toBeGreaterThan(0);
    const missingChild = result.findings.find(e => e.ruleId === 'dox-missing-agents-md');
    expect(missingChild).toBeDefined();
  });
});
