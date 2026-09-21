/**
 * tests/node/auditors/validate_pinia_reactivity.test.ts
 *
 * Unit tests for PiniaReactivityAuditor.
 */

import { describe, it, expect } from 'vitest';
import { PiniaReactivityAuditor } from '../../../scripts/auditors/architecture/validate_pinia_reactivity.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('PiniaReactivityAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new PiniaReactivityAuditor();
    expect(auditor.id).toBe('validate_pinia_reactivity');
    expect(auditor.family).toBe('architecture');
  });

  it('detects direct store destructuring without storeToRefs', () => {
    const auditor = new PiniaReactivityAuditor();
    const badCode = `
      import { useGameStore } from '@/stores/game';
      const { party, money } = useGameStore();
    `;

    scan(auditor, 'src/components/MyComponent.vue', badCode);
    expect(auditor.getCountsByRule().get('no-store-destructuring-without-storetorefs')!).toBeGreaterThan(0);
  });

  it('allows storeToRefs pattern', () => {
    const auditor = new PiniaReactivityAuditor();
    const goodCode = `
      import { storeToRefs } from 'pinia';
      import { useGameStore } from '@/stores/game';
      const gameStore = useGameStore();
      const { party, money } = storeToRefs(gameStore);
    `;

    scan(auditor, 'src/components/MyComponent.vue', goodCode);
    expect(auditor.getCountsByRule().get('no-store-destructuring-without-storetorefs') ?? 0).toBe(0);
  });

  it('detects indirect store destructuring without storeToRefs', () => {
    const auditor = new PiniaReactivityAuditor();
    const badCode = `
      import { useGameStore } from '@/stores/game';
      const gameStore = useGameStore();
      const { party, money } = gameStore;
    `;

    scan(auditor, 'src/components/MyComponent.vue', badCode);
    expect(auditor.getCountsByRule().get('no-store-destructuring-without-storetorefs')!).toBeGreaterThan(0);
  });

  it('allows action destructuring with // pinia-ok', () => {
    const auditor = new PiniaReactivityAuditor();
    const goodCode = `
      import { useGameStore } from '@/stores/game';
      const { resetGame } = useGameStore(); // pinia-ok: pure action destructuring without state
    `;

    scan(auditor, 'src/components/MyComponent.vue', goodCode);
    expect(auditor.getCountsByRule().get('no-store-destructuring-without-storetorefs') ?? 0).toBe(0);
  });

  it('detects direct store.$state mutation outside authorized files', () => {
    const auditor = new PiniaReactivityAuditor();
    const badCode = `
      gameStore.$state = { ...gameStore.$state, money: 100 };
    `;

    scan(auditor, 'src/components/Cheater.vue', badCode);
    expect(auditor.getCountsByRule().get('no-direct-state-mutation-outside-actions')!).toBeGreaterThan(0);
  });
});
