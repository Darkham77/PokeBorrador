// scripts/battle-tester/tests/moves_coverage_fuzzer.spec.ts
import { registerFuzzerSuite } from '../fuzzer-vitest-bridge.ts';
import { runMovesFuzzer } from '../fuzzer-engine.ts';

registerFuzzerSuite({
  suiteName: 'Fuzzer — Movimientos (Gen 9)',
  testName: 'debería cubrir todos los movimientos sin fallos de sincronización',
  timeoutMs: 120_000,
  run: runMovesFuzzer,
});
