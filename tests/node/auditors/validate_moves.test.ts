/**
 * tests/node/auditors/validate_moves.test.ts
 *
 * Dedicated unit test suite for MoveAuditor:
 * - Validates learnset moves against Gen 9 Showdown Dex
 * - Verifies Spanish translations and move descriptions
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  MoveAuditor,
  MOVE_RULES,
  type MoveRuleId
} from '../../../scripts/auditors/domain_data/validate_moves.ts';

describe('MoveAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and domain_data family', () => {
      const auditor = new MoveAuditor();
      expect(auditor.id).toBe('validate_moves');
      expect(auditor.family).toBe('domain_data');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in MOVE_RULES', () => {
      const expectedRules: MoveRuleId[] = [
        'move-invalid-showdown',
        'move-missing-translation',
        'move-missing-effect-desc'
      ];

      for (const rule of expectedRules) {
        expect(MOVE_RULES).toContain(rule);
      }
      expect(MOVE_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers move-invalid-showdown rule registration', () => {
      const auditor = new MoveAuditor();
      const rule: MoveRuleId = 'move-invalid-showdown';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers move-missing-translation rule registration', () => {
      const auditor = new MoveAuditor();
      const rule: MoveRuleId = 'move-missing-translation';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers move-missing-effect-desc rule registration', () => {
      const auditor = new MoveAuditor();
      const rule: MoveRuleId = 'move-missing-effect-desc';
      expect(auditor.ruleIds).toContain(rule);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new MoveAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Learnset moves checked']).toBeGreaterThan(0);
    });
  });
});
