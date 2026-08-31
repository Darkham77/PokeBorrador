// scripts/e2e/fuzzer/runners/run_items_fuzzer.ts
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runItemsFuzzer } from '../core/fuzzer_engine.ts';

await runFuzzerSuite({
  suiteName: 'Fuzzer — Ítems (All Generations)',
  run: runItemsFuzzer,
});
