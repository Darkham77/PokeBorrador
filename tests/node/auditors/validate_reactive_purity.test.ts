/**
 * tests/node/auditors/validate_reactive_purity.test.ts
 *
 * Unit tests for ReactivePurityAuditor.
 */

import { describe, it, expect } from 'vitest';
import { ReactivePurityAuditor } from '../../../scripts/auditors/architecture/validate_reactive_purity.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('ReactivePurityAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new ReactivePurityAuditor();
    expect(auditor.id).toBe('validate_reactive_purity');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('detects state mutation inside computed getter', () => {
    const auditor = new ReactivePurityAuditor();
    const badCode = `
      import { computed, ref } from 'vue';
      const myRef = ref(0);
      const doubled = computed(() => {
        myRef.value = 42;
        return 42 * 2;
      });
    `;

    scan(auditor, 'src/composables/useImpure.ts', badCode);
    expect(auditor.getCountsByRule().get('computed-state-mutation')!).toBeGreaterThan(0);
  });

  it('detects impure persistence calls inside computed getter', () => {
    const auditor = new ReactivePurityAuditor();
    const badCode = `
      import { computed } from 'vue';
      const total = computed(() => {
        gameStore.scheduleSave();
        return 100;
      });
    `;

    scan(auditor, 'src/stores/impureStore.ts', badCode);
    expect(auditor.getCountsByRule().get('computed-side-effect')!).toBeGreaterThan(0);
  });

  it('allows pure computed getters', () => {
    const auditor = new ReactivePurityAuditor();
    const goodCode = `
      import { computed } from 'vue';
      const count = ref(5);
      const doubled = computed(() => count.value * 2);
    `;

    scan(auditor, 'src/composables/usePure.ts', goodCode);
    expect(auditor.getCountsByRule().get('computed-state-mutation') ?? 0).toBe(0);
    expect(auditor.getCountsByRule().get('computed-side-effect') ?? 0).toBe(0);
  });

  it('honors // purity-ok: suppression comment', () => {
    const auditor = new ReactivePurityAuditor();
    const suppressedCode = `
      import { computed, ref } from 'vue';
      const count = ref(0);
      const memo = computed(() => {
        // purity-ok: local cache initialization
        count.value = 1;
        return count.value;
      });
    `;

    scan(auditor, 'src/composables/useSuppressed.ts', suppressedCode);
    expect(auditor.getCountsByRule().get('computed-state-mutation') ?? 0).toBe(0);
  });
});
