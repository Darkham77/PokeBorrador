import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { clickResilient } from '../e2e_helpers.ts';

const SIM_MASTER_FINAL_ELO = 3500 as const;
const SIM_PODIUM_RANK_FIRST = 1 as const;
const SIM_AWARD_COINS_AMOUNT = 500 as const;

class PvpSeasonAwardSimWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async openSeasonRewardModal(): Promise<void> {
    await this.page.evaluate(async ({ finalElo, rank, coinsAmount }) => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');

      const modalStore = useModalStore();
      const pvpStore = usePvPStore();

      pvpStore.elo = finalElo;

      modalStore.open('RankedSeasonReward', {
        seasonName: 'Temporada 1: Renacer de Kanto',
        tier: 'maestro',
        rank,
        finalElo,
        awards: [
          {
            id: 'award_season_1_medal',
            prize: { type: 'ranked_medal', tier: 'maestro', season: 'Temporada 1' }
          },
          {
            id: 'award_season_1_pokemon',
            prize: { type: 'pokemon', species: 'eevee', level: 50, shiny: true }
          },
          {
            id: 'award_season_1_coins',
            prize: { type: 'battle_coins', amount: coinsAmount }
          }
        ]
      });
    }, {
      finalElo: SIM_MASTER_FINAL_ELO,
      rank: SIM_PODIUM_RANK_FIRST,
      coinsAmount: SIM_AWARD_COINS_AMOUNT
    });
  }
}

test.describe('PvP Season End Award & Claim Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('displays season celebration modal with maestro tier, podio #1, and claims rewards', async ({ page }) => {
    const sim = new PvpSeasonAwardSimWrapper(page, 'PvpSeasonAwardSim');
    await sim.setup();
    await sim.openSeasonRewardModal();

    // 1. Modal header is visible with celebration
    const title = page.locator('#ranked-reward-title');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText('TEMPORADA 1');

    // 2. Podio badge #1
    const podiumTag = page.locator('.podium-tag');
    await expect(podiumTag).toBeVisible({ timeout: 10000 });
    await expect(podiumTag).toContainText('PODIO #1');

    // 3. Soft reset preview
    const resetInfo = page.locator('.soft-reset-preview');
    await expect(resetInfo).toBeVisible({ timeout: 10000 });
    await expect(resetInfo).toContainText('2250 LP');

    // 4. Rewards list contains medal, thematic shiny pokemon, and battle coins
    const awardsList = page.locator('.awards-grid');
    await expect(awardsList).toBeVisible({ timeout: 10000 });
    await expect(awardsList).toContainText('Medalla Maestro');
    await expect(awardsList).toContainText('EEVEE');
    await expect(awardsList).toContainText('SHINY');
    await expect(awardsList).toContainText('500 Monedas de Batalla');

    // 5. Click Claim Button
    const claimBtn = page.locator('#btn-claim-ranked-season-rewards');
    await expect(claimBtn).toBeVisible({ timeout: 10000 });
    await clickResilient(claimBtn);

    // 6. Verify modal was dismissed
    await expect(claimBtn).toHaveCount(0, { timeout: 10000 });
  });
});
