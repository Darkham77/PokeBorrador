import { test, expect } from '@playwright/test';
import { setupE2ESession, loginTestUser } from '../e2e_helpers.ts';

test.describe('Save Shield Integration & Security E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    const testUser = `TEST_SAVE_SHIELD_${Date.now()}`;
    await loginTestUser(page, testUser);
  });

  test('should block saving the game when Pokemon count is 0', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();

      // Forzar estado de corrupción: 0 Pokémon en equipo y banca
      gameStore.state.team = [];
      gameStore.state.box = [];
      gameStore.state.starterChosen = true;

      // Intentar guardar la partida
      return await gameStore.save();
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot save with 0 Pokémon or unchosen starter');
  });

  test('should block saving the game when starterChosen is false', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();

      // Forzar estado de corrupción: starterChosen = false
      gameStore.state.starterChosen = false;

      // Intentar guardar la partida
      return await gameStore.save();
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot save with 0 Pokémon or unchosen starter');
  });
});
