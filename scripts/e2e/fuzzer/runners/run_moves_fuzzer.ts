// scripts/e2e/fuzzer/runners/run_moves_fuzzer.ts
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runMovesFuzzer } from '../core/fuzzer_engine.ts';

await runFuzzerSuite({
  suiteName: 'Fuzzer — Movimientos (Gen 9)',
  run: runMovesFuzzer,
});
