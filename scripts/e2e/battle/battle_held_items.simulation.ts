// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, verifyHpParity, type CertifiedTestBatch, type WindowWithResolver } from '../e2e_helpers.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';

const E2E_SNORLAX_LEVEL = 50;
const E2E_CATERPIE_LEVEL = 5;
const E2E_MEWTWO_LEVEL = 100;
const E2E_SASH_SURVIVAL_HP = 1;

class HeldItemsSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupLeftoversScenario(): Promise<void> {
    await this.page.evaluate(async ({ snrLvl, catLvl }: { snrLvl: number; catLvl: number }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const snorlax = pokemonDebugService.generate({
        id: 'snorlax',
        level: snrLvl,
        heldItem: 'leftovers',
        moves: ['substitute', 'growl']
      });

      const caterpie = pokemonDebugService.generate({
        id: 'caterpie',
        level: catLvl,
        moves: ['splash']
      });

      useGameStore().state.team = [snorlax];
      await useBattleStore().startBattle(caterpie, { locationId: 'route1' });
    }, { snrLvl: E2E_SNORLAX_LEVEL, catLvl: E2E_CATERPIE_LEVEL });
  }

  public async setupLifeOrbScenario(): Promise<void> {
    await this.page.evaluate(async (lvl: number) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const mew = pokemonDebugService.generate({
        id: 'mew',
        level: lvl,
        heldItem: 'lifeorb',
        moves: ['psychic']
      });
      const blissey = pokemonDebugService.generate({
        id: 'blissey',
        level: lvl,
        moves: ['softboiled']
      });

      useGameStore().state.team = [mew];
      await useBattleStore().startBattle(blissey, { locationId: 'route1', enemyTeam: [blissey] });
    }, E2E_SNORLAX_LEVEL);
  }

  public async setupFocusSashScenario(): Promise<void> {
    await this.page.evaluate(async ({ sunkernLvl, mewtwoLvl }: { sunkernLvl: number; mewtwoLvl: number }) => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useMapStore } = await import('../../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      useMapStore().setGlobalWeather('clear');

      const sunkern = pokemonDebugService.generate({
        id: 'sunkern',
        level: sunkernLvl,
        ability: 'chlorophyll',
        heldItem: 'focussash',
        moves: ['tackle']
      });
      const mewtwo = pokemonDebugService.generate({
        id: 'mewtwo',
        level: mewtwoLvl,
        moves: ['psystrike', 'psychic']
      });

      useGameStore().state.team = [sunkern];
      await useBattleStore().startBattle(mewtwo, { locationId: 'route1' });
    }, { sunkernLvl: E2E_CATERPIE_LEVEL, mewtwoLvl: E2E_MEWTWO_LEVEL });
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
    test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
  });

  test('should apply passive healing from Leftovers at the end of a turn', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerItems');
    await sim.setup();
    await sim.setupLeftoversScenario();
    await waitForWaitInput(page);

    // Turno 1: Substitute
    await sim.selectMove(0);
    await verifyHpParity(page);

    const midHp = (await sim.getPlayerHpInfo()).hp;

    // Turno 2: Growl
    await sim.selectMove(1);

    const finalHp = (await sim.getPlayerHpInfo()).hp;
    expect(finalHp).toBeGreaterThan(midHp);
  });

  test('should apply Life Orb recoil damage after attacking', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerLifeOrb');
    await sim.setup();
    await sim.setupLifeOrbScenario();
    await waitForWaitInput(page);
    
    // Execute turn
    await sim.selectMove(0);

    const hpInfo = await sim.getPlayerHpInfo();
    expect(hpInfo.hp).toBeLessThan(hpInfo.maxHp);
  });

  test('should activate Focus Sash on a fatal blow and survive with 1 HP', async ({ page }) => {
    const sim = new HeldItemsSimWrapper(page, 'TestPlayerSash');
    await sim.setup();
    await sim.setupFocusSashScenario();
    await waitForWaitInput(page);

    // Execute turn
    await sim.selectMove(0);

    expect(await sim.getPlayerHp()).toBe(E2E_SASH_SURVIVAL_HP);
  });

  // Cargar y ejecutar lotes fuzzer
  const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (!fs.existsSync(consolidatorPath)) {
    throw new Error(`[E2E] Missing regenerated fuzzer item artifacts: ${consolidatorPath}`);
  }
  const content = JSON.parse(fs.readFileSync(consolidatorPath, 'utf8')) as Record<string, unknown>; // open-record
  if (!Array.isArray(content.items)) {
    throw new Error('[E2E] Regenerated fuzzer artifacts do not contain an items array.');
  }
  const itemBatches = content.items as CertifiedTestBatch[];

  const caseFilter = process.env.TEST_CASE;
  const caseIdFilter = process.env.TEST_CASE_ID;
  const startFromCaseId = process.env.TEST_START_FROM_CASE_ID;
  const startFromIndex = process.env.TEST_START_FROM_INDEX;

  let startIdx = 0;
  if (startFromCaseId) {
    const foundIdx = itemBatches.findIndex((b) => b.id === startFromCaseId.trim());
    if (foundIdx !== -1) startIdx = foundIdx;
  } else if (startFromIndex) {
    const parsed = Number(startFromIndex);
    if (!Number.isNaN(parsed) && parsed > 0) startIdx = parsed - 1;
  }

  const filteredItemBatches = itemBatches.map((b, idx) => ({ b, idx })).filter(({ b, idx }) => {
    if (caseIdFilter) return b.id === caseIdFilter.trim();
    if (caseFilter) return (idx + 1) === Number(caseFilter.trim());
    return idx >= startIdx;
  });

  if (filteredItemBatches.length > 0) {
    filteredItemBatches.forEach(({ b: batch, idx: index }) => {
      test(`debería ejecutar el lote de fuzzer de items #${index + 1} (${batch.playerTeam.length} Pokémon) de forma determinista`, async ({ page }) => {
        test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
        const sim = new HeldItemsSimWrapper(page, `TestBatchItems_${index}`);
        await sim.setup();

        // Inyectar el lote usando la clase base unificada
        await sim.setupFuzzerScenario(batch);

        try {
          await sim.replayCertifiedBattle(batch);
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
