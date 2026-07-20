import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput } from '../e2e_helpers.ts';
import type { WindowWithResolver } from '../e2e_helpers.ts';

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
    const sim = new ManualScenariosSimWrapper(page, 'TestManual_Revive');
    await sim.setup();
    await waitForWaitInput(page);

    await sim.setupReviveScenario();
    await sim.startBattle();

    const reviveCard = page.locator('.quick-item-card:not(.is-disabled):has(img[alt="Revivir"]), .quick-item-card:not(.is-disabled):has(img[alt*="Rev"])').first();
    await reviveCard.waitFor({ state: 'visible', timeout: 10000 });
    await reviveCard.click();

    const targetBtn = page.locator('.list-item:has(.name:has-text("Charmander")), button:has-text("Charmander")').first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await targetBtn.click();

    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentSubState === 'WAIT_INPUT' || !!(store.state && store.state.player && store.state.player.hp === 0);
    }, undefined, { timeout: 10000 });

    expect(await sim.getCharmanderHp()).toBeGreaterThan(0);

    // Jugar combate de forma automática hasta el final (sin fuzzer choices, usando fallbacks)
    await sim.playBattle();
  });
});
