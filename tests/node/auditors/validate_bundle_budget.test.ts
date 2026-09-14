/**
 * tests/node/auditors/validate_bundle_budget.test.ts
 *
 * Unit tests for BundleBudgetAuditor.
 */

import { describe, it, expect } from 'vitest';
import { BundleBudgetAuditor } from '../../../scripts/auditors/architecture/validate_bundle_budget.ts';

describe('BundleBudgetAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new BundleBudgetAuditor();
    expect(auditor.id).toBe('validate_bundle_budget');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('runs audit against project without crashing and produces valid findings or metrics', async () => {
    const auditor = new BundleBudgetAuditor();
    await auditor.runAudit();
    expect(auditor.getFilesScanned()).toBeGreaterThan(0);
    // Bundle budget should have 0 fatal runtime leak errors in valid codebase
    const errorCount = auditor.getCountsByRule().get('bundle-runtime-leak') ?? 0;
    expect(errorCount).toBe(0);
  });
});
