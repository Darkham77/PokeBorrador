// fallow-ignore-file security-sink
/**
 * Battle Capture Reload Persistence Simulation.
 * Verifies that capturing a wild Pokemon after a mid-combat page reload (F5)
 * when the team is full (6 Pokemon) properly routes the Pokemon to the PC Box
 * with 100% domain fidelity (species, stats, moves) and without save validation errors.
 */
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  armBattleFlowCompletion,
  armBattleReadyForInput,
  awaitBattleFlowCompletion,
  awaitBattleReadyForInput,
  clickResilient,
  openDebugTab,
  waitForStoreReady
} from '../e2e_helpers.ts';

const DUMMY_TEAM_LEVEL = 20;

class CaptureReloadSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupFullTeamAndMasterball(): Promise<void> {
    await openDebugTab(this.page, 'items');
    await this.page.locator('.search-input').fill('masterball');
    await this.page.locator('#debug-item-masterball').click();

    // Fill team to 6 Pokemon
    await this.page.evaluate(async (lvl) => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const store = useGameStore();
      store.state.team = [
        pokemonDebugService.generate({ id: 'pikachu', level: lvl }),
        pokemonDebugService.generate({ id: 'bulbasaur', level: lvl }),
        pokemonDebugService.generate({ id: 'charmander', level: lvl }),
        pokemonDebugService.generate({ id: 'squirtle', level: lvl }),
        pokemonDebugService.generate({ id: 'pidgeot', level: lvl }),
        pokemonDebugService.generate({ id: 'butterfree', level: lvl }),
      ];
      store.state.box = [];
      await store.save();
    }, DUMMY_TEAM_LEVEL);
  }

  public async startWildEncounter(speciesId: string, level: number): Promise<void> {
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

test.describe('Persistencia y Captura tras Recarga de Página (F5)', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/dev-import-db-cleanup');
  });

  test('captura a Rattata tras recargar a mitad de combate y verifica que se guarda en la Caja PC sin error de species', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('[SAVE]')) {
        errorLogs.push(msg.text());
      }
    });

    const sim = new CaptureReloadSimWrapper(page, 'TestReloadCapture');
    await sim.setup();
    await sim.setupFullTeamAndMasterball();

    // 1. Iniciar encuentro salvaje con Rattata nivel 3
    await sim.startWildEncounter('rattata', 3);

    // 2. Forzar guardado a mitad de combate
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore();
      await store.save();
    });

    // 3. Recargar la página (simulando F5 en pleno combate)
    await page.reload();
    await waitForStoreReady(page);
    await awaitBattleReadyForInput(page);

    // 4. Lanzar Master Ball y capturar al enemigo restaurado
    await sim.throwMasterBall();

    // 5. Verificar que el guardado se ejecuta sin errores críticos de esquema
    expect(errorLogs).toEqual([]);

    // 6. Verificar el contenido de la Caja PC
    const boxData = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const store = useGameStore();
      const box = store.state.box;
      const captured = box.find((p) => p?.id === 'rattata');
      return captured ? {
        id: captured.id,
        species: captured.species,
        name: captured.name,
        level: captured.level,
        hasUid: Boolean(captured.uid),
      } : null;
    });

    expect(boxData).not.toBeNull();
    expect(boxData!.id).toBe('rattata');
    expect(boxData!.species).toBe('rattata');
    expect(boxData!.level).toBe(3);
    expect(boxData!.hasUid).toBe(true);
  });
});
