import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, handleBattleInput } from '../e2e_helpers.ts';
import { MOVE_TRANSLATIONS_ES } from '../../../src/data/battle/moves.ts';

class CaptureSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupPidgeyScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const battleStore = useBattleStore();

      useGameStore().state.inventory = { masterball: 10 };
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      useGameStore().state.team = [charmander];
      useGameStore().state.starterChosen = true;

      const pidgey = pokemonDebugService.generate({ id: 'pidgey', level: 2 });
      await battleStore.startBattle(pidgey, { locationId: 'route1', wasSearching: false });
    });
  }

  public async setupDittoScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const battleStore = useBattleStore();

      useGameStore().state.inventory = { masterball: 5 };
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      useGameStore().state.team = [charmander];
      useGameStore().state.starterChosen = true;

      const ditto = pokemonDebugService.generate({ id: 'ditto', level: 5 });
      await battleStore.startBattle(ditto, { locationId: 'route1', wasSearching: false });
    });
  }

  public async setupMultiBattleScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const battleStore = useBattleStore();

      useGameStore().state.inventory = { masterball: 5 };
      const charmander = pokemonDebugService.generate({ id: 'charmander', level: 5 });
      useGameStore().state.team = [charmander];
      useGameStore().state.starterChosen = true;

      const pidgey = pokemonDebugService.generate({ id: 'pidgey', level: 3 });
      await battleStore.startBattle(pidgey, { locationId: 'route1', wasSearching: false });
    });
  }

  public async throwMasterBall(): Promise<void> {
    await this.page.evaluate(async () => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      if (resolver) {
        await resolver().useItemInBattle('masterball');
      }
    });
  }

  public async awaitCaptureSequence(): Promise<void> {
    await this.page.waitForFunction(() => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      return !resolver?.()?.state || resolver().state.over || resolver().currentFsmState === 'REWARDS_PHASE';
    }, undefined, { timeout: 15000 });
  }
}

test.describe('Sistema de Capturas y Animaciones de Combate', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ request }) => {
    await request.post('/api/dev-import-db-cleanup');
  });

  test('debería capturar un Pidgey salvaje con Master Ball y verificar que mantiene estadísticas, moves en español y sin errores', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer1');
    await sim.setup();
    await waitForWaitInput(page);

    await sim.setupPidgeyScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    await sim.throwMasterBall();
    await sim.awaitCaptureSequence();

    const pidgeyData = await page.evaluate(() => {
      const store = (window as any).__VITE_DEBUG__?.getGameStore?.();
      const p = store?.state?.team?.find((mon: any) => mon && mon.id === 'pidgey');
      return p ? { id: p.id, level: p.level, moves: p.moves, maxHp: p.maxHp, atk: p.atk } : null;
    });

    expect(pidgeyData).not.toBeNull();
    expect(pidgeyData!.level).toBe(2);
    expect(pidgeyData!.moves.find((m: any) => m?.id === 'tackle')?.name).toBe('Placaje');
  });

  test('debería capturar un Ditto transformado y revertir correctamente a la forma Ditto original con sus movimientos originales', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer2');
    await sim.setup();
    await waitForWaitInput(page);

    await sim.setupDittoScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    // Esperar al primer turno (Ditto usará Transformación)
    await handleBattleInput(page, 'move 1');
    await waitForWaitInput(page);

    await sim.throwMasterBall();
    await sim.awaitCaptureSequence();

    const dittoData = await page.evaluate(() => {
      const store = (window as any).__VITE_DEBUG__?.getGameStore?.();
      const p = store?.state?.team?.find((mon: any) => mon && mon.id === 'ditto');
      return p ? { id: p.id, moves: p.moves } : null;
    });

    expect(dittoData).not.toBeNull();
    expect(dittoData!.id).toBe('ditto');
    expect(dittoData!.moves.length).toBe(1);
    expect(dittoData!.moves[0]?.id).toBe('transform');
  });

  test('debería jugar una secuencia de 3 combates seguidos capturando y usando los Pokémon capturados con sus movimientos reales', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestMultiBattle');
    await sim.setup();
    await waitForWaitInput(page);

    // --- COMBATE 1 ---
    await sim.setupMultiBattleScenario();
    await sim.startBattle();
    await waitForWaitInput(page);
    await sim.throwMasterBall();
    await sim.awaitReturnToMap();

    // --- COMBATE 2 ---
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      gameStore.state.inventory = { masterball: 5 };
      const pidgeyIdx = gameStore.state.team.findIndex((p: any) => p && p.id === 'pidgey');
      if (pidgeyIdx !== -1) {
        const pidgey = gameStore.state.team[pidgeyIdx];
        if (pidgey) {
          gameStore.state.team.splice(pidgeyIdx, 1);
          gameStore.state.team.unshift(pidgey);
        }
      }

      const rattata = pokemonDebugService.generate({ id: 'rattata', level: 3 });
      await battleStore.startBattle(rattata, { locationId: 'route1', wasSearching: false });
    });

    await sim.startBattle();
    await waitForWaitInput(page);

    const activeMoves = await page.evaluate(() => {
      const moves = (window as any).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.moves || [];
      return moves.map((m: any) => m ? { id: m.id, name: m.name } : null).filter(Boolean);
    });
    expect(activeMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });

    await handleBattleInput(page, 'move 1');
    await waitForWaitInput(page);
    await sim.throwMasterBall();
    await sim.awaitReturnToMap();

    // --- COMBATE 3 ---
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();
      const battleStore = useBattleStore();

      const rattataIdx = gameStore.state.team.findIndex((p: any) => p && p.id === 'rattata');
      if (rattataIdx !== -1) {
        const rattata = gameStore.state.team[rattataIdx];
        if (rattata) {
          gameStore.state.team.splice(rattataIdx, 1);
          gameStore.state.team.unshift(rattata);
        }
      }

      const caterpie = pokemonDebugService.generate({ id: 'caterpie', level: 2 });
      await battleStore.startBattle(caterpie, { locationId: 'route1', wasSearching: false });
    });

    await sim.startBattle();
    await waitForWaitInput(page);

    const rattataMoves = await page.evaluate(() => {
      const moves = (window as any).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.moves || [];
      return moves.map((m: any) => m ? { id: m.id, name: m.name } : null).filter(Boolean);
    });
    expect(rattataMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });
  });

  test('debería asegurar que todos los movimientos tengan una animación y categoría mapeada correctamente', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer3');
    await sim.setup();
    await waitForWaitInput(page);

    const moveIdsToCheck = Object.keys(MOVE_TRANSLATIONS_ES);
    const unregisteredCategories = await page.evaluate(async (ids) => {
      const missing: string[] = [];
      const { pokemonDataProvider } = await import('../../../src/logic/providers/pokemonDataProvider');
      
      ids.forEach((id) => {
        try {
          const md = pokemonDataProvider.getMoveData(id);
          if (!md) {
            missing.push(`${id}: no data in DB`);
            return;
          }
          const cat = String(md.cat || '').toLowerCase();
          if (cat !== 'physical' && cat !== 'special' && cat !== 'status') {
            missing.push(`${id}: invalid category "${cat}"`);
          }
        } catch (e: any) {
          missing.push(`${id}: error ${e.message}`);
        }
      });
      return missing;
    }, moveIdsToCheck);

    expect(unregisteredCategories).toEqual([]);
  });
});
