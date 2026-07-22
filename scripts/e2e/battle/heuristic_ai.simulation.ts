import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForWaitInput, clickResilient, type WindowWithResolver, type BattleLogEntry } from '../e2e_helpers.ts';

interface FailureRecord {
  scenario: string;
  error: string;
  timestamp: string;
}

const failures: FailureRecord[] = [];
const FAILURES_DIR = path.resolve(process.cwd(), 'scratch/e2e_failures');
const REPORT_PATH  = path.resolve(process.cwd(), 'scripts/e2e/results/heuristic_ai_failures.json');

function recordFailure(scenario: string, error: string): void {
  const rec: FailureRecord = { scenario, error, timestamp: new Date().toISOString() };
  failures.push(rec);
  if (!fs.existsSync(FAILURES_DIR)) fs.mkdirSync(FAILURES_DIR, { recursive: true });
  const fname = `heuristic-${scenario.replace(/\s+/g, '-')}-${Date.now()}.json`;
  fs.writeFileSync(path.join(FAILURES_DIR, fname), JSON.stringify(rec, null, 2), 'utf8');
}

class HeuristicAISimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupScenario1(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore }   = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const charizard = pokemonDebugService.generate({ id: 'charizard', level: 50, heldItem: 'leftovers', moves: ['flamethrower', 'airslash', 'dragondance', 'roost'] });
      useGameStore().state.team = [charizard];

      const blastoise = pokemonDebugService.generate({ id: 'blastoise', level: 50, moves: ['surf', 'icebeam', 'flashcannon', 'protect'] });
      await useBattleStore().startBattle(blastoise, { locationId: 'route1', isTrainer: true, trainerName: 'NPC' });
    });
  }

  public async setupScenario2(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore }   = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const magikarp = pokemonDebugService.generate({ id: 'magikarp', level: 5, moves: ['splash'] });
      magikarp.hp = 1;
      useGameStore().state.team = [magikarp];

      const mewtwo = pokemonDebugService.generate({ id: 'mewtwo', level: 100, moves: ['psychic', 'shadowball', 'icebeam', 'thunderbolt'] });
      await useBattleStore().startBattle(mewtwo, { locationId: 'route1', isTrainer: true, trainerName: 'Rival' });
    });
  }

  public async setupScenario3(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore }   = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const snorlax = pokemonDebugService.generate({ id: 'snorlax', level: 50, moves: ['bodyslam', 'earthquake', 'icebeam', 'fireblast'] });
      useGameStore().state.team = [snorlax];

      const rattata = pokemonDebugService.generate({ id: 'rattata', level: 5, moves: ['tackle', 'tailwhip', 'quickattack', 'bite'] });
      await useBattleStore().startBattle(rattata, { locationId: 'route1', isTrainer: false });
    });
  }

  public async setupScenario4(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore }   = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const machamp = pokemonDebugService.generate({ id: 'machamp', level: 50, heldItem: 'choiceband', moves: ['dynamicpunch', 'rockslide', 'icepunch', 'thunderpunch'] });
      useGameStore().state.team = [machamp];

      const blissey = pokemonDebugService.generate({ id: 'blissey', level: 50, moves: ['softboiled', 'seismictoss', 'thunderwave', 'protect'] });
      await useBattleStore().startBattle(blissey, { locationId: 'route1', isTrainer: true, isGym: true, trainerName: 'Líder Gimnasio' });
    });
  }

  public async setupScenario5(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const { useGameStore }   = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const pikachu = pokemonDebugService.generate({ id: 'pikachu', level: 50, moves: ['thunderbolt', 'quickattack', 'irontail', 'voltswitch'] });
      useGameStore().state.team = [pikachu];

      const gengar   = pokemonDebugService.generate({ id: 'gengar', level: 50, moves: ['shadowball', 'sludgebomb', 'thunderbolt', 'focusblast'] });
      const clefable = pokemonDebugService.generate({ id: 'clefable', level: 50, moves: ['moonblast', 'softboiled', 'thunderwave', 'fireblast'] });
      await useBattleStore().startBattle(gengar, { locationId: 'route1', isTrainer: true, trainerName: 'Rival', enemyTeam: [gengar, clefable] });
    });
  }

  public async checkBattleOver(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store) return false;
      return store.state?.over || store.isBattleOver || store.currentFsmState === 'REWARDS_PHASE' || store.currentFsmState === 'EXIT_BATTLE';
    });
  }
}

