import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import { FuzzerRunnerLogger } from '../../../scripts/e2e/logging/fuzzer_runner_logger.ts';
import { SimulationRunnerLogger } from '../../../scripts/e2e/logging/simulation_runner_logger.ts';

describe('Runner Logging Framework (OOP Hierarchy)', () => {
  let logger: FuzzerRunnerLogger | SimulationRunnerLogger | null = null;

  afterEach(() => {
    if (logger) {
      logger.close();
      logger = null;
    }
  });

  it('FuzzerRunnerLogger creates fuzzer_debug.log in reports dir and intercepts console debug', () => {
    logger = new FuzzerRunnerLogger({ logName: 'test_fuzzer' });
    logger.startIntercepting();

    logger.progress('🚀 [FUZZER] Test Progress Start');
    console.debug('[DEBUG-UID-LOOKUP] Testing debug line');
    console.log('Noisy raw debug log line');

    logger.close();

    const debugPath = logger.getDebugFilePath();
    expect(fs.existsSync(debugPath)).toBe(true);

    const content = fs.readFileSync(debugPath, 'utf-8');
    expect(content).toContain('[PROGRESS] 🚀 [FUZZER] Test Progress Start');
    expect(content).toContain('[DEBUG] [DEBUG-UID-LOOKUP] Testing debug line');
    expect(content).toContain('[DEBUG] Noisy raw debug log line');

    // Cleanup test file
    fs.unlinkSync(debugPath);
  });

  it('SimulationRunnerLogger creates simulation_debug.log in reports dir', () => {
    logger = new SimulationRunnerLogger({ logName: 'test_simulation' });
    logger.startIntercepting();

    logger.progress('🚀 DISPOSITIVO DE SIMULACIONES');
    console.debug('[E2E-GETPOKE] rawId: p1a');

    logger.close();

    const debugPath = logger.getDebugFilePath();
    expect(fs.existsSync(debugPath)).toBe(true);

    const content = fs.readFileSync(debugPath, 'utf-8');
    expect(content).toContain('[PROGRESS] 🚀 DISPOSITIVO DE SIMULACIONES');
    expect(content).toContain('[DEBUG] [E2E-GETPOKE] rawId: p1a');

    // Cleanup test file
    fs.unlinkSync(debugPath);
  });
});
