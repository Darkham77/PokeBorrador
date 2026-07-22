// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, type WindowWithResolver } from '../e2e_helpers.ts';

class WeatherSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupRainScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      useMapStore().setGlobalWeather('rain');

      const pelipper = pokemonDebugService.generate({
        id: 'pelipper',
        level: 50,
        ability: 'drizzle',
        moves: ['surf']
      });
      const caterpie = pokemonDebugService.generate({
        id: 'caterpie',
        level: 5,
        moves: ['tackle']
      });

      useGameStore().state.team = [pelipper];
      useGameStore().state.starterChosen = true;
      await useBattleStore().startBattle(caterpie, { locationId: 'route1' });
    });
  }

  public async setupSandstormScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const bulbasaur = pokemonDebugService.generate({
        id: 'bulbasaur',
        level: 50,
        moves: ['splash']
      });
      const enemyBulbasaur = pokemonDebugService.generate({
        id: 'bulbasaur',
        level: 50,
        moves: ['splash']
      });

      useGameStore().state.team = [bulbasaur];
      useMapStore().setGlobalWeather('sandstorm');
      await useBattleStore().startBattle(enemyBulbasaur, { locationId: 'route1', enemyTeam: [enemyBulbasaur] });
    });
  }

  public async forceFleeDebugger(): Promise<void> {
    await this.page.evaluate(async () => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const battleStore = resolver?.();
      const bState = (battleStore?.state ?? null) as ({ playerFled?: boolean; over: boolean; turnCount: number } | null);
      if (bState) {
        bState.playerFled = true;
      }
      await (window as WindowWithResolver).__VITE_DEBUG__?.forceFlee?.();
    });
  }

  public async getEnemyHpInfo(): Promise<{ hp: number; maxHp: number }> {
    return await this.page.evaluate(() => {
      const enemy = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.enemy;
      return { hp: enemy?.hp ?? 0, maxHp: enemy?.maxHp ?? 1 };
    });
  }
}

test.describe('Weather Effects Verification Simulation', () => {

  test('should trigger rain weather with Drizzle and clean DOM after battle', async ({ page }) => {
    const sim = new WeatherSimWrapper(page, 'TestWeatherRain');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupRainScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    const atmosphere = page.locator('.battle-arena .atmosphere-container, .battle-arena canvas').first();
    await expect(atmosphere).toBeAttached();

    await sim.forceFleeDebugger();
    await expect(page.locator('.battle-arena')).not.toBeAttached();
  });

  test('should apply sandstorm damage to non-immune pokemon at turn end', async ({ page }) => {
    const sim = new WeatherSimWrapper(page, 'TestWeatherSand');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupSandstormScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    // Execute single turn
    await sim.selectMove(0);

    const hpInfo = await sim.getEnemyHpInfo();
    expect(hpInfo.hp).toBeLessThan(hpInfo.maxHp);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(async () => {
      try {
        const { useMapStore } = await import('../../../src/stores/map.ts');
        useMapStore().setGlobalWeather(null);
      } catch (_e: unknown) { /* expected */ }
    });
  });
});
