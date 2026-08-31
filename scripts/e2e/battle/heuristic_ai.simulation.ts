import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';
import { waitForWaitInput, type WindowWithResolver } from '../e2e_helpers.ts';
import type { NpcSpriteId } from '../../../src/data/pokemon/npcSpriteCatalog.ts';

interface FailureRecord {
  scenario: string;
  error: string;
  timestamp: string;
}

const failures: FailureRecord[] = [];
const FAILURES_DIR = path.resolve(process.cwd(), 'scratch/e2e_failures');
const REPORT_PATH  = path.resolve(process.cwd(), 'scripts/e2e/results/heuristic_ai_failures.json');
const HEURISTIC_AI_ERROR_PERCENTAGE_LABEL_TEXT = '50%';

const TRAINER_FIXTURES = {
  npc: { name: 'NPC', sprite: 'youngster' },
  gym: { name: 'Líder Gimnasio', sprite: 'brock' },
  rival: { name: 'Rival', sprite: 'youngster-masters' }
} as const satisfies Record<'npc' | 'gym' | 'rival', { readonly name: string; readonly sprite: NpcSpriteId }>;

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
      await useBattleStore().startBattle(blastoise, { locationId: 'route1', isTrainer: true, trainerName: 'NPC', trainerSprite: 'youngster' });
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
      await useBattleStore().startBattle(mewtwo, { locationId: 'route1', isTrainer: true, trainerName: 'Rival', trainerSprite: 'youngster-masters' });
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
      await useBattleStore().startBattle(blissey, { locationId: 'route1', isTrainer: true, isGym: true, trainerName: 'Líder Gimnasio', trainerSprite: 'brock' });
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
      await useBattleStore().startBattle(gengar, { locationId: 'route1', isTrainer: true, trainerName: 'Rival', trainerSprite: 'youngster-masters', enemyTeam: [gengar, clefable] });
    });
  }

  public async checkBattleOver(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store) return false;
      const storeObj = store as Record<string, unknown>; // open-record
      const fsmState = store.currentFsmState;
      const isFainted = (store.enemy?.hp === 0) || (store.player?.hp === 0) || (store.state?.enemy?.hp === 0) || (store.state?.player?.hp === 0);
      return !!(store.state?.over || storeObj.isBattleOver || fsmState === 'REWARDS_PHASE' || fsmState === 'EXIT_BATTLE' || fsmState === 'SEARCH_PHASE' || isFainted);
    });
  }
}

test.describe('HeuristicAI E2E Verification', () => {
  test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);

  test.afterAll(() => {
    if (!fs.existsSync(path.dirname(REPORT_PATH))) {
      fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(failures, null, 2), 'utf8');
  });

  test('Escenario 1 - NPC (5% error): batalla completa sin crash', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, 'AI_Scenario_1');
    try {
      await sim.setup();
      await sim.setupScenario1();
      await sim.enableE2EWorkerFlag();
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('npc-batalla-completa', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 2 - Rival (0% error): derrota al jugador con HP critico', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, 'AI_Scenario_2');
    try {
      await sim.setup();
      await sim.setupScenario2();
      await sim.enableE2EWorkerFlag();
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('rival-ohko', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test(`Escenario 3 - Wild (${HEURISTIC_AI_ERROR_PERCENTAGE_LABEL_TEXT} error): arranca y ejecuta turnos sin crash`, async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, 'AI_Scenario_3');
    try {
      await sim.setup();
      await sim.setupScenario3();
      await sim.enableE2EWorkerFlag();
      await waitForWaitInput(page);

      const subState = await page.evaluate(() => {
        const bs = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        return bs?.currentSubState ?? '';
      });
      expect(subState).toBe('WAIT_INPUT');

      // Jugar turnos y verificar que el combate avanza limpiamente sin errores
      for (let i = 0; i < 3; i++) {
        if (await sim.checkBattleOver()) break;
        await waitForWaitInput(page);
        if (await sim.checkBattleOver()) break;
        await sim.selectMove(0);
      }

      // Validar que la FSM esta en un estado principal valido (ACTIVE_BATTLE, REWARDS_PHASE, EXIT_BATTLE, SEARCH_PHASE)
      const currentFsmState = await page.evaluate(() => {
        const bs = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        return bs?.currentFsmState ?? '';
      });
      expect(['ACTIVE_BATTLE', 'REWARDS_PHASE', 'EXIT_BATTLE', 'SEARCH_PHASE']).toContain(currentFsmState);
    } catch (e) {
      recordFailure('wild-crash-free', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 4 - Gym (0% error): battle completa con held item (Choice Band)', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, 'AI_Scenario_4');
    try {
      await sim.setup();
      await sim.setupScenario4();
      await sim.enableE2EWorkerFlag();
      
      // Jugar turnos completos
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('gym-choice-band', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 5 - Rival con equipo: no crashea con switch disponible', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, 'AI_Scenario_5');
    try {
      await sim.setup();
      await sim.setupScenario5();
      await sim.enableE2EWorkerFlag();
      await sim.playBattle();
      expect(await sim.checkBattleOver()).toBe(true);
    } catch (e) {
      recordFailure('rival-switch-equipo', e instanceof Error ? e.message : String(e));
      throw e;
    }
  });

  test('Escenario 6 - Fuzzer: los 4 tipos de entrenador corren sin error', async ({ page }) => {
    const sim = new HeuristicAISimWrapper(page, 'AI_Scenario_6');
      const trainerTypes = ['wild', 'npc', 'gym', 'rival'] as const;

    for (const trainerType of trainerTypes) {
      try {
        await sim.setup();

        await page.evaluate(async ({ trainerType, fixture }) => {
          const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
          const { useGameStore }   = await import('../../../src/stores/game.ts');
          const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

          const mew = pokemonDebugService.generate({ id: 'mew', level: 100, moves: ['psychic', 'shadowball', 'icebeam', 'thunderbolt'] });
          useGameStore().state.team = [mew];

          const rattata = pokemonDebugService.generate({ id: 'rattata', level: 5, moves: ['tackle', 'tailwhip', 'quickattack', 'bite'] });
          const isTrainer = trainerType !== 'wild';
          const isGym = trainerType === 'gym';
          await useBattleStore().startBattle(rattata, {
            locationId: 'route1',
            isTrainer,
            isGym,
            trainerName: fixture?.name,
            trainerSprite: fixture?.sprite
          });
        }, { trainerType, fixture: trainerType === 'wild' ? undefined : TRAINER_FIXTURES[trainerType] });

        await sim.enableE2EWorkerFlag();
        await sim.playBattle();
        expect(await sim.checkBattleOver()).toBe(true);

        console.debug(`[AI Fuzzer] trainerType="${trainerType}" OK`);
      } catch (e) {
        recordFailure(`fuzzer-${trainerType}`, e instanceof Error ? e.message : String(e));
        throw e;
      }
    }
  });
});
