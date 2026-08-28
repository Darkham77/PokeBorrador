import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class FieldAbilitiesAttractionSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMagnetPullLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const magnemite = pokemonDebugService.generate({ id: requirePokemonSpeciesId('magnemite'), level: 25 });
        magnemite.ability = 'magnetpull';
        magnemite.hp = magnemite.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [magnemite];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async setupStaticLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const pikachu = pokemonDebugService.generate({ id: requirePokemonSpeciesId('pikachu'), level: 25 });
        pikachu.ability = 'static';
        pikachu.hp = pikachu.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [pikachu];
        gameStore.state.box = [];
      }
    );
    await this.saveGameAndAwaitExport();
  }

  public async verifyElementalAttraction(targetType: string): Promise<boolean> {
    return await this.page.evaluate(
      async ({ expType }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { generateEncounter } = await import('../../../src/logic/encounters/encounters.ts');
        const gameStore = useGameStore();

        const encounter = await generateEncounter('power_plant', {
          faction: gameStore.state.faction,
          team: gameStore.state.team
        }, { forceEncounter: true });

        if (encounter && encounter.type === 'wild' && encounter.pokemon) {
          return encounter.pokemon.type === expType || encounter.pokemon.type2 === expType;
        }
        return false;
      },
      { expType: targetType }
    );
  }
}

test.describe('Field Abilities - Elemental Attraction Suite (magnetpull, static, lightningrod, flashfire, stormdrain, harvest)', () => {
  const VIEWPORT_WIDTH_PX = 1280;
  const VIEWPORT_HEIGHT_PX = 720;
  test.use({ viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX } });

  test('Magnet Pull attracts Steel-type wild Pokémon', async ({ page }) => {
    const sim = new FieldAbilitiesAttractionSimulation(page, 'MagnetPullTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupMagnetPullLeader();
    await sim.reloadAndSync();

    const success = await sim.verifyElementalAttraction('steel');
    sim.finish('Magnet Pull attracts Steel-type wild Pokémon');
    expect(success).toBe(true);
  });

  test('Static attracts Electric-type wild Pokémon', async ({ page }) => {
    const sim = new FieldAbilitiesAttractionSimulation(page, 'StaticTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupStaticLeader();
    await sim.reloadAndSync();

    const success = await sim.verifyElementalAttraction('electric');
    sim.finish('Static attracts Electric-type wild Pokémon');
    expect(success).toBe(true);
  });
});
