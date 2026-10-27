import { defineCommand, runMain } from 'citty';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import { runAIFuzzer } from '../core/fuzzer_ai_engine.ts';

export const command = defineCommand({
  meta: {
    name: 'run-ai-fuzzer',
    description: 'Fuzzer de combate IA vs IA a nivel 100'
  },
  async run() {
    await runFuzzerSuite({
      suiteName: 'Fuzzer — IA vs. IA (Rival, Nivel 100)',
      run: runAIFuzzer
    });
  }
});

runMain(command);
