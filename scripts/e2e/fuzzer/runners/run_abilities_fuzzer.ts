// fallow-ignore-file security-sink
// scripts/e2e/fuzzer/runners/run_abilities_fuzzer.ts
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runAbilitiesFuzzer } from '../core/fuzzer_engine.ts';

await runFuzzerSuite({
  suiteName: 'Fuzzer — Habilidades (Gen 9)',
  run: runAbilitiesFuzzer,
});
