import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { clickResilient } from '../e2e_helpers.ts';

const SIM_PLAYER_INITIAL_ELO = 1058 as const;

class PvpArenaMilestoneSimWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupPlayerRankedElo(targetElo: number): Promise<void> {
    await this.page.evaluate(async (elo) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');

      const gameStore = useGameStore();
      const pvpStore = usePvPStore();

      gameStore.state.eloRating = elo;
      gameStore.state.rankedMaxElo = elo;
      gameStore.state.rankedRewardsClaimed = [];
      pvpStore.elo = elo;
      pvpStore.maxElo = elo;
      pvpStore.rewardsClaimed = [];

      await gameStore.save(true);
    }, targetElo);
  }

  public async openArenaModal(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const modalStore = useModalStore();
      modalStore.open('Arena', { show: true, initialTab: 'ranked' });
    });
  }
}

test.describe('PvP Arena Milestone In-Modal Claim Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('displays RECLAMAR button in coliseum, claims in-modal without closing, and persists after F5', async ({
    page
  }) => {
    const sim = new PvpArenaMilestoneSimWrapper(page, 'PvpMilestoneUser');
    await sim.setup();
    await sim.setupPlayerRankedElo(SIM_PLAYER_INITIAL_ELO);

    // 1. Open Coliseum Arena modal
    await sim.openArenaModal();

    // 2. Locate the 1000 ELO milestone claim button
    const claimBtn = page.locator('#arena-milestone-track-btn-claim-bronce_1000');
    await expect(claimBtn).toBeVisible({ timeout: 10000 });
    await expect(claimBtn).toHaveText(/RECLAMAR/);
    await expect(claimBtn).not.toHaveText(/RECLAMAR EN INICIO/);

    // 3. Click the claim button
    await clickResilient(claimBtn);

    // 4. Verify modal is STILL open and button has transitioned to claimed pill
    const milestoneSection = page.locator('.milestone-track');
    await expect(milestoneSection).toBeVisible({ timeout: 10000 });
    await expect(milestoneSection).toContainText('RECLAMADO');
    await expect(claimBtn).toHaveCount(0, { timeout: 10000 });

    // 5. Reload the page (simulate F5)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await sim.openArenaModal();

    // 6. Verify that after F5, 1000 ELO remains RECLAMADO and does NOT revert
    const milestoneSectionAfterF5 = page.locator('.milestone-track');
    await expect(milestoneSectionAfterF5).toBeVisible({ timeout: 10000 });
    await expect(milestoneSectionAfterF5).toContainText('RECLAMADO');
    await expect(page.locator('#arena-milestone-track-btn-claim-bronce_1000')).toHaveCount(0, {
      timeout: 10000
    });
  });
});
