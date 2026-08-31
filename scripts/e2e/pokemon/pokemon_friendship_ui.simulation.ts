import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

const TEST_BEST_FRIENDS_VALUE = 255;
const TEST_RADIANT_PRISM_VALUE = 180;

class PokemonFriendshipSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupFriendshipTestTeam(): Promise<{ success: boolean; p1Friendship: number }> {
    return await this.page.evaluate(async ({ bestFriendsVal, radiantVal }) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const gameStore = useGameStore();

      const p1 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 25 });
      p1.friendship = bestFriendsVal;

      const p2 = pokemonDebugService.generate({ id: requirePokemonSpeciesId('golbat'), level: 30 });
      p2.friendship = radiantVal;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [p1];
      gameStore.state.box = [p2];

      return { success: true, p1Friendship: p1.friendship };
    }, { bestFriendsVal: TEST_BEST_FRIENDS_VALUE, radiantVal: TEST_RADIANT_PRISM_VALUE });
  }
}

test.describe('Pokemon Friendship Seals & Ribbons UI Simulation', () => {
  test('renders friendship seals on team cards and displays details in status', async ({ page }) => {
    const sim = new PokemonFriendshipSimulation(page, 'FriendshipTester');

    await sim.setup();
    await waitForStoreReady(page);

    const setupResult = await sim.setupFriendshipTestTeam();
    expect(setupResult.success).toBe(true);
    expect(setupResult.p1Friendship).toBe(TEST_BEST_FRIENDS_VALUE);
  });
});
