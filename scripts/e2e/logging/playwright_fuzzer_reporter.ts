import fs from 'node:fs';
import path from 'node:path';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult
} from '@playwright/test/reporter';
import {
  recordSuiteFailure,
  clearSuiteCheckpoint,
  type SimDriver
} from '../helpers/e2eCheckpointManager.ts';
import { formatExecutionTimestamp } from './base_runner_logger.ts';

function logSync(msg: string): void {
  try {
    fs.writeSync(1, Buffer.from(msg + '\n', 'utf-8'));
  } catch {
    console.log(msg);
  }
}

function errSync(msg: string): void {
  try {
    fs.writeSync(2, Buffer.from(msg + '\n', 'utf-8'));
  } catch {
    console.error(msg);
  }
}

export default class PlaywrightFuzzerReporter implements Reporter {
  private totalTests = 0;
  private completedTests = 0;
  private startTime = 0;
  private activeSuiteName: string | null = null;

  onBegin(config: FullConfig, suite: Suite) {
    const offset = process.env.SIM_TEST_OFFSET ? parseInt(process.env.SIM_TEST_OFFSET, 10) : 0;
    const totalOverride = process.env.SIM_TOTAL_TESTS ? parseInt(process.env.SIM_TOTAL_TESTS, 10) : 0;
    const pendingTests = suite.allTests().length;
    this.totalTests = totalOverride > 0 ? totalOverride : (pendingTests + offset);
    // When all tests (including skipped ones) are registered statically in Playwright (pendingTests >= totalTests),
    // Playwright dispatches onTestEnd for every skipped test. Initializing completedTests to offset causes double-counting.
    this.completedTests = (pendingTests >= this.totalTests && offset > 0) ? 0 : offset;
    this.startTime = Date.now();
    const firstTest = suite.allTests()[0];
    if (firstTest?.location?.file) {
      this.activeSuiteName = path.basename(firstTest.location.file);
    }
    const startFormatted = formatExecutionTimestamp();
    logSync('─'.repeat(80));
    if (offset > 0) {
      const remainingCount = Math.max(0, this.totalTests - offset);
      logSync(`🚀 [SIMULATION] Reanudando suite en test ${offset + 1}/${this.totalTests} (${remainingCount} restantes) usando ${config.workers} workers concurrentes...`);
      logSync(`📅 [SIMULATION] Fecha y hora de inicio: ${startFormatted}\n`);
    } else {
      logSync(`🚀 [SIMULATION] Iniciando suite con ${this.totalTests} tests usando ${config.workers} workers concurrentes...`);
      logSync(`📅 [SIMULATION] Fecha y hora de inicio: ${startFormatted}\n`);
    }
  }

  onTestBegin(test: TestCase, result: TestResult) {
    const workerIndex = (result.workerIndex ?? 0) + 1;
    logSync(`▶️ [WORKER-${workerIndex}] Iniciando: ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.completedTests++;
    const workerIndex = (result.workerIndex ?? 0) + 1;
    const durationSec = (result.duration / 1000).toFixed(1);
    const percent = Math.round((this.completedTests / Math.max(1, this.totalTests)) * 100);
    const paddedPercent = `${percent}`.padStart(3, ' ');

    if (result.status === 'passed') {
      logSync(`✅ [WORKER-${workerIndex}] [${paddedPercent}%] (${this.completedTests}/${this.totalTests}) Completado: ${test.title} (${durationSec}s)`);
    } else if (result.status === 'skipped') {
      logSync(`⏭️ [WORKER-${workerIndex}] [${paddedPercent}%] (${this.completedTests}/${this.totalTests}) Omitido: ${test.title}`);
    } else if (result.status === 'interrupted') {
      logSync(`⚠️ [WORKER-${workerIndex}] Interrumpido: ${test.title}`);
    } else {
      logSync(`❌ [WORKER-${workerIndex}] [${paddedPercent}%] (${this.completedTests}/${this.totalTests}) FALLÓ: ${test.title} (${durationSec}s)`);
      if (result.error?.message) {
        const errorLines = result.error.message.split('\n').slice(0, 10).join('\n   ');
        errSync(`   Error: ${errorLines}`);
      }

      try {
        if (test.location?.file) {
          let suiteRelativePath = path.relative(process.cwd(), test.location.file);
          let suiteName = path.basename(test.location.file);

          if (suiteName.toLowerCase() === 'batchsimulationharness.ts' && test.parent) {
            let p: typeof test.parent | undefined = test.parent;
            while (p) {
              if (p.location?.file && path.basename(p.location.file).toLowerCase() !== 'batchsimulationharness.ts') {
                suiteRelativePath = path.relative(process.cwd(), p.location.file);
                suiteName = path.basename(p.location.file);
                break;
              }
              p = p.parent;
            }
          }

          const driver = (process.env.SIM_DB_DRIVER === 'postgres' ? 'postgres' : 'sqlite') as SimDriver;
          const batchMatch = test.title.match(/lote de fuzzer #(\d+)/i);
          const failedBatchIndex = batchMatch ? Number(batchMatch[1]) : undefined;

          recordSuiteFailure(suiteName, {
            suiteRelativePath,
            driver,
            failedTestTitle: test.title,
            failedBatchIndex,
            errorSnippet: result.error?.message?.slice(0, 300),
          });
        }
      } catch {
        // Non-fatal
      }
    }
  }

  onStdOut(chunk: string | Buffer) {
    const text = chunk.toString();
    if (text.includes('▶️') || text.includes('⚔️') || text.includes('✅') || text.includes('❌') || text.includes('⚠️')) {
      logSync(text.trimEnd());
    }
  }

  onStdErr(chunk: string | Buffer) {
    const text = chunk.toString();
    if (text.includes('❌') || text.includes('ERROR') || text.includes('Error:')) {
      errSync(text.trimEnd());
    }
  }

  onEnd(result: FullResult) {
    const totalSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const icon = result.status === 'passed' ? '✨' : '❌';
    logSync(`\n${icon} [SIMULATION] Suite finalizada con estado: ${result.status.toUpperCase()} (${this.completedTests}/${this.totalTests} ejecutados en ${totalSec}s)\n`);

    if (result.status === 'passed' && this.activeSuiteName) {
      try {
        clearSuiteCheckpoint(this.activeSuiteName);
      } catch {
        // Non-fatal
      }
    }
  }
}
