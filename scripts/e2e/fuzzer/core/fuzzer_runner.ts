import { styleText } from 'node:util';
import { FuzzerRunnerLogger } from '../../logging/fuzzer_runner_logger.ts';

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
  const logger = new FuzzerRunnerLogger();
  logger.startIntercepting();

  logger.progress(styleText('bold', `\n--- 🧪 FUZZER: ${config.suiteName} ---`));

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
      console.log(`  ${result.label.padEnd(labelWidth)} : Total: ${String(result.total).padStart(4)} | ${String(result.passed).padStart(4)} PASS / ${failStr} / ${untestedStr}${detail}`);
      if (result.failed > 0) anyFailed = true;
      if (result.untested > 0) anyUntested = true;
    }

    if (!anyFailed && !anyUntested) {
      const { fuzzerMemoryStore } = await import('./fuzzerMemoryStore.ts');
      await fuzzerMemoryStore.flushToDisk();
      logger.progress(styleText('green', '  ✅ PASS (100% Cobertura Probada)'));
    }

    if (anyFailed) {
      logger.error(styleText('red', `❌ CRITICAL: Se detectaron fallos en el fuzzer "${config.suiteName}".`));
      logger.close(`FUZZER SUITE: ${config.suiteName} (FAILED)`);
      process.exit(1);
    }
    if (anyUntested) {
      logger.error(styleText('yellow', `❌ CRITICAL: Hay entradas UNTESTED en el fuzzer "${config.suiteName}".`));
      logger.close(`FUZZER SUITE: ${config.suiteName} (UNTESTED)`);
      process.exit(1);
    }
  } catch (err) {
    logger.error(styleText('red', `❌ CRITICAL: Error inesperado ejecutando fuzzer "${config.suiteName}": ${err instanceof Error ? err.message : String(err)}`));
    logger.close(`FUZZER SUITE: ${config.suiteName} (ERROR)`);
    process.exit(1);
  } finally {
    logger.close(`FUZZER SUITE: ${config.suiteName}`);
  }
}
