// fallow-ignore-file security-sink
import { test, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { confirmAndStartBattle, waitForWaitInput, loginE2ETestUser } from '../e2e_helpers.ts';

class AshSaveSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async loadAshSave(request: APIRequestContext): Promise<void> {
    const dbPath = path.resolve('tests/fixtures/poke_local_ash.db');
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Base de datos no encontrada en ${dbPath}`);
    }
    const dbBuffer = fs.readFileSync(dbPath);
    await request.post('/api/dev-export-db', {
      headers: { 'Content-Type': 'application/octet-stream' },
      data: dbBuffer
    });

    await loginE2ETestUser(this.page, this.username);
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

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev-import-db-cleanup');
});

test('Debug ash save switch issue', async ({ page, request }) => {
  const sim = new AshSaveSimWrapper(page, 'ash');
  await sim.loadAshSave(request);

  await page.locator('#map-card-route1').click();
  await confirmAndStartBattle(page);
  await waitForWaitInput(page);

  await sim.rotateTeam();
});
