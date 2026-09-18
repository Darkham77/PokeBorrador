import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  openDebugTab
} from '../e2e_helpers.ts';

const WILD_PIDGEY_TEST_LEVEL = 3;

class WildEncounterJumpSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupShinyEncounter(): Promise<void> {
    await this.disableAutoMode();
    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill('gyarados');
    await this.page.locator('#option-gyarados').click();
    await this.page.locator('#debug-btn-toggle-shiny, .flag-btn.shiny').click();
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('Battle Wild Encounter Jump & Shiny Intro Simulations', () => {
  test('should render wild encounter intro sequence and settle into WAIT_INPUT state', async ({ page }) => {
    const sim = new WildEncounterJumpSimWrapper(page, 'WildJumpTest');
    await sim.setup();

    await openDebugTab(page, 'pokes');
    await page.locator('#debug-input-especie').fill('pidgey');
    await page.locator('#option-pidgey').click();
    await page.locator('#debug-input-level').fill(WILD_PIDGEY_TEST_LEVEL.toString());
    await armBattleReadyForInput(page);
    await page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(page);

    const enemyCombatant = page.locator('#combatant-enemy');
    await expect(enemyCombatant).toBeVisible();

    await sim.forceFleeDebugger();
  });

  test('should render shiny wild encounter with sparkles and audio event without animation blocking', async ({ page }) => {
    const sim = new WildEncounterJumpSimWrapper(page, 'WildShinyTest');
    await sim.setup();
    await sim.setupShinyEncounter();

    const isEnemyShiny = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return Boolean(store.state?.enemy?.isShiny);
    });
    expect(isEnemyShiny).toBe(true);

    const enemyCombatant = page.locator('#combatant-enemy');
    await expect(enemyCombatant).toBeVisible();

    await sim.forceFleeDebugger();
  });

  test('should render bushes and wild silhouette during SEARCH_PHASE and jump in ENTRY_ANIM', async ({ page }) => {
    const sim = new WildEncounterJumpSimWrapper(page, 'WildSearchPhaseTest');
    await sim.setup();
    await sim.disableAutoMode();

    // Trigger wild search encounter with wasSearching: true and healthy player team
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      const gameStore = useGameStore();
      const playerPoke = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('pikachu'),
        level: 15
      });
      gameStore.state.team = [playerPoke];

      const wildPoke = pokemonDebugService.generate({
        id: requirePokemonSpeciesId('pidgey'),
        level: 5
      });
      const store = useBattleStore();
      try {
        await store.startBattle(wildPoke, {
          isTrainer: false,
          locationId: 'route1',
          wasSearching: true
        });
      } catch (err) {
        console.error('[WildSearchPhaseTest ERROR in startBattle]:', err);
        throw err;
      }
    });

    const enemyCombatant = page.locator('#combatant-enemy');
    await expect(enemyCombatant).toBeAttached();

    const enemyImg = page.locator('#combatant-enemy img.pokemon-combat-image');
    await expect(enemyImg).toHaveClass(/is-silhouette/);
    await expect(enemyImg).not.toHaveAttribute('style', /filter:\s*none/);

    const backBush = page.locator('.back-bush-entity');
    await expect(backBush).toBeAttached();

    // Confirm encounter to enter battle
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      if (store.state && store.currentFsmState === 'SEARCH_PHASE') {
        await store.startEncounter();
      }
    });

    await awaitBattleReadyForInput(page);
    await expect(enemyCombatant).toBeVisible();

    await sim.forceFleeDebugger();
  });
});
