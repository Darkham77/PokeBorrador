// scripts/battle-tester/tests/abilities_coverage_fuzzer.spec.ts
import { registerFuzzerSuite } from '../fuzzer-vitest-bridge.ts';
import { runAbilitiesFuzzer } from '../fuzzer-engine.ts';

registerFuzzerSuite({
  suiteName: 'Fuzzer — Habilidades (Gen 9)',
  testName: 'debería cubrir todas las habilidades sin fallos de sincronización',
  timeoutMs: 120_000,
  run: runAbilitiesFuzzer,
});
