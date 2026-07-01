import { test, expect } from '@playwright/test';
import { setupE2ESession, loginTestUser } from '../e2e_helpers.ts';

test.describe('Daycare Daily Missions E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    const testUser = `TEST_MISSIONS_${Date.now()}`;
    await loginTestUser(page, testUser);
  });

  test('should view daily missions, attempt with invalid pokemon, and complete with valid pokemon', async ({ page }) => {
    // 1. Inyectar un Caterpie nivel 1 y un Caterpie nivel 50 en la PC box
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();

      // Caterpie frágil (no cumplirá nivel alto si se requiere)
      const babyCaterpie = pokemonDebugService.generate({ id: 'caterpie', level: 1 });
      babyCaterpie.nickname = 'BABY_CATERPIE';

      // Caterpie experto
      const masterCaterpie = pokemonDebugService.generate({ id: 'caterpie', level: 50 });
      masterCaterpie.nickname = 'MASTER_CATERPIE';

      // Para evitar que el Save Shield bloquee el guardado:
      gameStore.state.starterChosen = true;
      gameStore.state.team = [pokemonDebugService.generate({ id: 'caterpie', level: 5 })];

      // Agregar ambos a la caja
      gameStore.state.box = [babyCaterpie, masterCaterpie];

      // Forzar misiones diarias estáticas para hacer el test predecible
      // Misión: Entregar un Caterpie con nivel mínimo de 30 a cambio de 1 Caramelo Raro
      const today = Temporal.Now.plainDateISO().toString();
      gameStore.state.daycare_missions = [
        {
          date: today,
          targetId: 'caterpie',
          requirement: {
            type: 'level',
            minLevel: 30
          },
          reqText: 'Caterpie con nivel superior a 30',
          reward: {
            id: 'rarecandy',
            name: 'Caramelo Raro',
            qty: 1,
            icon: '🍬'
          },
          completed: false,
          trainerType: 'cazabichos',
          trainerName: 'Juan',
          trainerSprite: 'bugcatcher',
          dialogue: 'Se busca un Caterpie con nivel superior a 30.'
        }
      ];

      await gameStore.saveGame();
    });

    await page.reload();
    const mapaBtn = page.locator('button:has-text("MAPA")').first();
    await mapaBtn.waitFor({ state: 'visible', timeout: 15000 });

    // 2. Abrir Guardería (Daycare) -> Misiones
    await page.click('button:has-text("MARKET")');
    await page.click('button:has-text("LOCAL")');

    const daycareTab = page.locator('button:has-text("GUARDERÍA"), button:has-text("DAYCARE")').first();
    await daycareTab.waitFor({ state: 'visible', timeout: 5000 });
    await daycareTab.click();

    // Ir a la sección o botón de misiones dentro del daycare
    const missionsSecBtn = page.locator('button:has-text("MISIONES"), .daycare-missions-tab').first();
    await missionsSecBtn.waitFor({ state: 'visible', timeout: 5000 });
    await missionsSecBtn.click();

    // 3. Confirmar que la misión está listada
    const missionCard = page.locator('.mission-card:has-text("Se busca un Caterpie")').first();
    await expect(missionCard).toBeVisible();

    // Intentar entregar el Caterpie nivel 1 (BABY_CATERPIE)
    // El test hace click en el botón de entregar o completar en la misión
    const entregarBtn = missionCard.locator('button:has-text("COMPLETAR"), button:has-text("ENTREGAR")').first();
    await entregarBtn.click();

    // Debería abrirse un modal de selección de Pokémon. Seleccionamos el de nivel 1
    const babyOption = page.locator('.list-item:has-text("BABY_CATERPIE"), button:has-text("BABY_CATERPIE")').first();
    await babyOption.waitFor({ state: 'visible', timeout: 5000 });
    await babyOption.click();

    // Debería fallar o no completar la misión porque no tiene el nivel suficiente.
    // Verificamos que la misión siga sin completarse
    const isCompletedAfterFail = await page.evaluate(() => {
      interface MockGameStore {
        state: {
          daycare_missions: { completed: boolean }[];
        };
      }
      const win = window as unknown as Record<string, () => MockGameStore>;
      const getStore = win.useGameStore;
      if (!getStore) return false;
      const gameStore = getStore();
      return gameStore.state.daycare_missions[0]?.completed ?? false;
    });
    expect(isCompletedAfterFail).toBe(false);

    // 4. Volver a intentar y elegir al Caterpie nivel 50 (MASTER_CATERPIE)
    // Si el modal de selección se cerró tras el fallo, volvemos a hacer click en entregar
    if (!await babyOption.isVisible()) {
      await entregarBtn.click();
    }
    const masterOption = page.locator('.list-item:has-text("MASTER_CATERPIE"), button:has-text("MASTER_CATERPIE")').first();
    await masterOption.waitFor({ state: 'visible', timeout: 5000 });
    await masterOption.click();

    // 5. Verificar que la misión se marque como completada en el store y se haya removido al Caterpie de nivel 50
    await page.waitForFunction(() => {
      interface MockGameStore {
        state: {
          daycare_missions: { completed: boolean }[];
        };
      }
      const win = window as unknown as Record<string, () => MockGameStore>;
      const getStore = win.useGameStore;
      if (!getStore) return false;
      const gameStore = getStore();
      return gameStore.state.daycare_missions[0]?.completed === true;
    }, undefined, { timeout: 10000 });

    const stateCheck = await page.evaluate(() => {
      interface TargetPoke {
        nickname: string;
      }
      interface MockGameStore {
        state: {
          box: (TargetPoke | null)[];
          inventory: Record<string, number>;
        };
      }
      const win = window as unknown as Record<string, () => MockGameStore>;
      const getStore = win.useGameStore;
      if (!getStore) return { hasMaster: false, hasBaby: false, candyQty: 0 };
      const gameStore = getStore();
      const hasMaster = gameStore.state.box.some((p: TargetPoke | null) => p?.nickname === 'MASTER_CATERPIE');
      const hasBaby = gameStore.state.box.some((p: TargetPoke | null) => p?.nickname === 'BABY_CATERPIE');
      const candyQty = gameStore.state.inventory?.rarecandy ?? 0;
      return { hasMaster, hasBaby, candyQty };
    });

    expect(stateCheck.hasMaster).toBe(false); // Removido
    expect(stateCheck.hasBaby).toBe(true);    // Conservado
    expect(stateCheck.candyQty).toBe(1);      // Recibió premio
  });
});
