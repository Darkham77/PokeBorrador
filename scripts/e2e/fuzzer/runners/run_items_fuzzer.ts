import { defineCommand, runMain } from 'citty';

import { runItemsFuzzer } from '../core/fuzzer_engine.ts';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';

export const command = defineCommand({
  meta: {
    name: 'run-items-fuzzer',
    description: 'Fuzzer de ítems Pokémon de todas las generaciones'
  },
  async run() {
    await runFuzzerSuite({
      suiteName: 'Fuzzer — Ítems (All Generations)',
      run: runItemsFuzzer
    });
  }
});

runMain(command);
