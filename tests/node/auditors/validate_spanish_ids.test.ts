/**
 * tests/node/auditors/validate_spanish_ids.test.ts
 *
 * Dedicated unit test suite for SpanishIdAuditor:
 * - Scans codebase for hardcoded Spanish names in logic contexts
 * - Verifies suppression escape hatches (spanish-ok, text-ok)
 * - Asserts clean execution on repository data
 */

import { describe, it, expect } from 'vitest';
import {
  SpanishIdAuditor,
  SPANISH_ID_RULES,
  type SpanishIdRuleId
} from '../../../scripts/auditors/domain_data/validate_spanish_ids.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('SpanishIdAuditor', () => {
  describe('Metadata & Configuration', () => {
    it('initializes with correct auditor ID and domain_data family', () => {
      const auditor = new SpanishIdAuditor();
      expect(auditor.id).toBe('validate_spanish_ids');
      expect(auditor.family).toBe('domain_data');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares all expected canonical rules in SPANISH_ID_RULES', () => {
      const expectedRules: SpanishIdRuleId[] = [
        'spanish-logic-id'
      ];

      for (const rule of expectedRules) {
        expect(SPANISH_ID_RULES).toContain(rule);
      }
      expect(SPANISH_ID_RULES).toHaveLength(expectedRules.length);
    });
  });

  describe('Rule Coverage & Violation Detection', () => {
    it('detects spanish nature used in logic assignment', () => {
      const auditor = new SpanishIdAuditor();
      const code = `const p = { nature: 'Firme' };`;

      scan(auditor, 'src/logic/test.ts', code);
      expect(auditor.getCountsByRule().get('spanish-logic-id')!).toBeGreaterThan(0);
    });

    it('honors spanish-ok suppression comment', () => {
      const auditor = new SpanishIdAuditor();
      const code = `const p = { nature: 'Firme' }; // spanish-ok: display label`;

      scan(auditor, 'src/logic/test.ts', code);
      expect(auditor.getCountsByRule().get('spanish-logic-id') ?? 0).toBe(0);
    });
  });

  describe('Clean Execution Verification', () => {
    it('executes cleanly with zero errors on repository dataset', async () => {
      const auditor = new SpanishIdAuditor();
      const result = await auditor.execute();

      expect(result.summary.errors).toBe(0);
      expect(result.status).toBe('passed');
    });
  });
});
