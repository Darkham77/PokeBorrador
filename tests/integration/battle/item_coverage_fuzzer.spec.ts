// tests/integration/battle/item_coverage_fuzzer.spec.ts
import { describe, it } from 'vitest';
import { runItemCoverageFuzzer } from '../../../scripts/battle-tester/run-item-tester.ts';

describe('Showdown All Generations Battle Item Coverage Fuzzer', () => {
  it('debería simular combates para todos los objetos y verificar su sincronización sin fallos', async () => {
    await runItemCoverageFuzzer();
  });
});
