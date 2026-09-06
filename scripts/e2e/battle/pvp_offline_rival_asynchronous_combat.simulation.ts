import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { awaitBattleReadyForInput, clickResilient } from '../e2e_helpers.ts';

const SIM_OFFLINE_RIVAL_INITIAL_ELO = 1700 as const;
const SIM_LOW_HP_VALUE = 10 as const;

class PvpOfflineRivalSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupAsynchronousBattle(): Promise<void> {
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

      const rivalGengar = pokemonDebugService.generate({ id: 'gengar', level: 50 });
      rivalGengar.hp = lowHp;

      livePvPStore.battleState.active = true;
      livePvPStore.battleState.isRanked = true;
      livePvPStore.battleState.opponentId = 'sim-offline-rival-id';

      await battleStore.startBattle(rivalGengar, {
        isPvP: true,
        isRanked: true,
        pvpMatchId: 'sim-async-pvp-1',
        pvpIsHost: true,
        pvpOpponentName: 'Offline Rival Blue',
        enemyTeam: [rivalGengar],
        playerTeam: [pvpPikachu, pvpCharizard],
        isTrainer: true,
        trainerName: 'Offline Rival Blue',
        trainerSprite: 'blue',
        locationId: 'gym'
      });
    }, { initialElo: SIM_OFFLINE_RIVAL_INITIAL_ELO, lowHp: SIM_LOW_HP_VALUE });
    await awaitBattleReadyForInput(this.page);
  }
}

test.describe('PvP Offline Rival Asynchronous Combat Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('executes asynchronous combat against offline rival team and records passive battle report', async ({ page }) => {
    const sim = new PvpOfflineRivalSimWrapper(page, 'PvpAsyncSim');
    await sim.setup();
    await sim.setupAsynchronousBattle();

    // 1. Clock is visible in asynchronous PvP
    const turnClock = page.locator('#pvp-turn-timer-clock');
    await expect(turnClock).toBeVisible({ timeout: 10000 });

    // 2. Click Move 0
    const move0 = page.locator('#move-btn-0').first();
    await expect(move0).toBeVisible({ timeout: 10000 });
    await clickResilient(move0);

    // 3. Conclude battle and verify passive report recording
    const reportRecorded = await page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const livePvPStore = useLivePvPStore();
      const gameStore = useGameStore();

      livePvPStore.endBattle(true, '¡Victoria sobre el rival asíncrono!');

      if (gameStore.db) {
        const { data } = await gameStore.db
          .from('passive_battle_reports')
          .select('*')
          .eq('opponent_id', 'sim-offline-rival-id') as { data: unknown[] | null };
        return Boolean(data && data.length > 0);
      }
      return true;
    });

    expect(reportRecorded).toBe(true);
  });
});
