// tests/integration/battle/items_coverage_fuzzer.spec.ts
import { registerFuzzerSuite } from '../../../scripts/battle-tester/fuzzer-runner.ts';
import { runItemsFuzzer } from '../../../scripts/battle-tester/run-tester.ts';

registerFuzzerSuite({
  suiteName: 'Fuzzer — Ítems (All Generations)',
  testName: 'debería cubrir todos los objetos sin fallos de sincronización',
  timeoutMs: 60_000,
  run: runItemsFuzzer,
});
