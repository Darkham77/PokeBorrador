/**
 * tests/node/auditors/validate_reactive_leaks.test.ts
 *
 * Unit tests for ReactiveLeaksAuditor.
 */

import { describe, it, expect } from 'vitest';
import { ReactiveLeaksAuditor } from '../../../scripts/auditors/architecture/validate_reactive_leaks.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('ReactiveLeaksAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new ReactiveLeaksAuditor();
    expect(auditor.id).toBe('validate_reactive_leaks');
    expect(auditor.family).toBe('architecture');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
  });

  it('detects uncleaned addEventListener in component without unmount hook', () => {
    const auditor = new ReactiveLeaksAuditor();
    const badCode = `
      <script setup lang="ts">
      window.addEventListener('resize', () => {});
      </script>
    `;

    scan(auditor, 'src/components/LeakTest.vue', badCode);
    expect(auditor.getCountsByRule().get('dom-event-leak')!).toBeGreaterThan(0);
  });

  it('allows addEventListener when onUnmounted or removeEventListener is present', () => {
    const auditor = new ReactiveLeaksAuditor();
    const goodCode = `
      <script setup lang="ts">
      import { onUnmounted } from 'vue';
      const handler = () => {};
      window.addEventListener('resize', handler);
      onUnmounted(() => {
        window.removeEventListener('resize', handler);
      });
      </script>
    `;

    scan(auditor, 'src/components/CleanTest.vue', goodCode);
    expect(auditor.getCountsByRule().get('dom-event-leak') ?? 0).toBe(0);
  });

  it('allows addEventListener with { once: true }', () => {
    const auditor = new ReactiveLeaksAuditor();
    const onceCode = `
      <script setup lang="ts">
      window.addEventListener('load', () => {}, { once: true });
      </script>
    `;

    scan(auditor, 'src/components/OnceTest.vue', onceCode);
    expect(auditor.getCountsByRule().get('dom-event-leak') ?? 0).toBe(0);
  });

  it('detects uncleaned gameBus.on listeners', () => {
    const auditor = new ReactiveLeaksAuditor();
    const badCode = `
      <script setup lang="ts">
      gameBus.on('SOME_EVENT', () => {});
      </script>
    `;

    scan(auditor, 'src/components/BusLeak.vue', badCode);
    expect(auditor.getCountsByRule().get('gamebus-leak')!).toBeGreaterThan(0);
  });
});
