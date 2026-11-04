import { defineCommand, runMain } from 'citty';

import { runAbilitiesFuzzer } from '../core/fuzzer_engine.ts';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';

export const command = defineCommand({
  meta: {
    name: 'run-abilities-fuzzer',
    description: 'Fuzzer de habilidades Pokémon de Generación 9'
  },
  async run() {
    await runFuzzerSuite({
      suiteName: 'Fuzzer — Habilidades (Gen 9)',
      run: runAbilitiesFuzzer
    });
  }
});

runMain(command);
