/**
 * scripts/e2e/events/event_subcompetition_filters.simulation.ts
 *
 * E2E Simulation Suite 4: Sub-Competition Filters & Strict Category Eligibility
 * Validates:
 * 1. Global event species constraints (e.g. only tournament species allowed, non-tournament excluded).
 * 2. Event timeframe constraint (requireCaughtDuringEvent: Pokémon caught outside window are excluded).
 * 3. Species-scoped sub-competitions (e.g. weight_shellder only permits Shellder, excluding other tournament species like Horsea).
 * 4. Mutual exclusion / single-enrollment rule (already enrolled Pokémon cannot be enrolled into another category).
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 5s action timeouts, zero timers)
 * - /game-simulation (dual DB execution, fail-fast determinism)
 * - /domain-type-first (canonical models, typed seeds)
 * - /ponytail (concise, minimal, single-responsibility)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

export class EventSubcompetitionFiltersSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string = 'FilterPro') {
    super(page, username);
  }

  /**
   * Sets up 4 test Pokémon with varied eligibility criteria:
   * - Horsea: Eligible for global categories (tournament species, caught in window).
   * - Shellder: Eligible for global & Shellder-specific categories (tournament species, caught in window).
   * - Old Shellder: Ineligible (tournament species, but caught BEFORE event window).
   * - Pikachu: Ineligible (non-tournament species).
   */
  public async setupFilterScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { getServerTime } = await import('../../../src/logic/utils/timeUtils.ts');

      const gameStore = useGameStore();
      const currentSimTime = getServerTime();

      const TEST_LEVEL_HORSEA = 28; // no-magic: Test seed level
      const TEST_LEVEL_SHELLDER = 25; // no-magic: Test seed level
      const TEST_LEVEL_OLD_SHELLDER = 20; // no-magic: Test seed level
      const TEST_LEVEL_PIKACHU = 30; // no-magic: Test seed level
      const ANCIENT_OBTAINED_TIMESTAMP = 1000; // no-magic: Timestamp far in the past

      // 1. Eligible Horsea
      const horsea = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('horsea'),
        level: TEST_LEVEL_HORSEA
      });
      horsea.uid = 'sim-flt-horsea';
      horsea.name = 'Horsea';
      horsea.obtainedAt = currentSimTime;

      // 2. Eligible Shellder
      const shellder = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('shellder'),
        level: TEST_LEVEL_SHELLDER
      });
      shellder.uid = 'sim-flt-shellder';
      shellder.name = 'Shellder';
      shellder.obtainedAt = currentSimTime;

      // 3. Ineligible Old Shellder (obtained long before tournament window)
      const oldShellder = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('shellder'),
        level: TEST_LEVEL_OLD_SHELLDER
      });
      oldShellder.uid = 'sim-flt-oldshellder';
      oldShellder.name = 'Shellder (Old)';
      oldShellder.obtainedAt = ANCIENT_OBTAINED_TIMESTAMP;

      // 4. Ineligible Pikachu (Species not in fishing tournament rotation)
      const pikachu = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('pikachu'),
        level: TEST_LEVEL_PIKACHU
      });
      pikachu.uid = 'sim-flt-pikachu';
      pikachu.name = 'Pikachu';
      pikachu.obtainedAt = currentSimTime;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [horsea, shellder, oldShellder, pikachu];
      gameStore.state.box = [];

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }
}

test.describe('World Events Sub-Competition Filters E2E Simulation', () => {
  test('enforces strict species, timeframe, and category scoping filters in PokemonSelectionModal', async ({ page }) => {
    const sim = new EventSubcompetitionFiltersSimulation(page, 'FilterPro');
    await sim.setup();

    try {
      // 1. Fail-fast canonical validation
      await sim.assertCanonicalEventExists('torneo_pesca');

      // 2. Deterministic time anchor: Tuesday Week 2 (August 11, 2026, 19:00 GMT-3)
      await sim.setMockGameTime('2026-08-11T19:00:00');

      // 3. Setup contestants with diverse eligibility profiles
      await sim.setupFilterScenario();

      // 4. Open World Events modal via HUD navigation
      await sim.openWorldEventsViaHud();

      // 5. Test Global Category Filters ('ivs'):
      // Click global IVs chip
      const ivsChip = page.locator('#comp-slot-chip-torneo_pesca-ivs');
      await expect(ivsChip).toBeVisible({ timeout: 5000 });
      await ivsChip.click();

      // Modal opens
      const modal = page.locator('.selection-container');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Eligible tournament Pokémon (Horsea, Shellder) must be present
      const horseaCard = page.locator('#pokemon-select-sim-flt-horsea');
      const shellderCard = page.locator('#pokemon-select-sim-flt-shellder');
      await expect(horseaCard).toBeVisible({ timeout: 5000 });
      await expect(shellderCard).toBeVisible({ timeout: 5000 });

      // Ineligible Pokémon must NOT be listed in the modal
      const oldShellderCard = page.locator('#pokemon-select-sim-flt-oldshellder');
      const pikachuCard = page.locator('#pokemon-select-sim-flt-pikachu');
      await expect(oldShellderCard).toHaveCount(0);
      await expect(pikachuCard).toHaveCount(0);

      // Select Horsea into global IVs slot
      await horseaCard.click();
      await expect(modal).toHaveCount(0, { timeout: 5000 });
      await expect(ivsChip).toHaveClass(/enrolled/, { timeout: 5000 });

      // 6. Test Species-Scoped Category Filters ('weight_shellder'):
      // Click Shellder weight chip
      const shellderWeightChip = page.locator('#comp-slot-chip-torneo_pesca-weight_shellder');
      await expect(shellderWeightChip).toBeVisible({ timeout: 5000 });
      await shellderWeightChip.click();

      await expect(modal).toBeVisible({ timeout: 5000 });

      // Shellder MUST be present (matches target species & timeframe)
      await expect(shellderCard).toBeVisible({ timeout: 5000 });

      // Horsea MUST NOT be present (wrong species for weight_shellder)
      await expect(horseaCard).toHaveCount(0);
      // Pikachu & Old Shellder MUST NOT be present
      await expect(pikachuCard).toHaveCount(0);
      await expect(oldShellderCard).toHaveCount(0);

      // Select Shellder into weight_shellder slot
      await shellderCard.click();
      await expect(modal).toHaveCount(0, { timeout: 5000 });
      await expect(shellderWeightChip).toHaveClass(/enrolled/, { timeout: 5000 });

      // 7. Test Mutual Exclusion / Non-Duplication:
      // Clicking the already-enrolled ivs chip should open the slot action modal, NOT re-enroll
      await ivsChip.click();
      const changeBtn = page.locator('#event-slot-change-btn');
      await expect(changeBtn).toBeVisible({ timeout: 5000 });

      // Click change participant: Shellder should NOT be available because it is enrolled in weight_shellder
      await changeBtn.click();
      await expect(modal).toBeVisible({ timeout: 5000 });
      await expect(shellderCard).toHaveCount(0);

      // Close modal cleanly using canonical ID
      const closeBtn = page.locator('#pokemon-selection-modal-close-btn');
      await expect(closeBtn).toBeVisible({ timeout: 5000 });
      await closeBtn.click();
      await expect(modal).toHaveCount(0, { timeout: 5000 });

      sim.finish('World Events Sub-Competition Filters E2E Simulation', 'passed');
    } catch (err) {
      sim.finish('World Events Sub-Competition Filters E2E Simulation', 'failed');
      throw err;
    } finally {
      await sim.resetMockGameTime();
    }
  });
});
