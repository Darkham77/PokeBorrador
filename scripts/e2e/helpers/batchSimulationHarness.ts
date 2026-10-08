import { setTimeout } from 'node:timers/promises';
import { test, type Page, type Browser, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isTransientNetworkError, isTransientNetworkFailure, type CertifiedTestBatch } from '../e2e_helpers.ts';
import type { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  getSuiteCheckpoint,
  recordSuiteFailure,
  clearSuiteCheckpoint,
  isCleanRequested
} from './e2eCheckpointManager.ts';
import { getSuiteTimeoutForBatch } from '../simulation_config.ts';

export interface BatchHarnessOptions<T extends CertifiedTestBatch> {
  suiteName: string;
  suiteRelativePath?: string;
  batches: T[];
  baseTestCount?: number;
  loadBalancing?: 'interleaved' | 'sequential';
  isHeavyBatch?: (batch: T) => boolean;
  simWrapperFactory: (page: Page, testId: string) => BaseBattleSimulation;
  formatTestTitle?: (batch: T, index: number) => string;
}

/**
 * Resuelve de forma pura el índice de reanudación (0-indexed) de un lote de simulación.
 */
export function resolveBatchResumptionIndex(params: {
  suiteName: string;
  totalBatches: number;
  isClean?: boolean;
  startFromIndex?: string;
  startFromCaseId?: string;
  checkpointBatchIndex?: number;
  batches?: Array<{ id?: string }>;
}): number {
  if (params.startFromCaseId && params.batches) {
    const foundIdx = params.batches.findIndex((b) => b.id === params.startFromCaseId!.trim());
    if (foundIdx !== -1) return foundIdx;
  }

  if (params.startFromIndex) {
    const parsed = Number(params.startFromIndex.trim());
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed - 1;
    }
  }

  if (!params.isClean && params.checkpointBatchIndex && params.checkpointBatchIndex > 0) {
    return Math.max(0, params.checkpointBatchIndex - 1);
  }

  return 0;
}

/**
 * Algoritmo de interleaving matemático uniforme para distribuir lotes pesados
 * (como batallas 6v6) equitativamente entre los workers paralelos.
 */
export function interleaveHeavyBatches<T>(batches: T[], isHeavy: (item: T) => boolean): T[] {
  const heavy: T[] = [];
  const normal: T[] = [];

  for (const b of batches) {
    if (isHeavy(b)) {
      heavy.push(b);
    } else {
      normal.push(b);
    }
  }

  if (heavy.length === 0 || normal.length === 0) {
    return [...batches];
  }

  const result: T[] = [...normal];
  const total = result.length + heavy.length;

  for (let hIdx = 0; hIdx < heavy.length; hIdx++) {
    const insertPos = Math.min(result.length, Math.floor((hIdx * total) / heavy.length));
    result.splice(insertPos, 0, heavy[hIdx]!);
  }

  return result;
}

/**
 * Filtra lotes según variables de entorno opcionales (TEST_CASE, TEST_CASE_ID).
 */
export function filterBatchesByEnv<T extends { id?: string }>(
  batches: T[],
  params: { caseFilter?: string; caseIdFilter?: string }
): Array<{ item: T; originalIndex: number }> {
  const { caseFilter, caseIdFilter } = params;
  const allowedIds = caseIdFilter ? caseIdFilter.split(',').map(s => s.trim()) : null;
  const targetCaseNum = caseFilter ? Number(caseFilter.trim()) : null;

  return batches
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item, originalIndex }) => {
      if (allowedIds && item.id && !allowedIds.includes(item.id)) {
        return false;
      }
      if (targetCaseNum !== null && (originalIndex + 1) !== targetCaseNum) {
        return false;
      }
      return true;
    });
}

/**
 * Registra y orquesta un conjunto masivo de lotes de fuzzer en Playwright.
 * Centraliza lectura de checkpoints, cálculo de offsets para reporter,
 * skipping con test.skip() y volcado de errores en RAM buffer.
 */
