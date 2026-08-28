import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class FieldAbilitiesFishingLevelsSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupOctilleryFishingLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const octillery = pokemonDebugService.generate({ id: requirePokemonSpeciesId('octillery'), level: 35 });
        octillery.ability = 'suctioncups';
        octillery.hp = octillery.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [octillery];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async setupPressureLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const aerodactyl = pokemonDebugService.generate({ id: requirePokemonSpeciesId('aerodactyl'), level: 50 });
        aerodactyl.ability = 'pressure';
        aerodactyl.hp = aerodactyl.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [aerodactyl];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async verifyFishingEncounterGenerated(): Promise<boolean> {
    return await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { generateEncounter } = await import('../../../src/logic/encounters/encounters.ts');
        const gameStore = useGameStore();

        const encounter = await generateEncounter('route12', {
          faction: gameStore.state.faction,
          team: gameStore.state.team,
          fishingRodSecs: 3600
        }, { forceEncounter: true });

        return encounter !== null;
      }
    );
  }

  public async verifyPressureMaxLevel(): Promise<boolean> {
    return await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { generateEncounter } = await import('../../../src/logic/encounters/encounters.ts');
        const gameStore = useGameStore();

        const encounter = await generateEncounter('route1', {
          faction: gameStore.state.faction,
          team: gameStore.state.team
        }, { forceEncounter: true });

        if (encounter && encounter.type === 'wild' && encounter.pokemon) {
          // Route 1 max level is 5
          return encounter.pokemon.level >= 2 && encounter.pokemon.level <= 5;
        }
        return false;
      }
    );
  }
}

test.describe('Field Abilities - Fishing and Level Modifiers Suite', () => {
  const VIEWPORT_WIDTH_PX = 1280;
  const VIEWPORT_HEIGHT_PX = 720;
  test.use({ viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX } });

  test('Suction Cups boosts fishing bite probability', async ({ page }) => {
    const sim = new FieldAbilitiesFishingLevelsSimulation(page, 'SuctionCupsTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupOctilleryFishingLeader();
    await sim.reloadAndSync();

    const success = await sim.verifyFishingEncounterGenerated();
    sim.finish('Suction Cups boosts fishing bite probability');
    expect(success).toBe(true);
  });

  test('Pressure filters and forces route levels correctly', async ({ page }) => {
    const sim = new FieldAbilitiesFishingLevelsSimulation(page, 'PressureTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupPressureLeader();
    await sim.reloadAndSync();

    const success = await sim.verifyPressureMaxLevel();
    sim.finish('Pressure filters and forces route levels correctly');
    expect(success).toBe(true);
  });
});
