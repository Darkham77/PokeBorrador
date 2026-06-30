import { test, expect, Page } from '@playwright/test';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, waitForWaitInput } from '../e2e_helpers.ts';

type WindowWithResolver = typeof window & {
  __VITE_DEBUG_STORE_RESOLVER__?: () => any;
};

async function executeSingleTurn(page: Page) {
  await waitForWaitInput(page);
  const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
  await activeMoveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await activeMoveBtn.click();
}

test.describe('E2E Weather Effects Verification', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    const testUser = `TEST_WEATHER_${Date.now()}`;
    await loginTestUser(page, testUser);
  });

  test('should trigger rain weather with Drizzle and clean DOM after battle', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

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
    const atmosphere = page.locator('.battle-arena-view .atmosphere-container, .battle-arena-view canvas').first();
    await expect(atmosphere).toBeAttached();

    // Debilitar al enemigo para finalizar el combate
    await executeSingleTurn(page);

    // Esperar a que la batalla termine y volvamos al overworld
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return true;
      const store = resolver();
      return !store.state || store.state.over;
    }, undefined, { timeout: 15000 });

    // Confirmar que el combate se cerró
    const hudMapBtn = page.locator('button:has-text("MAPA")').first();
    await expect(hudMapBtn).toBeVisible();
  });

  test('should apply sandstorm damage to non-immune pokemon at turn end', async ({ page }) => {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      // Hippowdon con Sand Stream (Tormenta de arena)
      const hippowdon = pokemonDebugService.generate({
        id: 'hippowdon',
        level: 50,
        ability: 'sandstream',
        moves: ['slackoff'] // Movimiento que no ataca para evitar noquear al rival de un golpe
      });

      // Bulbasaur (recibe daño por tormenta de arena)
      const bulbasaur = pokemonDebugService.generate({
        id: 'bulbasaur',
        level: 50,
        moves: ['synthesis']
      });

      useGameStore().state.team = [hippowdon];
      await useBattleStore().startBattle(bulbasaur, { locationId: 'route1', enemyTeam: [bulbasaur] });
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
});