export function registerCertifiedBatchTests<T extends CertifiedTestBatch>(options: BatchHarnessOptions<T>): void {
  const {
    suiteName,
    batches: rawBatches,
    baseTestCount = 0,
    loadBalancing = 'sequential',
    isHeavyBatch = (b: T) => (b.playerTeam.length >= 6 && b.enemyTeam.length >= 6) || (b.history.length >= 30),
    simWrapperFactory,
    formatTestTitle = (b: T, idx: number) => `lote de fuzzer #${idx + 1} (${b.id || 'batch'})`
  } = options;

  if (rawBatches.length === 0) {
    throw new Error(`[BATCH-HARNESS] ${suiteName} no contiene lotes certificados para ejecutar.`);
  }

  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;
  const isClean = isCleanRequested() || process.env.SIM_CLEAN === 'true';
  const suiteCheckpoint = getSuiteCheckpoint(suiteName);

  // 1. Limpieza de directorio temporal de progreso si es corrida limpia
  const activeDriver = (process.env.SIM_DB_DRIVER || process.env.DB_DRIVER || 'sqlite').toLowerCase();
  const progressDir = path.resolve(process.cwd(), `scratch/e2e_progress/${activeDriver}`);
  if (isClean && fs.existsSync(progressDir)) {
    try {
      fs.rmSync(progressDir, { recursive: true, force: true });
    } catch { // catch-ok: ignore failure when deleting non-critical directory
      // Ignorar fallo de borrado no crítico
    }
  }

  // 2. Balanceo de carga si corresponde
  const batches = loadBalancing === 'interleaved'
    ? interleaveHeavyBatches(rawBatches, isHeavyBatch)
    : rawBatches;

  // 3. Resolución del índice de reanudación
  let startIdx = 0;
  if (!caseFilter && !caseIdFilter) {
    startIdx = resolveBatchResumptionIndex({
      suiteName,
      totalBatches: batches.length,
      isClean,
      startFromIndex,
      startFromCaseId,
      checkpointBatchIndex: suiteCheckpoint?.failedBatchIndex,
      batches
    });
  }

  if (startIdx > 0) {
    const totalOffset = startIdx + baseTestCount;
    const totalTests = batches.length + baseTestCount;
    process.env.SIM_TEST_OFFSET = String(totalOffset);
    process.env.SIM_TOTAL_TESTS = String(totalTests);
    console.log(`\n🔄 [AUTO-RESUME] Checkpoint detectado para ${suiteName}. Reanudando desde lote #${startIdx + 1} (test ${totalOffset + 1}/${totalTests})... Usa 'clean=true' para forzar desde el lote 1.\n`);
  }

  // 4. Registro estático del 100% de los tests en Playwright con pool de página por worker
  let anyFailed = false;

  interface WorkerSession {
    context: BrowserContext;
    page: Page;
    isInitialized: boolean;
  }

  interface BatchExecutionParams<TB extends CertifiedTestBatch> {
    batch: TB;
    index: number;
    browser: Browser;
    workerIndex: number;
    suiteName: string;
    suiteRelativePath?: string;
    simWrapperFactory: (page: Page, testId: string) => BaseBattleSimulation;
    getOrCreateWorkerSession: (browser: Browser, workerIndex: number) => Promise<WorkerSession>;
    destroyWorkerSession: (workerIndex: number) => Promise<void>;
    onFailure: () => void;
  }

  function checkBatchSkipReason<TB extends CertifiedTestBatch>(
    index: number,
    startIdx: number,
    totalBatches: number,
    batch: TB,
    caseFilter?: string,
    caseIdFilter?: string
  ): { skip: boolean; reason?: string } {
    if (index < startIdx) {
      return { skip: true, reason: `Skipped by checkpoint resumption (batch ${index + 1}/${totalBatches})` };
    }
    if (caseIdFilter) {
      const allowedIds = caseIdFilter.split(',').map(s => s.trim());
      if (batch.id && !allowedIds.includes(batch.id)) {
        return { skip: true, reason: 'Skipped by caseIdFilter' };
      }
    }
    if (caseFilter && (index + 1) !== Number(caseFilter.trim())) {
      return { skip: true, reason: 'Skipped by caseFilter' };
    }
    return { skip: false };
  }

  async function handleBatchExecutionFailure<TB extends CertifiedTestBatch>(
    params: BatchExecutionParams<TB>,
    sim: BaseBattleSimulation,
    session: WorkerSession,
    error: unknown
  ): Promise<never> {
    const errorMsg = error instanceof Error ? error.message : String(error);
    params.onFailure();
    await params.destroyWorkerSession(params.workerIndex);
    const caseId = params.batch.id || `lote-${params.index + 1}`;
    const logBuf = (session.page as { _e2eLogBuffer?: string[] })._e2eLogBuffer || [];
    console.error(`[E2E-FAIL-LOGS-START: ${caseId}]\n` + logBuf.join('\n') + `\n[E2E-FAIL-LOGS-END: ${caseId}]`);

    const cleanError = errorMsg.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');
    recordSuiteFailure(params.suiteName, {
      suiteRelativePath: params.suiteRelativePath || `scripts/e2e/battle/${params.suiteName}`,
      driver: sim.getDriver(),
      failedBatchIndex: params.index + 1,
      failedCaseId: params.batch.id,
      errorSnippet: cleanError.slice(0, 200),
    });

    if (process.env.CONTINUE_ON_ERROR === 'true') {
      console.warn(`[E2E-WARN] Ignorando error en lote ${caseId}`);
      return undefined as never;
    }
    throw new Error(`[Fallo en Lote ${caseId}]: ${errorMsg}`, { cause: error });
  }

  function isInterruptedError(msg: string): boolean {
    return msg.includes('Test ended') || msg.includes('Target page, context or browser has been closed');
  }

  function isBrowserTransientError(msg: string): boolean {
    return msg.includes('Resulting promise was garbage collected') || msg.includes('Execution context was destroyed');
  }

  async function handleBatchRetryEvaluation<TB extends CertifiedTestBatch>(
    error: unknown,
    attempt: number,
    params: BatchExecutionParams<TB>,
    session: WorkerSession
  ): Promise<boolean> {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (isInterruptedError(errorMsg)) {
      await params.destroyWorkerSession(params.workerIndex);
      throw error;
    }

    const pageWithBuf = session.page as { _e2eLogBuffer?: string[] };
    const logBuf = pageWithBuf._e2eLogBuffer || [];
    const isNetworkError = isTransientNetworkFailure(errorMsg, logBuf);
    const networkReason = isTransientNetworkError(errorMsg) ? errorMsg : (logBuf.find(log => isTransientNetworkError(log)) || errorMsg);
    const isTransientBrowserError = isBrowserTransientError(errorMsg);

    const MAX_NETWORK_RETRIES = 3;
    const MAX_BROWSER_RETRIES = 1;

    if (isNetworkError && attempt <= MAX_NETWORK_RETRIES) {
      console.warn(`⚠️ [NETWORK-RETRY] Microcorte de red detectado en lote #${params.index + 1} (${params.batch.id || 'case'}) (intento ${attempt}/${MAX_NETWORK_RETRIES}): ${networkReason.slice(0, 120)}. Purgando logs y reintentando limpio en 1s...`);
      if (pageWithBuf._e2eLogBuffer) pageWithBuf._e2eLogBuffer.length = 0;
      await params.destroyWorkerSession(params.workerIndex);
      await setTimeout(1000);
      return true;
    }

    if (isTransientBrowserError && attempt <= MAX_BROWSER_RETRIES) {
      console.warn(`⚠️ [BATCH-HARNESS] Error transitorio de navegador en lote #${params.index + 1} (${errorMsg.slice(0, 100)}). Reintentando lote limpio (intento ${attempt + 1})...`);
      await params.destroyWorkerSession(params.workerIndex);
      return true;
    }

    if (isNetworkError) {
      console.error(`\n🛑 [INFRASTRUCTURE-ERROR] Microcorte persistente de red tras ${MAX_NETWORK_RETRIES} reintentos en lote #${params.index + 1} (${params.batch.id || 'case'}). Deteniendo ejecución para revisión de red del host.\n`);
    }

    return false;
  }

  async function executeBatchAttemptWithRetries<TB extends CertifiedTestBatch>(
    params: BatchExecutionParams<TB>
  ): Promise<void> {
    let attempt = 0;

    while (true) {
      attempt++;
      const session = await params.getOrCreateWorkerSession(params.browser, params.workerIndex);
      const sim = params.simWrapperFactory(session.page, `Worker_${params.workerIndex}`);
      (session.page as { _e2eLogBuffer?: string[] })._e2eLogBuffer = sim.getLogBuffer();

      try {
        if (!session.isInitialized) {
          await sim.setup();
          session.isInitialized = true;
        } else {
          await sim.resetToCleanState();
        }

        await sim.setupFuzzerScenario(params.batch);
        await sim.replayCertifiedBattle(params.batch);
        break;
      } catch (error: unknown) {
        const shouldRetry = await handleBatchRetryEvaluation(error, attempt, params, session);
        if (shouldRetry) continue;

        await handleBatchExecutionFailure(params, sim, session, error);
        return;
      }
    }
  }

  const workerSessions = new Map<number, WorkerSession>();

  async function getOrCreateWorkerSession(
    browser: Browser,
    workerIndex: number
  ): Promise<WorkerSession> {
    let session = workerSessions.get(workerIndex);
    if (!session || session.page.isClosed()) {
      if (session) {
        try {
          await session.context.close();
        } catch { // catch-ok: ignore failure when closing corrupt context
          // Ignorar fallo al cerrar contexto corrupto
        }
      }
      const context = await browser.newContext({
        viewport: { width: 1600, height: 900 }
      });
      const page = await context.newPage();
      session = { context, page, isInitialized: false };
      workerSessions.set(workerIndex, session);
    }
    return session;
  }

  async function destroyWorkerSession(workerIndex: number): Promise<void> {
    const session = workerSessions.get(workerIndex);
    if (session) {
      try {
        await session.context.close();
      } catch { // catch-ok: ignore failure when closing already closed context
        // Ignorar fallo al cerrar contexto ya cerrado
      }
      workerSessions.delete(workerIndex);
    }
  }

  async function cleanupAllWorkerSessions(): Promise<void> {
    for (const [, session] of workerSessions) {
      try {
        await session.context.close();
      } catch { // catch-ok: ignore cleanup error on worker session close
        // Ignorar
      }
    }
    workerSessions.clear();
  }

  test.afterAll(async () => {
    await cleanupAllWorkerSessions();
    if (!anyFailed && !caseFilter && !caseIdFilter) {
      clearSuiteCheckpoint(suiteName);
    }
  });

  batches.forEach((batch, index) => {
    test(formatTestTitle(batch, index), async ({ browser }, testInfo) => {
      test.setTimeout(getSuiteTimeoutForBatch(batch.history?.length));

      const skipCheck = checkBatchSkipReason(index, startIdx, batches.length, batch, caseFilter, caseIdFilter);
      if (skipCheck.skip) {
        test.skip(true, skipCheck.reason);
      }

      await executeBatchAttemptWithRetries({
        batch,
        index,
        browser,
        workerIndex: testInfo.workerIndex,
        suiteName,
        suiteRelativePath: options.suiteRelativePath,
        simWrapperFactory,
        getOrCreateWorkerSession,
        destroyWorkerSession,
        onFailure: () => { anyFailed = true; }
      });
    });
  });
}
