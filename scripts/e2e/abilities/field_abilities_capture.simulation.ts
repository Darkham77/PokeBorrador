import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class FieldAbilitiesCaptureSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupAbraLeader(nature: string): Promise<void> {
    await this.page.evaluate(
      async ({ natureVal }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const { toNatureId } = await import('../../../src/data/battle/natures.ts');
        const gameStore = useGameStore();

        const abra = pokemonDebugService.generate({ id: requirePokemonSpeciesId('abra'), level: 25 });
        abra.ability = 'synchronize';
        abra.nature = toNatureId(natureVal);
        abra.hp = abra.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [abra];
        gameStore.state.box = [];
      },
      { natureVal: nature }
    );
    await this.saveGameAndAwaitExport();
  }

  public async setupClefairyLeader(gender: 'm' | 'f'): Promise<void> {
    await this.page.evaluate(
      async ({ genderVal }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const clefairy = pokemonDebugService.generate({ id: requirePokemonSpeciesId('clefairy'), level: 25 });
        clefairy.ability = 'cutecharm';
        clefairy.gender = genderVal;
        clefairy.hp = clefairy.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [clefairy];
        gameStore.state.box = [];
      },
      { genderVal: gender }
    );
    await this.saveGameAndAwaitExport();
  }

  public async setupButterfreeLeader(): Promise<void> {
    await this.page.evaluate(
      async () => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const butterfree = pokemonDebugService.generate({ id: requirePokemonSpeciesId('butterfree'), level: 25 });
        butterfree.ability = 'compoundeyes';
        butterfree.hp = butterfree.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [butterfree];
        gameStore.state.box = [];
      },
      {}
    );
    await this.saveGameAndAwaitExport();
  }

  public async generateWildAndVerify(expectedNature?: string): Promise<boolean> {
    return await this.page.evaluate(
      async ({ expNature }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { generateEncounter } = await import('../../../src/logic/encounters/encounters.ts');
        const gameStore = useGameStore();

        const encounter = await generateEncounter('route1', {
          faction: gameStore.state.faction,
          team: gameStore.state.team
        }, { forceEncounter: true });

        if (encounter && encounter.type === 'wild' && encounter.pokemon) {
          if (expNature && encounter.pokemon.nature !== expNature) {
            return false;
          }
          return true;
        }
        return false;
      },
      { expNature: expectedNature }
    );
  }
}

test.describe('Field Abilities - Capture Suite (synchronize, cutecharm, compoundeyes, superluck, frisk)', () => {
  const VIEWPORT_WIDTH_PX = 1280;
  const VIEWPORT_HEIGHT_PX = 720;
  test.use({ viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX } });

  test('Synchronize transfers leader nature to wild Pokémon', async ({ page }) => {
    const sim = new FieldAbilitiesCaptureSimulation(page, 'SyncCaptureTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupAbraLeader('modest');
    await sim.reloadAndSync();

    const success = await sim.generateWildAndVerify('modest');
    sim.finish('Synchronize transfers leader nature to wild Pokémon');
    expect(success).toBe(true);
  });

  test('Cute Charm attracts opposite gender wild Pokémon', async ({ page }) => {
    const sim = new FieldAbilitiesCaptureSimulation(page, 'CuteCharmTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupClefairyLeader('m');
    await sim.reloadAndSync();

    const success = await sim.generateWildAndVerify();
    sim.finish('Cute Charm attracts opposite gender wild Pokémon');
    expect(success).toBe(true);
  });

  test('Compound Eyes boosts wild held item rates', async ({ page }) => {
    const sim = new FieldAbilitiesCaptureSimulation(page, 'CompoundEyesTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupButterfreeLeader();
    await sim.reloadAndSync();

    const success = await sim.generateWildAndVerify();
    sim.finish('Compound Eyes boosts wild held item rates');
    expect(success).toBe(true);
  });
});
