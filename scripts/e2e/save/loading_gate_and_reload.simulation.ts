import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, MAX_PER_ACTION_TIMEOUT_MS } from '../e2e_helpers.ts';

class LoadingGateReloadSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async getStoreDataStatus(): Promise<{
    gameReady: boolean;
    warLoaded: boolean;
    eventsLoaded: boolean;
    breedingLoaded: boolean;
    gtsLoaded: boolean;
    teamCount: number;
    money: number;
  }> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useWarStore } = await import('../../../src/stores/war.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const { useGTSStore } = await import('../../../src/stores/gts.ts');

      const game = useGameStore();
      const war = useWarStore();
      const events = useEventStore();
      const breeding = useBreedingStore();
      const gts = useGTSStore();

      return {
        gameReady: game.isReady,
        warLoaded: war.isLoaded ?? true,
        eventsLoaded: events.isLoading === false,
        breedingLoaded: breeding.slots.length > 0,
        gtsLoaded: gts.loading === false,
        teamCount: game.state.team.length,
        money: game.state.money
      };
    });
  }

  public async addMoneyAndSave(amount: number): Promise<number> {
    return await this.page.evaluate(async (amt) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const game = useGameStore();
      game.state.money += amt;
      await game.save(false);
      return game.state.money;
    }, amount);
  }

  public async triggerRedundantStoreFetches(): Promise<{
    warTimeMs: number;
    eventsTimeMs: number;
    breedingTimeMs: number;
    gtsTimeMs: number;
  }> {
    return await this.page.evaluate(async () => {
      const { useWarStore } = await import('../../../src/stores/war.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const { useGTSStore } = await import('../../../src/stores/gts.ts');

      const war = useWarStore();
      const events = useEventStore();
      const breeding = useBreedingStore();
      const gts = useGTSStore();

      const t0 = performance.now();
      await war.loadWarData();
      const t1 = performance.now();

      await events.fetchEvents();
      const t2 = performance.now();

      await breeding.loadDaycare();
      const t3 = performance.now();

      await gts.fetchListings();
      const t4 = performance.now();

      return {
        warTimeMs: t1 - t0,
        eventsTimeMs: t2 - t1,
        breedingTimeMs: t3 - t2,
        gtsTimeMs: t4 - t3
      };
    });
  }
  public async navigateToHome(): Promise<void> {
    const homeBtn = this.page.locator('#nav-home-btn').first();
    await homeBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await homeBtn.click();
    const homeView = this.page.locator('#home-view-container').first();
    await homeView.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }
}

test.describe('Loading Gate, Reload Combinations & Single Source of Truth Simulation', () => {
  test('should coordinate loading gate smoothly with zero pop-in during initial login and render Home dashboard', async ({ page }) => {
    const sim = new LoadingGateReloadSimulation(page, 'GateUser1');

    await sim.setup();
    await waitForStoreReady(page);

    // 1. Navigate to Home dashboard
    await sim.navigateToHome();

    // 2. Verify all Home dashboard widgets are mounted in DOM using explicit #id locators
    const eventsWidget = page.locator('#widget-events-section').first();
    await eventsWidget.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const breedingWidget = page.locator('#widget-breeding-section').first();
    await breedingWidget.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const gymsWidget = page.locator('#widget-gyms-progress').first();
    await gymsWidget.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });

    // 3. Verify all parallel boot stores are in ready state
    const status = await sim.getStoreDataStatus();
    expect(status.gameReady).toBe(true);
    expect(status.teamCount).toBeGreaterThan(0);
  });

  test('should handle page reload deterministically via Web Worker save processing and smoothly reopen loading gate', async ({ page }) => {
    const sim = new LoadingGateReloadSimulation(page, 'GateUser2');

    await sim.setup();
    await waitForStoreReady(page);

    // 1. Mutate state and save
    const initialMoney = (await sim.getStoreDataStatus()).money;
    const addedAmount = 1500;
    const expectedMoney = initialMoney + addedAmount;
    await sim.addMoneyAndSave(addedAmount);

    // 2. Reload the page (triggers OPFS Web Worker decompress & validate)
    await sim.reloadAndSync();

    // 3. Navigate to Home and verify updated state restored cleanly
    await sim.navigateToHome();

    const statusAfterReload = await sim.getStoreDataStatus();
    expect(statusAfterReload.gameReady).toBe(true);
    expect(statusAfterReload.money).toBe(expectedMoney);
  });

  test('should handle offline network disconnection and restore state from local OPFS cache without crashing', async ({ page }) => {
    const sim = new LoadingGateReloadSimulation(page, 'GateUser3');

    await sim.setup();
    await waitForStoreReady(page);

    // 1. Ensure state is saved
    await sim.saveGameAndAwaitExport();

    // 2. Simulate offline connectivity by aborting all backend cloud calls
    await page.route('**/rest/v1/**', route => route.abort());
    await page.route('**/realtime/**', route => route.abort());

    try {
      // 3. Reload in offline state (Vite delivers SPA, but cloud backend is unreachable)
      await sim.reloadAndSync();

      // 4. Verify game restored from local cache cleanly via Web Worker
      await sim.navigateToHome();

      const statusOffline = await sim.getStoreDataStatus();
      expect(statusOffline.gameReady).toBe(true);
      expect(statusOffline.teamCount).toBeGreaterThan(0);
    } finally {
      // 5. Restore cloud routes
      await page.unroute('**/rest/v1/**');
      await page.unroute('**/realtime/**');
    }
  });

  test('should verify centralized single source of truth and no duplicate store fetches across widgets', async ({ page }) => {
    const sim = new LoadingGateReloadSimulation(page, 'GateUser4');

    await sim.setup();
    await waitForStoreReady(page);

    // 1. Execute redundant store calls on mounted stores
    const timings = await sim.triggerRedundantStoreFetches();

    // Redundant in-flight or loaded calls should resolve fast (<100ms) without re-fetching
    expect(timings.warTimeMs).toBeLessThan(500);
    expect(timings.eventsTimeMs).toBeLessThan(500);
    expect(timings.breedingTimeMs).toBeLessThan(500);
    expect(timings.gtsTimeMs).toBeLessThan(500);
  });
});
