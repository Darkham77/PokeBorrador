import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, verifyHpParity, type CertifiedTestBatch } from '../e2e_helpers.ts';
import { loadCertifiedBattleCases } from '../helpers/certifiedCaseLoader.ts';
import { registerCertifiedBatchTests } from '../helpers/batchSimulationHarness.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';

const E2E_SNORLAX_LEVEL = 50;
const E2E_CATERPIE_LEVEL = 5;
const E2E_MEWTWO_LEVEL = 100;
const E2E_SASH_SURVIVAL_HP = 1;

class HeldItemsSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupLeftoversScenario(): Promise<void> {
    await this.setupWildBattle(
      { id: 'caterpie', level: E2E_CATERPIE_LEVEL, moves: ['stringshot'] },
      {
        playerTeam: [
          { id: 'snorlax', level: E2E_SNORLAX_LEVEL, heldItem: 'leftovers', moves: ['substitute', 'defensecurl'] }
        ]
      }
    );
  }

  public async setupLifeOrbScenario(): Promise<void> {
    await this.setupTrainerBattle(
      [{ id: 'blissey', level: E2E_SNORLAX_LEVEL, moves: ['softboiled'] }],
      {
        playerTeam: [
          { id: 'mew', level: E2E_SNORLAX_LEVEL, heldItem: 'lifeorb', moves: ['psychic'] }
        ]
      }
    );
  }

  public async setupFocusSashScenario(): Promise<void> {
    await this.setupWildBattle(
      { id: 'mewtwo', level: E2E_MEWTWO_LEVEL, moves: ['psystrike', 'psychic'] },
      {
        weather: 'clear',
        playerTeam: [
          { id: 'sunkern', level: E2E_CATERPIE_LEVEL, ability: 'chlorophyll', heldItem: 'focussash', moves: ['tackle'] }
        ]
      }
    );
  }
}

test.describe('E2E Held Items Verification', () => {
  test.beforeEach(async () => {
    test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
  });

  test('should apply passive healing from Leftovers at the end of a turn', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerItems');
    await sim.setup();
    await sim.setupLeftoversScenario();
    await waitForWaitInput(page);

    // Turno 1: Substitute
    await sim.selectMove(0);
    await verifyHpParity(page);

    const midHp = (await sim.getPlayerHpInfo()).hp;

    // Turno 2: Growl
    await sim.selectMove(1);

    const finalHp = (await sim.getPlayerHpInfo()).hp;
    expect(finalHp).toBeGreaterThan(midHp);
  });

  test('should apply Life Orb recoil damage after attacking', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerOrb');
    await sim.setup();
    await sim.setupLifeOrbScenario();
    await waitForWaitInput(page);

    // Execute turn
    await sim.selectMove(0);

    const hpInfo = await sim.getPlayerHpInfo();
    expect(hpInfo.hp).toBeLessThan(hpInfo.maxHp);
  });

  test('should activate Focus Sash on a fatal blow and survive with 1 HP', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerSash');
    await sim.setup();
    await sim.setupFocusSashScenario();
    await waitForWaitInput(page);

    // Execute turn
    await sim.selectMove(0);

    expect(await sim.getPlayerHp()).toBe(E2E_SASH_SURVIVAL_HP);
  });

  // Cargar y registrar lotes fuzzer de items usando el harness unificado
  const itemBatches = loadCertifiedBattleCases('items') as CertifiedTestBatch[];

  registerCertifiedBatchTests({
    suiteName: 'battle_held_items.simulation.ts',
    suiteRelativePath: 'scripts/e2e/battle/battle_held_items.simulation.ts',
    batches: itemBatches,
    baseTestCount: 3,
    simWrapperFactory: (page, testId) => new HeldItemsSimWrapper(page, testId),
    formatTestTitle: (batch, index) =>
      `debería ejecutar el lote de fuzzer de items #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`
  });
});
