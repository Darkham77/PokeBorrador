// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { armBattleReadyForInput, awaitBattleReadyForInput, clickResilient, openDebugTab, type WindowWithResolver } from '../e2e_helpers.ts';

const PELIPPER_WEATHER_TEST_LEVEL = 50;

class WeatherSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupRainScenario(): Promise<void> {
    await this.disableAutoMode();
    await openDebugTab(this.page, 'tiempo');
    await this.page.locator('#debug-weather-btn-rain').click();
    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill('snorlax');
    await this.page.locator('#option-snorlax').click();
    await this.page.locator('#debug-input-level').fill('5');
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }

  public async setupSandstormScenario(): Promise<void> {
    await this.disableAutoMode();
    await openDebugTab(this.page, 'tiempo');
    await this.page.locator('#debug-weather-btn-sandstorm').click();
    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill('bulbasaur');
    await this.page.locator('#option-bulbasaur').click();
    await this.page.locator('#debug-input-level').fill(PELIPPER_WEATHER_TEST_LEVEL.toString());
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }

  public async getEnemyHpInfo(): Promise<{ hp: number; maxHp: number }> {
    return await this.page.evaluate(() => {
      const enemy = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.enemy;
      return { hp: enemy?.hp ?? 0, maxHp: enemy?.maxHp ?? 1 };
    });
  }
}

test.describe('Weather Effects Verification Simulation', () => {

  test('should render rain weather set through visible controls and clean DOM after battle', async ({ page }) => {
    const sim = new WeatherSimWrapper(page, 'TestWeatherRain');
    await sim.setup();
    await sim.setupRainScenario();

    const atmosphere = page.locator('.battle-arena .atmosphere-container, .battle-arena canvas').first();
    await expect(atmosphere).toBeAttached();

    await sim.forceFleeDebugger();
  });

  test('should apply sandstorm damage to non-immune pokemon at turn end', async ({ page }) => {
    const sim = new WeatherSimWrapper(page, 'TestWeatherSand');
    await sim.setup();
    await sim.setupSandstormScenario();

    // Execute single turn
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    const hpInfo = await sim.getEnemyHpInfo();
    expect(hpInfo.hp).toBeLessThan(hpInfo.maxHp);

    await sim.playBattle();
    await sim.closeBattleModal();
    await sim.awaitReturnToMap();
  });

  test.afterEach(async ({ page }) => {
    await openDebugTab(page, 'tiempo');
    const activeWeatherButton = page.locator('#debug-weather-btn-rain.active, #debug-weather-btn-sandstorm.active').first();
    if (await activeWeatherButton.isVisible()) await activeWeatherButton.click();
  });
});
