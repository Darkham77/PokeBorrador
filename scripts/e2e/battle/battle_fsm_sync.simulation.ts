// fallow-ignore-file security-sink
import { test, type Page } from '@playwright/test';
import { generateTestBatches } from '../fuzzer/generators/fuzzer_team_generator.ts';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, type CertifiedTestBatch } from '../e2e_helpers.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';

class FSMSyncSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string, logBuffer?: string[]) {
    super(page, username, logBuffer);
  }
}

test.describe('Battle FSM & GSAP Synchronization - Stress Simulation', () => {
  test.beforeAll(async () => {
    const failuresDir = path.resolve(process.cwd(), 'scratch/e2e_failures');
    const reportPath = path.resolve(process.cwd(), 'scripts/e2e/results/e2e_simulation_failures.json');
    try {
      if (fs.existsSync(failuresDir)) {
        fs.rmSync(failuresDir, { recursive: true, force: true });
      }
      fs.writeFileSync(reportPath, '[]', 'utf8');
    } catch (_e: unknown) { /* expected empty */ }
  });

  let allBatches: CertifiedTestBatch[] = [];
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (fs.existsSync(consolidatorPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8')) as { battle?: CertifiedTestBatch[] };
      if (content.battle) {
        allBatches = content.battle;
      }
    } catch (_e: unknown) { /* expected empty */ }
  }
  if (allBatches.length === 0) {
    allBatches = generateTestBatches(6) as CertifiedTestBatch[];
  }

  const batchFilter = process.env.TEST_BATCH;
  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;
  const resumeProgress = process.env.RESUME_PROGRESS === 'true' || process.env.RESUME === 'true';

  let startIdx = 0;
  if (startFromCaseId) {
    const foundIdx = allBatches.findIndex((b) => b.id === startFromCaseId.trim());
    if (foundIdx !== -1) startIdx = foundIdx;
  } else if (startFromIndex) {
    startIdx = Number(startFromIndex.trim()) - 1;
  }

  const progressDir = path.resolve(process.cwd(), 'scratch/e2e_progress');

  const batches = allBatches.map((b, idx) => ({ b, idx })).filter(({ b, idx }) => {
    if (resumeProgress) {
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

  if (batches.length > 0) {
    batches.forEach(({ b: batch, idx: index }) => {
      test(`debería ejecutar el lote de fuzzer #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`, async ({ page }) => {
        test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
        startTimesMap[index] = Number(Temporal.Now.instant().epochMilliseconds);

        const logBuffer: string[] = [];
        const sim = new FSMSyncSimWrapper(page, `TestBatchFSM_${index}`, logBuffer);
        await sim.setup();
        await waitForWaitInput(page);

        try {
          await sim.setupFuzzerScenario(batch);
          await sim.playBattle(index, 0, batch.playerChoices, batch.cheats, batch.finalState);
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

          if (process.env.CONTINUE_ON_ERROR === 'true') {
            console.warn(`[E2E-WARN] Ignorando error en lote ${caseId}`);
            return;
          }
          throw new Error(`[Fallo en Lote ${caseId}]: ${errMessage}`);
        } finally {
          // Output the entire buffered trace sequentially
          console.log(`\n==================================================`);
          console.log(`📋 CONCURRENT LOGS FOR TEST BATCH #${index + 1} (${batch.id})`);
          console.log(`==================================================`);
          console.log(logBuffer.join('\n'));
          console.log(`==================================================\n`);
          
          try {
            const logsDir = path.resolve(process.cwd(), 'scratch/e2e_logs');
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
            fs.writeFileSync(path.join(logsDir, `lote-${index + 1}.log`), logBuffer.join('\n'), 'utf8');
          } catch (_e: unknown) { /* expected empty */ }
        }
      });
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
              return JSON.parse(fs.readFileSync(path.join(failuresDir, f), 'utf8')) as Record<string, unknown>;
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
