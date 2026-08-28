// fallow-ignore-file security-sink
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

      eventStore.allEvents = [
        {
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
        }
      ];
    });
  }
}

test.describe('Multi-Species Event Competition E2E Simulation', () => {
  test('renders global IV slot, species tabs, switches active slots and registers participants', async ({ page }) => {
    const sim = new MultiSpeciesEventSimulation(page, 'FisherPro');
    await sim.setup();
    await sim.setupMultiSpeciesScenario();

    // Open World Events modal
    await page.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().open('WorldEvents');
    });

    const modal = page.locator('.world-events-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 1. Verify Global IVs slot is rendered
    const globalSlot = page.locator('.category-slot-card').filter({ hasText: 'Mayor IVs Totales' });
    await expect(globalSlot).toBeVisible({ timeout: 5000 });

    // 2. Verify Species Tabs Bar is rendered with 3 species
    const tabsBar = page.locator('.species-tabs-bar');
    await expect(tabsBar).toBeVisible({ timeout: 5000 });

    const tabButtons = tabsBar.locator('.species-tab-btn');
    await expect(tabButtons).toHaveCount(3);

    // 3. Default active tab is Shellder
    await expect(tabButtons.nth(0)).toHaveClass(/active/);

    // 4. Click Horsea tab
    await tabButtons.nth(1).click();
    await expect(tabButtons.nth(1)).toHaveClass(/active/);

    // 5. Inscribe Horsea into Horsea Weight slot
    const horseaWeightSlot = page.locator('.category-slot-card').filter({ hasText: 'Mayor Peso' });
    await expect(horseaWeightSlot).toBeVisible({ timeout: 5000 });

    const inscribeBtn = horseaWeightSlot.locator('.btn-slot-action.inscribe');
    await inscribeBtn.click();

    // Pokemon selection modal opens
    const selectionModal = page.locator('.pokemon-selection-modal, .base-modal');
    await expect(selectionModal.first()).toBeVisible({ timeout: 5000 });

    // Select Horsea from grid and confirm
    const horseaGridItem = page.locator('.pokemon-grid-item, .poke-select-card').filter({ hasText: 'Horsea' }).first();
    if (await horseaGridItem.isVisible()) {
      await horseaGridItem.click();
    }
    const confirmBtn = page.locator('.btn-confirm, .confirm-btn, button:has-text("CONFIRMAR")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Verify Horsea is enrolled
    await expect(horseaWeightSlot.locator('.slot-enrolled-body')).toBeVisible({ timeout: 5000 });
    await expect(horseaWeightSlot).toContainText('Speedy Sea');
  });
});
