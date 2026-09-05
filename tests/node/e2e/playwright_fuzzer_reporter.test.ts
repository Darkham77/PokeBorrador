import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FullConfig, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import PlaywrightFuzzerReporter from '../../../scripts/e2e/logging/playwright_fuzzer_reporter.ts';

describe('PlaywrightFuzzerReporter Progress Tracking', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.SIM_TEST_OFFSET;
    delete process.env.SIM_TOTAL_TESTS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function createMockSuite(testCount: number): Suite {
    const tests: TestCase[] = Array.from({ length: testCount }, (_, i) => ({
      title: `test #${i + 1}`,
      location: { file: '/project/scripts/e2e/battle/battle_fsm_sync.simulation.ts', line: i + 1, column: 1 }
    } as unknown as TestCase));

    return {
      allTests: () => tests
    } as unknown as Suite;
  }

  function createMockConfig(): FullConfig {
    return {
      workers: 4
    } as unknown as FullConfig;
  }

  function createMockResult(status: 'passed' | 'skipped' | 'failed', workerIndex = 0): TestResult {
    return {
      status,
      duration: 1000,
      workerIndex
    } as unknown as TestResult;
  }

  it('correctly tracks progress from 0 to total in clean run', () => {
    const reporter = new PlaywrightFuzzerReporter();
    const suite = createMockSuite(10);
    const config = createMockConfig();

    reporter.onBegin(config, suite);

    for (let i = 0; i < 10; i++) {
      const test = suite.allTests()[i]!;
      reporter.onTestBegin(test, createMockResult('passed'));
      reporter.onTestEnd(test, createMockResult('passed'));
    }

    expect((reporter as any).completedTests).toBe(10);
    expect((reporter as any).totalTests).toBe(10);
  });

  it('does NOT double count skipped tests when resuming from checkpoint with static test declarations', () => {
    const reporter = new PlaywrightFuzzerReporter();
    const totalBatches = 227;
    const resumeOffset = 88;

    process.env.SIM_TEST_OFFSET = String(resumeOffset);
    process.env.SIM_TOTAL_TESTS = String(totalBatches);

    const suite = createMockSuite(totalBatches);
    const config = createMockConfig();

    reporter.onBegin(config, suite);

    // 88 tests skipped via test.skip() during resumption
    for (let i = 0; i < resumeOffset; i++) {
      const test = suite.allTests()[i]!;
      reporter.onTestEnd(test, createMockResult('skipped'));
    }

    // After the skipped tests, completed count must NOT exceed resumeOffset
    expect((reporter as any).completedTests).toBe(resumeOffset);

    // Remaining 139 tests execute and pass
    for (let i = resumeOffset; i < totalBatches; i++) {
      const test = suite.allTests()[i]!;
      reporter.onTestEnd(test, createMockResult('passed'));
    }

    // At the end, completed count must equal exactly 227 (not 315!)
    expect((reporter as any).completedTests).toBe(totalBatches);
    expect((reporter as any).totalTests).toBe(totalBatches);
  });
});
