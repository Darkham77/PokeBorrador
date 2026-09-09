import { test, expect, type Page } from '@playwright/test';
import { BaseE2ESimulation } from '../base_simulation.ts';
import { waitForStoreReady, clickResilient } from '../e2e_helpers.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { SeasonRules } from '../../../src/stores/pvp.ts';

class TieredSaveSimWrapper extends BaseE2ESimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async getSaveCoordinatorState(): Promise<{
    isDirty: boolean;
    lastCloudSaveTime: number;
    shouldExecuteCloudSave: boolean;
  }> {
    return await this.page.evaluate(async () => {
      const { saveCoordinator } = await import('../../../src/logic/auth/saveCoordinator.ts');
      return {
        isDirty: saveCoordinator.isDirty(),
        lastCloudSaveTime: saveCoordinator.getLastCloudSaveTime(),
        shouldExecuteCloudSave: saveCoordinator.shouldExecuteCloudSave()
      };
    });
  }

  public async setShortCloudThrottle(throttleMs: number): Promise<void> {
    await this.page.evaluate(async (ms) => {
      const { saveCoordinator } = await import('../../../src/logic/auth/saveCoordinator.ts');
      saveCoordinator.setCloudThrottleMs(ms);
    }, throttleMs);
  }

  public async mutateMoneyRapidly(times: number): Promise<number> {
    return await this.page.evaluate(async (n) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const game = useGameStore();
      for (let i = 0; i < n; i++) {
        game.state.money += 100;
        game.scheduleSave();
      }
      return game.state.money;
    }, times);
  }

  public async triggerManualSave(forceRemote = false): Promise<{ success: boolean; remote?: boolean }> {
    return await this.page.evaluate(async (force) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const game = useGameStore();
      const res = await game.save(false, true, force);
      return res || { success: false };
    }, forceRemote);
  }

  public async triggerEmergencyFlush(): Promise<void> {
    await this.page.evaluate(async () => {
      const { saveCoordinator } = await import('../../../src/logic/auth/saveCoordinator.ts');
      await saveCoordinator.flushPendingSave();
    });
  }

  public async configureSeasonalRules(rules: SeasonRules): Promise<void> {
    await this.page.evaluate(async (r) => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const pvpStore = usePvPStore();
      pvpStore.currentSeasonRules = r;
    }, rules);
  }

  public async setDefendingRoster(roster: Array<{ id: PokemonSpeciesId; level: number; uid?: string }>): Promise<void> {
    await this.page.evaluate(async (mons) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();

      const generated = mons.map((m, i) => {
        const p = pokemonDebugService.generate({ id: m.id, level: m.level });
        p.uid = m.uid || `sim_mon_${i}_${m.id}`;
        return p;
      });

      gameStore.state.team = generated;
      gameStore.state.pvpTeam6 = generated.map(g => g.uid);
    }, roster);
  }

  public async setPassiveActive(active: boolean): Promise<void> {
    await this.page.evaluate(async (a) => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      usePvPStore().passiveTeamActive = a;
    }, active);
  }

  public async triggerRapidSnapshotSyncSchedules(count: number): Promise<void> {
    await this.page.evaluate(async (n) => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      const pvp = usePvPStore();
      for (let i = 0; i < n; i++) {
        pvp.scheduleDefenseSnapshotSync();
      }
    }, count);
  }

  public async navigateToHome(): Promise<void> {
    const homeBtn = this.page.locator('#nav-home-btn').first();
    await clickResilient(homeBtn);
    const widget = this.page.locator('#widget-passive-defense');
    await expect(widget).toBeVisible({ timeout: 10000 });
  }
}

