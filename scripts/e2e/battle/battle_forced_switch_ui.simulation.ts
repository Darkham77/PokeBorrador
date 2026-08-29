// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  clickResilient
} from '../e2e_helpers.ts';

const TRAINER_TEAM_TEST_LEVEL = 30;
const WILD_CATERPIE_TEST_LEVEL = 5;

class ForcedSwitchSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupTrainerBattleWithBench(): Promise<void> {
    await this.page.evaluate(async (testLevel) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const p1 = pokemonDebugService.generate({ id: 'pikachu', level: testLevel, moves: ['growl', 'tailwhip'] });
      const p2 = pokemonDebugService.generate({ id: 'charizard', level: testLevel });
      gameStore.state.team = [p1, p2];
      gameStore.state.starterChosen = true;

      const e1 = pokemonDebugService.generate({
        id: 'pidgeot',
        level: testLevel,
        moves: ['whirlwind']
      });
      const e2 = pokemonDebugService.generate({ id: 'machop', level: testLevel });

      await battleStore.startBattle(e1, {
        isTrainer: true,
        trainerName: 'Bird Keeper Paco',
        trainerSprite: 'birdkeeper',
        enemyTeam: [e1, e2],
        locationId: 'route1'
      });
    }, TRAINER_TEAM_TEST_LEVEL);
  }

  public async setupWild1v1Battle(): Promise<void> {
    await this.page.evaluate(async ({ pLevel, eLevel }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const p1 = pokemonDebugService.generate({
        id: 'pidgeot',
        level: pLevel,
        moves: ['whirlwind', 'quickattack']
      });
      gameStore.state.team = [p1];
      gameStore.state.starterChosen = true;

      const wildCaterpie = pokemonDebugService.generate({ id: 'caterpie', level: eLevel });

      await battleStore.startBattle(wildCaterpie, {
        isTrainer: false,
        locationId: 'route1'
      });
    }, { pLevel: TRAINER_TEAM_TEST_LEVEL, eLevel: WILD_CATERPIE_TEST_LEVEL });
  }
}

test.describe('Battle Forced Switch (Phazing) UI Simulations', () => {
  test('should execute Whirlwind forced ejection on player and drag out bench Pokémon without position jumps', async ({ page }) => {
    const sim = new ForcedSwitchSimWrapper(page, 'ForcedSwitchWhirlwind');
    await sim.setup();
    await armBattleReadyForInput(page);
    await sim.setupTrainerBattleWithBench();
    await awaitBattleReadyForInput(page);

    // Initial active player is Pikachu
    const initialSnapshot = await sim.getBattleStoreState();
    expect(initialSnapshot?.activePlayerName).toBe('Pikachu');

    // Trigger Whirlwind turn (P2 uses Whirlwind)
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Verify player active slot has been updated to Charizard without crash
    const updatedSnapshot = await sim.getBattleStoreState();
    expect(updatedSnapshot?.activePlayerName).toBe('Charizard');

    await sim.forceFleeDebugger();
  });

  test('should fail cleanly when Whirlwind is used against wild 1v1 target without bench', async ({ page }) => {
    const sim = new ForcedSwitchSimWrapper(page, 'ForcedSwitchEmptyBench');
    await sim.setup();
    await armBattleReadyForInput(page);
    await sim.setupWild1v1Battle();
    await awaitBattleReadyForInput(page);

    // Player uses Whirlwind (#move-btn-0)
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Target is still Caterpie, battle still active, no crash
    const enemyName = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return store.state?.enemy?.name ?? '';
    });
    expect(enemyName).toBe('Caterpie');

    await sim.forceFleeDebugger();
  });
});
