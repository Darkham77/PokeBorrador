// scripts/e2e/fuzzer/core/fuzzer_batch_worker.ts
Reflect.set(globalThis, '__E2E__', true);
process.env.VITE_E2E = 'true';

import { parentPort, workerData } from 'node:worker_threads';
import { runStandaloneBatch } from './fuzzer_engine.ts';
import { FuzzerRunnerLogger } from '../../logging/fuzzer_runner_logger.ts';

import type { FuzzerWorkerData } from '../generators/fuzzer_team_generator.ts';

async function run() {
  if (!parentPort) return;
  const data = workerData as FuzzerWorkerData;
  const { batch, roundNum, totalRounds } = data;

  const logger = new FuzzerRunnerLogger();
  logger.startIntercepting();

  try {
    const result = await runStandaloneBatch(batch, roundNum, totalRounds || 29);
    logger.close(`WORKER LOTE #${roundNum} / ${totalRounds || 29}`);
    parentPort.postMessage({ status: 'SUCCESS', result });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.close(`WORKER LOTE #${roundNum} / ${totalRounds || 29} (ERROR)`);
    parentPort.postMessage({ status: 'ERROR', error: errMsg });
  }
}

void run();
