// scripts/battle-tester/tests/items_coverage_fuzzer.spec.ts
import { registerFuzzerSuite } from '../fuzzer-vitest-bridge.ts';
import { runItemsFuzzer } from '../fuzzer-engine.ts';

registerFuzzerSuite({
  suiteName: 'Fuzzer — Ítems (All Generations)',
  testName: 'debería cubrir todos los objetos sin fallos de sincronización',
  timeoutMs: 60_000,
  run: runItemsFuzzer,
});
