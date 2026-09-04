/**
 * scripts/e2e/events/event_home_section_and_schedule.simulation.ts
 *
 * E2E Simulation Suite 5: Home View Events Section & Live Schedule Synchronization
 * Validates:
 * 1. Home dashboard events widget (#home-events-section) mounting and rendering.
 * 2. Real-time active event card presence (#event-card-torneo_pesca) on the dashboard.
 * 3. Weekly 7-day schedule accordion toggle (#home-events-schedule-toggle-btn).
 * 4. Manual / reactive event refresh button (#home-events-refresh-btn).
 * 5. Dynamic time advancement past event end and past events history accordion (#home-events-history-toggle-btn).
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 5s action timeouts, zero timers)
 * - /game-simulation (dual DB execution, fail-fast determinism)
 * - /domain-type-first (canonical models, typed seeds)
 * - /ponytail (concise, minimal, single-responsibility)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

const E2E_ACTION_TIMEOUT_MS = 5000;

export class EventHomeSectionSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string = 'HomeObserver') {
    super(page, username);
  }

  public async setupPlayerScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      gameStore.state.money = 1000; // no-magic: Test seed balance
      gameStore.state.battleCoins = 10; // no-magic: Test seed balance
      gameStore.state.starterChosen = true;

      const pikachu = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('pikachu'),
        level: 15 // no-magic: Test seed level
      });
      pikachu.uid = 'sim-home-pikachu';

      gameStore.state.team = [pikachu];
      gameStore.state.box = [];

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }
}

test.describe('World Events Home Dashboard & Schedule E2E Simulation', () => {
  test('renders events section on home dashboard, toggles upcoming schedule and reacts to time changes', async ({ page }) => {
    const sim = new EventHomeSectionSimulation(page, 'HomeObserver');
    await sim.setup();

    try {
      // 1. Fail-fast canonical validation
      await sim.assertCanonicalEventExists('torneo_pesca');

      // 2. Deterministic time anchor: Tuesday Week 2 (August 11, 2026, 19:00 GMT-3)
      await sim.setMockGameTime('2026-08-11T19:00:00');

      // 3. Setup player
      await sim.setupPlayerScenario();

      // 4. Navigate to Home dashboard via HUD
      await sim.navigateToHome();

      // 5. Verify Home view and #home-events-section are visible on dashboard
      const homeSection = page.locator('#home-events-section');
      await expect(homeSection).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // 5. Verify active event card is rendered inside home widget
      const activeCard = homeSection.locator('#event-card-torneo_pesca');
      await expect(activeCard).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // 6. Test Weekly 7-Day Schedule Accordion Toggle:
      const scheduleToggle = page.locator('#home-events-schedule-toggle-btn');
      await expect(scheduleToggle).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // Open schedule
      await scheduleToggle.click();
      const upcomingBlock = page.locator('#upcoming-events-schedule-section');
      await expect(upcomingBlock).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // Close schedule
      await scheduleToggle.click();
      await expect(upcomingBlock).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });

      // 7. Test Dashboard Refresh Button
      const refreshBtn = page.locator('#home-events-refresh-btn');
      await expect(refreshBtn).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });
      await refreshBtn.click();
      await expect(activeCard).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // 8. Dynamic Time Advancement: Travel to Wednesday 01:00 (event concluded)
      await sim.setMockGameTime('2026-08-12T01:00:00');

      // Refresh events on home dashboard
      await refreshBtn.click();

      // Verify torneo_pesca is no longer active in current row
      await expect(activeCard).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });

      // 9. Test Past Concluded Events Archive Accordion Toggle:
      const historyToggle = page.locator('#home-events-history-toggle-btn');
      await expect(historyToggle).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // Open past events
      await historyToggle.click();
      const pastEventsContainer = page.locator('#past-events-history-section');
      await expect(pastEventsContainer).toBeVisible({ timeout: E2E_ACTION_TIMEOUT_MS });

      // Close past events
      await historyToggle.click();
      await expect(pastEventsContainer).toHaveCount(0, { timeout: E2E_ACTION_TIMEOUT_MS });

      sim.finish('World Events Home Dashboard & Schedule E2E Simulation', 'passed');
    } catch (err) {
      sim.finish('World Events Home Dashboard & Schedule E2E Simulation', 'failed');
      throw err;
    } finally {
      await sim.resetMockGameTime();
    }
  });
});
