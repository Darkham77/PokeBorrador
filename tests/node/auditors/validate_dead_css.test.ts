/**
 * tests/node/auditors/validate_dead_css.test.ts
 *
 * Unit tests for DeadCssAuditor.
 */

import { describe, it, expect } from 'vitest';
import { DeadCssAuditor } from '../../../scripts/auditors/architecture/validate_dead_css.ts';

describe('DeadCssAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new DeadCssAuditor();
    expect(auditor.id).toBe('validate_dead_css');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('runs audit against project components and collects metrics', async () => {
    const auditor = new DeadCssAuditor();
    await auditor.runAudit();
    expect(auditor.getFilesScanned()).toBeGreaterThan(0);
  });
});
