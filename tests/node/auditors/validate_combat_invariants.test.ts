/**
 * tests/node/auditors/validate_combat_invariants.test.ts
 *
 * Dedicated unit test suite for CombatInvariantsAuditor:
 * - Detects null status assignments in Showdown combat code
 * - Detects binary p1/p2 seat hardcoding
 * - Verifies suppression escape hatches (status-ok, seat-ok)
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  CombatInvariantsAuditor,
  COMBAT_INVARIANTS_RULES,
  type CombatInvariantsRuleId
} from '../../../scripts/auditors/fsm/validate_combat_invariants.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('CombatInvariantsAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and fsm family', () => {
      const auditor = new CombatInvariantsAuditor();
      expect(auditor.id).toBe('validate_combat_invariants');
      expect(auditor.family).toBe('fsm');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in COMBAT_INVARIANTS_RULES', () => {
      const expectedRules: CombatInvariantsRuleId[] = [
        'showdown-healthy-status-null-prohibition',
        'battle-multi-seat-hardcoding'
      ];

      for (const rule of expectedRules) {
        expect(COMBAT_INVARIANTS_RULES).toContain(rule);
      }
      expect(COMBAT_INVARIANTS_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Violation Detection', () => {
    it('detects showdown-healthy-status-null-prohibition violation', () => {
      const auditor = new CombatInvariantsAuditor();
      const code = `const mon = { status: null };`;

      scan(auditor, 'src/logic/battle/testMon.ts', code);
      const errors = auditor.getErrorsByRule().get('showdown-healthy-status-null-prohibition') ?? 0;
      expect(errors).toBeGreaterThan(0);
    });

    it('detects battle-multi-seat-hardcoding violation', () => {
      const auditor = new CombatInvariantsAuditor();
      const code = `const foe = seat === 'p1' ? 'p2' : 'p1';`;

      scan(auditor, 'src/logic/battle/testSeat.ts', code);
      expect(auditor.getCountsByRule().get('battle-multi-seat-hardcoding')!).toBeGreaterThan(0);
    });

    it('honors status-ok and seat-ok escape hatches', () => {
      const auditor = new CombatInvariantsAuditor();
      const code = `
        const mon = { status: null }; // status-ok: legacy bridge test
        const foe = seat === 'p1' ? 'p2' : 'p1'; // seat-ok: binary mock test
      `;

      scan(auditor, 'src/logic/battle/testSuppressed.ts', code);
      expect(auditor.getCountsByRule().get('showdown-healthy-status-null-prohibition') ?? 0).toBe(0);
      expect(auditor.getCountsByRule().get('battle-multi-seat-hardcoding') ?? 0).toBe(0);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new CombatInvariantsAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
    });
  });
});
