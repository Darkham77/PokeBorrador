/**
 * tests/node/auditors/validate_abilities.test.ts
 *
 * Dedicated unit test suite for AbilityAuditor:
 * - Validates ability parity against Showdown Dex
 * - Verifies Spanish translations and non-empty metadata
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  AbilityAuditor,
  ABILITY_RULES,
  type AbilityRuleId
} from '../../../scripts/auditors/domain_data/validate_abilities.ts';

describe('AbilityAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and domain_data family', () => {
      const auditor = new AbilityAuditor();
      expect(auditor.id).toBe('validate_abilities');
      expect(auditor.family).toBe('domain_data');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in ABILITY_RULES', () => {
      const expectedRules: AbilityRuleId[] = [
        'ability-invalid-showdown',
        'ability-missing-translation',
        'ability-empty-field'
      ];

      for (const rule of expectedRules) {
        expect(ABILITY_RULES).toContain(rule);
      }
      expect(ABILITY_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers ability-invalid-showdown rule registration', () => {
      const auditor = new AbilityAuditor();
      const rule: AbilityRuleId = 'ability-invalid-showdown';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers ability-missing-translation rule registration', () => {
      const auditor = new AbilityAuditor();
      const rule: AbilityRuleId = 'ability-missing-translation';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers ability-empty-field rule registration', () => {
      const auditor = new AbilityAuditor();
      const rule: AbilityRuleId = 'ability-empty-field';
      expect(auditor.ruleIds).toContain(rule);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new AbilityAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Unique abilities validated']).toBeGreaterThan(0);
    });

    it('records violations with error severity when invalid abilities exist', () => {
      const auditor = new AbilityAuditor();
      auditor.addViolation({
        ruleId: 'ability-empty-field',
        severity: 'error',
        file: 'src/data/battle/abilities.json',
        line: 1,
        message: 'Missing required ability field',
        context: 'overgrow'
      });
      expect(auditor.getErrorsByRule().get('ability-empty-field')).toBe(1);
    });
  });
});
