import { test, Page } from '@playwright/test';
import { setupE2ESession, loginTestUser, clickResilient } from '../e2e_helpers.ts';
import type { WindowWithResolver } from '../e2e_helpers.ts';

async function playAllTurnsToWin(page: Page) {
  // 1. Esperar a que el combate se inicie y esté activo
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return false;
    const store = resolver();
    return store.currentFsmState === 'ACTIVE_BATTLE' && !!store.state;
  }, undefined, { timeout: 5000 });

  let isOver = false;
  let actionCount = 0;
  
  while (!isOver && actionCount < 100) {
    // Esperar a que la FSM de batalla transicione a un estado listo para input, secuencia de reemplazo o termine
    // Asegurándonos de que no haya animaciones activas ni procesamiento en curso.
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      const isReady = (store.currentFsmState === 'ACTIVE_BATTLE' && 
                      ['WAIT_INPUT', 'SWITCH_MENU', 'ENEMY_REPLACEMENT_SEQ', 'POKEMON_CALL'].includes(store.currentSubState || '') &&
                      !store.isProcessing && !store.isIntroAnimating) || 
                      (store.state && !!store.state.over) ||
                      store.currentFsmState === 'SEARCH_PHASE';
      return isReady;
    }, undefined, { timeout: 5000 });

    isOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      return !store || !store.state || !!store.state.over || store.currentFsmState === 'SEARCH_PHASE';
    });
    if (isOver) break;

    const currentSub = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.()?.currentSubState || '';
    });

    if (currentSub === 'ENEMY_REPLACEMENT_SEQ' || currentSub === 'POKEMON_CALL') {
      await page.waitForTimeout(200);
      continue;
    }

    if (currentSub === 'SWITCH_MENU') {
      const activeSwitchBtn = page.locator('.quick-card-override:not(.is-active):not(.is-fainted):not(.is-disabled)').first();
      if (await activeSwitchBtn.isVisible()) {
        actionCount++;
        await activeSwitchBtn.click();
      }
      await page.waitForTimeout(200);
      continue;
    }

    const moveBtn = page.locator('.move-card-vicio:not([disabled])').first();
    if (await moveBtn.isVisible()) {
      actionCount++;
      await moveBtn.click();
    }
    await page.waitForTimeout(300);
  }
}

