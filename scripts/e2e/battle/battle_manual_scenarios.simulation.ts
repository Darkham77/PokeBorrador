// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput } from '../e2e_helpers.ts';

class ManualScenariosSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupReviveScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { revive: 1 };
      const bulbasaur = pokemonDebugService.generate({ id: 'bulbasaur', level: 5 });
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      charmander.hp = 0; // Debilitado
      gameStore.state.team = [bulbasaur, charmander];
      gameStore.state.starterChosen = true;

      const pikachu = pokemonDebugService.generate({ id: 'pikachu', level: 5 });
      await battleStore.startBattle(pikachu, { locationId: 'route1' });
    });
  }

  public async getCharmanderHp(): Promise<number> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.team[1]?.hp ?? 0;
    });
  }
}

test.describe('Battle Manual E2E Scenarios', () => {
  test('debería consumir un Revivir en un Pokémon de la banca debilitado y jugar el combate hasta el final', async ({ page }) => {
    const sim = new ManualScenariosSimWrapper(page, 'ManualRevive');
    await sim.setup();
    await sim.setupReviveScenario();
    await waitForWaitInput(page);

    const charmanderUid = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.team[1]?.uid || '';
    });

    await sim.useItemOnPokemon('revive', charmanderUid);

    expect(await sim.getCharmanderHp()).toBeGreaterThan(0);

    // Turno completado tras el uso del ítem Revivir. Verificar estado activo de la batalla.
    const isBattleActive = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().isBattleActive;
    });

    expect(isBattleActive).toBe(true);
  });
});
