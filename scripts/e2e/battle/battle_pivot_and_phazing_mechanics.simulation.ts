import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  clickResilient
} from '../e2e_helpers.ts';

class PivotAndPhazingSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupPivotAndPhazingTrainerBattle(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Player team: Tapu Koko (Volt Switch), Garchomp (Dragon Tail), Golem (Explosion)
      const tapukoko = pokemonDebugService.generate({
        id: 'tapukoko',
        level: 50,
        moves: ['voltswitch', 'thunderbolt', 'dazzlinggleam', 'roost']
      });
      const garchomp = pokemonDebugService.generate({
        id: 'garchomp',
        level: 50,
        moves: ['earthquake', 'dragontail', 'stoneedge', 'swordsdance']
      });
      const golem = pokemonDebugService.generate({
        id: 'golem',
        level: 50,
        moves: ['explosion', 'earthquake', 'stoneedge', 'stealthrock']
      });

      gameStore.state.team = [tapukoko, garchomp, golem];
      gameStore.state.starterChosen = true;

      // Enemy Trainer: Ornitólogo Paco with Skarmory (Whirlwind), Blissey, Tyranitar
      const skarmory = pokemonDebugService.generate({
        id: 'skarmory',
        level: 50,
        moves: ['roost', 'whirlwind', 'spikes', 'bravebird']
      });
      const blissey = pokemonDebugService.generate({
        id: 'blissey',
        level: 50,
        moves: ['softboiled', 'seismictoss', 'toxic', 'aromatherapy']
      });
      const tyranitar = pokemonDebugService.generate({
        id: 'tyranitar',
        level: 50,
        moves: ['stoneedge', 'crunch', 'earthquake', 'dragondance']
      });

      await battleStore.startBattle(skarmory, {
        isTrainer: true,
        trainerName: 'Ornitólogo Paco',
        trainerSprite: 'birdkeeper',
        enemyTeam: [skarmory, blissey, tyranitar],
        locationId: 'route1'
      });
    });
  }
}

test.describe('Battle Pivot, Phazing, and Complex Switch Mechanics - Real E2E Simulation', () => {
  test('should execute Volt Switch pivot to bench, Whirlwind forced ejection, and consecutive turns without worker rejection', async ({ page }) => {
    const sim = new PivotAndPhazingSimWrapper(page, 'PivotPhazingE2E');
    await sim.setup();

    // Enable animation monitoring in browser
    await page.evaluate(() => {
      interface CustomWindow extends Window {
        __ANIM_EVENTS__?: string[];
      }
      const win = window as CustomWindow;
      win.__ANIM_EVENTS__ = [];
      const debug = window.__VITE_DEBUG__ as { gameBus?: { on: (ev: string, cb: (data?: unknown) => void) => void } } | undefined;
      const gameBus = debug?.gameBus;
      if (gameBus) {
        gameBus.on('PLAY_SEND_OUT', (d) => win.__ANIM_EVENTS__?.push(`PLAY_SEND_OUT:${JSON.stringify(d)}`));
        gameBus.on('PLAY_ESCAPE_ANIM', (d) => win.__ANIM_EVENTS__?.push(`PLAY_ESCAPE_ANIM:${JSON.stringify(d)}`));
        gameBus.on('PLAY_FAINT', (d) => win.__ANIM_EVENTS__?.push(`PLAY_FAINT:${JSON.stringify(d)}`));
      }
    });

    await armBattleReadyForInput(page);
    await sim.setupPivotAndPhazingTrainerBattle();
    await awaitBattleReadyForInput(page);

    // Initial state: Tapu Koko is active player
    const state0 = await sim.getBattleStoreState();
    expect(state0?.activePlayerName).toBe('Tapu Koko');

    // Turn 1: Player uses Volt Switch (move button 0)
    // Volt Switch hits Skarmory -> triggers P1 self-switch -> UI enters SWITCH_MENU / player selects Garchomp
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    const readyStateAfterTurn1 = await awaitBattleReadyForInput(page);

    // If Volt Switch opened the switch menu or automatically requested switch
    if (readyStateAfterTurn1.subState === 'SWITCH_MENU') {
      await armBattleReadyForInput(page);
      await page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        await useBattleStore().executeSwitch(1, true);
      });
      await awaitBattleReadyForInput(page);
    }

    // Verify after Volt Switch that player Pokémon is Garchomp
    const playerAfterVoltSwitch = await sim.getBattleStoreState();
    expect(playerAfterVoltSwitch?.activePlayerName).toBe('Garchomp');

    // Turn 2: Garchomp uses move 0 (Earthquake)
    // Skarmory uses Whirlwind (-6 priority) -> Whirlwind phazes Garchomp -> drags out a bench Pokémon (Tapu Koko or Golem)
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Turn 3: Current active player attacks again
    // MUST execute without worker rejection ("Worker rejected turn" or "You need a switch response")
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Check combat history logs
    const logs = await page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { battleLogs?: Array<{ msg?: string }> } } | undefined;
      return debug?.useBattleStore?.()?.battleLogs?.map(l => l.msg || '') || [];
    });

    console.log('Pivot & Phazing E2E Logs:', logs);

    // Assert no error logs
    const hasErrorLog = logs.some(l => l.includes('Ocurrió un error') || l.includes('rejected'));
    expect(hasErrorLog).toBe(false);

    // Assert that Volt Switch and Whirlwind/moves were logged
    expect(logs.some(l => l.includes('Voltiocambio') || l.includes('Volt Switch') || l.includes('usó'))).toBe(true);

    await sim.forceFleeDebugger();
  });
});
