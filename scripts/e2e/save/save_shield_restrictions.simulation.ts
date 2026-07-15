import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class SaveShieldSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async attemptSaveWithZeroPokemon(): Promise<{ success: boolean; error?: string }> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();

      // Forzar estado de corrupción: 0 Pokémon en equipo y banca
      gameStore.state.team = [];
      gameStore.state.box = [];
      gameStore.state.starterChosen = true;

      // Intentar guardar la partida
      return await gameStore.save();
    });
  }

  public async attemptSaveWithUnchosenStarter(): Promise<{ success: boolean; error?: string }> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();

      // Forzar estado de corrupción: starterChosen = false
      gameStore.state.starterChosen = false;

      // Intentar guardar la partida
      return await gameStore.save();
    });
  }
}

test.describe('Save Shield Integration & Security Simulation', () => {
  test('should block saving the game when Pokemon count is 0', async ({ page }) => {
    const testUser = `TEST_SAVE_SHIELD_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new SaveShieldSimulation(page, testUser);

    await sim.setup();
    await waitForStoreReady(page);

    const result = await sim.attemptSaveWithZeroPokemon();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot save with 0 Pokémon or unchosen starter');
  });

  test('should block saving the game when starterChosen is false', async ({ page }) => {
    const testUser = `TEST_SAVE_SHIELD_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new SaveShieldSimulation(page, testUser);

    await sim.setup();
    await waitForStoreReady(page);

    const result = await sim.attemptSaveWithUnchosenStarter();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot save with 0 Pokémon or unchosen starter');
  });
});
