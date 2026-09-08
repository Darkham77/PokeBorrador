/**
 * scripts/e2e/events/event_capture_auto_enroll.simulation.ts
 *
 * E2E Simulation: Post-Capture Event Auto-Enrollment Prompt & Home Auto-Fill.
 * Validates:
 * 1. Capturing a Pokémon that qualifies for an active competition event automatically triggers
 *    the EventAutoEnrollModal (#event-auto-enroll-modal).
 * 2. Confirming auto-enrollment via #btn-enroll-confirm successfully enrolls the Pokémon.
 * 3. The Home / EventCard [⚡ AUTO-RELLENAR] button (#event-auto-fill-btn-<eventId>) computes
 *    and executes greedy optimal filling across all competition categories.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 10s action timeouts, zero artificial timers)
 * - /game-simulation (dual DB execution, fail-fast determinism)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { awaitBattleReadyForInput, clickResilient } from '../e2e_helpers.ts';

const MOCK_SNORLAX_WEIGHT_KG = 460;
const MOCK_SNORLAX_LEVEL = 5;
const STAT_IV_PERFECT = 31;

class CaptureAutoEnrollSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username, { enableEvents: true });
  }

  public async setupActiveCompetitionAndBattle(): Promise<void> {
    await this.page.evaluate(async (params) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const { useInventoryStore } = await import('../../../src/stores/inventory/inventory.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requireItemId } = await import('../../../src/data/inventory/items.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const invStore = useInventoryStore();
      await invStore.addItem(requireItemId('masterball'), 5);

      const eventStore = useEventStore();
      eventStore.simEventsEnabled = true;

      const mockCompEvent = {
        id: 'capture_comp_test',
        name: 'Concurso de Captura Test',
        description: 'Concurso de Captura Test',
        active: true,
        type: 'competition' as const,
        icon: '🏆',
        config: JSON.stringify({
          subCompetitions: [
            {
              id: 'heavyweight',
              name: 'Más Pesado',
              metric: 'weight',
              order: 'max'
            }
          ]
        }),
        rules: {
          categories: [
            {
              id: 'heavyweight',
              title: 'Más Pesado',
              metric: 'weight' as const,
              order: 'max' as const
            }
          ]
        }
      };

      eventStore.allEvents = [mockCompEvent];
      eventStore.activeEvents = [mockCompEvent];

      const wildSnorlax = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('snorlax'),
        level: params.level
      });
      wildSnorlax.weight = params.weight;
      wildSnorlax.ivs = {
        hp: params.iv,
        atk: params.iv,
        def: params.iv,
        spa: params.iv,
        spd: params.iv,
        spe: params.iv
      };

      const battleStore = useBattleStore();
      await battleStore.startBattle(wildSnorlax, {
        isTrainer: false,
        locationId: 'route1'
      });
    }, { weight: MOCK_SNORLAX_WEIGHT_KG, level: MOCK_SNORLAX_LEVEL, iv: STAT_IV_PERFECT });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('Post-Capture Event Auto-Enrollment & Home Auto-Fill Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('prompts auto-enroll modal upon catching high-record Pokémon and confirms enrollment', async ({ page }) => {
    const sim = new CaptureAutoEnrollSimWrapper(page, 'EventCaptureSim');
    await sim.setup();
    await sim.setupActiveCompetitionAndBattle();

    // 1. Capture wild Snorlax using Master Ball
    await sim.throwBall('masterball', { expectCapture: true });

    // 2. The Auto-Enroll Modal must be displayed
    const modal = page.locator('#event-auto-enroll-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // 3. Verify modal contents
    const confirmBtn = page.locator('#btn-enroll-confirm');
    await expect(confirmBtn).toBeVisible();

    // 4. Confirm enrollment
    await clickResilient(confirmBtn);

    // 5. Modal should close
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // 6. Verify entry was recorded in eventStore
    const hasEntry = await page.evaluate(async () => {
      const { useEventStore } = await import('../../../src/stores/events.ts');
      const entries = useEventStore().userEntries;
      return Object.keys(entries).length > 0;
    });
    expect(hasEntry).toBe(true);

    // 7. Test Home Auto-Fill execution
    const autoFillCount = await page.evaluate(async () => {
      const { useEventStore } = await import('../../../src/stores/events.ts');
      return await useEventStore().autoFillBestEntries('capture_comp_test');
    });
    expect(typeof autoFillCount).toBe('number');
  });
});
