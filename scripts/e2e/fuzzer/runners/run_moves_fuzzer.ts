import { defineCommand, runMain } from 'citty';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runMovesFuzzer } from '../core/fuzzer_engine.ts';

export const command = defineCommand({
  meta: {
    name: 'run-moves-fuzzer',
    description: 'Fuzzer de movimientos Pokémon de Generación 9'
  },
  async run() {
    await runFuzzerSuite({
      suiteName: 'Fuzzer — Movimientos (Gen 9)',
      run: runMovesFuzzer
    });
  }
});

runMain(command);
