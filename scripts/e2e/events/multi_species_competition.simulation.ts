import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

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
      await expect(eventCard).toBeVisible({ timeout: 5000 });

      // 1. Verify category chips in the active competition card
      const chips = eventCard.locator('[id^="comp-slot-chip-torneo_pesca-"]');
      await expect(chips.first()).toBeVisible({ timeout: 5000 });
      const chipCount = await chips.count();
      expect(chipCount).toBeGreaterThanOrEqual(3);

      // 2. Inscribe in the IVs category via canonical #id
      const ivChip = page.locator('#comp-slot-chip-torneo_pesca-ivs');
      await expect(ivChip).toBeVisible({ timeout: 5000 });
      await ivChip.click();

      // Pokemon selection modal opens
      const selectionModal = page.locator('.selection-container, #pokemon-selection-confirm-btn');
      await expect(selectionModal.first()).toBeVisible({ timeout: 5000 });

      // Select Horsea from list and confirm
      const horseaItem = page.locator('.list-item, [id^="pokemon-select-"]').filter({ hasText: 'HORSEA' }).first();
      await expect(horseaItem).toBeVisible({ timeout: 5000 });
      await horseaItem.click();

      const confirmBtn = page.locator('#pokemon-selection-confirm-btn');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Verify chip shows enrolled status (check mark)
      await expect(ivChip).toContainText('✓', { timeout: 5000 });
    } finally {
      await sim.resetMockGameTime();
      await sim.finish('Multi-Species Event Competition E2E Simulation');
    }
  });
});
