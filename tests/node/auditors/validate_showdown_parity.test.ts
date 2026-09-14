/**
 * tests/node/auditors/validate_showdown_parity.test.ts
 *
 * Unit tests for ShowdownParityAuditor.
 */

import { describe, it, expect } from 'vitest';
import { ShowdownParityAuditor, CANONICAL_SHOWDOWN_PROTOCOL_TOKENS } from '../../../scripts/auditors/fsm/validate_showdown_parity.ts';

describe('ShowdownParityAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new ShowdownParityAuditor();
    expect(auditor.id).toBe('validate_showdown_parity');
    expect(auditor.family).toBe('fsm');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('declares canonical protocol token categories with valid entries', () => {
    expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('move');
    expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('-damage');
    expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('faint');
    expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.LIFECYCLE_FLOW).toContain('turn');
  });

  it('runs audit against showdownBridge source files and collects metrics', async () => {
    const auditor = new ShowdownParityAuditor();
    await auditor.runAudit();
    expect(auditor.getFilesScanned()).toBeGreaterThan(0);
  });
});