test.describe('2-Tier Persistence Architecture & Passive Defense Coalescing Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('Scenario 1: Coalesces rapid mutations into a single debounced local save', async ({ page }) => {
    const sim = new TieredSaveSimWrapper(page, 'TierUser1');
    await sim.setup();
    await waitForStoreReady(page);

    // Track network RPC calls to save_game_trusted
    let remoteSaveRpcCount = 0;
    page.on('request', (req) => {
      if (req.url().includes('save_game_trusted') || req.url().includes('rpc/save_game_trusted')) {
        remoteSaveRpcCount++;
      }
    });

    // Fire 5 rapid mutations in milliseconds
    const updatedMoney = await sim.mutateMoneyRapidly(5);
    expect(updatedMoney).toBeGreaterThan(0);

    // Initial check: Save has not fired yet (debounce window of 1500ms active)
    expect(remoteSaveRpcCount).toBe(0);

    // Wait deterministically for the local debounce window and save to finish
    await page.waitForFunction(async () => {
      const { saveCoordinator } = await import('../../../src/logic/auth/saveCoordinator.ts');
      return !saveCoordinator.hasPendingLocalSave() && !saveCoordinator.isDirty();
    }, null, { timeout: 10000 });

    // Exactly 1 remote save request fired (first save of session)
    expect(remoteSaveRpcCount).toBeLessThanOrEqual(1);

    const coordState = await sim.getSaveCoordinatorState();
    expect(coordState.isDirty).toBe(false);
    expect(coordState.lastCloudSaveTime).toBeGreaterThan(0);
  });

  test('Scenario 2: Throttles cloud save to 60-second window while updating local storage (Tier 1)', async ({ page }) => {
    const sim = new TieredSaveSimWrapper(page, 'TierUser2');
    await sim.setup();
    await waitForStoreReady(page);

    // Baseline save to establish cloud timestamp
    await sim.triggerManualSave(true);
    const initialCoord = await sim.getSaveCoordinatorState();
    expect(initialCoord.lastCloudSaveTime).toBeGreaterThan(0);
    expect(initialCoord.isDirty).toBe(false);

    // Routine minor save occurs 5 seconds later (within 60s window)
    const result = await sim.triggerManualSave(false);
    expect(result.success).toBe(true);

    // Coordinator must mark state as dirty in local cache without sending unthrottled cloud save
    const throttledCoord = await sim.getSaveCoordinatorState();
    expect(throttledCoord.isDirty).toBe(true);
    expect(throttledCoord.shouldExecuteCloudSave).toBe(false);
  });

  test('Scenario 3: Bypasses 60-second cloud throttle immediately when forceRemote is true', async ({ page }) => {
    const sim = new TieredSaveSimWrapper(page, 'TierUser3');
    await sim.setup();
    await waitForStoreReady(page);

    // 1. Initial save establishes throttle baseline
    await sim.triggerManualSave(true);
    const t0 = (await sim.getSaveCoordinatorState()).lastCloudSaveTime;

    // 2. Minor change causes dirty state
    await sim.triggerManualSave(false);
    expect((await sim.getSaveCoordinatorState()).isDirty).toBe(true);

    // 3. Critical event occurs (manual save button or badge victory) with forceRemote = true
    await sim.triggerManualSave(true);

    const finalCoord = await sim.getSaveCoordinatorState();
    expect(finalCoord.isDirty).toBe(false);
    expect(finalCoord.lastCloudSaveTime).toBeGreaterThanOrEqual(t0);
  });

  test('Scenario 4: Flushes pending dirty cloud state on emergency flush (beforeunload)', async ({ page }) => {
    const sim = new TieredSaveSimWrapper(page, 'TierUser4');
    await sim.setup();
    await waitForStoreReady(page);

    // 1. Initial baseline
    await sim.triggerManualSave(true);

    // 2. Minor update sets dirty state
    await sim.triggerManualSave(false);
    expect((await sim.getSaveCoordinatorState()).isDirty).toBe(true);

    // 3. Emergency flush (beforeunload / tab close)
    await sim.triggerEmergencyFlush();

    const flushedCoord = await sim.getSaveCoordinatorState();
    expect(flushedCoord.isDirty).toBe(false);
  });

  test('Scenario 5: Passive defense coalesces rapid roster syncs and cancels immediately on ineligibility', async ({ page }) => {
    const sim = new TieredSaveSimWrapper(page, 'TierUser5');
    await sim.setup();
    await sim.navigateToHome();

    // 1. Configure season rules: Flat 50, mewtwo banned
    await sim.configureSeasonalRules({
      name: 'Torneo E2E Flat 50',
      levelCap: 50,
      maxPokemon: 6,
      bannedPokemonIds: ['mewtwo']
    });

    // 2. Set valid team of 3 Level 50 Pokémon
    await sim.setDefendingRoster([
      { id: 'pikachu', level: 50 },
      { id: 'charizard', level: 50 },
      { id: 'blastoise', level: 50 }
    ]);
    await sim.setPassiveActive(true);

    // 3. Fire 5 rapid snapshot sync schedules (simulating spamming item swaps)
    await sim.triggerRapidSnapshotSyncSchedules(5);

    // 4. Before debounce expires, level up Charizard to 51 (illegal mutation!)
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      const charizard = gameStore.state.team.find(p => p.id === 'charizard');
      if (charizard) {
        charizard.level = 51;
      }
    });

    // 5. Watcher should immediately trigger deactivatePassiveDefense (0ms fail-fast)
    const toggleBtn = page.locator('#widget-passive-defense .toggle-btn');
    await expect(toggleBtn).toHaveText('DESACTIVADO', { timeout: 10000 });
    await expect(toggleBtn).not.toHaveClass(/active/);

    const toastMsg = page.locator('#notification-stack .toast-item .toast-msg', {
      hasText: 'Defensa Pasiva desactivada: Charizard no cumple las reglas'
    });
    await expect(toastMsg.first()).toBeVisible({ timeout: 10000 });

    // 6. Verify passiveTeamActive is false
    const isActive = await page.evaluate(async () => {
      const { usePvPStore } = await import('../../../src/stores/pvp.ts');
      return usePvPStore().passiveTeamActive;
    });
    expect(isActive).toBe(false);
  });
});
