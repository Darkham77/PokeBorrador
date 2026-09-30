/**
 * tests/node/auditors/validate_fsm_implementation.test.ts
 *
 * Dedicated unit test suite for FsmImplementationAuditor:
 * - Validates FSM implementation against architectural invariants
 * - Verifies state coverage, idempotency guards, and seat rules
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  FsmImplementationAuditor,
  FSM_IMPLEMENTATION_RULES,
  parseMermaid,
  parseFsmConstants,
  type FsmImplementationRuleId
} from '../../../scripts/auditors/fsm/validate_fsm_implementation.ts';

describe('FsmImplementationAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and fsm family', () => {
      const auditor = new FsmImplementationAuditor();
      expect(auditor.id).toBe('validate_fsm_implementation');
      expect(auditor.family).toBe('fsm');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in FSM_IMPLEMENTATION_RULES', () => {
      const expectedRules: FsmImplementationRuleId[] = [
        'fsm-mermaid-missing-in-js',
        'fsm-unused-constant',
        'fsm-orphan-substate',
        'fsm-non-atomic-timer',
        'fsm-unawaited-substate',
        'fsm-missing-idempotency-guard',
        'fsm-missing-seat-rule',
        'fsm-missing-level-up-cycle',
        'fsm-missing-persistence-mode',
        'fsm-nonexistent-state-reference',
        'fsm-invalid-suppression'
      ];

      for (const rule of expectedRules) {
        expect(FSM_IMPLEMENTATION_RULES).toContain(rule);
      }
      expect(FSM_IMPLEMENTATION_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Parser Functions', () => {
    it('parses Mermaid state names', () => {
      const manual = `
\`\`\`mermaid
stateDiagram-v2
  INTRO --> ACTION_SELECT
\`\`\`
      `;
      const { states } = parseMermaid(manual);
      expect(states.has('INTRO')).toBe(true);
      expect(states.has('ACTION_SELECT')).toBe(true);
    });

    it('parses constants and identifies suppressed keys', () => {
      const code = `
export const BATTLE_STATES = {
  INTRO: 'INTRO',
  UNUSED: 'UNUSED' // fsm-unused-ok: legacy reserved slot
} as const;
      `;
      const { allKeys, suppressedKeys } = parseFsmConstants(code);
      expect(allKeys.has('INTRO')).toBe(true);
      expect(allKeys.has('UNUSED')).toBe(true);
      expect(suppressedKeys.has('UNUSED')).toBe(true);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all declared FSM implementation rules in auditor', () => {
      const auditor = new FsmImplementationAuditor();
      const rules = [
        'fsm-mermaid-missing-in-js',
        'fsm-unused-constant',
        'fsm-orphan-substate',
        'fsm-non-atomic-timer',
        'fsm-unawaited-substate',
        'fsm-missing-idempotency-guard',
        'fsm-missing-seat-rule',
        'fsm-missing-level-up-cycle',
        'fsm-missing-persistence-mode',
        'fsm-nonexistent-state-reference',
        'fsm-invalid-suppression'
      ];

      for (const r of rules) {
        expect(auditor.ruleIds).toContain(r);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new FsmImplementationAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Mermaid states']).toBeGreaterThan(0);
    });
  });
});

