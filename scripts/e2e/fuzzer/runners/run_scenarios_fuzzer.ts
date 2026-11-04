import { defineCommand, runMain } from 'citty';

import { runScenariosFuzzer } from '../core/fuzzer_engine.ts';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';

export const command = defineCommand({
  meta: {
    name: 'run-scenarios-fuzzer',
    description: 'Fuzzer de escenarios y mecánicas de combate de Generación 9'
  },
  async run() {
    await runFuzzerSuite({
      suiteName: 'Fuzzer — Escenarios y Mecánicas (Gen 9)',
      run: runScenariosFuzzer
    });
  }
});

runMain(command);
