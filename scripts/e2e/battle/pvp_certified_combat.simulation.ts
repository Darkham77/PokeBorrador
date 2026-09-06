import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { awaitBattleReadyForInput, clickResilient } from '../e2e_helpers.ts';

class PvpCombatSimWrapper extends BaseBattleSimulation {
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
      const pvpBlastoise = pokemonDebugService.generate({ id: 'blastoise', level: 50 });

      const advPidgey = pokemonDebugService.generate({ id: 'pidgey', level: 5 });
      gameStore.state.team = [advPidgey];
      gameStore.state.box = [pvpPikachu, pvpCharizard, pvpBlastoise];
      gameStore.state.pvpTeam = [pvpPikachu.uid, pvpCharizard.uid, pvpBlastoise.uid];
      gameStore.state.starterChosen = true;

      const enemyGengar = pokemonDebugService.generate({ id: 'gengar', level: 50 });
      const enemyAlakazam = pokemonDebugService.generate({ id: 'alakazam', level: 50 });

      await battleStore.startBattle(enemyGengar, {
        isPvP: true,
        pvpMatchId: 'sim-pvp-match-1',
        pvpIsHost: true,
        pvpOpponentName: 'Rival Gary',
        enemyTeam: [enemyGengar, enemyAlakazam],
        playerTeam: [pvpPikachu, pvpCharizard, pvpBlastoise],
        isTrainer: true,
        trainerName: 'Rival Gary',
        trainerSprite: 'blue',
        locationId: 'gym'
      });
    });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('PvP Certified Combat Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('verifies PvP UI restrictions: visual turn timer active, bag disabled, and team isolation', async ({ page }) => {
    const sim = new PvpCombatSimWrapper(page, 'PvpUiCert');
    await sim.setup();
    await sim.setupPvpBattle();

    // 1. Visual Turn Timer Clock MUST be rendered
    const turnClock = page.locator('#pvp-turn-timer-clock');
    await expect(turnClock).toBeVisible({ timeout: 10000 });

    // 2. Bag button MUST be disabled in PvP
    const bagBtn = page.locator('#battle-bag-btn');
    await expect(bagBtn).toBeDisabled({ timeout: 10000 });

    // 3. Quick bag container MUST NOT be rendered
    const quickBag = page.locator('.zone-bag');
    await expect(quickBag).toHaveCount(0);

    // 4. Executing turn with move 0
    const move0 = page.locator('#move-btn-0');
    await expect(move0).toBeVisible({ timeout: 10000 });
    await clickResilient(page.locator('#move-btn-0').first());

    // 5. Battle advances
    const activePlayerName = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.player?.name;
    });
    expect(activePlayerName).toBe('Pikachu');
  });
});
