import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { awaitBattleReadyForInput } from '../e2e_helpers.ts';

class PvpReconnectSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupAndPersistPvpBattle(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const pvpPikachu = pokemonDebugService.generate({ id: 'pikachu', level: 50 });
      const advCharmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });

      gameStore.state.team = [advCharmander];
      gameStore.state.box = [pvpPikachu];
      gameStore.state.pvpTeam = [pvpPikachu.uid];
      gameStore.state.starterChosen = true;

      const enemyGengar = pokemonDebugService.generate({ id: 'gengar', level: 50 });

      await battleStore.startBattle(enemyGengar, {
        isPvP: true,
        pvpMatchId: 'sim-reconnect-match-1',
        pvpIsHost: true,
        pvpOpponentName: 'Rival Gary',
        enemyTeam: [enemyGengar],
        playerTeam: [pvpPikachu],
        isTrainer: true,
        trainerName: 'Rival Gary',
        trainerSprite: 'blue',
        locationId: 'gym'
      });

      // Save game state with active battle
      await gameStore.save(false, true, true);
    });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('PvP Reconnection & Persistence (F5) Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('preserves PvP battle state and dedicated team across page refresh (F5)', async ({ page }) => {
    const sim = new PvpReconnectSimWrapper(page, 'PvpF5Sim');
    await sim.setup();
    await sim.setupAndPersistPvpBattle();

    // 1. Reload the page (simulating browser close or F5 refresh)
    await page.reload();
    await awaitBattleReadyForInput(page);

    // 2. Assert battle is still PvP
    const isPvP = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().isPvP;
    });
    expect(isPvP).toBe(true);

    // 3. Assert active combatant is the PvP Pokemon (Pikachu), NOT the adventure Pokemon (Charmander)
    const activePlayerName = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.player?.name;
    });
    expect(activePlayerName).toBe('Pikachu');

    // 4. Assert turn clock is visible
    const clock = page.locator('#pvp-turn-timer-clock');
    await expect(clock).toBeVisible({ timeout: 10000 });
  });
});
