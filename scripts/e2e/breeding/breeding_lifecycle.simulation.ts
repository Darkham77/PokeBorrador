// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class BreedingLifecycleSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupDittoAndBulbasaur(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();

      const ditto = pokemonDebugService.generate({ id: 'ditto', level: 50 });
      ditto.vigor = 10;
      ditto.maxVigor = 10;
      
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 50 });
      bulbasaur.vigor = 10;
      bulbasaur.maxVigor = 10;

      gameStore.state.starterChosen = true;
      gameStore.state.team = [ditto];
      gameStore.state.box = [bulbasaur];
      gameStore.state.money = 20000;
      
      await gameStore.saveGame();
    });
  }

  public async depositInDaycare(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
      const gameStore = useGameStore();
      const breedingStore = useBreedingStore();

      const p1 = gameStore.state.team[0];
      const p2 = gameStore.state.box[0];
      if (!p1 || !p2) throw new Error('Parents not found');

      p1.inDaycare = true;
      p1.daycareSlot = 0;
      const past = Temporal.Now.instant().subtract({ hours: 24 }).toString();
      p1.daycareDepositedAt = past;

      p2.inDaycare = true;
      p2.daycareSlot = 1;
      p2.daycareDepositedAt = past;

      breedingStore.slots[0] = { pokemon: p1, slotIndex: 0, deposited_at: past };
      breedingStore.slots[1] = { pokemon: p2, slotIndex: 1, deposited_at: past };

      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const activePoke = pokemonDebugService.generate({ id: 'caterpie', level: 5 });
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

    await this.clickElement('button:has-text("CRIANZA")');
    await this.clickElement('div.egg-card');
    await this.clickElement('button:has-text("ACEPTAR")');
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
    await this.clickElement('.modal-close-btn, .modal-close-btn-floating');
    await this.clickElement('.egg-hud-card.is-ready');

    const hatchContainer = this.page.locator('.hatch-container');
    await hatchContainer.waitFor({ state: 'visible', timeout: 5000 });
    await hatchContainer.click();
    await this.page.waitForTimeout(200);
    await hatchContainer.click();
    await this.page.waitForTimeout(200);
    await hatchContainer.click();

    await this.clickElement('button.btn-confirm:has-text("CONTINUAR"), button:has-text("CONTINUAR")', 15000);
    const mapBtn = this.page.locator('button.map-btn').filter({ visible: true }).first();
    await expect(mapBtn).toBeVisible({ timeout: 15000 });
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
      }, undefined, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }
}

test.describe('Breeding & Hatching Lifecycle Simulation', () => {
  test('should breed Ditto and Bulbasaur, generate an egg, and hatch it', async ({ page }) => {
    const testUser = `TEST_BREED_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new BreedingLifecycleSimulation(page, testUser);

    // 1. Setup session y login
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Cargar padres DittoxBulbasaur y depositar en guardería
    await sim.setupDittoAndBulbasaur();
    await sim.depositInDaycare();

    // 3. Reclamar el huevo en el almacén
    await sim.generateAndClaimEgg();

    // 4. Eclosionar el huevo
    await sim.forceEggReadyToHatch();
    await sim.performHatchingSequence();

    // 5. Validar que el Bulbasaur nacido esté registrado
    const success = await sim.verifyNewbornInBox();
    expect(success).toBe(true);
  });
});
