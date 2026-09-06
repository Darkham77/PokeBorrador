import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { awaitBattleReadyForInput, clickResilient } from '../e2e_helpers.ts';

const SIM_CASUAL_INITIAL_ELO = 1650 as const;
const SIM_LOW_HP_VALUE = 10 as const;

class PvpCasualSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupCasualPvpBattle(): Promise<void> {
    await this.page.evaluate(async ({ initialElo, lowHp }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();
      const livePvPStore = useLivePvPStore();
      const pvpStore = usePvPStore();

      pvpStore.elo = initialElo;

      const pvpPikachu = pokemonDebugService.generate({ id: 'pikachu', level: 50 });
      const pvpCharizard = pokemonDebugService.generate({ id: 'charizard', level: 50 });

      gameStore.state.team = [pvpPikachu];
      gameStore.state.box = [pvpCharizard];
      gameStore.state.pvpTeam = [pvpPikachu.uid, pvpCharizard.uid];
      gameStore.state.starterChosen = true;

      const enemyGengar = pokemonDebugService.generate({ id: 'gengar', level: 50 });
      enemyGengar.hp = lowHp;

      livePvPStore.battleState.isRanked = false;
      livePvPStore.battleState.active = true;

      await battleStore.startBattle(enemyGengar, {
        isPvP: true,
        isRanked: false,
        pvpMatchId: 'sim-casual-match-1',
        pvpIsHost: true,
        pvpOpponentName: 'Friendly Rival',
        enemyTeam: [enemyGengar],
        playerTeam: [pvpPikachu, pvpCharizard],
        isTrainer: true,
        trainerName: 'Friendly Rival',
        trainerSprite: 'blue',
        locationId: 'gym'
      });
    }, { initialElo: SIM_CASUAL_INITIAL_ELO, lowHp: SIM_LOW_HP_VALUE });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('PvP Casual Battle Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('executes casual friendly match and verifies zero ELO rating delta on victory', async ({ page }) => {
    const sim = new PvpCasualSimWrapper(page, 'PvpCasualSim');
    await sim.setup();
    await sim.setupCasualPvpBattle();

    // 1. Turn clock is visible even in casual PvP
    const turnClock = page.locator('#pvp-turn-timer-clock');
    await expect(turnClock).toBeVisible({ timeout: 10000 });

    // 2. Click Move 0 to execute turn
    const move0 = page.locator('#move-btn-0').first();
    await expect(move0).toBeVisible({ timeout: 10000 });
    await clickResilient(move0);

    // 3. Complete casual battle victory and assert zero ELO change
    const eloAfter = await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const livePvPStore = useLivePvPStore();
      const pvpStore = usePvPStore();

      livePvPStore.endBattle(true, '¡Victoria amistosa!');

      return pvpStore.elo;
    });

    // Initial ELO was 1650, MUST remain exactly 1650
    expect(eloAfter).toBe(SIM_CASUAL_INITIAL_ELO);
  });
});
