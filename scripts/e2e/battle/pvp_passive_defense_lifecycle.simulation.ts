import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { clickResilient } from '../e2e_helpers.ts';

import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { SeasonRules } from '../../../src/stores/pvp.ts';

class PvpPassiveDefenseSimWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async configureSeasonalRules(rules: SeasonRules): Promise<void> {
    await this.page.evaluate(async (r) => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const pvpStore = usePvPStore();
      pvpStore.currentSeasonRules = r;
    }, rules);
  }

  public async setDefendingRoster(roster: Array<{ id: PokemonSpeciesId; level: number; uid?: string }>): Promise<void> {
    await this.page.evaluate(async (mons) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();

      const generated = mons.map((m, i) => {
        const p = pokemonDebugService.generate({ id: m.id, level: m.level });
        p.uid = m.uid || `sim_mon_${i}_${m.id}`;
        return p;
      });

      gameStore.state.team = generated;
      gameStore.state.pvpTeam6 = generated.map(g => g.uid);
    }, roster);
  }

  public async setLoginReminderPending(): Promise<void> {
    await this.page.evaluate(() => {
      sessionStorage.setItem('pvp_login_reminder_pending', 'true');
    });
  }

  public async triggerLoadPvPData(): Promise<void> {
    await this.page.evaluate(async () => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      await usePvPStore().loadPvPData();
    });
  }

  public async setPassiveActive(active: boolean): Promise<void> {
    await this.page.evaluate(async (a) => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      usePvPStore().passiveTeamActive = a;
    }, active);
  }

  public async navigateToHome(): Promise<void> {
    const homeBtn = this.page.locator('#nav-home-btn').first();
    await clickResilient(homeBtn);
    const widget = this.page.locator('#widget-passive-defense');
    await expect(widget).toBeVisible({ timeout: 10000 });
  }
}

