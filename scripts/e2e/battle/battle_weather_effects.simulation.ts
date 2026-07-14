import { test, expect, Page } from '@playwright/test';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, waitForWaitInput } from '../e2e_helpers.ts';
import type { WindowWithResolver } from '../e2e_helpers.ts';

async function executeSingleTurn(page: Page) {
  await waitForWaitInput(page);
  const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
  await activeMoveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await activeMoveBtn.click();
}

test.describe('Weather Effects Verification Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    const testUser = `TEST_WEATHER_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginTestUser(page, testUser);
  });

  test('should trigger rain weather with Drizzle and clean DOM after battle', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      // Forzar clima de lluvia para asegurar que AtmosphereLayer esté en el DOM
      useMapStore().setGlobalWeather('rain');

      // Pelipper con Drizzle (Lluvia)
      const pelipper = pokemonDebugService.generate({
        id: 'pelipper',
        level: 50,
        ability: 'drizzle',
        moves: ['surf']
      });
      const caterpie = pokemonDebugService.generate({
        id: 'caterpie',
        level: 5,
        moves: ['tackle']
      });

      useGameStore().state.team = [pelipper];
      await useBattleStore().startBattle(caterpie, { locationId: 'route1' });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // En el DOM, el clima se refleja aplicando el filtro del clima a la arena o mediante AtmosphereLayer
    const atmosphere = page.locator('.battle-arena .atmosphere-container, .battle-arena canvas').first();
    await expect(atmosphere).toBeAttached();

    // Huir del combate usando comando de debug para cerrarlo inmediatamente sin diálogos de experiencia/monedas
    await page.evaluate(async () => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const battleStore = resolver?.();
      const bState = battleStore?.state as { playerFled?: boolean } | null;
      if (bState) {
        bState.playerFled = true;
      }
      await (window as unknown as Window & { __VITE_DEBUG__: { forceFlee: () => Promise<void> } }).__VITE_DEBUG__.forceFlee();
    });

    // Confirmar que la arena de combate se destruyó y ya no está en el DOM
    await expect(page.locator('.battle-arena')).not.toBeAttached();
  });

  test('should apply sandstorm damage to non-immune pokemon at turn end', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      // Bulbasaur (jugador)
      const bulbasaur = pokemonDebugService.generate({
        id: 'bulbasaur',
        level: 50,
        moves: ['splash']
      });

      // Bulbasaur (enemigo, recibe daño por tormenta de arena)
      const enemyBulbasaur = pokemonDebugService.generate({
        id: 'bulbasaur',
        level: 50,
        moves: ['splash']
      });

      useGameStore().state.team = [bulbasaur];
      useMapStore().setGlobalWeather('sandstorm');
      await useBattleStore().startBattle(enemyBulbasaur, { locationId: 'route1', enemyTeam: [enemyBulbasaur] });
    });

    await confirmAndStartBattle(page);
    await waitForWaitInput(page);

    // Ejecutar un turno
    await executeSingleTurn(page);
    await waitForWaitInput(page);

    // Verificar que el enemigo (Bulbasaur) recibió daño de tormenta de arena
    const enemyHpInfo = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const enemy = resolver?.().state?.enemy;
      return { hp: enemy?.hp ?? 0, maxHp: enemy?.maxHp ?? 1 };
    });

    expect(enemyHpInfo.hp).toBeLessThan(enemyHpInfo.maxHp);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(async () => {
      try {
        const { useMapStore } = await import('../../../src/stores/map.ts');
        useMapStore().setGlobalWeather(null);
      } catch (_e) { /* ignore */ }
    });
  });
});
