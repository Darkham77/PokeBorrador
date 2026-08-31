import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult
} from '@playwright/test/reporter';

export default class PlaywrightFuzzerReporter implements Reporter {
  private totalTests = 0;
  private completedTests = 0;
  private startTime = 0;

  onBegin(config: FullConfig, suite: Suite) {
    this.totalTests = suite.allTests().length;
    this.completedTests = 0;
    this.startTime = Date.now();
    console.log(`\n🚀 [SIMULATION] Iniciando suite con ${this.totalTests} tests usando ${config.workers} workers concurrentes...\n`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    const workerIndex = (result.workerIndex ?? 0) + 1;
    console.log(`▶️ [WORKER-${workerIndex}] Iniciando: ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.completedTests++;
    const workerIndex = (result.workerIndex ?? 0) + 1;
    const durationSec = (result.duration / 1000).toFixed(1);
    const percent = Math.round((this.completedTests / Math.max(1, this.totalTests)) * 100);
    const paddedPercent = `${percent}`.padStart(3, ' ');

    if (result.status === 'passed') {
      console.log(`✅ [WORKER-${workerIndex}] [${paddedPercent}%] (${this.completedTests}/${this.totalTests}) Completado: ${test.title} (${durationSec}s)`);
    } else if (result.status === 'skipped') {
      console.log(`⏭️ [WORKER-${workerIndex}] [${paddedPercent}%] (${this.completedTests}/${this.totalTests}) Omitido: ${test.title}`);
    } else if (result.status === 'interrupted') {
      console.log(`⚠️ [WORKER-${workerIndex}] Interrumpido: ${test.title}`);
    } else {
      console.log(`❌ [WORKER-${workerIndex}] [${paddedPercent}%] (${this.completedTests}/${this.totalTests}) FALLÓ: ${test.title} (${durationSec}s)`);
      if (result.error?.message) {
        console.error(`   Error: ${result.error.message.split('\n')[0]}`);
      }
    }
  }

  onEnd(result: FullResult) {
    const totalSec = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const icon = result.status === 'passed' ? '✨' : '❌';
    console.log(`\n${icon} [SIMULATION] Suite finalizada con estado: ${result.status.toUpperCase()} (${this.completedTests}/${this.totalTests} ejecutados en ${totalSec}s)\n`);
  }
}
