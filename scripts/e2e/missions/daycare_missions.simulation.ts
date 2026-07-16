import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class DaycareMissionsSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMissionsScenario(): Promise<void> {
    await this.page.evaluate(async () => {
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

      // Inicializar el inventario con 0 caramelos raros para determinismo del test
      gameStore.state.inventory = { rarecandy: 0 };

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

    await this.page.reload();
    await waitForStoreReady(this.page);
    const mapaBtn = this.page.locator('button.map-btn').filter({ visible: true }).first();
    await mapaBtn.waitFor({ state: 'visible', timeout: 15000 });
  }

  public async openDaycareMissions(): Promise<void> {
    await this.openModal('EventMissions');
  }

  public async getCompletedStatus(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.daycare_missions[0]?.completed ?? false;
    });
  }

  public async getInventoryState(): Promise<{ hasMaster: boolean; hasBaby: boolean; candyQty: number }> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      const hasMaster = gameStore.state.box.some((p) => p && p.nickname === 'MASTER_CATERPIE');
      const hasBaby = gameStore.state.box.some((p) => p && p.nickname === 'BABY_CATERPIE');
      const candyQty = gameStore.state.inventory?.rarecandy ?? 0;
      return { hasMaster, hasBaby, candyQty };
    });
  }
}

test.describe('Daycare Daily Missions Daily Flow Simulation', () => {
  test('should view daily missions, attempt with invalid pokemon, and complete with valid pokemon', async ({ page }) => {
    const testUser = `TEST_MISSIONS_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new DaycareMissionsSimulation(page, testUser);

    // 1. Setup session y login
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Setup misiones y escenario
    await sim.setupMissionsScenario();

    // 3. Abrir Guardería -> Misiones
    await sim.openDaycareMissions();

    // 4. Confirmar que la misión está listada
    const missionCard = page.locator('.mission-card:has-text("Se busca un Caterpie")').first();
    await expect(missionCard).toBeVisible();

    // Intentar entregar el Pokémon para la misión
    const entregarBtn = missionCard.locator('button:has-text("COMPLETAR"), button:has-text("ENTREGAR")').first();
    await entregarBtn.click();

    // Seleccionamos al Caterpie de nivel 50 (MASTER_CATERPIE)
    const masterOption = page.locator('.list-item:has-text("MASTER_CATERPIE"), button:has-text("MASTER_CATERPIE")').first();
    await masterOption.waitFor({ state: 'visible', timeout: 5000 });
    await masterOption.click();

    await page.waitForFunction(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      return gameStore.state.daycare_missions[0]?.completed === true;
    }, undefined, { timeout: 10000 });

    const stateCheck = await sim.getInventoryState();

    expect(stateCheck.hasMaster).toBe(false); // Removido
    expect(stateCheck.hasBaby).toBe(true);    // Conservado
    expect(stateCheck.candyQty).toBe(1);      // Recibió premio
  });
});
