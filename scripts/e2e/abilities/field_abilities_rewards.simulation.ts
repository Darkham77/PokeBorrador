import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class FieldAbilitiesRewardsSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupPickupAndNaturalCureParty(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const meowth = pokemonDebugService.generate({ id: requirePokemonSpeciesId('meowth'), level: 30 });
        meowth.ability = 'pickup';
        meowth.hp = meowth.maxHp;

        const chansey = pokemonDebugService.generate({ id: requirePokemonSpeciesId('chansey'), level: 40 });
        chansey.ability = 'naturalcure';
        chansey.hp = chansey.maxHp;
        chansey.status = 'psn';

        gameStore.state.starterChosen = true;
        gameStore.state.team = [meowth, chansey];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async triggerBattleRewardsAndVerify(): Promise<{ chanseyClean: boolean; itemCollected: boolean }> {
    return await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { resolveFieldBattleRewards } = await import('../../../src/logic/rules/fieldRulesCoordinator.ts');
        const gameStore = useGameStore();

        const rewards = resolveFieldBattleRewards({
          team: gameStore.state.team,
          isWild: true,
          isTrainer: false,
          randomFn: () => 0.01 // deterministic trigger
        });

        const chansey = gameStore.state.team.find(p => p?.id === 'chansey');
        return {
          chanseyClean: chansey?.status === '',
          itemCollected: rewards.pickupItems.length > 0
        };
      }
    );
  }
}

test.describe('Field Abilities - Post-Battle Rewards Suite (pickup, honeygather, naturalcure)', () => {
  const VIEWPORT_WIDTH_PX = 1280;
  const VIEWPORT_HEIGHT_PX = 720;
  test.use({ viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX } });

  test('Pickup collects level-bracketed item and Natural Cure cures status post-battle', async ({ page }) => {
    const sim = new FieldAbilitiesRewardsSimulation(page, 'RewardsTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupPickupAndNaturalCureParty();
    await sim.reloadAndSync();

    const result = await sim.triggerBattleRewardsAndVerify();
    sim.finish('Pickup collects level-bracketed item and Natural Cure cures status post-battle');
    expect(result.chanseyClean).toBe(true);
    expect(result.itemCollected).toBe(true);
  });
});
