// scripts/e2e/fuzzer/core/fuzzer_batch_worker.ts
(globalThis as unknown as Record<string, unknown>).__E2E__ = true;
process.env.VITE_E2E = 'true';

import { parentPort, workerData } from 'node:worker_threads';
import { runStandaloneBatch } from './fuzzer_engine.ts';

async function run() {
  if (!parentPort) return;
  const { batch, roundNum, totalRounds } = workerData;
  try {
    const result = await runStandaloneBatch(batch, roundNum, totalRounds);
    parentPort.postMessage({ status: 'SUCCESS', result });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    parentPort.postMessage({ status: 'ERROR', error: errMsg });
  }
}

void run();
