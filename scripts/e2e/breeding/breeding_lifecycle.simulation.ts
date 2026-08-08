import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { MAX_PER_ACTION_TIMEOUT_MS, MAX_UI_SETTLE_TIMEOUT_MS } from '../simulation_config.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

const SIMULATION_POKEMON_LEVEL = 50;
const SIMULATION_VIGOR_VAL = 10;
const SIMULATION_INITIAL_MONEY_VAL = 20000;
const SIMULATION_DAYCARE_HOURS_PAST = 24;
const SIMULATION_ACTIVE_POKEMON_LEVEL = 5;

class BreedingLifecycleSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupDittoAndBulbasaur(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
      const gameStore = useGameStore();

      const ditto = pokemonDebugService.generate({ id: requirePokemonSpeciesId('ditto'), level: SIMULATION_POKEMON_LEVEL });
      ditto.vigor = SIMULATION_VIGOR_VAL;
      ditto.maxVigor = SIMULATION_VIGOR_VAL;
      
      const bulbasaur = pokemonDebugService.generate({ id: requirePokemonSpeciesId('bulbasaur'), level: SIMULATION_POKEMON_LEVEL });
      bulbasaur.vigor = SIMULATION_VIGOR_VAL;
      bulbasaur.maxVigor = SIMULATION_VIGOR_VAL;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [ditto, bulbasaur];
      gameStore.state.box = [];
      gameStore.state.money = SIMULATION_INITIAL_MONEY_VAL;

      await gameStore.saveGame();
    });
  }

  public async depositInDaycare(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const gameStore = useGameStore();
      const breedingStore = useBreedingStore();

      const p1 = gameStore.state.team.find((p) => p && p.id === 'ditto') || gameStore.state.team[0];
      const p2 = gameStore.state.team.find((p) => p && p.id === 'bulbasaur') || gameStore.state.team[1] || gameStore.state.box[0];
      if (!p1 || !p2) throw new Error('Parents not found');

      p1.inDaycare = true;
      p1.daycareSlot = 0;
      const past = Temporal.Now.instant().subtract({ hours: SIMULATION_DAYCARE_HOURS_PAST }).toString();
      p1.daycareDepositedAt = past;

      p2.inDaycare = true;
      p2.daycareSlot = 1;
      p2.daycareDepositedAt = past;

      breedingStore.slots[0] = { pokemon: p1, slotIndex: 0, deposited_at: past };
      breedingStore.slots[1] = { pokemon: p2, slotIndex: 1, deposited_at: past };

      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const activePoke = pokemonDebugService.generate({ id: 'caterpie', level: SIMULATION_ACTIVE_POKEMON_LEVEL });
      gameStore.state.team = [activePoke];
      gameStore.state.box = [p1, p2];

      await gameStore.saveGame();
      await breedingStore.loadDaycare();
    });
  }

  public async generateAndClaimEgg(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const breedingStore = useBreedingStore();
      if (breedingStore?.checkAndGenerateEgg) {
        await breedingStore.checkAndGenerateEgg();
      }
    });

    await this.clickElement('#nav-crianza-btn');
    await this.clickElement('[id^="egg-card-"]');
    await this.clickElement('#confirm-modal-btn');
  }

  public async forceEggReadyToHatch(): Promise<void> {
    await this.page.waitForFunction(async () => {
      try {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const store = useGameStore();
        return !!store?.state?.eggs && store.state.eggs.length > 0;
      } catch {
        return false;
      }
    });

    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      if (gameStore.state.eggs && gameStore.state.eggs.length > 0) {
        const firstEgg = gameStore.state.eggs[0];
        if (firstEgg) {
          firstEgg.steps = 0;
          firstEgg.ready = true;
        }
      }
    });
  }

  public async performHatchingSequence(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      useModalStore().closeAll();
    });
    await this.clickElement('[id^="egg-hud-card-"].is-ready');

    const hatchContainer = this.page.locator('#hatch-container');
    await hatchContainer.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await hatchContainer.click();
    await hatchContainer.click();
    await this.page.waitForFunction(() => document.querySelector('#hatch-container'), undefined, { timeout: MAX_UI_SETTLE_TIMEOUT_MS }).catch(() => null);
    await hatchContainer.click();
    await this.page.waitForFunction(() => document.querySelector('#hatch-container'), undefined, { timeout: MAX_UI_SETTLE_TIMEOUT_MS }).catch(() => null);
    await hatchContainer.click();

    await this.clickElement('#hatch-continue-btn', MAX_PER_ACTION_TIMEOUT_MS);
    const mapBtn = this.page.locator('#nav-map-btn').filter({ visible: true }).first();
    await expect(mapBtn).toBeVisible({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  public async verifyNewbornInBox(): Promise<boolean> {
    try {
      await this.page.waitForFunction(async () => {
        try {
          const { useGameStore } = await import('../../../src/stores/game.ts');
          const gameStore = useGameStore();
          const allPokemon = [...gameStore.state.team, ...gameStore.state.box];
          return allPokemon.some((p) => p && p.level === 1 && p.id === 'bulbasaur');
        } catch {
          return false;
        }
      }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
      return true;
    } catch {
      return false;
    }
  }
}

test.describe('Breeding & Hatching Lifecycle Simulation', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should breed Ditto and Bulbasaur, generate an egg, and hatch it', async ({ page }) => {
    const testUser = `TEST_BREED_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new BreedingLifecycleSimulation(page, testUser);

    // 1. Setup session y login
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Cargar padres DittoxBulbasaur y depositar en guardería
    await sim.setupDittoAndBulbasaur();
    await sim.reloadAndSync();
    await sim.depositInDaycare();
    await sim.reloadAndSync();

    // 3. Reclamar el huevo en el almacén
    await sim.generateAndClaimEgg();

    // 4. Eclosionar el huevo
    await sim.forceEggReadyToHatch();
    await sim.performHatchingSequence();

    // 5. Validar que el Bulbasaur nacido esté registrado
    const success = await sim.verifyNewbornInBox();
    sim.finish('Breeding & Hatching Lifecycle Simulation');
    expect(success).toBe(true);
  });
});
