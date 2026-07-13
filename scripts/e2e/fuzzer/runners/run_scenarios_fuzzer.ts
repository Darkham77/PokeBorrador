// scripts/e2e/fuzzer/runners/run_scenarios_fuzzer.ts
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runScenariosFuzzer } from '../core/fuzzer_engine.ts';

await runFuzzerSuite({
  suiteName: 'Fuzzer — Escenarios y Mecánicas (Gen 9)',
  run: runScenariosFuzzer,
});
