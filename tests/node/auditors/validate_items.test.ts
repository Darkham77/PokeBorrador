/**
 * tests/node/auditors/validate_items.test.ts
 *
 * Dedicated unit test suite for ItemAuditor:
 * - Validates item schema integrity and battle effects parity
 * - Verifies sprite mapping, translations, and category contracts
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  ItemAuditor,
  ITEM_RULES,
  type ItemRuleId
} from '../../../scripts/auditors/domain_data/validate_items.ts';

describe('ItemAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and domain_data family', () => {
      const auditor = new ItemAuditor();
      expect(auditor.id).toBe('validate_items');
      expect(auditor.family).toBe('domain_data');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in ITEM_RULES', () => {
      const expectedRules: ItemRuleId[] = [
        'item-missing-field',
        'item-sprite-not-found',
        'item-unknown-category',
        'item-missing-healing-effect',
        'item-invalid-healing-effect',
        'item-missing-held-type',
        'item-english-desc-leak',
        'item-english-name-leak',
        'item-phantom-healing',
        'item-sprite-collision'
      ];

      for (const rule of expectedRules) {
        expect(ITEM_RULES).toContain(rule);
      }
      expect(ITEM_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all item auditor rules in suite declarations', () => {
      const auditor = new ItemAuditor();
      const rules = [
        'item-missing-field',
        'item-sprite-not-found',
        'item-unknown-category',
        'item-missing-healing-effect',
        'item-invalid-healing-effect',
        'item-missing-held-type',
        'item-english-desc-leak',
        'item-english-name-leak',
        'item-phantom-healing',
        'item-sprite-collision'
      ];

      for (const r of rules) {
        expect(auditor.ruleIds).toContain(r);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new ItemAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['SHOP_ITEMS scanned']).toBeGreaterThan(0);
    });

    it('records violations with error severity when invalid items exist', () => {
      const auditor = new ItemAuditor();
      auditor.addViolation({
        ruleId: 'item-missing-field',
        severity: 'error',
        file: 'src/data/inventory/items.json',
        line: 1,
        message: 'Missing required item field',
        context: 'potion'
      });
      expect(auditor.getErrorsByRule().get('item-missing-field')).toBe(1);
    });
  });
});
