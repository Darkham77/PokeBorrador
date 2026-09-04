/**
 * scripts/e2e/events/event_awards_gui_lifecycle.simulation.ts
 *
 * E2E Simulation Suite 2: World Events Awards GUI Lifecycle (Enfoque B - 100% Orgánico)
 * Validates the complete interactive lifecycle of event awards:
 * 1. Player enrolls eligible Pokémon into tournament categories (ivs and weight).
 * 2. Simulation advances game time past tournament conclusion (18:00 - 22:00 -> 23:00).
 * 3. Canonical server procedure fn_award_event_automated runs organically, computing podiums and creating awards.
 * 4. GUI renders EventPendingAwardsBanner with the generated awards.
 * 5. Player claims 1st place award: GUI updates, money/BC/items credited.
 * 6. Player discards 2nd award: ConfirmModal opens, confirms discard, award removed without credit.
 *
 * Conforms 100% to:
 * - /project-standards (100% ID locators, 5s action timeouts, zero timers)
 * - /game-simulation (dual DB execution, fail-fast determinism)
 * - /domain-type-first (canonical models, typed seeds)
 * - /ponytail (concise, minimal, single-responsibility)
 */

import { test, expect, type Page } from '@playwright/test';
import { BaseEventSimulation } from './base_event_simulation.ts';

const EXPECTED_CLAIMED_MONEY = 26000;
const EXPECTED_CLAIMED_BC = 160;
const EXPECTED_GOLD_CAPS = 1;
const EXPECTED_RARE_CANDIES = 5;

export class EventAwardsGuiLifecycleSimulation extends BaseEventSimulation {
  constructor(page: Page, username: string = 'AwardMaster') {
    super(page, username);
  }

  /**
   * Sets up eligible competition Pokémon (Shellder and Horsea) and baseline wallet balances.
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
      gameStore.state.money = 1000; // no-magic: Test seed baseline balance
      gameStore.state.battleCoins = 10; // no-magic: Test seed baseline balance
      gameStore.state.inventory = { goldbottlecap: 0, rarecandy: 0 };
      gameStore.state.starterChosen = true;

      // Shellder: Heavy weight contestant for 'weight' category
      const shellder = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('shellder'),
        level: 25 // no-magic: Test seed level
      });
      shellder.uid = 'sim-award-shellder';
      shellder.name = 'Shellder';
      shellder.nickname = 'Titan Shell';
      shellder.weight = 35.0; // no-magic: Test seed weight
      shellder.height = 0.5; // no-magic: Test seed height
      shellder.ivs = { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 }; // no-magic: Test seed IVs
      shellder.obtainedAt = currentSimTime;

      // Horsea: Perfect 186 IVs contestant for 'ivs' category
      const horsea = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('horsea'),
        level: 28 // no-magic: Test seed level
      });
      horsea.uid = 'sim-award-horsea';
      horsea.name = 'Horsea';
      horsea.nickname = 'Gene Sea';
      horsea.weight = 18.0; // no-magic: Test seed weight
      horsea.height = 0.6; // no-magic: Test seed height
      horsea.ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }; // no-magic: Test seed IVs
      horsea.obtainedAt = currentSimTime;

      gameStore.state.team = [horsea, shellder];
      gameStore.state.box = [];

      const isOffline = localStorage.getItem('pokevicio_session_mode') === 'offline';
      if (isOffline) {
        const { persistSQLite } = await import('../../../src/logic/db/sqliteEngine.ts');
        await persistSQLite();
      }
    });
  }
}

test.describe('World Events Awards GUI Lifecycle E2E Simulation', () => {
  test('enrolls contestants, awards via server procedure, claims 1st award in GUI, and discards 2nd award via ConfirmModal', async ({ page }) => {
    const sim = new EventAwardsGuiLifecycleSimulation(page, 'AwardMaster');
    await sim.setup();

    try {
      // 1. Fail-fast canonical validation
      await sim.assertCanonicalEventExists('torneo_pesca');

      // 2. Deterministic time anchor: Tuesday Week 2 during active tournament window (18:00 - 22:00)
      await sim.setMockGameTime('2026-08-11T19:00:00');

      // 3. Setup eligible contestants and initial balances
      await sim.setupContestantsScenario();

      // 4. Open World Events modal and enroll Horsea into 'ivs' category
      await sim.openWorldEventsViaHud();
      await sim.enrollPokemonById('torneo_pesca', 'ivs', 'sim-award-horsea');

      // 5. Enroll Shellder into 'weight_shellder' category
      await sim.enrollPokemonById('torneo_pesca', 'weight_shellder', 'sim-award-shellder');

      // Close modal to prepare for time travel
      await sim.closeWorldEventsModal();

      // 6. Time travel past tournament conclusion (23:00 GMT-3)
      await sim.setMockGameTime('2026-08-11T23:00:00');

      // 7. Trigger canonical server awarding procedure (fn_award_event_automated)
      await sim.triggerEventAwarding('torneo_pesca');

      // 8. Verify awards GUI lifecycle (claim 1st place, discard 2nd place)
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
      sim.finish('World Events Awards GUI Lifecycle E2E Simulation', 'passed');
    } catch (err) {
      sim.finish('World Events Awards GUI Lifecycle E2E Simulation', 'failed');
      throw err;
    } finally {
      await sim.resetMockGameTime();
    }
  });
});