test.describe('PvP Passive Defense Lifecycle E2E Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('displays login reminder toast when passive defense is disabled and pending flag is set', async ({ page }) => {
    const sim = new PvpPassiveDefenseSimWrapper(page, 'PvpDefUserReminder');
    await sim.setup();

    // Ensure passive defense is inactive and pending flag is present
    await sim.setPassiveActive(false);
    await sim.setLoginReminderPending();
    await sim.triggerLoadPvPData();

    // Verify reminder toast appears in toast stack
    const reminderToast = page.locator('#notification-stack .toast-item .toast-msg', {
      hasText: 'Recuerda activar tu Defensa Pasiva en el Home para proteger tu ELO.'
    });
    await expect(reminderToast.first()).toBeVisible({ timeout: 10000 });

    // Verify sessionStorage flag was consumed
    const flagValue = await page.evaluate(() => sessionStorage.getItem('pvp_login_reminder_pending'));
    expect(flagValue).toBeNull();
  });

  test('displays ineligible warning cartel and blocks activation when defending team violates season rules', async ({ page }) => {
    const sim = new PvpPassiveDefenseSimWrapper(page, 'PvpDefUserIneligible');
    await sim.setup();
    await sim.navigateToHome();

    // 1. Configure season rules: Cap 50, mewtwo banned
    await sim.configureSeasonalRules({
      name: 'Torneo Kanto Flat 50',
      levelCap: 50,
      maxPokemon: 6,
      bannedPokemonIds: ['mewtwo']
    });

    // 2. Set defending roster with an over-leveled mon (level 75) and a banned mon
    await sim.setDefendingRoster([
      { id: 'pikachu', level: 75, uid: 'overlevel_pikachu' },
      { id: 'charizard', level: 50, uid: 'legal_charizard' }
    ]);
    await sim.setPassiveActive(false);

    // 3. Verify widget preview displays the ineligible cartel and card
    const widget = page.locator('#widget-passive-defense');
    await expect(widget).toBeVisible({ timeout: 10000 });

    const ineligibleCard = widget.locator('.defense-card-wrapper.ineligible-card');
    await expect(ineligibleCard.first()).toBeVisible({ timeout: 10000 });

    const ineligibleCartel = widget.locator('.ineligible-cartel');
    await expect(ineligibleCartel.first()).toBeVisible({ timeout: 10000 });
    await expect(ineligibleCartel.first()).toContainText('Nivel excede el límite');

    // 4. Attempt to activate passive defense by clicking toggle button
    const toggleBtn = widget.locator('.toggle-btn');
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await expect(toggleBtn).toContainText('DESACTIVADO');
    await clickResilient(toggleBtn);

    // 5. Verify activation was blocked and warning toast was dispatched
    const blockedToast = page.locator('#notification-stack .toast-item .toast-msg', {
      hasText: 'No puedes activar la Defensa Pasiva'
    });
    await expect(blockedToast.first()).toBeVisible({ timeout: 10000 });
    await expect(toggleBtn).toContainText('DESACTIVADO');
  });

  test('automatically deactivates passive defense when defending team changes to contain an ineligible pokemon', async ({ page }) => {
    const sim = new PvpPassiveDefenseSimWrapper(page, 'PvpDefUserAutoDeactivate');
    await sim.setup();
    await sim.navigateToHome();

    // 1. Configure season rules
    await sim.configureSeasonalRules({
      name: 'Torneo Kanto Flat 50',
      levelCap: 50,
      maxPokemon: 6
    });

    // 2. Set 100% legal roster and activate defense
    await sim.setDefendingRoster([
      { id: 'pikachu', level: 50, uid: 'legal_pika_1' }
    ]);
    await sim.setPassiveActive(true);

    const widget = page.locator('#widget-passive-defense');
    const toggleBtn = widget.locator('.toggle-btn');
    await expect(toggleBtn).toContainText('ACTIVADO', { timeout: 10000 });

    // 3. Mutate defending team to introduce an ineligible Pokemon (level 80)
    await sim.setDefendingRoster([
      { id: 'pikachu', level: 80, uid: 'now_illegal_pika' }
    ]);

    // 4. Verify reactive watcher triggers auto-deactivation
    const deactivationToast = page.locator('#notification-stack .toast-item .toast-msg', {
      hasText: 'Defensa Pasiva desactivada'
    });
    await expect(deactivationToast.first()).toBeVisible({ timeout: 10000 });
    await expect(toggleBtn).toContainText('DESACTIVADO', { timeout: 10000 });
  });

  test('keeps defense active and synchronizes snapshot when legal roster changes', async ({ page }) => {
    const sim = new PvpPassiveDefenseSimWrapper(page, 'PvpDefUserLegalSync');
    await sim.setup();
    await sim.navigateToHome();

    // 1. Configure season rules
    await sim.configureSeasonalRules({
      name: 'Torneo Kanto Flat 50',
      levelCap: 50,
      maxPokemon: 6
    });

    // 2. Set legal roster and activate defense
    await sim.setDefendingRoster([
      { id: 'pikachu', level: 50, uid: 'legal_pika_init' }
    ]);
    await sim.setPassiveActive(true);

    const widget = page.locator('#widget-passive-defense');
    const toggleBtn = widget.locator('.toggle-btn');
    await expect(toggleBtn).toContainText('ACTIVADO', { timeout: 10000 });

    // 3. Swap to another legal Pokémon (level 50 Raichu)
    await sim.setDefendingRoster([
      { id: 'raichu', level: 50, uid: 'legal_raichu_swap' }
    ]);

    // 4. Assert defense remains active
    await expect(toggleBtn).toContainText('ACTIVADO', { timeout: 10000 });

    // Verify card rendered is now Raichu without ineligible styling
    const cardWrapper = widget.locator('.defense-card-wrapper');
    await expect(cardWrapper.first()).toBeVisible({ timeout: 10000 });
    await expect(cardWrapper.first()).not.toHaveClass(/ineligible-card/);
  });
});
