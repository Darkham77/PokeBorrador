/**
 * tests/node/auditors/validate_spawns_whitelist.test.ts
 *
 * Dedicated unit test suite for SpawnsWhitelistAuditor:
 * - Validates species whitelist compliance on world maps and gyms
 * - Checks level ranges and encounter rates parity
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  SpawnsWhitelistAuditor,
  SPAWN_WHITELIST_RULES,
  type SpawnWhitelistRuleId
} from '../../../scripts/auditors/domain_data/validate_spawns_whitelist.ts';

describe('SpawnsWhitelistAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and domain_data family', () => {
      const auditor = new SpawnsWhitelistAuditor();
      expect(auditor.id).toBe('validate_spawns_whitelist');
      expect(auditor.family).toBe('domain_data');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in SPAWN_WHITELIST_RULES', () => {
      const expectedRules: SpawnWhitelistRuleId[] = [
        'spawns-species-whitelist',
        'spawns-level-range-integrity',
        'spawns-encounter-rates-parity'
      ];

      for (const rule of expectedRules) {
        expect(SPAWN_WHITELIST_RULES).toContain(rule);
      }
      expect(SPAWN_WHITELIST_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Invariant Assertions', () => {
    it('covers spawns-species-whitelist rule registration', () => {
      const auditor = new SpawnsWhitelistAuditor();
      const rule: SpawnWhitelistRuleId = 'spawns-species-whitelist';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers spawns-level-range-integrity rule registration', () => {
      const auditor = new SpawnsWhitelistAuditor();
      const rule: SpawnWhitelistRuleId = 'spawns-level-range-integrity';
      expect(auditor.ruleIds).toContain(rule);
    });

    it('covers spawns-encounter-rates-parity rule registration', () => {
      const auditor = new SpawnsWhitelistAuditor();
      const rule: SpawnWhitelistRuleId = 'spawns-encounter-rates-parity';
      expect(auditor.ruleIds).toContain(rule);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new SpawnsWhitelistAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
      expect(result.metrics['Maps Scanned']).toBeGreaterThan(0);
    });
  });
});
