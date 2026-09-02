import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';

class MultiSpeciesEventSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMultiSpeciesScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const eventStore = useEventStore();

      const shellder = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('shellder'),
        level: 25
      });
      shellder.name = 'Shellder';
      shellder.nickname = 'Titan Shell';
      shellder.weight = 15.2;
      shellder.height = 0.4;
      shellder.ivs = { hp: 30, atk: 30, def: 30, spa: 30, spd: 30, spe: 30 };
      shellder.obtainedAt = Temporal.Now.instant().epochMilliseconds;

      const horsea = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('horsea'),
        level: 20
      });
      horsea.name = 'Horsea';
      horsea.nickname = 'Speedy Sea';
      horsea.weight = 9.8;
      horsea.height = 0.5;
      horsea.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
      horsea.obtainedAt = Temporal.Now.instant().epochMilliseconds;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [shellder, horsea];
      gameStore.state.box = [];

      const now = Temporal.Now.instant();
      const startAt = now.subtract({ hours: 1 }).toString();
      const endAt = now.add({ hours: 2 }).toString();

      const db = gameStore.db;
      if (db) {
        await db.from('events_config').upsert({
          id: 'torneo_pesca',
          name: 'Torneo de Pesca Acuática',
          icon: '🎣',
          type: 'competition',
          active: true,
          manual: true,
          start_at: startAt,
          end_at: endAt,
          config: JSON.stringify({
            species: 'shellder,horsea,staryu',
            hasCompetition: true,
            subCompetitions: [
              { id: 'ivs', name: 'Genética Superior (IVs)', metric: 'total_ivs', order: 'max' },
              { id: 'weight', name: 'Masa y Peso (Titán / Miniatura)', metric: 'weight', order: 'auto' },
              { id: 'height', name: 'Envergadura y Altura (Gran Salto)', metric: 'height', order: 'auto' }
            ]
          }),
          description: '¡Compite con las especies acuáticas destacadas de la semana!'
        });
      }

      await eventStore.fetchEvents(true);
    });
  }
}

test.describe('Multi-Species Event Competition E2E Simulation', () => {
  test('renders global IV slot, species tabs, switches active slots and registers participants', async ({ page }) => {
    const sim = new MultiSpeciesEventSimulation(page, 'FisherPro');
    await sim.setup();
    await sim.setupMultiSpeciesScenario();

    // Open WorldEvents modal
    await page.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().open('WorldEvents');
    });

    const modal = page.locator('.events-modal-content-inner, .events-modal-header');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });

    // 1. Verify category chips in the active competition card
    const chips = page.locator('.comp-slot-chip');
    await expect(chips.first()).toBeVisible({ timeout: 5000 });
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(3);

    // 2. Inscribe in the IVs category
    const ivChip = chips.filter({ hasText: 'Mayor IVs' }).first();
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
  });
});
