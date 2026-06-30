import { test, expect } from '@playwright/test';

test.describe('Save Shield Integration & Security E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E__ = true;
      localStorage.setItem('pwa_permissions_accepted', 'true');
      localStorage.setItem('auto-battle', 'false');
    });

    await page.goto('/login');
    await page.locator('button:has-text("Local")').click();
    const testUser = `TEST_SAVE_SHIELD_${Date.now()}`;
    await page.fill('input[placeholder="Nombre de Entrenador"]', testUser);
    await page.click('button:has-text("JUGAR LOCAL")');

    const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
    try {
      await starterCard.waitFor({ state: 'visible', timeout: 10000 });
      await starterCard.click();
    } catch (_e) {
      // Ignore if starter already chosen
    }

    const mapaBtn = page.locator('button:has-text("MAPA")').first();
    await mapaBtn.waitFor({ state: 'attached', timeout: 30000 });
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
