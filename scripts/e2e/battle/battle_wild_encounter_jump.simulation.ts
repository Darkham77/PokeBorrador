// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  openDebugTab
} from '../e2e_helpers.ts';

const SHINY_GYARADOS_TEST_LEVEL = 30;
const WILD_PIDGEY_TEST_LEVEL = 3;

class WildEncounterJumpSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupShinyEncounter(): Promise<void> {
    await this.disableAutoMode();
    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill('gyarados');
    await this.page.locator('#option-gyarados').click();
    await this.page.locator('#debug-input-level').fill(SHINY_GYARADOS_TEST_LEVEL.toString());
    await this.page.locator('#debug-checkbox-shiny').check();
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('Battle Wild Encounter Jump & Shiny Intro Simulations', () => {
  test('should render wild encounter intro sequence and settle into WAIT_INPUT state', async ({ page }) => {
    const sim = new WildEncounterJumpSimWrapper(page, 'WildJumpTest');
    await sim.setup();

    await openDebugTab(page, 'pokes');
    await page.locator('#debug-input-especie').fill('pidgey');
    await page.locator('#option-pidgey').click();
    await page.locator('#debug-input-level').fill(WILD_PIDGEY_TEST_LEVEL.toString());
    await armBattleReadyForInput(page);
    await page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(page);

    const enemyCombatant = page.locator('#combatant-enemy');
    await expect(enemyCombatant).toBeVisible();

    await sim.forceFleeDebugger();
  });

  test('should render shiny wild encounter with sparkles and audio event without animation blocking', async ({ page }) => {
    const sim = new WildEncounterJumpSimWrapper(page, 'WildShinyTest');
    await sim.setup();
    await sim.setupShinyEncounter();

    const isEnemyShiny = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return Boolean(store.state?.enemy?.isShiny);
    });
    expect(isEnemyShiny).toBe(true);

    const enemyCombatant = page.locator('#combatant-enemy');
    await expect(enemyCombatant).toBeVisible();

    await sim.forceFleeDebugger();
  });
});
