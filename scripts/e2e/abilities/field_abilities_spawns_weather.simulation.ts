import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class FieldAbilitiesSpawnsWeatherSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupArenaTrapLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const dugtrio = pokemonDebugService.generate({ id: requirePokemonSpeciesId('dugtrio'), level: 30 });
        dugtrio.ability = 'arenatrap';
        dugtrio.hp = dugtrio.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [dugtrio];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async setupStenchLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const grimer = pokemonDebugService.generate({ id: requirePokemonSpeciesId('grimer'), level: 25 });
        grimer.ability = 'stench';
        grimer.hp = grimer.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [grimer];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async verifyEncounterWeightRate(expectedRate: number): Promise<boolean> {
    return await this.page.evaluate(
      async ({ expRate }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { calculateEncounterTypeWeights } = await import('../../../src/logic/encounters/encounterHelpers.ts');
        const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider.ts');
        const gameStore = useGameStore();

        const maps = pokemonDataProvider.getMaps();
        const loc = maps.find(m => m.id === 'route1')!;

        const weights = calculateEncounterTypeWeights(loc, 'clear', {
          faction: gameStore.state.faction,
          team: gameStore.state.team
        }, {});

        // Standard ground weight is 100. With 2.0x it is 200; with 0.5x it is 50.
        return weights.groundWeight === 100 * expRate;
      },
      { expRate: expectedRate }
    );
  }
}

test.describe('Field Abilities - Spawns and Weather Rates Suite', () => {
  const VIEWPORT_WIDTH_PX = 1280;
  const VIEWPORT_HEIGHT_PX = 720;
  test.use({ viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX } });

  test('Arena Trap doubles wild ground encounter rate', async ({ page }) => {
    const sim = new FieldAbilitiesSpawnsWeatherSimulation(page, 'ArenaTrapTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupArenaTrapLeader();
    await sim.reloadAndSync();

    const success = await sim.verifyEncounterWeightRate(2.0);
    sim.finish('Arena Trap doubles wild ground encounter rate');
    expect(success).toBe(true);
  });

  test('Stench halves wild ground encounter rate', async ({ page }) => {
    const sim = new FieldAbilitiesSpawnsWeatherSimulation(page, 'StenchTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupStenchLeader();
    await sim.reloadAndSync();

    const success = await sim.verifyEncounterWeightRate(0.5);
    sim.finish('Stench halves wild ground encounter rate');
    expect(success).toBe(true);
  });
});
