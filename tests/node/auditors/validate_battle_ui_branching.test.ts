/**
 * tests/node/auditors/validate_battle_ui_branching.test.ts
 *
 * Unit tests for BattleUiBranchingAuditor.
 */

import { describe, it, expect } from 'vitest';
import { BattleUiBranchingAuditor } from '../../../scripts/auditors/architecture/validate_battle_ui_branching.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('BattleUiBranchingAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new BattleUiBranchingAuditor();
    expect(auditor.id).toBe('validate_battle_ui_branching');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('detects cannotEscape raw flags in template directives', () => {
    const auditor = new BattleUiBranchingAuditor();
    const badCode = `
      <template>
        <button :disabled="battleStore.state?.cannotEscape">Huir</button>
      </template>
    `;

    scan(auditor, 'src/components/battle/TestControls.vue', badCode);
    expect(auditor.getCountsByRule().get('ui-branching-escape')!).toBeGreaterThan(0);
  });

  it('detects primitive isTrainer or isGym branching in templates', () => {
    const auditor = new BattleUiBranchingAuditor();
    const badCode = `
      <template>
        <button v-if="battleStore.state?.isTrainer">Entrenador</button>
      </template>
    `;

    scan(auditor, 'src/components/battle/TestControls.vue', badCode);
    expect(auditor.getCountsByRule().get('ui-branching-raw-flag')!).toBeGreaterThan(0);
  });

  it('allows declarations consuming declarative uiConfig', () => {
    const auditor = new BattleUiBranchingAuditor();
    const goodCode = `
      <template>
        <button :disabled="!battleStore.uiConfig.allowFlee">Huir</button>
      </template>
    `;

    scan(auditor, 'src/components/battle/TestControls.vue', goodCode);
    expect(auditor.getCountsByRule().get('ui-branching-escape') ?? 0).toBe(0);
    expect(auditor.getCountsByRule().get('ui-branching-raw-flag') ?? 0).toBe(0);
  });

  it('honors <!-- ui-branching-ok: ... --> suppression', () => {
    const auditor = new BattleUiBranchingAuditor();
    const suppressedCode = `
      <template>
        <!-- ui-branching-ok: special visual overlay for trainer intro -->
        <div v-if="battleStore.state?.isTrainer">Intro</div>
      </template>
    `;

    scan(auditor, 'src/components/battle/TestControls.vue', suppressedCode);
    expect(auditor.getCountsByRule().get('ui-branching-raw-flag') ?? 0).toBe(0);
  });
});
