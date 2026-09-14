/**
 * scripts/auditors/fsm/validate_combat_invariants.ts
 *
 * COMBAT ENGINE & SHOWDOWN INVARIANTS AUDITOR (Node.js 26+ Native)
 *
 * Enforces combat state machine and simulation engine parity rules (game_engine_and_state.md):
 *   1. Showdown Healthy Status Null Prohibition (`showdown-healthy-status-null-prohibition`):
 *      In `src/logic/battle/`, forbids assigning `.status = null` or `{ status: null }`.
 *      Showdown Pokemon status representations strictly use an empty string `''` to represent
 *      un-afflicted status. Passing `null` causes fatal unhandled exceptions inside `@pkmn/sim`.
 *   2. Battle Multi-Seat Hardcoding Prohibition (`battle-multi-seat-hardcoding`):
 *      In `src/logic/battle/`, forbids binary seat branching (e.g. `seat === 'p1' ? 'p2' : 'p1'`).
 *      All seat resolution must support the 4-seat generic model (`p1`, `p2`, `p3`, `p4`) via helpers.
 *
 * Escape Hatches:
 *   `// status-ok: <reason>`, `// seat-ok: <reason>`
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/fsm/validate_combat_invariants.ts
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, FileScanAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type CombatInvariantsRuleId =
  | 'showdown-healthy-status-null-prohibition'
  | 'battle-multi-seat-hardcoding';

export const COMBAT_INVARIANTS_RULES: readonly CombatInvariantsRuleId[] = [
  'showdown-healthy-status-null-prohibition',
  'battle-multi-seat-hardcoding'
] as const;

const STATUS_NULL_ASSIGNMENT_REGEX = /(?:\.status\s*=\s*null\b|\bstatus:\s*null\b)/g;
const BINARY_SEAT_BRANCH_REGEX = /\b(?:seat|sideID|side|targetSide)\s*===\s*['"]p1['"]\s*\?\s*['"]p2['"]\s*:\s*['"]p1['"]/g;

export class CombatInvariantsAuditor extends FileScanAuditor<CombatInvariantsRuleId> {
  constructor() {
    super({
      id: 'validate_combat_invariants',
      name: 'Combat Engine & Showdown Invariants Auditor',
      description: 'Invariantes rotas de Showdown o bifurcación binaria p1/p2',
      family: 'fsm',
      ruleIds: COMBAT_INVARIANTS_RULES,
      ruleDescriptions: {
        'showdown-healthy-status-null-prohibition': 'Asignación de status: null en vez de string vacío',
        'battle-multi-seat-hardcoding': 'Bifurcación binaria p1/p2 violando 4 asientos'
      },
      roots: ['src/logic/battle'],
      allowedExtensions: new Set(['.ts', '.vue'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    // 1. Audit status null assignments
    this.auditStatusNull(relPath, content);

    // 2. Audit binary seat hardcoding
    this.auditBinarySeats(relPath, content);
  }

  private auditStatusNull(relPath: string, content: string): void {
    let match: RegExpExecArray | null;
    const regex = new RegExp(STATUS_NULL_ASSIGNMENT_REGEX.source, STATUS_NULL_ASSIGNMENT_REGEX.flags);

    while ((match = regex.exec(content)) !== null) {
      const line = this.getLineNumber(content, match.index);
      const lineContent = this.getLineAt(content, line);

      if (this.hasEscapeHatch(lineContent, ['status-ok'])) {
        continue;
      }

      this.addViolation({
        ruleId: 'showdown-healthy-status-null-prohibition',
        severity: 'error',
        file: relPath,
        line,
        message: `Prohibited 'null' status assignment detected. Showdown engine expects an empty string '' for healthy Pokémon; 'null' crashes @pkmn/sim.`,
        context: lineContent.trim()
      });
    }
  }

  private auditBinarySeats(relPath: string, content: string): void {
    this.scanRegexMatches(
      content,
      BINARY_SEAT_BRANCH_REGEX,
      relPath,
      'battle-multi-seat-hardcoding',
      ['seat-ok'],
      `Binary seat hardcoding ('p1' ? 'p2' : 'p1') detected. Mandatory 4-Seat Generic Compatibility requires dynamic seat helpers.`
    );
  }
}

// Standalone execution support
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new CombatInvariantsAuditor());
}
