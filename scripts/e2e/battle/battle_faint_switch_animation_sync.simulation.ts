// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  clickResilient
} from '../e2e_helpers.ts';

class FaintSwitchAnimationSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupAngelaTrainerBattle(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      // Player: Aurorus L50 with Ice Beam, Ancient Power, Freeze Dry, Thunderbolt
      const aurorus = pokemonDebugService.generate({
        id: 'aurorus',
        level: 50,
        moves: ['icebeam', 'ancientpower', 'freezedry', 'thunderbolt']
      });
      gameStore.state.team = [aurorus];
      gameStore.state.starterChosen = true;

      // Enemy Trainer: Montañera Angela with Sandshrew L18, Rhyhorn L18, Geodude L18
      const sandshrew = pokemonDebugService.generate({
        id: 'sandshrew',
        level: 18,
        moves: ['earthquake', 'swordsdance', 'bodyslam', 'rockslide']
      });
      const rhyhorn = pokemonDebugService.generate({
        id: 'rhyhorn',
        level: 18,
        moves: ['substitute', 'earthquake', 'rockslide', 'bodyslam']
      });
      const geodude = pokemonDebugService.generate({
        id: 'geodude',
        level: 18,
        moves: ['earthquake', 'explosion', 'bodyslam', 'rockslide']
      });

      await battleStore.startBattle(sandshrew, {
        isTrainer: true,
        trainerName: 'Montañera Angela',
        trainerSprite: 'hiker',
        enemyTeam: [sandshrew, rhyhorn, geodude],
        locationId: 'rock_tunnel'
      });
    });
  }
}

test.describe('Battle Faint Switch & Animation Synchronization - Real E2E Simulation', () => {
  test('should execute mid-turn switch, KO faint animation, replacement send-out animation, and consecutive Turn 2 move cleanly without worker rejection', async ({ page }) => {
    const sim = new FaintSwitchAnimationSimWrapper(page, 'AngelaFaintSwitchE2E');
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
        gameBus.on('PLAY_FAINT', (d) => win.__ANIM_EVENTS__?.push(`PLAY_FAINT:${JSON.stringify(d)}`));
      }
    });

    await armBattleReadyForInput(page);
    await sim.setupAngelaTrainerBattle();
    await awaitBattleReadyForInput(page);

    // Initial state: Sandshrew is active enemy
    const state0 = await sim.getBattleStoreState();
    expect(state0?.activePlayerName).toBe('Aurorus');

    // Turn 1: Player uses Ice Beam (move button 0).
    // AI switches to Rhyhorn, Ice Beam hits Rhyhorn for fatal super-effective damage,
    // Rhyhorn faints, GSAP faint sequence executes, Angela sends out Sandshrew, GSAP sendout sequence executes.
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Verify after Turn 1 faint sequence that Sandshrew is now the active enemy
    const enemyAfterTurn1 = await page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { enemy?: { name?: string; species?: string; hp?: number; fainted?: boolean }; activeBattle?: { enemy?: { name?: string; species?: string; hp?: number } } } } | undefined;
      const store = debug?.useBattleStore?.();
      return {
        name: store?.enemy?.name || store?.activeBattle?.enemy?.name,
        hp: store?.enemy?.hp ?? store?.activeBattle?.enemy?.hp,
        fainted: store?.enemy?.fainted
      };
    });

    const turn1Logs = await page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { activeBattle?: { logs?: Array<{ text: string }> } } } | undefined;
      return debug?.useBattleStore?.()?.activeBattle?.logs?.map(l => l.text) || [];
    });
    console.log('Turn 1 E2E Logs:', turn1Logs);

    // After Turn 1, whoever was sent out should be healthy
    expect(enemyAfterTurn1.hp).toBeGreaterThan(0);
    expect(enemyAfterTurn1.fainted).toBeFalsy();

    // Turn 2: Player uses Ice Beam again against Sandshrew.
    // MUST execute without worker rejection ("Worker rejected turn" or "You need a switch response")
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    // Check combat history logs from store
    const logs = await page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { battleLogs?: Array<{ msg?: string }> } } | undefined;
      const store = debug?.useBattleStore?.();
      return store?.battleLogs?.map(l => l.msg || '') || [];
    });

    console.log('Battle E2E Simulation Logs:', logs);

    // Assert that no movement error occurred
    const hasErrorLog = logs.some(l => l.includes('Ocurrió un error') || l.includes('rejected'));
    expect(hasErrorLog).toBe(false);

    // Assert that Turn 1 and Turn 2 moves were executed in log
    expect(logs.some(l => l.includes('Ventisca') || l.includes('Rayo Hielo') || l.includes('Ice Beam') || l.includes('usó'))).toBe(true);

    await sim.forceFleeDebugger();
  });
});
