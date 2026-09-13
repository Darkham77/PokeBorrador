import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';


class MultiSpeciesEventSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMultiSpeciesScenario(): Promise<void> {
    // 1. Fail-fast canonical verification: assert torneo_pesca exists in database
    await this.assertCanonicalEventExists('torneo_pesca');

    // 2. Set deterministic mock time to Tuesday Week 2 at 19:00 (Torneo de Pesca Exótica)
    // Canonical schedule: Tuesday 18:00 - 22:00, Week 2 species: shellder,staryu,horsea,seadra,goldeen
    const deterministicDateStr = '2026-08-11T19:00:00';
    await this.setMockGameTime(deterministicDateStr);

    // 3. Seed team with eligible Week 2 Pokémon caught during the event window
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { getServerTime } = await import('../../../src/logic/utils/timeUtils.ts');

      const gameStore = useGameStore();
      const currentSimTime = getServerTime();

      const shellder = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('shellder'),
        level: 25
      });
      shellder.name = 'Shellder';
      shellder.nickname = 'Titan Shell';
      shellder.weight = 15.2;
      shellder.height = 0.4;
      shellder.ivs = { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 };
      shellder.obtainedAt = currentSimTime;

      const horsea = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('horsea'),
        level: 20
      });
      horsea.name = 'Horsea';
      horsea.nickname = 'Speedy Sea';
      horsea.weight = 9.8;
      horsea.height = 0.5;
      horsea.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      horsea.obtainedAt = currentSimTime;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [shellder, horsea];
      gameStore.state.box = [];

      await gameStore.saveGame();

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }
}

test.describe('Multi-Species Event Competition E2E Simulation', () => {
  test('renders global IV slot, species tabs, switches active slots and registers participants', async ({ page }) => {
    const sim = new MultiSpeciesEventSimulation(page, 'FisherPro');
    await sim.setup();
    try {
      await sim.setupMultiSpeciesScenario();

      // Open WorldEvents modal through HUD navigation
      await sim.openWorldEventsViaHud();

      // Target the specific Torneo de Pesca competition card via canonical #id
      const eventCard = page.locator('#event-card-torneo_pesca');
      await expect(eventCard).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

      // 1. Verify species tabs and global IVs slot
      const speciesTabs = eventCard.locator('.species-tab-btn');
      await expect(speciesTabs.first()).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      const tabCount = await speciesTabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(2);

      // In the default global tab, the IVs category chip is visible
      const ivChip = page.locator('#comp-slot-chip-torneo_pesca-ivs');
      await expect(ivChip).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

      // 2. Switch to a species tab (Shellder) and verify intra-species slots
      const shellderTab = page.locator('#event-species-tab-torneo_pesca-shellder');
      await expect(shellderTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await shellderTab.click();

      const shellderWeightChip = page.locator('#comp-slot-chip-torneo_pesca-weight_shellder');
      await expect(shellderWeightChip).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

      // 3. Switch back to global tab to inscribe in IVs category
      const globalTab = page.locator('#event-species-tab-torneo_pesca-global');
      await expect(globalTab).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await globalTab.click();

      await expect(ivChip).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await ivChip.click();

      // Pokemon selection modal opens
      const selectionModal = page.locator('.selection-container, #pokemon-selection-confirm-btn');
      await expect(selectionModal.first()).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

      // Select Horsea from list and confirm
      const horseaItem = page.locator('.list-item, [id^="pokemon-select-"]').filter({ hasText: 'HORSEA' }).first();
      await expect(horseaItem).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await horseaItem.click();

      const confirmBtn = page.locator('#pokemon-selection-confirm-btn');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Verify chip shows enrolled status (check mark)
      await expect(ivChip).toContainText('✓', { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } finally {
      await sim.resetMockGameTime();
      await sim.finish('Multi-Species Event Competition E2E Simulation');
    }
  });
});
