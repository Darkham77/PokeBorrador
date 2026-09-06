import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { clickResilient } from '../e2e_helpers.ts';

class PvpReplaySpectatorSimWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async launchTacticalReplay(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useLivePvPStore } = await import('../../../src/stores/livePvP.ts');
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const livePvPStore = useLivePvPStore();
      const modalStore = useModalStore();

      const mockReplay = {
        id: 'sim_replay_e2e_001',
        battleCode: 'BTL-E2E1-2026',
        seasonId: 'season_1',
        themeId: 'kanto_classic',
        p1: {
          userId: 'u_p1_sim',
          username: 'RedSpectator',
          tier: 'maestro',
          elo: 2450,
          team: [
            {
              speciesId: 'pikachu',
              level: 50,
              revealedMoves: ['thunderbolt'],
              revealedAbility: 'static'
            }
          ]
        },
        p2: {
          userId: 'u_p2_sim',
          username: 'BlueSpectator',
          tier: 'diamante',
          elo: 2380,
          team: [
            {
              speciesId: 'eevee',
              level: 50,
              revealedMoves: ['quickattack']
            }
          ]
        },
        turnsCount: 3,
        winnerSide: 'p1',
        choiceStream: [
          {
            turn: 1,
            p1Choice: 'move 1',
            p2Choice: 'move 1',
            logs: [
              '|move|p1a: Pikachu|Thunderbolt|p2a: Eevee',
              '|-damage|p2a: Eevee|40/100'
            ]
          },
          {
            turn: 2,
            p1Choice: 'move 1',
            p2Choice: 'move 1',
            logs: [
              '|move|p1a: Pikachu|Thunderbolt|p2a: Eevee',
              '|-damage|p2a: Eevee|0 fnt',
              '|faint|p2a: Eevee'
            ]
          }
        ],
        initialSeed: [42, 42, 42, 42],
        isTop10Archived: true,
        viewsCount: 1,
        createdAt: '2026-09-06T00:00:00Z'
      };

      livePvPStore.watchReplay(mockReplay as never);
      modalStore.open('BattleReplay', { replay: mockReplay });
    });
  }
}

test.describe('PvP Battle Tactical Replay Spectator Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('opens tactical spectator arena, navigates turns with fog-of-war, and exits', async ({ page }) => {
    const sim = new PvpReplaySpectatorSimWrapper(page, 'ReplaySpectatorSim');
    await sim.setup();

    // 1. Launch tactical replay
    await sim.launchTacticalReplay();

    // 2. Spectator arena modal becomes visible
    const replayModal = page.locator('#battle-replay-modal');
    await expect(replayModal).toBeVisible({ timeout: 10000 });

    // 3. Floating tactical replayer bar is mounted
    const replayerBar = page.locator('#battle-tactical-replayer-bar');
    await expect(replayerBar).toBeVisible({ timeout: 10000 });

    // 4. Turn label starts at turn 0
    const turnVal = page.locator('.turn-val');
    await expect(turnVal).toBeVisible({ timeout: 10000 });
    await expect(turnVal).toContainText('TURNO 00');

    // 5. Click next turn
    await clickResilient(page.locator('#btn-replayer-next-turn'));
    await expect(turnVal).toContainText('TURNO 01');

    // 6. Click next turn again
    await clickResilient(page.locator('#btn-replayer-next-turn'));
    await expect(turnVal).toContainText('TURNO 02');

    // 7. Restart replay
    await clickResilient(page.locator('#btn-replayer-restart'));
    await expect(turnVal).toContainText('TURNO 00');

    // 8. Exit theater
    await clickResilient(page.locator('#btn-replayer-exit'));
    await expect(replayerBar).not.toBeVisible({ timeout: 10000 });
  });
});
