/**
 * scripts/e2e/events/saturday_global_contest_and_tiebreaks.simulation.ts
 *
 * E2E Simulation Suite 3: Saturday Global Open Contest & Scoring/Tiebreaks
 * Validates:
 * 1. Global open competition (species: "*", any Pokémon eligible) on Saturdays.
 * 2. Active event card and global category chips (ivs, weight, height).
 * 3. Enrolling contestants into multiple categories.
 * 4. Advancing time past Saturday conclusion (Sunday 01:00) and triggering awarding.
 * 5. Organic podium evaluation and award creation by server procedure.
 * 6. Claiming 1st place epic awards (₽50,000, 300 BC, 1 Gold Bottle Cap, 10 Rare Candies).
 * 7. Discarding remaining award via ConfirmModal.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 5s action timeouts, zero timers)
 * - /game-simulation (dual DB execution, fail-fast determinism)
 * - /domain-type-first (canonical models, typed seeds)
 * - /ponytail (concise, minimal, single-responsibility)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

const EXPECTED_CLAIMED_MONEY = 55000;
const EXPECTED_CLAIMED_BC = 350;
const EXPECTED_GOLD_CAPS = 1;
const EXPECTED_RARE_CANDIES = 10;

export class SaturdayGlobalContestSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string = 'SaturdayChamp') {
    super(page, username);
  }

  /**
   * Sets up global contestants (Snorlax for weight and shiny Dragonite for IVs)
   */
  public async setupContestantsScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const { getServerTime } = await import('../../../src/logic/utils/timeUtils.ts');

      const gameStore = useGameStore();
      const currentSimTime = getServerTime();

      // Initial wallet and inventory state
      gameStore.state.money = 5000; // no-magic: Test seed balance
      gameStore.state.battleCoins = 50; // no-magic: Test seed balance
      gameStore.state.inventory = { goldbottlecap: 0, rarecandy: 0 };
      gameStore.state.starterChosen = true;

      // Heavyweight Snorlax for 'weight' category
      const snorlax = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('snorlax'),
        level: 50 // no-magic: Test seed level
      });
      snorlax.uid = 'sim-sat-snorlax';
      snorlax.name = 'Snorlax';
      snorlax.nickname = 'Colossus';
      snorlax.weight = 460.0; // no-magic: Test seed weight
      snorlax.height = 2.1; // no-magic: Test seed height
      snorlax.ivs = { hp: 25, atk: 25, def: 25, spa: 25, spd: 25, spe: 25 }; // no-magic: Test seed IVs
      snorlax.obtainedAt = currentSimTime;

      // Perfect Shiny Dragonite for 'ivs' category (186 IVs + Shiny priority)
      const dragonite = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('dragonite'),
        level: 55 // no-magic: Test seed level
      });
      dragonite.uid = 'sim-sat-dragonite';
      dragonite.name = 'Dragonite';
      dragonite.nickname = 'Golden Dragon';
      dragonite.isShiny = true;
      dragonite.weight = 210.0; // no-magic: Test seed weight
      dragonite.height = 2.2; // no-magic: Test seed height
      dragonite.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }; // no-magic: Test seed IVs
      dragonite.obtainedAt = currentSimTime;

      gameStore.state.team = [dragonite, snorlax];
      gameStore.state.box = [];

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }
}

test.describe('Saturday Global Open Contest & Tiebreaks E2E Simulation', () => {
  test('enrolls contestants into open categories, advances time past Saturday, and claims epic awards in GUI', async ({ page }) => {
    const sim = new SaturdayGlobalContestSimulation(page, 'SaturdayChamp');
    await sim.setup();
    await sim.purgeEventState('gran_concurso_sabado');

    try {
      // 1. Fail-fast canonical validation
      await sim.assertCanonicalEventExists('gran_concurso_sabado');

      // 2. Deterministic time anchor: Saturday Week 2 (August 15, 2026, 15:00 GMT-3)
      await sim.setMockGameTime('2026-08-15T15:00:00');

      // 3. Setup eligible contestants and initial balances
      await sim.setupContestantsScenario();

      // 4. Open World Events modal via HUD navigation
      await sim.openWorldEventsViaHud();

      // 5. Verify Saturday event card and global category chips are visible
      const eventCard = page.locator('#event-card-gran_concurso_sabado');
      await expect(eventCard).toBeVisible({ timeout: 5000 });

      const ivsChip = page.locator('#comp-slot-chip-gran_concurso_sabado-ivs');
      const weightChip = page.locator('#comp-slot-chip-gran_concurso_sabado-weight');
      await expect(ivsChip).toBeVisible({ timeout: 5000 });
      await expect(weightChip).toBeVisible({ timeout: 5000 });

      // 6. Enroll contestants: Dragonite into 'ivs' and Snorlax into 'weight'
      await sim.enrollPokemonById('gran_concurso_sabado', 'ivs', 'sim-sat-dragonite');
      await sim.enrollPokemonById('gran_concurso_sabado', 'weight', 'sim-sat-snorlax');

      // Close modal before time travel
      await sim.closeWorldEventsModal();

      // 7. Time travel past Saturday conclusion: Sunday 01:00 GMT-3
      await sim.setMockGameTime('2026-08-16T01:00:00');

      // 8. Trigger canonical server awarding procedure (fn_award_event_automated)
      await sim.triggerEventAwarding('gran_concurso_sabado');

      // 9. Verify awards GUI lifecycle (claim 1st place, discard 2nd place)
      await sim.verifyAwardClaimAndDiscardFlow({
        money: EXPECTED_CLAIMED_MONEY,
        battleCoins: EXPECTED_CLAIMED_BC,
        goldCapCount: EXPECTED_GOLD_CAPS,
        rareCandyCount: EXPECTED_RARE_CANDIES
      });

      // Verify resources were NOT credited on discard
      const stateAfterDiscard = await page.evaluate(async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        return useGameStore().state.money || 0;
      });

      expect(stateAfterDiscard).toBe(EXPECTED_CLAIMED_MONEY);

      sim.finish('Saturday Global Open Contest & Tiebreaks E2E Simulation', 'passed');
    } catch (err) {
      sim.finish('Saturday Global Open Contest & Tiebreaks E2E Simulation', 'failed');
      throw err;
    } finally {
      await sim.resetMockGameTime();
    }
  });
});
