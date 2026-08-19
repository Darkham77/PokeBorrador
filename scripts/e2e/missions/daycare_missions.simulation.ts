import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, clickResilient } from '../e2e_helpers.ts';

const SIMULATION_BABY_LEVEL = 1;
const SIMULATION_MASTER_LEVEL = 50;
const SIMULATION_ACTIVE_LEVEL = 5;
const SIMULATION_MIN_LEVEL_REQ = 30;
const SIMULATION_REWARD_CANDY_QTY = 1;
const SIMULATION_NAV_TIMEOUT_MS = 15000;
const SIMULATION_SELECTION_TIMEOUT_MS = 5000;
const SIMULATION_COMPLETION_TIMEOUT_MS = 10000;

class DaycareMissionsSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMissionsScenario(): Promise<void> {
    await this.page.evaluate(
      async (opts) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        
        const gameStore = useGameStore();

        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

        // Caterpie frágil (no cumplirá nivel alto si se requiere)
        const babyCaterpie = pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: opts.babyLevel });
        babyCaterpie.nickname = 'BABY_CATERPIE';

        // Caterpie experto
        const masterCaterpie = pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: opts.masterLevel });
        masterCaterpie.nickname = 'MASTER_CATERPIE';

        // Para evitar que el Save Shield bloquee el guardado:
        gameStore.state.starterChosen = true;
        gameStore.state.team = [pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: opts.activeLevel })];

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
              minLevel: opts.minLevelReq
            },
            reqText: `Caterpie con nivel superior a ${opts.minLevelReq}`,
            reward: {
              id: 'rarecandy',
              name: 'Caramelo Raro',
              qty: opts.rewardCandyQty,
              icon: '🍬'
            },
            completed: false,
            trainerType: 'cazabichos',
            trainerName: 'Juan',
            trainerSprite: 'bugcatcher',
            dialogue: `Se busca un Caterpie con nivel superior a ${opts.minLevelReq}.`
          }
        ];

        await gameStore.saveGame();
      },
      {
        babyLevel: SIMULATION_BABY_LEVEL,
        masterLevel: SIMULATION_MASTER_LEVEL,
        activeLevel: SIMULATION_ACTIVE_LEVEL,
        minLevelReq: SIMULATION_MIN_LEVEL_REQ,
        rewardCandyQty: SIMULATION_REWARD_CANDY_QTY
      }
    );

    const mapaBtn = this.page.locator('#nav-map-btn').filter({ visible: true }).first();
    await mapaBtn.waitFor({ state: 'visible', timeout: SIMULATION_NAV_TIMEOUT_MS });
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
    const sim = new DaycareMissionsSimulation(page, 'MissionsUser');

    // 1. Setup session y login
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Setup misiones y escenario
    await sim.setupMissionsScenario();

    // 3. Abrir Guardería -> Misiones
    await sim.openDaycareMissions();

    // 4. Confirmar que la misión está listada
    const missionCard = page.locator('[id^="mission-card-"]').first();
    await expect(missionCard).toBeVisible();

    // Intentar entregar el Pokémon para la misión
    const entregarBtn = missionCard.locator('[id^="deliver-btn-"]').first();
    await clickResilient(entregarBtn);

    // Seleccionamos al Caterpie de nivel 50 (MASTER_CATERPIE) mediante su UID
    const caterpieUid = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore().state;
      const allPkmn = [...(store.team || []), ...(store.box || [])];
      const caterpie = allPkmn.find((p) => p !== null && (p.nickname === 'MASTER_CATERPIE' || (p.id === 'caterpie' && (p.level || 0) >= 30)));
      if (!caterpie || !caterpie.uid) {
        throw new Error('[daycare_missions] MASTER_CATERPIE missing from team and box state');
      }
      return caterpie.uid;
    });

    const masterOption = page.locator(`[data-pokemon-uid="${caterpieUid}"]`).first();
    await masterOption.waitFor({ state: 'visible', timeout: SIMULATION_SELECTION_TIMEOUT_MS });
    await clickResilient(masterOption);

    await expect.poll(async () => {
      return await sim.getCompletedStatus();
    }, { timeout: SIMULATION_COMPLETION_TIMEOUT_MS }).toBe(true);

    const stateCheck = await sim.getInventoryState();

    expect(stateCheck.hasMaster).toBe(false); // Removido
    expect(stateCheck.hasBaby).toBe(true);    // Conservado
    expect(stateCheck.candyQty).toBe(1);      // Recibió premio
  });
});
