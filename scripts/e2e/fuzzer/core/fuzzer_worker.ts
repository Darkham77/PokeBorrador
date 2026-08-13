// scripts/e2e/fuzzer/core/fuzzer_worker.ts
import { parentPort, workerData } from 'node:worker_threads';
import { runStandaloneBatch } from './fuzzer_engine.ts';
import { FuzzerRunnerLogger } from '../../logging/fuzzer_runner_logger.ts';

import type { FuzzerWorkerData } from '../generators/fuzzer_team_generator.ts';

async function run() {
  if (!parentPort) return;
  const logger = new FuzzerRunnerLogger();
  logger.startIntercepting();

  const data = workerData as FuzzerWorkerData;
  const { batch, roundNum, totalRounds } = data;
  try {
    const result = await runStandaloneBatch(batch, roundNum, totalRounds || 29);
    parentPort.postMessage({ status: 'SUCCESS', result });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    parentPort.postMessage({ status: 'ERROR', error: errMsg });
  } finally {
    logger.close();
  }
}

void run();
