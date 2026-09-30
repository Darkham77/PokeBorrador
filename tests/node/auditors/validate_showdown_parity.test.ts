/**
 * tests/node/auditors/validate_showdown_parity.test.ts
 *
 * Dedicated unit test suite for ShowdownParityAuditor:
 * - Validates protocol tokens coverage in Showdown bridge modules
 * - Ensures all combat simulation events are mapped or handled
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  ShowdownParityAuditor,
  SHOWDOWN_PARITY_RULES,
  CANONICAL_SHOWDOWN_PROTOCOL_TOKENS,
  type ShowdownParityRuleId
} from '../../../scripts/auditors/fsm/validate_showdown_parity.ts';

describe('ShowdownParityAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and fsm family', () => {
      const auditor = new ShowdownParityAuditor();
      expect(auditor.id).toBe('validate_showdown_parity');
      expect(auditor.family).toBe('fsm');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in SHOWDOWN_PARITY_RULES', () => {
      const expectedRules: ShowdownParityRuleId[] = [
        'missing-protocol-token'
      ];

      for (const rule of expectedRules) {
        expect(SHOWDOWN_PARITY_RULES).toContain(rule);
      }
      expect(SHOWDOWN_PARITY_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Protocol Tokens Declarations', () => {
    it('declares essential core actions and lifecycle tokens', () => {
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('move');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('-damage');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('-heal');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('faint');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.LIFECYCLE_FLOW).toContain('turn');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.LIFECYCLE_FLOW).toContain('switch');
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers missing-protocol-token rule registration', () => {
      const auditor = new ShowdownParityAuditor();
      const rule: ShowdownParityRuleId = 'missing-protocol-token';
      expect(auditor.ruleIds).toContain(rule);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new ShowdownParityAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Tokens Audited']).toBeGreaterThan(0);
    });
  });
});
