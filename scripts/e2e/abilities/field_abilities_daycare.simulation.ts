import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

const MOCK_MAGMAR_LEVEL = 30;
const INITIAL_EGG_STEPS = 20;
const MOCK_IV_STAT_VALUE = 10;
const EXPECTED_REMAINING_STEPS = 16;

class FieldAbilitiesDaycareSimulation extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupFlameBodyParty(): Promise<void> {
    await this.page.evaluate(
      async ({ magmarLevel, eggSteps, ivVal }) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requirePokemonSpeciesId } = await import('../../../src/data/pokemon/pokedex.ts');
        const gameStore = useGameStore();

        const magmar = pokemonDebugService.generate({ id: requirePokemonSpeciesId('magmar'), level: magmarLevel });
        magmar.ability = 'flamebody';
        magmar.hp = magmar.maxHp;

        gameStore.state.starterChosen = true;
        gameStore.state.team = [magmar];
        gameStore.state.box = [];
        gameStore.state.eggs = [
          {
            uid: 'sim-egg-1',
            id: requirePokemonSpeciesId('charmander'),
            steps: eggSteps,
            ready: false,
            isNpc: false,
            ivs: { hp: ivVal, atk: ivVal, def: ivVal, spa: ivVal, spd: ivVal, spe: ivVal },
            nature: 'hardy',
            movesAtBirth: [],
            abilitySlot: 0,
            isShiny: false
          }
        ];
      },
      { magmarLevel: MOCK_MAGMAR_LEVEL, eggSteps: INITIAL_EGG_STEPS, ivVal: MOCK_IV_STAT_VALUE }
    );
    await this.saveGameAndAwaitExport();
  }

  public async stepBreedingReduction(): Promise<number> {
    return await this.page.evaluate(
      async () => {
        const { useBreedingStore } = await import('../../../src/stores/breeding.ts');
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const breedingStore = useBreedingStore();
        const gameStore = useGameStore();

        breedingStore.reduceHatchTimers('battle');
        return gameStore.state.eggs[0]?.steps ?? -1;
      }
    );
  }
}

test.describe('Field Abilities - Daycare Hatching Suite (flamebody, magmaarmor, steamengine)', () => {
  const VIEWPORT_WIDTH_PX = 1280;
  const VIEWPORT_HEIGHT_PX = 720;
  test.use({ viewport: { width: VIEWPORT_WIDTH_PX, height: VIEWPORT_HEIGHT_PX } });

  test('Flame Body doubles egg step reduction rate during battles', async ({ page }) => {
    const sim = new FieldAbilitiesDaycareSimulation(page, 'FlameBodyTestUser');
    await sim.setup();
    await waitForStoreReady(page);

    await sim.setupFlameBodyParty();
    await sim.reloadAndSync();

    const remainingSteps = await sim.stepBreedingReduction();
    sim.finish('Flame Body doubles egg step reduction rate during battles');
    // Starting at 20 steps, reducing by 2*2x = 4 -> 16 steps remaining
    expect(remainingSteps).toBe(EXPECTED_REMAINING_STEPS);
  });
});
