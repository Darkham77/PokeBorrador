/**
 * tests/node/auditors/validate_asset_usage.test.ts
 *
 * Dedicated unit test suite for AssetUsageAuditor:
 * - Validates centralized asset resolution (getAssetUrl / resolveAsset)
 * - Prohibits hardcoded asset paths in templates, styles, and data
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  AssetUsageAuditor,
  ASSET_USAGE_RULES,
  type AssetUsageRuleId
} from '../../../scripts/auditors/assets/validate_asset_usage.ts';

describe('AssetUsageAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and assets family', () => {
      const auditor = new AssetUsageAuditor();
      expect(auditor.id).toBe('validate_asset_usage');
      expect(auditor.family).toBe('assets');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in ASSET_USAGE_RULES', () => {
      const expectedRules: AssetUsageRuleId[] = [
        'asset-hardcoded-path-template',
        'asset-literal-bound-src',
        'asset-direct-banner-binding',
        'asset-unmediated-logic-path',
        'asset-hardcoded-data-path',
        'asset-hardcoded-style-path',
        'asset-physical-file-missing'
      ];

      for (const rule of expectedRules) {
        expect(ASSET_USAGE_RULES).toContain(rule);
      }
      expect(ASSET_USAGE_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers all asset usage rules in suite declarations', () => {
      const auditor = new AssetUsageAuditor();
      const rules: AssetUsageRuleId[] = [
        'asset-hardcoded-path-template',
        'asset-literal-bound-src',
        'asset-direct-banner-binding',
        'asset-unmediated-logic-path',
        'asset-hardcoded-data-path',
        'asset-hardcoded-style-path',
        'asset-physical-file-missing'
      ];

      for (const r of rules) {
        expect(auditor.ruleIds).toContain(r);
      }
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new AssetUsageAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Vue files scanned']).toBeGreaterThan(0);
    });
  });
});