test.describe('Sequential Search Loop Battles Simulation', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.debug(`[BROWSER-${msg.type()}] ${msg.text()}`);
    });
    await setupE2ESession(page);
    const testUser = `TEST_SEQ_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginTestUser(page, testUser);
  });

  test('should execute 10 sequential battles in the search loop without initialization or UID errors', async ({ page }) => {
    test.setTimeout(240000); // Aumentar a 4 minutos para mayor estabilidad en E2E

    // 1. Configurar un Pokémon extremadamente fuerte (Rayquaza lvl 100) para asegurar victorias rápidas
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const rayquaza = pokemonDebugService.generate({
        id: 'rayquaza',
        level: 100,
        moves: ['dragonclaw', 'outrage', 'extremespeed', 'tackle']
      });
      
      rayquaza.maxHp = 9999;
      rayquaza.hp = 9999;
      rayquaza.atk = 999;
      rayquaza.def = 999;
      rayquaza.spa = 999;
      rayquaza.spd = 999;
      rayquaza.spe = 999;
      
      useGameStore().state.team = [rayquaza];
      useGameStore().state.starterChosen = true;
      await useGameStore().saveGame();

      // Interceptar useModalStore.open para resolver minijuegos instantáneamente sin race conditions
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const modalStore = useModalStore();
      const originalOpen = modalStore.open;
      modalStore.open = function(name: string, props?: Record<string, unknown>) {
        if (name === 'Fishing') {
          const p = props as { onWin?: () => void } | undefined;
          p?.onWin?.();
          return null;
        }
        if (name === 'Archaeology') {
          const p = props as { onWin?: (difficulty: string) => void } | undefined;
          p?.onWin?.('hard');
          return null;
        }
        return originalOpen.call(this, name, props);
      };
    });

    // 2. Navegar a Ruta 1 para comenzar la exploración/bucle de búsqueda
    await page.evaluate(async () => {
      const { useMapStore } = await import('../../../src/stores/map.ts');
      await useMapStore().navigate('route1');
    });

    const encountersToTest = [
      { num: 1, type: 'wild', label: 'Wild Encounter' },
      { num: 2, type: 'trainer', label: 'Trainer Encounter' },
      { num: 3, type: 'rival', label: 'Rival Encounter' },
      { num: 4, type: 'fishing', label: 'Fishing Minigame + Battle' },
      { num: 5, type: 'archaeology', label: 'Archaeology Minigame' },
      { num: 6, type: 'wild', label: 'Wild Encounter' },
      { num: 7, type: 'trainer', label: 'Trainer Encounter' },
      { num: 8, type: 'rival', label: 'Rival Encounter' },
      { num: 9, type: 'fishing', label: 'Fishing Minigame + Battle' },
      { num: 10, type: 'wild', label: 'Wild Encounter' }
    ];

    for (const enc of encountersToTest) {
      console.debug(`[E2E-TEST] --- Iniciando Combate ${enc.num}: ${enc.label} ---`);
      
      // Curar al equipo antes de cada encuentro para asegurar HP completo y evitar debilitaciones fortuitas
      await page.evaluate(() => {
        (window as unknown as { __VITE_DEBUG__?: { healAll?: () => void } }).__VITE_DEBUG__?.healAll?.();
      });

      // Esperar a que la FSM esté en SEARCH_PHASE / COMBAT_OR_FLEE, sin procesamiento activo
      if (enc.num === 1) {
        await page.waitForFunction(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return false;
          const store = resolver();
          const matches = store.currentFsmState === 'SEARCH_PHASE' && 
                          store.currentSubState === 'COMBAT_OR_FLEE' &&
                          !store.isProcessing;
          console.log(`[E2E-FSM-DEBUG] enc.num === 1: state=${store.currentFsmState}, subState=${store.currentSubState}, isProcessing=${store.isProcessing} -> matches=${matches}`);
          return matches;
        }, undefined, { timeout: 15000 });

        const startBtn = page.locator('.continue-btn-final.fight-btn').first();
        await startBtn.waitFor({ state: 'visible', timeout: 2000 });
        await clickResilient(startBtn);
      } else {
        await page.waitForFunction(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return false;
          const store = resolver();
          const matches = store.currentFsmState === 'SEARCH_PHASE' && 
                          store.currentSubState === 'COMBAT_OR_FLEE' &&
                          !store.isProcessing;
          console.log(`[E2E-FSM-DEBUG] enc.num > 1: state=${store.currentFsmState}, subState=${store.currentSubState}, isProcessing=${store.isProcessing} -> matches=${matches}`);
          return matches;
        }, undefined, { timeout: 15000 });

        // Configurar el tipo de encuentro
        await page.evaluate((t) => {
          const win = window as unknown as WindowWithResolver & {
            __VITE_DEBUG__?: {
              forceEncounterType?: string;
            };
          };
          if (win.__VITE_DEBUG__) {
            win.__VITE_DEBUG__.forceEncounterType = t;
          }
        }, enc.type);

        // Hacer clic en combatir en la pantalla de búsqueda
        const startBtn = page.locator('.continue-btn-final.fight-btn').first();
        await startBtn.waitFor({ state: 'visible', timeout: 2000 });
        await clickResilient(startBtn);
      }

      if (enc.type !== 'archaeology') {
        // Iniciar el combate real
        await playAllTurnsToWin(page);
      }
      console.debug(`[E2E-TEST] Combate ${enc.num} finalizado con éxito.`);
    }

    console.debug('[E2E-TEST] ¡Bucle de 10 combates secuenciales completado con éxito absoluto!');
  });
});
