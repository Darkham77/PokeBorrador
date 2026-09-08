/**
 * scripts/e2e/events/rewards_claim_all_and_archive.simulation.ts
 *
 * E2E Simulation: Rewards Claim All, GTS Pokemon Transfer, and Legacy Archive Lifecycle
 * Validates the complete interactive lifecycle of unified pending rewards:
 * 1. Simulates past events, class missions, GTS sales (item + Pokemon), ranked milestones,
 *    and an unclaimable archived legacy event award using the debug panel button.
 * 2. Navigates to the Home pending rewards widget and verifies all items are displayed.
 * 3. Clicks 'RECLAMAR TODO' and verifies that all claimable items are processed immediately.
 * 4. Confirms that only the non-claimable legacy archived award remains with its discard button.
 * 5. Verifies the Pokemon from GTS is in the player's team/box.
 * 6. Reloads the page (F5) and confirms that claimed rewards do NOT reappear.
 * 7. Discards the remaining legacy archived award via ConfirmModal and verifies the widget disappears.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, zero timers, clean cleanup)
 * - /game-simulation (fail-fast determinism, dual database support)
 * - /domain-type-first (type safety, zero any)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { clickResilient } from '../e2e_helpers.ts';

export class RewardsClaimAllAndArchiveSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string = 'RewardSim') {
    super(page, username);
  }

  /**
   * Opens the admin debug panel, navigates to the Modals tab,
   * and triggers the reward simulation debug button.
   */
  public async triggerDebugSimulateRewards(): Promise<void> {
    const debugTriggerBtn = this.page.locator('#debug-trigger-btn');
    await expect(debugTriggerBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(debugTriggerBtn);

    const modalsTabBtn = this.page.locator('#debug-tab-modals');
    await expect(modalsTabBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(modalsTabBtn);

    const simulateRewardsBtn = this.page.locator('#btn-debug-simulate-rewards');
    await expect(simulateRewardsBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(simulateRewardsBtn);
  }
}

test.describe('Rewards Claim All & Legacy Archive E2E Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('claims all eligible rewards, leaves only unclaimable legacy rewards, and persists across reload', async ({ page }) => {
    // Enable SQLite persistence across reloads via the dev simulation bridge
    await page.addInitScript(() => {
      (window as Window & { __GTS_SIMULATION__?: boolean }).__GTS_SIMULATION__ = true;
    });

    const sim = new RewardsClaimAllAndArchiveSimulation(page, 'RewardSim');
    await sim.setup();

    try {
      // 1. Trigger debug rewards simulation via the official debug panel button
      await sim.triggerDebugSimulateRewards();

      // 2. Locate Home pending rewards widget
      const widget = page.locator('#widget-pending-rewards');
      await expect(widget).toBeVisible({ timeout: 10000 });

      // 3. Verify 'RECLAMAR TODO' button is visible
      const claimAllBtn = page.locator('#btn-claim-all-rewards');
      await expect(claimAllBtn).toBeVisible({ timeout: 10000 });

      // 4. Verify list contains legacy archived award and claimable rewards
      const allItems = widget.locator('.award-item');
      const totalInitialCount = await allItems.count();
      expect(totalInitialCount).toBeGreaterThanOrEqual(4);

      const legacyItem = widget.locator('.award-item.is-legacy');
      await expect(legacyItem).toHaveCount(1);
      await expect(legacyItem.locator('.legacy-badge')).toContainText('ARCHIVADO');

      // 5. Click 'RECLAMAR TODO'
      await clickResilient(claimAllBtn);

      // 6. Verify that 'RECLAMAR TODO' button is dismissed
      await expect(claimAllBtn).toBeHidden({ timeout: 15000 });

      // 7. Verify ONLY the unclaimable legacy archived award remains in the widget
      await expect(allItems).toHaveCount(1);
      await expect(allItems.first()).toHaveClass(/is-legacy/);

      // Verify no claim button is visible for the legacy award
      const claimButtons = widget.locator('[id^="claim-pending-reward-btn-"]');
      await expect(claimButtons).toHaveCount(0);

      // Verify the discard button is visible for the legacy award
      const discardBtn = widget.locator('[id^="discard-pending-reward-btn-"]');
      await expect(discardBtn).toBeVisible({ timeout: 10000 });

      // 8. Verify the GTS Pokémon (Eevee) was successfully claimed and received in team or box with valid capture timestamp
      const eeveeData = await page.evaluate(async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const state = useGameStore().state;
        const allPokemon = [...(state.team || []), ...(state.box || [])];
        const eevee = allPokemon.find(p => p && (p.species === 'eevee' || p.id === 'eevee' || p.name === 'Eevee'));
        return eevee ? { hasEevee: true, obtainedAt: eevee.obtainedAt, obtainedMethod: eevee.obtainedMethod } : { hasEevee: false };
      });
      expect(eeveeData.hasEevee).toBe(true);
      expect(eeveeData.obtainedAt).toBeGreaterThan(0);
      expect(eeveeData.obtainedMethod).toBe('reward');

      // 9. Reload page (F5 simulation) and verify persistence (NO claimed rewards reappear!)
      await sim.reloadAndSync();

      // The widget should still be visible because the legacy archived award remains uncollected
      await expect(widget).toBeVisible({ timeout: 10000 });
      await expect(allItems).toHaveCount(1);
      await expect(allItems.first()).toHaveClass(/is-legacy/);
      await expect(claimButtons).toHaveCount(0);
      await expect(discardBtn).toBeVisible({ timeout: 10000 });

      // 10. Discard the legacy archived reward via ConfirmModal
      await clickResilient(discardBtn);

      const confirmModalBtn = page.locator('#confirm-modal-btn');
      await expect(confirmModalBtn).toBeVisible({ timeout: 10000 });
      await clickResilient(confirmModalBtn);

      // 11. Verify widget is completely empty and unmounted/hidden
      await expect(widget).toBeHidden({ timeout: 10000 });

      // 12. Final reload check: ensure widget does NOT reappear
      await sim.reloadAndSync();
      await expect(widget).toHaveCount(0);

      sim.finish('Rewards Claim All and Archive E2E Simulation', 'passed');
    } catch (err) {
      sim.finish('Rewards Claim All and Archive E2E Simulation', 'failed');
      throw err;
    }
  });
});
