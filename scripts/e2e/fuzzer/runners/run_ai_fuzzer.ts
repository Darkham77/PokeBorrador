// fallow-ignore-file security-sink
// scripts/e2e/fuzzer/runners/run_ai_fuzzer.ts
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runAIFuzzer } from '../core/fuzzer_ai_engine.ts';

await runFuzzerSuite({
  suiteName: 'Fuzzer — IA vs. IA (Rival, Nivel 100)',
  run: runAIFuzzer,
});
