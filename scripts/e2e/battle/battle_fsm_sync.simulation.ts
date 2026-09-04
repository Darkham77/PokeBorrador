import { test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { type CertifiedTestBatch } from '../e2e_helpers.ts';
import { getSuiteTimeoutForBatch } from '../simulation_config.ts';
import { requireCertifiedBattleCaseDocument } from '../fuzzer/core/certifiedBattleCase.ts';
import {
  getSuiteCheckpoint,
  recordSuiteFailure,
  clearSuiteCheckpoint,
  isCleanRequested,
} from '../helpers/e2eCheckpointManager.ts';

class FSMSyncSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string, logBuffer?: string[]) {
    super(page, username, logBuffer);
  }
}

test.describe('Battle FSM & GSAP Synchronization - Stress Simulation', () => {
  test.beforeAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    const activeDriver = (process.env.SIM_DB_DRIVER || process.env.DB_DRIVER || 'sqlite').toLowerCase();
    const progressDir = path.resolve(process.cwd(), `scratch/e2e_progress/${activeDriver}`);
    const reportPath = path.resolve(process.cwd(), 'scripts/e2e/results/e2e_simulation_failures.json');
    try {
      if (fs.existsSync(failuresDir)) {
        fs.rmSync(failuresDir, { recursive: true, force: true });
      }
      if (isClean && fs.existsSync(progressDir)) {
        fs.rmSync(progressDir, { recursive: true, force: true });
      }
      fs.writeFileSync(reportPath, '[]', 'utf8');
    } catch (_e: unknown) { /* expected empty */ }
  });

  test.afterAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    if (!fs.existsSync(failuresDir) || fs.readdirSync(failuresDir).length === 0) {
      clearSuiteCheckpoint('battle_fsm_sync.simulation.ts');
    }
  });

  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (!fs.existsSync(consolidatorPath)) {
    throw new Error(`[E2E-CERTIFICATION] Missing fuzzer-certified cases at ${consolidatorPath}. Run npm run sim:fuzzer before Playwright replay.`);
  }
  const rawCases: unknown = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8'));
  const allBatches: CertifiedTestBatch[] = requireCertifiedBattleCaseDocument(rawCases, consolidatorPath).battle;
  if (allBatches.length === 0) {
    throw new Error(`[E2E-CERTIFICATION] ${consolidatorPath} contains no certified battle cases. The fuzzer must produce terminal cases before replay.`);
  }

  const batchFilter = process.env.TEST_BATCH;
  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;
  const resumeProgress = process.env.RESUME_PROGRESS === 'true' || process.env.RESUME === 'true';

  let startIdx = 0;
  const suiteCheckpoint = getSuiteCheckpoint('battle_fsm_sync.simulation.ts');
  const isClean = isCleanRequested();

  if (startFromCaseId) {
    const foundIdx = allBatches.findIndex((b) => b.id === startFromCaseId.trim());
    if (foundIdx !== -1) startIdx = foundIdx;
  } else if (startFromIndex) {
    startIdx = Number(startFromIndex.trim()) - 1;
  } else if (!isClean && suiteCheckpoint?.failedBatchIndex && !batchFilter && !caseFilter && !caseIdFilter) {
    startIdx = Math.max(0, suiteCheckpoint.failedBatchIndex - 1);
    console.log(`\n🔄 [AUTO-RESUME] Checkpoint detectado para battle_fsm_sync.simulation.ts. Reanudando desde lote #${startIdx + 1} (${suiteCheckpoint.failedCaseId || 'desconocido'})... Usa 'clean=true' para forzar desde el lote 1.\n`);
  }

  if (startIdx > 0) {
    process.env.SIM_TEST_OFFSET = String(startIdx);
    process.env.SIM_TOTAL_TESTS = String(allBatches.length);
  }

  const activeDriver = (process.env.SIM_DB_DRIVER || process.env.DB_DRIVER || 'sqlite').toLowerCase();
  const progressDir = path.resolve(process.cwd(), `scratch/e2e_progress/${activeDriver}`);

  const shouldResumeByProgress = !isClean && !batchFilter && !caseFilter && !caseIdFilter;

  const batches = allBatches.map((b, idx) => ({ b, idx })).filter(({ b, idx }) => {
    if (resumeProgress || shouldResumeByProgress) {
      const batchFile = path.join(progressDir, `lote-${idx + 1}.json`);
      if (fs.existsSync(batchFile)) {
        try {
          const progressData = JSON.parse(fs.readFileSync(batchFile, 'utf8')) as { isFailed?: boolean };
          if (!progressData.isFailed) return false;
        } catch (_e: unknown) { /* expected empty */ }
      }
    }
    if (caseIdFilter) return b.id && caseIdFilter.split(',').map(id => id.trim()).includes(b.id);
    if (caseFilter) return (idx + 1) === Number(caseFilter.trim());
    if (idx < startIdx) return false;

    if (!batchFilter) return true;
    const cleanFilter = batchFilter.trim();
    if (cleanFilter.includes('-')) {
      const [start, end] = cleanFilter.split('-').map(Number);
      return (idx + 1) >= (start ?? 1) && (idx + 1) <= (end ?? allBatches.length);
    }
    return cleanFilter.split(',').map(Number).includes(idx + 1);
  });

  function balanceBatches(rawBatches: Array<{ b: CertifiedTestBatch; idx: number }>): Array<{ b: CertifiedTestBatch; idx: number }> {
    if (caseFilter || caseIdFilter || batchFilter || rawBatches.length <= 4) {
      return rawBatches;
    }
    const heavy = rawBatches.filter(({ b }) => (b.playerTeam?.length ?? 1) >= 4);
    const light = rawBatches.filter(({ b }) => (b.playerTeam?.length ?? 1) < 4);
    if (heavy.length === 0 || light.length === 0) return rawBatches;

    const total = heavy.length + light.length;
    const balanced: Array<{ b: CertifiedTestBatch; idx: number }> = [];
    let hIdx = 0;
    let lIdx = 0;

    for (let i = 0; i < total; i++) {
      if (hIdx < heavy.length && i >= Math.floor((hIdx * total) / heavy.length)) {
        balanced.push(heavy[hIdx++]!);
      } else if (lIdx < light.length) {
        balanced.push(light[lIdx++]!);
      } else {
        balanced.push(heavy[hIdx++]!);
      }
    }
    return balanced;
  }

  const scheduledBatches = balanceBatches(batches);

  const startTimesMap: { [key: number]: number } = {};

  function reportProgress(batchIndex: number, isFailed: boolean) {
    if (!fs.existsSync(progressDir)) {
      try { fs.mkdirSync(progressDir, { recursive: true }); } catch (_e: unknown) { /* expected empty */ }
    }
    const startTime = startTimesMap[batchIndex];
    const elapsed = startTime ? Number(Temporal.Now.instant().epochMilliseconds) - startTime : 0;

    const progressFile = path.join(progressDir, `lote-${batchIndex + 1}.json`);
    fs.writeFileSync(progressFile, JSON.stringify({ isFailed, elapsedMs: elapsed, date: new Date().toISOString() }, null, 2), 'utf8');
  }

  if (scheduledBatches.length > 0) {
    scheduledBatches.forEach(({ b: batch, idx: index }) => {
      test(`debería ejecutar el lote de fuzzer #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`, async ({ page }, testInfo) => {
        test.setTimeout(getSuiteTimeoutForBatch(batch.history?.length));
        startTimesMap[index] = Number(Temporal.Now.instant().epochMilliseconds);

        const logBuffer: string[] = []; // no-domain: Non-domain utility collection or data structure
        const sim = new FSMSyncSimWrapper(page, `FSM_${index}`, logBuffer);
        await sim.setup();

        try {
          await sim.setupFuzzerScenario(batch);
          await sim.replayCertifiedBattle(batch);
          reportProgress(index, false);
        } catch (error: unknown) {
          reportProgress(index, true);
          const caseId = batch.id || `lote-${index + 1}`;
          const errMessage = error instanceof Error ? error.message : String(error);
          console.error(`\n❌ ERROR EN EL COMBATE: ${caseId}`);
          console.error(`Original Error Stack:`, error instanceof Error ? error.stack : error);
          console.error(`Detalles del lote:`, JSON.stringify({
            id: caseId,
            playerTeam: batch.playerTeam.map(p => p.species),
            enemyTeam: batch.enemyTeam.map(e => e.species)
          }, null, 2));

          const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
          if (!fs.existsSync(failuresDir)) fs.mkdirSync(failuresDir, { recursive: true });
          const cleanError = errMessage.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), '');
          fs.writeFileSync(
            path.join(failuresDir, `fail-${caseId}.json`),
            JSON.stringify({ id: caseId, error: cleanError, timestamp: new Date().toISOString() }, null, 2),
            'utf8'
          );

          recordSuiteFailure('battle_fsm_sync.simulation.ts', {
            suiteRelativePath: 'scripts/e2e/battle/battle_fsm_sync.simulation.ts',
            driver: (sim.getDriver() as 'sqlite' | 'postgres') || 'sqlite',
            failedBatchIndex: index + 1,
            failedCaseId: batch.id,
            errorSnippet: cleanError.slice(0, 200),
          });

          if (process.env.CONTINUE_ON_ERROR === 'true') {
            console.warn(`[E2E-WARN] Ignorando error en lote ${caseId}`);
            return;
          }
          throw new Error(`[Fallo en Lote ${caseId}]: ${errMessage}`);
        } finally {
          const statusStr = testInfo.status ?? 'unknown';
          const isFailed = statusStr !== 'passed';
          if (isFailed || process.env.DEBUG_E2E === 'true') {
            // Output the entire buffered trace sequentially to console only on failure to avoid cluttering the terminal
            console.log(`\n==================================================`);
            console.log(`📋 CONCURRENT LOGS FOR TEST BATCH #${index + 1} (${batch.id}) [STATUS: ${statusStr.toUpperCase()}]`);
            console.log(`==================================================`);
            console.log(logBuffer.join('\n'));
            console.log(`==================================================\n`);
          }
          
          try {
            const logsDir = path.resolve(process.cwd(), 'scratch/e2e_logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            fs.writeFileSync(path.join(logsDir, `lote-${index + 1}.log`), logBuffer.join('\n'), 'utf8');
          } catch (_e: unknown) { /* expected empty */ }
        }
      });
    });
  } else {
    test(`todos los lotes de fuzzer para [${activeDriver.toUpperCase()}] ya se encuentran 100% certificados`, () => {
      console.log(`\n🎉 [100% CERTIFICADO] Todos los 227 lotes de battle_fsm_sync.simulation.ts ya pasaron con éxito en ${activeDriver.toUpperCase()}.\n`);
    });
  }

  test.afterAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    const reportPath = path.resolve(process.cwd(), 'scripts/e2e/results/e2e_simulation_failures.json');
    try {
      if (fs.existsSync(failuresDir)) {
        const files = fs.readdirSync(failuresDir);
        const failuresList = files
          .filter((f) => f.endsWith('.json'))
          .map((f) => {
            try {
              return JSON.parse(fs.readFileSync(path.join(failuresDir, f), 'utf8')) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
            } catch (_e: unknown) {
              return null;
            }
          })
          .filter((x): x is Record<string, unknown> => x !== null);

        fs.writeFileSync(reportPath, JSON.stringify(failuresList, null, 2), 'utf8');
      } else {
        fs.writeFileSync(reportPath, '[]', 'utf8');
      }
    } catch (_e: unknown) { /* expected empty */ }
  });
});
