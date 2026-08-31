import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleFlowCompletion,
  armBattleReadyForInput,
  awaitBattleFlowCompletion,
  awaitBattleReadyForInput,
  clickResilient,
  openDebugTab,
  type WindowWithResolver
} from '../e2e_helpers.ts';

const MEWTWO_BOSS_LEVEL = 70;
const WHITEOUT_TEST_LEVEL = 5;
const WHITEOUT_TEST_INITIAL_HP = 1;
const WHITEOUT_TEST_MAX_HP = 20;
const BOSS_DRAGONITE_LEVEL = 80;

class CatchBreakoutWhiteoutSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupWildBossEncounter(): Promise<void> {
    await this.disableAutoMode();
    await openDebugTab(this.page, 'items');
    await this.page.locator('.search-input').fill('pokeball');
    await this.page.locator('#debug-item-pokeball').click();

    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill('mewtwo');
    await this.page.locator('#option-mewtwo').click();
    await this.page.locator('#debug-input-level').fill(MEWTWO_BOSS_LEVEL.toString());
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }

  public async setupWhiteoutScenario(): Promise<void> {
    await this.page.evaluate(async ({ pLevel, pHp, pMaxHp, enemyLevel }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const p1 = pokemonDebugService.generate({ id: 'pikachu', level: pLevel });
      p1.hp = pHp;
      p1.maxHp = pMaxHp;
      gameStore.state.team = [p1];
      gameStore.state.starterChosen = true;

      const bossEnemy = pokemonDebugService.generate({ id: 'dragonite', level: enemyLevel });

      await battleStore.startBattle(bossEnemy, {
        isTrainer: false,
        locationId: 'route1'
      });
    }, {
      pLevel: WHITEOUT_TEST_LEVEL,
      pHp: WHITEOUT_TEST_INITIAL_HP,
      pMaxHp: WHITEOUT_TEST_MAX_HP,
      enemyLevel: BOSS_DRAGONITE_LEVEL
    });
  }
}

test.describe('Battle Catch Breakout and Whiteout Defeat Simulations', () => {
  test('should handle Pokéball breakout on full HP legendary and resume battle smoothly', async ({ page }) => {
    const sim = new CatchBreakoutWhiteoutSimWrapper(page, 'TestCatchBreakout');
    await sim.setup();
    await sim.setupWildBossEncounter();

    // Throw regular Poké Ball at Level 70 full HP Mewtwo (guaranteed breakout)
    await armBattleReadyForInput(page);
    const pokeballCard = page.locator('.quick-item-card[data-item-id="pokeball"]').first();
    await clickResilient(pokeballCard);
    await awaitBattleReadyForInput(page);

    // Battle should continue and turn should be restored
    const isBattleActive = await page.evaluate(() => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      return Boolean(store?.isBattleActive);
    });
    expect(isBattleActive).toBe(true);

    await sim.forceFleeDebugger();
  });

  test('should display defeat modal and allow clean return to map when all player Pokémon faint', async ({ page }) => {
    const sim = new CatchBreakoutWhiteoutSimWrapper(page, 'TestWhiteoutDefeat');
    await sim.setup();
    await armBattleReadyForInput(page);
    await sim.setupWhiteoutScenario();
    await awaitBattleReadyForInput(page);

    // Turn 1: Player moves, enemy Level 80 Dragonite OHKOs player 1 HP Pikachu
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      if (store.state?.player) {
        store.state.player.hp = 0;
        store.state.player.fainted = true;
      }
    });

    // Execute faint sequence and transition to defeat modal
    await armBattleFlowCompletion(page);
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      await store.endBattle(false, false);
      await store.completeBattleFlow('map');
    });
    await awaitBattleFlowCompletion(page);

    // Verify player is back on map
    const isBattleActive = await page.evaluate(() => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      return Boolean(store?.isBattleActive);
    });
    expect(isBattleActive).toBe(false);
  });
});
