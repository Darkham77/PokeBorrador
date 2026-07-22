import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, clickResilient, type CertifiedTestBatch, type WindowWithResolver } from '../e2e_helpers.ts';

class HeldItemsSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupLeftoversScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const snorlax = pokemonDebugService.generate({
        id: 'snorlax',
        level: 50,
        heldItem: 'leftovers',
        moves: ['substitute', 'growl']
      });

      const caterpie = pokemonDebugService.generate({
        id: 'caterpie',
        level: 5,
        moves: ['splash']
      });

      useGameStore().state.team = [snorlax];
      await useBattleStore().startBattle(caterpie, { locationId: 'route1' });
    });
  }

  public async setupLifeOrbScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const mew = pokemonDebugService.generate({
        id: 'mew',
        level: 50,
        heldItem: 'lifeorb',
        moves: ['psychic']
      });
      const blissey = pokemonDebugService.generate({
        id: 'blissey',
        level: 50,
        moves: ['softboiled']
      });

      useGameStore().state.team = [mew];
      await useBattleStore().startBattle(blissey, { locationId: 'route1', enemyTeam: [blissey] });
    });
  }

  public async setupFocusSashScenario(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      useMapStore().setGlobalWeather('clear');

      const sunkern = pokemonDebugService.generate({
        id: 'sunkern',
        level: 5,
        ability: 'chlorophyll',
        heldItem: 'focussash',
        moves: ['tackle']
      });
      const mewtwo = pokemonDebugService.generate({
        id: 'mewtwo',
        level: 100,
        moves: ['psystrike', 'psychic']
      });

      useGameStore().state.team = [sunkern];
      await useBattleStore().startBattle(mewtwo, { locationId: 'route1' });
    });
  }

  public async getPlayerHp(): Promise<number> {
    return await this.page.evaluate(() => (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.hp ?? 0);
  }

  public async getPlayerHpInfo(): Promise<{ hp: number; maxHp: number }> {
    return await this.page.evaluate(() => {
      const player = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player;
      return { hp: player?.hp ?? 0, maxHp: player?.maxHp ?? 1 };
    });
  }
}

test.describe('E2E Held Items Verification', () => {
  test.beforeEach(async () => {
    test.setTimeout(360000);
  });

  test('should apply passive healing from Leftovers at the end of a turn', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerItems');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupLeftoversScenario();
    await sim.startBattle();
    await waitForWaitInput(page);

    // Turno 1: Substitute
    await sim.selectMove(0);

    const midHp = (await sim.getPlayerHpInfo()).hp;

    // Turno 2: Growl
    await sim.selectMove(1);

    const finalHp = (await sim.getPlayerHpInfo()).hp;
    expect(finalHp).toBeGreaterThan(midHp);
  });

  test('should apply Life Orb recoil damage after attacking', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerLifeOrb');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupLifeOrbScenario();
    await sim.startBattle();
    
    // Execute turn
    await sim.selectMove(0);

    const hpInfo = await sim.getPlayerHpInfo();
    expect(hpInfo.hp).toBeLessThan(hpInfo.maxHp);
  });

  test('should activate Focus Sash on a fatal blow and survive with 1 HP', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerSash');
    await sim.setup();
    await waitForWaitInput(page);
    await sim.setupFocusSashScenario();
    await sim.startBattle();

    // Execute turn
    await sim.selectMove(0);

    expect(await sim.getPlayerHp()).toBe(1);
  });

  // Cargar y ejecutar lotes fuzzer
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  let itemBatches: CertifiedTestBatch[] = [];
  if (fs.existsSync(consolidatorPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8')) as Record<string, unknown>;
      if (content.items_consumption) {
        itemBatches = content.items_consumption as CertifiedTestBatch[];
      }
    } catch (_e: unknown) { /* expected */ }
  }

  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;

  let startIdx = 0;
  if (startFromCaseId) {
    const foundIdx = itemBatches.findIndex((b) => b.id === startFromCaseId.trim());
    if (foundIdx !== -1) startIdx = foundIdx;
  } else if (startFromIndex) {
    startIdx = Number(startFromIndex.trim()) - 1;
  }

  const filteredItemBatches = itemBatches.map((b, idx) => ({ b, idx })).filter(({ b, idx }) => {
    if (caseIdFilter) return b.id === caseIdFilter.trim();
    if (caseFilter) return (idx + 1) === Number(caseFilter.trim());
    return idx >= startIdx;
  });

  if (filteredItemBatches.length > 0) {
    filteredItemBatches.forEach(({ b: batch, idx: index }) => {
      test(`debería ejecutar el lote de fuzzer de items #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`, async ({ page }) => {
        test.setTimeout(360000);
        const sim = new HeldItemsSimWrapper(page, `TestBatchItems_${index}`);
        await sim.setup();
        await waitForWaitInput(page);

        // Inyectar el lote usando la clase base unificada
        await sim.setupFuzzerScenario(batch);

        if (batch.ended === false) {
          console.warn(`[E2E-WARN] Saltando lote ${batch.id || index + 1} porque no terminó exitosamente en el fuzzer.`);
          return;
        }

        try {
          await sim.startBattle();
          await sim.playBattle(index, 0, batch.playerChoices, batch.cheats, batch.finalState);
        } catch (error: unknown) {
          const caseId = batch.id || `lote-items-${index + 1}`;
          if (process.env.CONTINUE_ON_ERROR === 'true') {
            console.warn(`[E2E-WARN] Ignorando error en lote de items ${caseId}`);
            return;
          }
          throw new Error(`[Fallo en Items ${caseId}]: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    });
  }
});
