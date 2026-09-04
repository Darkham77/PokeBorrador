import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  clickResilient
} from '../e2e_helpers.ts';

const INITIAL_CLASS_LEVEL = 5;
const SWAT_CLASS_LEVEL = 10;
const INITIAL_PLAYER_MONEY = 50000;
const CRIMINALITY_LEVEL_ZERO = 0;
const CRIMINALITY_LEVEL_FIFTY = 50;
const CRIMINALITY_LEVEL_ALERT = 100;
const CRIMINALITY_LEVEL_HIGH = 150;
const CRIMINALITY_LEVEL_SWAT = 200;
const EXPECTED_SWAT_POLICE_LEVEL = 17; // base 2 + 5 offset + 10 bonus = 17
const EXPECTED_SWAT_TEAM_SIZE = 6;
const EXPECTED_REMAINING_MONEY_AFTER_BAIL = 34000;
const EXPECTED_REMAINING_MONEY_AFTER_BAIL_WITH_STEAL = 33200;

const HEIGHT_STYLE_0_REGEX = /height:\s*0%/;
const HEIGHT_STYLE_50_REGEX = /height:\s*50%/;
const HEIGHT_STYLE_100_REGEX = /height:\s*100%/;

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
  test('should display criminality bar progression with excess levels and reset to 0% after police resolution', async ({ page }) => {
    const sim = new RocketPoliceSimWrapper(page, 'TestRocketPolice');
    await sim.setup();

    // 1. Initial State: Team Rocket with 0% Criminality
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: INITIAL_CLASS_LEVEL,
      criminality: CRIMINALITY_LEVEL_ZERO,
      money: INITIAL_PLAYER_MONEY
    });

    const crimBar = page.locator('#criminality-bar');
    await expect(crimBar).toBeVisible();

    const crimLabel = page.locator('#criminality-percent-label');
    const crimFill = page.locator('#criminality-bar-fill');

    await expect(crimLabel).toHaveText('0%');
    await expect(crimFill).toHaveAttribute('style', HEIGHT_STYLE_0_REGEX);

    // 2. Set Criminality to 50%
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: INITIAL_CLASS_LEVEL,
      criminality: CRIMINALITY_LEVEL_FIFTY,
      money: INITIAL_PLAYER_MONEY
    });
    await expect(crimLabel).toHaveText('50%');
    await expect(crimFill).toHaveAttribute('style', HEIGHT_STYLE_50_REGEX);

    // 3. Set Criminality to 100% (Alert threshold)
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: INITIAL_CLASS_LEVEL,
      criminality: CRIMINALITY_LEVEL_ALERT,
      money: INITIAL_PLAYER_MONEY
    });
    await expect(crimLabel).toHaveText('100%');
    await expect(crimFill).toHaveAttribute('style', HEIGHT_STYLE_100_REGEX);

    // 4. Set Criminality to 150% (Excess: +5 LV)
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: INITIAL_CLASS_LEVEL,
      criminality: CRIMINALITY_LEVEL_HIGH,
      money: INITIAL_PLAYER_MONEY
    });
    await expect(crimLabel).toHaveText('150% (+5 LV)');
    await expect(crimFill).toHaveAttribute('style', HEIGHT_STYLE_100_REGEX);

    // 5. Set Criminality to 200% (Excess: +10 LV, SWAT squad 6 Pokemon)
    await sim.setPlayerState({
      playerClass: 'rocket',
      classLevel: SWAT_CLASS_LEVEL,
      criminality: CRIMINALITY_LEVEL_SWAT,
      money: INITIAL_PLAYER_MONEY
    });
    await expect(crimLabel).toHaveText('200% (+10 LV)');
    await expect(crimFill).toHaveAttribute('style', HEIGHT_STYLE_100_REGEX);

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
      const state = (store.state as { value?: typeof store.state } | undefined)?.value || store.state;
      return {
        isBattleActive: Boolean(store.isBattleActive),
        archetype: state?.trainerArchetype,
        trainerName: state?.trainerName,
        teamLength: state?.enemyTeam?.length ?? 0,
        firstEnemyLevel: state?.enemy?.level ?? 0
      };
    });

    expect(battleData.isBattleActive).toBe(true);
    expect(battleData.archetype).toBe('policeman');
    expect(battleData.trainerName).toContain('Oficial de Policía');
    expect(battleData.teamLength).toBe(EXPECTED_SWAT_TEAM_SIZE);
    expect(battleData.firstEnemyLevel).toBe(EXPECTED_SWAT_POLICE_LEVEL);

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
    await expect(crimFill).toHaveAttribute('style', HEIGHT_STYLE_0_REGEX);

    const finalMoney = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      return useGameStore().state.money;
    });
    // Bail for level 10 at 200% criminality: 10^2 * 80 * 2.0 = 16,000. 50,000 - 16,000 = 34,000.
    // If Quick Steal triggered upon encounter (+10 criminality), criminality became 210%: 10^2 * 80 * 2.1 = 16,800. 50,000 - 16,800 = 33,200.
    expect([EXPECTED_REMAINING_MONEY_AFTER_BAIL, EXPECTED_REMAINING_MONEY_AFTER_BAIL_WITH_STEAL]).toContain(finalMoney);
  });
});
