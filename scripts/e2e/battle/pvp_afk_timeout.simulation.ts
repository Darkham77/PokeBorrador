import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { awaitBattleReadyForInput } from '../e2e_helpers.ts';

class PvpAfkTimeoutSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupPvpBattle(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const pvpPikachu = pokemonDebugService.generate({ id: 'pikachu', level: 50 });
      const pvpCharizard = pokemonDebugService.generate({ id: 'charizard', level: 50 });

      gameStore.state.team = [pvpPikachu];
      gameStore.state.pvpTeam = [pvpPikachu.uid, pvpCharizard.uid];
      gameStore.state.starterChosen = true;

      const enemyGengar = pokemonDebugService.generate({ id: 'gengar', level: 50 });

      await battleStore.startBattle(enemyGengar, {
        isPvP: true,
        pvpMatchId: 'sim-afk-match-1',
        pvpIsHost: true,
        pvpOpponentName: 'Rival Gary',
        enemyTeam: [enemyGengar],
        playerTeam: [pvpPikachu, pvpCharizard],
        isTrainer: true,
        trainerName: 'Rival Gary',
        trainerSprite: 'blue',
        locationId: 'gym'
      });
    });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('PvP AFK Timeout & Strike Rules Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('displays AFK Strike 1 badge and forfeits on AFK Strike 2', async ({ page }) => {
    const sim = new PvpAfkTimeoutSimWrapper(page, 'PvpAfkSim');
    await sim.setup();
    await sim.setupPvpBattle();

    // 1. Turn clock is visible
    const clock = page.locator('#pvp-turn-timer-clock');
    await expect(clock).toBeVisible({ timeout: 10000 });

    // 2. Trigger Strike 1 timeout in livePvP store
    await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      useLivePvPStore().afkStrikes = 1;
    });

    const strikeBadge = page.locator('#pvp-afk-strikes');
    await expect(strikeBadge).toBeVisible({ timeout: 10000 });
    await expect(strikeBadge).toContainText('STRIKE 1/2');

    // 3. Trigger Strike 2 timeout (auto forfeit)
    await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      useLivePvPStore()._forfeit();
    });

    // 4. Battle ends
    const isOver = await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      return useLivePvPStore().battleState.phase === 'over';
    });
    expect(isOver).toBe(true);
  });
});
