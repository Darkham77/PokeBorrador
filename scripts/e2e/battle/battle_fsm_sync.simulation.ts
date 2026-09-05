import { test, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { loadCertifiedBattleCases } from '../helpers/certifiedCaseLoader.ts';
import { registerCertifiedBatchTests } from '../helpers/batchSimulationHarness.ts';
import type { CertifiedTestBatch } from '../e2e_helpers.ts';

class FSMSyncSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }
}

test.describe('Battle FSM & GSAP Synchronization - Stress Simulation', () => {
  const battleBatches = loadCertifiedBattleCases('battle') as CertifiedTestBatch[];

  registerCertifiedBatchTests({
    suiteName: 'battle_fsm_sync.simulation.ts',
    suiteRelativePath: 'scripts/e2e/battle/battle_fsm_sync.simulation.ts',
    batches: battleBatches,
    loadBalancing: 'interleaved',
    simWrapperFactory: (page, testId) => new FSMSyncSimWrapper(page, testId),
    formatTestTitle: (batch, index) =>
      `debería ejecutar el lote de fuzzer #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`
  });
});
