/**
 * tests/node/auditors/validate_combat_invariants.test.ts
 *
 * Unit tests for CombatInvariantsAuditor.
 */

import { describe, it, expect } from 'vitest';
import { CombatInvariantsAuditor } from '../../../scripts/auditors/fsm/validate_combat_invariants.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('CombatInvariantsAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new CombatInvariantsAuditor();
    expect(auditor.id).toBe('validate_combat_invariants');
    expect(auditor.family).toBe('fsm');
  });

  it('detects status = null assignments', () => {
    const auditor = new CombatInvariantsAuditor();
    const badCode = `
      function cureStatus(pokemon: any) {
        pokemon.status = null;
      }
    `;

    scan(auditor, 'src/logic/battle/statusManager.ts', badCode);
    expect(auditor.getCountsByRule().get('showdown-healthy-status-null-prohibition')!).toBeGreaterThan(0);
  });

  it('allows status = "" assignments', () => {
    const auditor = new CombatInvariantsAuditor();
    const goodCode = `
      function cureStatus(pokemon: any) {
        pokemon.status = '';
      }
    `;

    scan(auditor, 'src/logic/battle/statusManager.ts', goodCode);
    expect(auditor.getCountsByRule().get('showdown-healthy-status-null-prohibition') ?? 0).toBe(0);
  });

  it('detects binary seat hardcoding', () => {
    const auditor = new CombatInvariantsAuditor();
    const badCode = `
      const opponentSeat = seat === 'p1' ? 'p2' : 'p1';
    `;

    scan(auditor, 'src/logic/battle/battleActions.ts', badCode);
    expect(auditor.getCountsByRule().get('battle-multi-seat-hardcoding')!).toBeGreaterThan(0);
  });
});
