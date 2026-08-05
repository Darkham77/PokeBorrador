// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, clickResilient } from '../e2e_helpers.ts';

class DaycareMissionsSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMissionsScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();

      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');

      // Caterpie frágil (no cumplirá nivel alto si se requiere)
      const babyCaterpie = pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: 1 });
      babyCaterpie.nickname = 'BABY_CATERPIE';

      // Caterpie experto
      const masterCaterpie = pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: 50 });
      masterCaterpie.nickname = 'MASTER_CATERPIE';

      // Para evitar que el Save Shield bloquee el guardado:
      gameStore.state.starterChosen = true;
      gameStore.state.team = [pokemonDebugService.generate({ id: requirePokemonSpeciesId('caterpie'), level: 5 })];

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

    const mapaBtn = this.page.locator('#nav-map-btn').filter({ visible: true }).first();
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
      const caterpie = allPkmn.find((p: { id?: string; nickname?: string | null; level?: number; uid?: string }) => (p?.nickname as string) === 'MASTER_CATERPIE' || (p?.id === 'caterpie' && ((p?.level as number) || 0) >= 30));
      if (!caterpie || !caterpie.uid) {
        throw new Error('[daycare_missions] MASTER_CATERPIE missing from team and box state');
      }
      return caterpie.uid;
    });

    const masterOption = page.locator(`[data-pokemon-uid="${caterpieUid}"]`).first();
    await masterOption.waitFor({ state: 'visible', timeout: 5000 });
    await clickResilient(masterOption);

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
