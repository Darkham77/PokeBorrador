import { test, expect, Page } from '@playwright/test';

interface DebugStore {
  currentFsmState?: string;
  currentSubState?: string;
  isProcessing?: boolean;
  isIntroAnimating?: boolean;
  state?: {
    over?: boolean;
    turnCount?: number;
    player?: { hp?: number; maxHp?: number } | null;
    enemy?: { hp?: number; maxHp?: number } | null;
  } | null;
}

type WindowWithResolver = typeof window & {
  __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
};

async function waitForWaitInput(page: Page) {
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return false;
    const store = resolver();
    return (store.currentFsmState === 'ACTIVE_BATTLE' && 
            (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
            !store.state || store.state.over;
  }, undefined, { timeout: 15000 });
}

async function confirmAndStartBattle(page: Page) {
  const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
  await combatirBtn.waitFor({ state: 'visible', timeout: 15000 });
  await combatirBtn.click();
}

async function executeSingleTurn(page: Page) {
  await waitForWaitInput(page);
  const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
  await activeMoveBtn.waitFor({ state: 'visible', timeout: 5000 });
  await activeMoveBtn.click();
}

test.describe('E2E Weather Effects Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E__ = true;
      localStorage.setItem('pwa_permissions_accepted', 'true');
      localStorage.setItem('auto-battle', 'false');
    });

    await page.goto('/login');
    await page.locator('button:has-text("Local")').click();
    const testUser = `TEST_WEATHER_${Date.now()}`;
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
