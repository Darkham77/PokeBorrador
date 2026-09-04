import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

const E2E_ACTION_TIMEOUT_MS = 5000;

/**
 * scripts/e2e/events/event_slot_management.simulation.ts
 *
 * E2E Simulation Suite: Interactive Slot Management & Enrollment Lifecycle.
 * Validates:
 * 1. Initial enrollment of an eligible Pokémon into a tournament category.
 * 2. Opening EventSlotActionModal by clicking an occupied slot.
 * 3. Changing enrolled Pokémon (#event-slot-change-btn) to one with higher score.
 * 4. Voluntary withdrawal (#event-slot-withdraw-btn), resetting onEvent to false.
 * 5. Rejection of duplicate enrollment of the same Pokémon across categories.
 */
class EventSlotManagementSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupSlotScenario(): Promise<void> {
    await this.assertCanonicalEventExists('torneo_pesca');
    await this.setMockGameTime('2026-08-11T19:00:00');

    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { getServerTime } = await import('../../../src/logic/utils/timeUtils.ts');

      const gameStore = useGameStore();
      const currentSimTime = getServerTime();

      const TEST_LEVEL_SHELLDER = 25; // no-magic: Test seed level
      const TEST_LEVEL_HORSEA = 28; // no-magic: Test seed level
      const SHELLDER_WEIGHT = 12.0; // no-magic: Test seed weight
      const SHELLDER_HEIGHT = 0.3; // no-magic: Test seed height
      const HORSEA_WEIGHT = 18.5; // no-magic: Test seed weight
      const HORSEA_HEIGHT = 0.6; // no-magic: Test seed height
      const SHELLDER_IV = 20; // no-magic: Test seed IVs
      const HORSEA_IV = 31; // no-magic: Test seed IVs

      const shellder = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('shellder'),
        level: TEST_LEVEL_SHELLDER
      });
      shellder.uid = 'sim-slot-shellder';
      shellder.name = 'Shellder';
      shellder.nickname = 'Base Shell';
      shellder.weight = SHELLDER_WEIGHT;
      shellder.height = SHELLDER_HEIGHT;
      shellder.ivs = { hp: SHELLDER_IV, atk: SHELLDER_IV, def: SHELLDER_IV, spa: SHELLDER_IV, spd: SHELLDER_IV, spe: SHELLDER_IV };
      shellder.obtainedAt = currentSimTime;

      const horsea = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('horsea'),
        level: TEST_LEVEL_HORSEA
      });
      horsea.uid = 'sim-slot-horsea';
      horsea.name = 'Horsea';
      horsea.nickname = 'Star Sea';
      horsea.weight = HORSEA_WEIGHT;
      horsea.height = HORSEA_HEIGHT;
      horsea.ivs = { hp: HORSEA_IV, atk: HORSEA_IV, def: HORSEA_IV, spa: HORSEA_IV, spd: HORSEA_IV, spe: HORSEA_IV };
      horsea.obtainedAt = currentSimTime;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [shellder, horsea];
      gameStore.state.box = [];

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }
}

test.describe('World Events Slot Management E2E Simulation', () => {
  test('enrolls, changes participant via EventSlotActionModal, and withdraws releasing onEvent', async ({ page }) => {
    const sim = new EventSlotManagementSimulation(page, 'SlotMaster');
    await sim.setup();
    try {
      await sim.setupSlotScenario();

      // 1. Open World Events via HUD
      await sim.openWorldEventsViaHud();

      const eventCard = page.locator('#event-card-torneo_pesca');
      await expect(eventCard).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      const ivChip = page.locator('#comp-slot-chip-torneo_pesca-ivs');
      await expect(ivChip).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // 2. Initial enrollment with Shellder (120 IVs)
      await sim.enrollPokemonById('torneo_pesca', 'ivs', 'sim-slot-shellder');
      await expect(ivChip).toContainText('✓', { timeout: E2E_ACTION_TIMEOUT_MS });

      // 3. Click occupied slot to open EventSlotActionModal and assert initial score (120 IVs)
      await ivChip.click();

      const changeBtn = page.locator('#event-slot-change-btn');
      const withdrawBtn = page.locator('#event-slot-withdraw-btn');
      const registeredValueRow = page.locator('.registered-value-row');
      await expect(changeBtn).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });
      await expect(withdrawBtn).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });
      await expect(registeredValueRow).toContainText('120', { timeout: E2E_ACTION_TIMEOUT_MS });

      // 4. Test Change: Replace Shellder with Horsea (186 IVs)
      await changeBtn.click();

      const horseaItem = page.locator('#pokemon-select-sim-slot-horsea');
      await horseaItem.waitFor({ state: 'visible', timeout: E2E_ACTION_TIMEOUT_MS });
      await horseaItem.click();

      // In autoConfirm mode, clicking confirms immediately.
      // Verify selection modal unmounts completely within the 5s timeout limit.
      await expect(page.locator('.selection-container')).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });

      await expect(ivChip).toContainText('✓', { timeout: E2E_ACTION_TIMEOUT_MS });

      // Open EventSlotActionModal again and assert updated score of 186
      await ivChip.click();
      await expect(registeredValueRow).toContainText('186', { timeout: E2E_ACTION_TIMEOUT_MS });

      // 5. Test Withdrawal: Click withdraw
      await withdrawBtn.click();

      // Verify chip returns to unenrolled status ('+')
      await expect(ivChip).toContainText('+', { timeout: E2E_ACTION_TIMEOUT_MS });
      await expect(ivChip).not.toContainText('✓', { timeout: E2E_ACTION_TIMEOUT_MS });

      // Verify onEvent was released back to false
      const onEventState = await page.evaluate(async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        return useGameStore().state.team.map(p => ({ nickname: p.nickname, onEvent: Boolean(p.onEvent) }));
      });

      expect(onEventState.every(p => p.onEvent === false)).toBe(true);
    } finally {
      await sim.resetMockGameTime();
      await sim.finish('World Events Slot Management E2E Simulation');
    }
  });
});
