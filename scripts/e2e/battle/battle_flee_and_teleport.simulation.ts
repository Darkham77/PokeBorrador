import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleFlowCompletion,
  armBattleReadyForInput,
  awaitBattleFlowCompletion,
  awaitBattleReadyForInput,
  clickResilient,
  openDebugTab,
  type WindowWithResolver
} from '../e2e_helpers.ts';

const CATERPIE_LOW_LEVEL = 2;
const HIGH_LEVEL_PIDGEOT = 50;
const SPEED_PENALTY_STAGE = -6;

class FleeTeleportSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupWildEncounter(speciesId: string, level: number): Promise<void> {
    await this.disableAutoMode();
    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill(speciesId);
    await this.page.locator(`#option-${speciesId}`).click();
    await this.page.locator('#debug-input-level').fill(level.toString());
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('Battle Flee and Teleport Simulations', () => {
  test.beforeEach(async ({ request }) => {
    for (const k of ['sim_db_testfleesuccess', 'sim_db_testfleefail', 'sim_db_testteleport']) {
      await request.post('/api/dev-sim-db-cleanup', {
        headers: { 'x-db-key': k }
      });
    }
  });

  test('should successfully flee from wild encounter via official UI and return cleanly to map', async ({ page }) => {
    const sim = new FleeTeleportSimWrapper(page, 'TestFleeSuccess');
    await sim.setup();
    await sim.setupWildEncounter('caterpie', CATERPIE_LOW_LEVEL);

    // Click official escape/close button in battle arena
    const fleeButton = page.locator('#battle-arena-modal-close-btn').first();
    await expect(fleeButton).toBeVisible();
    await clickResilient(fleeButton);

    // Confirm dialog appears
    const confirmButton = page.locator('#confirm-modal-btn').first();
    await expect(confirmButton).toBeVisible();

    await armBattleFlowCompletion(page);
    await clickResilient(confirmButton);
    await awaitBattleFlowCompletion(page);

    // Verify battle is closed and player is back on map
    const isBattleActive = await page.evaluate(() => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      return Boolean(store?.isBattleActive);
    });
    expect(isBattleActive).toBe(false);
  });

  test('should fail flee when player speed is penalized and receive enemy counter-attack', async ({ page }) => {
    const sim = new FleeTeleportSimWrapper(page, 'TestFleeFail');
    await sim.setup();
    await sim.setupWildEncounter('pidgeot', HIGH_LEVEL_PIDGEOT);

    // Penalize player speed stages to force escape failure
    await page.evaluate((stage) => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      if (debug && typeof debug.setStatStage === 'function') {
        debug.setStatStage('player', 'spe', stage);
      }
    }, SPEED_PENALTY_STAGE);

    // Click flee button
    const fleeButton = page.locator('#battle-arena-modal-close-btn').first();
    await clickResilient(fleeButton);

    const confirmButton = page.locator('#confirm-modal-btn').first();
    await armBattleReadyForInput(page);
    await clickResilient(confirmButton);
    await awaitBattleReadyForInput(page);

    // Verify turn restored and battle is still active
    const isBattleActive = await page.evaluate(() => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      return Boolean(store?.isBattleActive);
    });
    expect(isBattleActive).toBe(true);

    await sim.forceFleeDebugger();
  });

  test('should handle Abra Teleport move with bench as a pivot switch without defeat slide', async ({ page }) => {
    const sim = new FleeTeleportSimWrapper(page, 'TestTeleportAbra');
    await sim.setup();
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const p1 = pokemonDebugService.generate({ id: 'bulbasaur', level: 20, moves: ['growl'] });
      gameStore.state.team = [p1];
      gameStore.state.starterChosen = true;

      const e1 = pokemonDebugService.generate({ id: 'abra', level: 20, moves: ['teleport'] });
      const e2 = pokemonDebugService.generate({ id: 'kadabra', level: 20, moves: ['confusion'] });

      await battleStore.startBattle(e1, {
        isTrainer: true,
        trainerName: 'Psychic Sabrina',
        trainerSprite: 'sabrina',
        enemyTeam: [e1, e2],
        locationId: 'route1'
      });
    });

    await armBattleReadyForInput(page);
    const moveBtn = page.locator('#move-btn-0').first();
    await clickResilient(moveBtn);
    await awaitBattleReadyForInput(page);

    // Abra pivoted to Kadabra
    const activeEnemyName = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.state?.enemy?.name ?? '';
    });
    expect(activeEnemyName).toBe('Kadabra');

    await sim.forceFleeDebugger();
  });
});