test.describe('HeuristicAI E2E Verification', () => {
  test.setTimeout(300_000);

  test.afterAll(() => {
    if (!fs.existsSync(path.dirname(REPORT_PATH))) {
      fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(failures, null, 2), 'utf8');
  });

  test('Escenario 1 - NPC (5% error): batalla completa sin crash', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, `TEST_AI_1_${Date.now()}`);
    try {
      await sim.setup();
      await waitForWaitInput(page);
      await sim.setupScenario1();
      await sim.startBattle();
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('npc-batalla-completa', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 2 - Rival (0% error): derrota al jugador con HP critico', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, `TEST_AI_2_${Date.now()}`);
    try {
      await sim.setup();
      await waitForWaitInput(page);
      await sim.setupScenario2();
      await sim.startBattle();
      await waitForWaitInput(page);

      // Clickeamos splash
      await sim.selectMove(0);

      // Esperar a que el jugador caiga debilitado
      await page.waitForFunction(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        return !!store.state?.over || store.state?.player?.hp === 0 || store.currentSubState === 'PLAYER_FAINT_SEQ';
      }, undefined, { timeout: 15000 });

      const fainted = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        return (store?.state?.player?.hp ?? 1) === 0 || !!store?.state?.over;
      });
      expect(fainted).toBe(true);
    } catch (e) {
      recordFailure('rival-ohko', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 3 - Wild (50% error): arranca y ejecuta turnos sin crash', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, `TEST_AI_3_${Date.now()}`);
    try {
      await sim.setup();
      await waitForWaitInput(page);
      await sim.setupScenario3();
      await sim.startBattle();
      await waitForWaitInput(page);

      const subState = await page.evaluate(() => (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().currentSubState ?? '');
      expect(subState).toBe('WAIT_INPUT');

      // Jugar 3 turnos
      for (let i = 0; i < 3; i++) {
        await waitForWaitInput(page);
        const over = await sim.checkBattleOver();
        if (over) break;
        await sim.selectMove(0);
      }

      const enemyLogs = await page.evaluate(() => {
        const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        return (store?.battleLogs ?? []).filter((l: BattleLogEntry) => l.side === 'enemy').map((l: BattleLogEntry) => l.msg);
      });
      expect(enemyLogs.length).toBeGreaterThanOrEqual(1);
    } catch (e) {
      recordFailure('wild-crash-free', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 4 - Gym (0% error): battle completa con held item (Choice Band)', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, `TEST_AI_4_${Date.now()}`);
    try {
      await sim.setup();
      await waitForWaitInput(page);
      await sim.setupScenario4();
      await sim.startBattle();
      
      // Jugar turnos completos
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('gym-choice-band', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 5 - Rival con equipo: no crashea con switch disponible', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, `TEST_AI_5_${Date.now()}`);
    try {
      await sim.setup();
      await waitForWaitInput(page);
      await sim.setupScenario5();
      await sim.startBattle();
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('rival-switch-equipo', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 6 - Fuzzer: los 4 tipos de entrenador corren sin error', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, `TEST_AI_6_${Date.now()}`);
    const trainerTypes = ['wild', 'npc', 'gym', 'rival'] as const;

    for (const trainerType of trainerTypes) {
      try {
        await sim.setup();
        await waitForWaitInput(page);

        await page.evaluate(async (tt) => {
          const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
          const { useGameStore }   = await import('../../../src/stores/game.ts');
          const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

          const mew = pokemonDebugService.generate({ id: 'mew', level: 100, moves: ['psychic', 'shadowball', 'icebeam', 'thunderbolt'] });
          useGameStore().state.team = [mew];

          const rattata = pokemonDebugService.generate({ id: 'rattata', level: 5, moves: ['tackle', 'tailwhip', 'quickattack', 'bite'] });
          const isTrainer = tt !== 'wild';
          const isGym = tt === 'gym';
          const nameMap: Record<string, string> = { rival: 'Rival', gym: 'Líder Gimnasio', npc: 'NPC' };
          await useBattleStore().startBattle(rattata, {
            locationId: 'route1',
            isTrainer,
            isGym,
            trainerName: isTrainer ? (nameMap[tt] || 'NPC') : undefined
          });
        }, trainerType);

        await sim.startBattle();
        await waitForWaitInput(page);

        await sim.selectMove(0).catch(() => {});

        await page.waitForFunction(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          const store = resolver?.();
          return !store?.state || store.state.over ||
            store.currentSubState === 'WAIT_INPUT' ||
            store.currentSubState === 'PLAYER_FAINT_SEQ';
        }, undefined, { timeout: 10000 }).catch(() => { /* expected */ });

        await page.evaluate(async () => {
          const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
          useBattleStore().endBattle?.(false, true);
        });
        await page.waitForTimeout(400);

        console.debug(`[AI Fuzzer] trainerType="${trainerType}" OK`);
      } catch (e) {
        recordFailure(`fuzzer-${trainerType}`, e instanceof Error ? e.message : String(e));
        throw e;
      }
    }
  });
});
