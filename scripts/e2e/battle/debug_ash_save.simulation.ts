import { test, type Page, type APIRequestContext } from '@playwright/test';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { confirmAndStartBattle, waitForWaitInput } from '../e2e_helpers.ts';

class AshSaveSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async loadAshSave(request: APIRequestContext): Promise<void> {
    const dbPath = path.resolve('tests/fixtures/poke_local_ash.db');
    await this.page.addInitScript(() => {
      (window as Window & { __GTS_SIMULATION__?: boolean }).__GTS_SIMULATION__ = true;
    });
    await this.loadDatabaseFixture(dbPath, request);
    await this.setup();

    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { requireMapRouteId } = await import('../../../src/data/world/map-assets.ts');
      const gs = useGameStore();
      if (gs?.state) {
        gs.state.map.currentMap = requireMapRouteId('route1');
        if ('classData' in gs.state && typeof gs.state.classData === 'object' && gs.state.classData !== null) {
          const cd = gs.state.classData as { officialRouteId?: string; officialRouteTimestamp?: string };
          cd.officialRouteId = 'route1';
          cd.officialRouteTimestamp = String(Temporal.Now.instant().epochMilliseconds);
        }
        await gs.saveGame();
      }
    });
  }

  public async rotateTeam(): Promise<void> {
    const battleState = await this.getBattleStoreState();
    const activeUid = battleState?.activePlayerUid;
    const teamUids = (battleState?.playerTeam ?? [])
      .map((p: { uid: string }) => p.uid)
      .filter((uid: string) => Boolean(uid) && uid !== activeUid);

    for (const uid of teamUids) {
      await waitForWaitInput(this.page);
      await this.voluntarySwitch(uid);
    }
  }
}

test('Debug ash save switch issue', async ({ page, request }) => {
  const sim = new AshSaveSimWrapper(page, 'ash');
  await sim.loadAshSave(request);

  await sim.navigateToRoute1();
  await confirmAndStartBattle(page);
  await waitForWaitInput(page);

  await sim.rotateTeam();
});
