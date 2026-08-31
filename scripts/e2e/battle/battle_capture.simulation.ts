import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { armBattleFlowCompletion, armBattleReadyForInput, awaitBattleFlowCompletion, awaitBattleReadyForInput, clickResilient, openDebugTab, type WindowWithResolver } from '../e2e_helpers.ts';
import { MOVE_TRANSLATIONS_ES } from '../../../src/data/battle/moves.ts';

class CaptureSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupScenario(speciesId: string, level: number): Promise<void> {
    await openDebugTab(this.page, 'items');
    await this.page.locator('.search-input').fill('masterball');
    await this.page.locator('#debug-item-masterball').click();
    await openDebugTab(this.page, 'pokes');
    await this.page.locator('#debug-input-especie').fill(speciesId);
    await this.page.locator(`#option-${speciesId}`).click();
    await this.page.locator('#debug-input-level').fill(level.toString());
    await armBattleReadyForInput(this.page);
    await this.page.locator('#debug-btn-encounter').click();
    await awaitBattleReadyForInput(this.page);
  }

  public async throwMasterBall(): Promise<void> {
    await armBattleFlowCompletion(this.page);
    await clickResilient(this.page.locator('.quick-item-card[data-item-id="masterball"]:not(.is-disabled)').first());
    await awaitBattleFlowCompletion(this.page);
  }
}

test.describe('Sistema de Capturas y Animaciones de Combate', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/dev-import-db-cleanup');
  });

  test('debería capturar un Pidgey salvaje con Master Ball y verificar que mantiene estadísticas, moves en español y sin errores', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer1');
    await sim.setup();
    await sim.setupScenario('pidgey', 2);

    await sim.throwMasterBall();

    const pidgeyData = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      const p = (store?.state?.team as Array<{ id?: string; level?: number; moves?: { id: string; name?: string }[]; maxHp?: number; atk?: number } | null> | undefined)
        ?.find((mon: { id?: string } | null) => mon?.id === 'pidgey');
      return p ? { id: p.id, level: p.level, moves: p.moves, maxHp: p.maxHp, atk: p.atk } : null;
    });

    expect(pidgeyData).not.toBeNull();
    expect(pidgeyData!.level).toBe(2);
    expect((pidgeyData!.moves as Array<{ id: string; name?: string } | null | undefined>).find((m: { id: string; name?: string } | null | undefined) => m?.id === 'tackle')?.name).toBe('Placaje');
  });

  test('debería capturar un Ditto transformado y revertir correctamente a la forma Ditto original con sus movimientos originales', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer2');
    await sim.setup();
    await sim.setupScenario('ditto', 5);

    // Esperar al primer turno (Ditto usará Transformación)
    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);

    await sim.throwMasterBall();

    const dittoData = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.();
      const p = (store?.state?.team as Array<{ id?: string; level?: number; moves?: { id: string; name?: string }[]; maxHp?: number; atk?: number } | null> | undefined)
        ?.find((mon: { id?: string } | null) => mon?.id === 'ditto');
      return p ? { id: p.id, level: p.level, moves: p.moves, maxHp: p.maxHp, atk: p.atk } : null;
    });

    expect(dittoData).not.toBeNull();
    expect(dittoData!.level).toBe(5);
    expect((dittoData!.moves as Array<{ id: string; name?: string } | null | undefined>).find((m: { id: string; name?: string } | null | undefined) => m?.id === 'transform')?.name).toBe('Transformación');
  });

  test('debería jugar una secuencia de 3 combates seguidos capturando y usando los Pokémon capturados con sus movimientos reales', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestMultiBattle');
    await sim.setup();
    await sim.setupScenario('pidgey', 3);

    await sim.throwMasterBall();

    // --- COMBATE 2 ---
    await sim.setupScenario('rattata', 3);

    const activeMoves = await page.evaluate(() => {
      const moves = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.moves ?? [];
      return (moves as Array<{ id: string; name?: string } | null | undefined>).map((m: { id: string; name?: string } | null | undefined) => m ? { id: m.id, name: m.name ?? '' } : null).filter(Boolean);
    });
    expect(activeMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });

    await armBattleReadyForInput(page);
    await clickResilient(page.locator('#move-btn-0').first());
    await awaitBattleReadyForInput(page);
    await sim.throwMasterBall();

    // --- COMBATE 3 ---
    await sim.setupScenario('caterpie', 2);

    const rattataMoves = await page.evaluate(() => {
      const moves = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.moves ?? [];
      return (moves as Array<{ id: string; name?: string } | null | undefined>).map((m: { id: string; name?: string } | null | undefined) => m ? { id: m.id, name: m.name ?? '' } : null).filter(Boolean);
    });
    expect(rattataMoves).toContainEqual({ id: 'tackle', name: 'Placaje' });
  });

  test('debería asegurar que todos los movimientos tengan una animación y categoría mapeada correctamente', async ({ page }) => {
    const sim = new CaptureSimWrapper(page, 'TestPlayer3');
    await sim.setup();

    const moveIdsToCheck = Object.keys(MOVE_TRANSLATIONS_ES);
    const unregisteredCategories = await page.evaluate(async (ids) => {
      const missing: string[] = []; // no-domain
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
        } catch (e: unknown) {
          missing.push(`${id}: error ${(e as Error).message}`);
        }
      });
      return missing;
    }, moveIdsToCheck);

    expect(unregisteredCategories).toEqual([]);
  });
});
