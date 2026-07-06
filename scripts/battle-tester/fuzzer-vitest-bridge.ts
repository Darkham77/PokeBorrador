// scripts/battle-tester/fuzzer-vitest-bridge.ts
import { describe, it } from 'vitest';
import { styleText } from 'node:util';

export interface FuzzerResult {
  label: string;
  passed: number;
  failed: number;
  untested: number;
  total: number;
  detail?: string; // e.g. "(de 283 testeables)"
}

export interface FuzzerSuiteConfig {
  suiteName: string;
  testName: string;
  timeoutMs: number;
  run(): Promise<FuzzerResult[]>;
}

export function registerFuzzerSuite(config: FuzzerSuiteConfig): void {
  describe(config.suiteName, () => {
    it(config.testName, async () => {
      console.log(styleText('bold', `\n--- 🧪 FUZZER: ${config.suiteName} ---`));

      const results = await config.run();

      let anyFailed = false;
      let anyUntested = false;

      const labelWidth = Math.max(...results.map(r => r.label.length), 8);

      for (const result of results) {
        const failStr = result.failed > 0
          ? styleText('red', `${result.failed} FAIL`)
          : `0 FAIL`;
        const untestedStr = result.untested > 0
          ? styleText('yellow', `${result.untested} UNTESTED`)
          : `0 UNTESTED`;
        const detail = result.detail ? `  ${result.detail}` : '';
        console.log(`  ${result.label.padEnd(labelWidth)} : ${String(result.passed).padStart(4)} PASS / ${failStr} / ${untestedStr}${detail}`);
        if (result.failed > 0) anyFailed = true;
        if (result.untested > 0) anyUntested = true;
      }

      if (!anyFailed && !anyUntested) {
        console.log(styleText('green', '  ✅ PASS'));
      }

      if (anyFailed) {
        throw new Error(`CRITICAL: Se detectaron fallos en el fuzzer "${config.suiteName}".`);
      }
      if (anyUntested) {
        throw new Error(`CRITICAL: Hay entradas UNTESTED en el fuzzer "${config.suiteName}".`);
      }
    }, config.timeoutMs);
  });
}
