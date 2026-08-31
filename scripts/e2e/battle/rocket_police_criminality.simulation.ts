// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  clickResilient
} from '../e2e_helpers.ts';

class RocketPoliceSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setPlayerState(params: {
    playerClass: string;
    classLevel: number;
    criminality: number;
    money: number;
  }): Promise<void> {
    await this.page.evaluate(async (p) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const gameStore = useGameStore();
      const uiStore = useUIStore();
      const modalStore = useModalStore();

      modalStore.closeAll();
      gameStore.state.playerClass = p.playerClass as import('../../../src/data/player/playerClasses.ts').PlayerClassId;
      gameStore.state.classLevel = p.classLevel;
      gameStore.state.classData = {
        captureStreak: 0,
        longestStreak: 0,
        reputation: 0,
        blackMarketSales: 0,
        criminality: p.criminality,
        blackMarketDaily: { date: '', items: [], purchased: [] },
        extortedRouteId: null,
        officialRouteId: null,
        kitCaptures: 0
      };
      gameStore.state.money = p.money;
      gameStore.state.starterChosen = true;
      uiStore.activeTab = 'map';
    }, params);
  }
}

test.describe('Rocket Police Criminality and Difficulty E2E Simulation (Tier 3)', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/dev-import-db-cleanup');
  });

  test('should display criminality bar progression with excess levels and reset to 0% after police resolution', async ({ page }) => {
    const sim = new RocketPoliceSimWrapper(page, 'TestRocketPolice');
    await sim.setup();

    // 1. Initial State: Team Rocket with 0% Criminality
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: 5,
      criminality: 0,
      money: 50000
    });

    const crimBar = page.locator('#criminality-bar');
    await expect(crimBar).toBeVisible();

    const crimLabel = page.locator('#criminality-percent-label');
    const crimFill = page.locator('#criminality-bar-fill');

    await expect(crimLabel).toHaveText('0%');
    await expect(crimFill).toHaveAttribute('style', /height:\s*0%/);

    // 2. Set Criminality to 50%
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: 5,
      criminality: 50,
      money: 50000
    });
    await expect(crimLabel).toHaveText('50%');
    await expect(crimFill).toHaveAttribute('style', /height:\s*50%/);

    // 3. Set Criminality to 100% (Alert threshold)
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: 5,
      criminality: 100,
      money: 50000
    });
    await expect(crimLabel).toHaveText('100%');
    await expect(crimFill).toHaveAttribute('style', /height:\s*100%/);

    // 4. Set Criminality to 150% (Excess: +5 LV)
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: 5,
      criminality: 150,
      money: 50000
    });
    await expect(crimLabel).toHaveText('150% (+5 LV)');
    await expect(crimFill).toHaveAttribute('style', /height:\s*100%/);

    // 5. Set Criminality to 200% (Excess: +10 LV, SWAT squad 6 Pokemon)
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: 10,
      criminality: 200,
      money: 50000
    });
    await expect(crimLabel).toHaveText('200% (+10 LV)');
    await expect(crimFill).toHaveAttribute('style', /height:\s*100%/);

    // 6. Spawn and trigger police battle with 200% criminality on route1
    await page.evaluate(async () => {
      const { buildTrainerEncounter } = await import('../../../src/logic/battle/trainerSpawner.ts');
      const { requireMapRouteId } = await import('../../../src/data/world/map-assets.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const enc = await buildTrainerEncounter(
        {
          playerClass: 'rocket',
          classData: gameStore.state.classData,
          trainerChance: 5
        },
        requireMapRouteId('route1')
      );

      await battleStore.startBattle(enc.enemyTeam[0]!, {
        isTrainer: true,
        trainerName: enc.name,
        trainerSprite: enc.sprite,
        trainerArchetype: enc.archetype,
        enemyTeam: enc.enemyTeam,
        locationId: 'route1',
        wasSearching: false
      });
    });

    // 7. Verify in battle store that police is active with scaled difficulty
    const battleData = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        isBattleActive: Boolean(store.isBattleActive),
        archetype: store.state?.trainerArchetype,
        trainerName: store.state?.trainerName,
        teamLength: store.state?.enemyTeam?.length ?? 0,
        firstEnemyLevel: store.state?.enemy?.level ?? 0
      };
    });

    expect(battleData.isBattleActive).toBe(true);
    expect(battleData.archetype).toBe('policeman');
    expect(battleData.trainerName).toContain('Oficial de Policía');
    expect(battleData.teamLength).toBe(6); // SWAT team for 200% crim
    expect(battleData.firstEnemyLevel).toBe(17); // base 2 + 5 offset + 10 bonus = 17

    // 8. Conclude battle with defeat (paying bail)
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      await store.endBattle(false, false); // defeat
    });

    // 9. Close battle modal and return to map
    await armBattleFlowCompletion(page);
    const exitBattleButton = page.locator('#exit-battle-btn').first();
    if (await exitBattleButton.isVisible()) {
      await clickResilient(exitBattleButton);
    }
    await awaitBattleFlowCompletion(page);

    // 10. Verify that on map tab, criminality has been reset to 0% and bail deducted
    await expect(crimLabel).toHaveText('0%');
    await expect(crimFill).toHaveAttribute('style', /height:\s*0%/);

    const finalMoney = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.money;
    });
    // Bail for level 10 at 200% criminality: 10^2 * 80 * 2.0 = 16,000. 50,000 - 16,000 = 34,000.
    expect(finalMoney).toBe(34000);
  });
});
