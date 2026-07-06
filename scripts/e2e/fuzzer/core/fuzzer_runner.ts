// scripts/e2e/fuzzer/core/fuzzer_runner.ts
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
  run(): Promise<FuzzerResult[]>;
}

export async function runFuzzerSuite(config: FuzzerSuiteConfig): Promise<void> {
  console.log(styleText('bold', `\n--- 🧪 FUZZER: ${config.suiteName} ---`));

  try {
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
      console.error(styleText('red', `❌ CRITICAL: Se detectaron fallos en el fuzzer "${config.suiteName}".`));
      process.exit(1);
    }
    if (anyUntested) {
      console.error(styleText('yellow', `❌ CRITICAL: Hay entradas UNTESTED en el fuzzer "${config.suiteName}".`));
      process.exit(1);
    }
  } catch (err) {
    console.error(styleText('red', `❌ CRITICAL: Error inesperado ejecutando fuzzer "${config.suiteName}":`), err);
    process.exit(1);
  }
}
