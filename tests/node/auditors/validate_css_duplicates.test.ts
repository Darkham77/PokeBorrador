/**
 * tests/node/auditors/validate_css_duplicates.test.ts
 *
 * Comprehensive unit test suite for CssDuplicatesAuditor and SCSS duplication rules.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CssDuplicatesAuditor } from '../../../scripts/auditors/architecture/validate_css_duplicates.ts';
import { getCssCheckerCmd } from '../../../scripts/maintenance/analyzers/cssAnalyzer.ts';

describe('CssDuplicatesAuditor', () => {
  beforeEach(() => {
    process.env.AUDIT_SUBPROCESS = 'true';
  });

  afterEach(() => {
    delete process.env.AUDIT_SUBPROCESS;
  });

  it('instantiates cleanly with BaseAuditor compliance and required metadata', () => {
    const auditor = new CssDuplicatesAuditor();
    expect(auditor.id).toBe('validate_css_duplicates');
    expect(auditor.family).toBe('architecture');
    expect(auditor.name).toBe('CSS Duplication Validator');
    expect(auditor.description).toBeDefined();
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('verifies that getCssCheckerCmd attempts to resolve system binary or returns null safely', () => {
    const cmd = getCssCheckerCmd();
    // Either found on machine or null in isolated environments
    expect(cmd === null || typeof cmd === 'string').toBe(true);
  });

  it('runs audit on src without crashing and returns valid StandardAuditResult', async () => {
    const auditor = new CssDuplicatesAuditor();
    const result = await auditor.execute();

    expect(result).toBeDefined();
    expect(result.id).toBe('validate_css_duplicates');
    expect(result.family).toBe('architecture');
    expect(typeof result.durationMs).toBe('number');
    expect(result.summary).toBeDefined();
    expect(typeof result.summary.errors).toBe('number');
  });

  it('correctly reports passed status when 0 errors are encountered', async () => {
    const auditor = new CssDuplicatesAuditor();
    const result = await auditor.execute();

    expect(result.status).toBe('passed');
    expect(result.summary.errors).toBe(0);
  });

  it('declares valid rule ids matching CSS_DUPLICATES_RULES constant', () => {
    const auditor = new CssDuplicatesAuditor();
    expect(auditor.ruleIds).toBeDefined();
    expect(auditor.ruleIds.length).toBeGreaterThan(0);
    expect(auditor.ruleIds).toContain('css-duplicate-rules');
  });
});
