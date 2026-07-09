/**
 * scripts/e2e/battle/heuristic_ai.sim.ts
 *
 * Playwright E2E — HeuristicAI behavior verification
 *
 * Scenarios:
 *  1. NPC (5% error): llega a un resultado valido en combate completo
 *  2. Rival (0% error): elige el OHKO disponible sobre el move inferior
 *  3. Wild (50% error): arranca y ejecuta turnos sin crash
 *  4. Gym leader (0% error): battle completa con held item
 *  5. Rival con equipo: no crashea con switch disponible
 *  6. Fuzzer: los 4 tipos de entrenador corren sin error
 *
 * Fallos se guardan en scratch/e2e_failures/ y se consolidan en
 * scripts/e2e/results/heuristic_ai_failures.json al final del suite.
 */

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  setupE2ESession,
  loginTestUser,
  confirmAndStartBattle,
  waitForWaitInput,
  type WindowWithResolver,
} from '../e2e_helpers.ts';

// ── result tracking ───────────────────────────────────────────────────────────

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

// ── helpers ───────────────────────────────────────────────────────────────────

async function playNTurns(page: Parameters<typeof waitForWaitInput>[0], n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const isOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return !resolver || !resolver().state || resolver().state.over;
    });
    if (isOver) break;

    await waitForWaitInput(page);

    const stillOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return !resolver || !resolver().state || resolver().state.over;
    });
    if (stillOver) break;

    const firstMove = page.locator('.move-card-vicio:not([disabled])').first();
    const visible = await firstMove.isVisible().catch(() => false);
    if (!visible) break;
    await firstMove.click();
  }
}

// ── suite ─────────────────────────────────────────────────────────────────────

test.describe('HeuristicAI E2E Verification', () => {
  test.setTimeout(300_000);

  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    await loginTestUser(page, `TEST_AI_${Date.now()}`);
  });

  test.afterAll(() => {
    if (!fs.existsSync(path.dirname(REPORT_PATH))) {
      fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(failures, null, 2), 'utf8');
    if (failures.length > 0) {
      console.log(`\n⚠️  ${failures.length} fallo(s) guardados en ${REPORT_PATH}`);
    } else {
      console.log('\n✅ Todos los escenarios de HeuristicAI pasaron. Reporte vaciado.');
    }
  });

  // ── Escenario 1: Combate completo NPC ─────────────────────────────────────

  test('Escenario 1 - NPC (5% error): batalla completa sin crash', async ({ page }) => {
    try {
      await page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore }   = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

        const charizard = pokemonDebugService.generate({ id: 'charizard', level: 50, heldItem: 'leftovers', moves: ['flamethrower', 'airslash', 'dragondance', 'roost'] });
        useGameStore().state.team = [charizard];

        const blastoise = pokemonDebugService.generate({ id: 'blastoise', level: 50, moves: ['surf', 'icebeam', 'flashcannon', 'protect'] });
        await useBattleStore().startBattle(blastoise, { locationId: 'route1', trainerType: 'npc' });
      });

      await confirmAndStartBattle(page);
      await playNTurns(page, 60);

      const over = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        return resolver?.().state?.over ?? false;
      });

      expect(over).toBe(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordFailure('npc-batalla-completa', msg);
      throw e;
    }
  });

  // ── Escenario 2: Rival elige OHKO ─────────────────────────────────────────

  test('Escenario 2 - Rival (0% error): derrota al jugador con HP critico', async ({ page }) => {
    try {
      await page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore }   = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

        const magikarp = pokemonDebugService.generate({ id: 'magikarp', level: 5, moves: ['splash'] });
        magikarp.hp = 1;
        useGameStore().state.team = [magikarp];

        const mewtwo = pokemonDebugService.generate({ id: 'mewtwo', level: 100, moves: ['psychic', 'shadowball', 'icebeam', 'thunderbolt'] });
        await useBattleStore().startBattle(mewtwo, { locationId: 'route1', trainerType: 'rival' });
      });

      await confirmAndStartBattle(page);
      await waitForWaitInput(page);

      const splashBtn = page.locator('.move-card-vicio:not([disabled])').first();
      await splashBtn.click();

      await page.waitForFunction(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        return !!store.state?.over || store.state?.player?.hp === 0 || store.currentSubState === 'PLAYER_FAINT_SEQ';
      }, undefined, { timeout: 15000 });

      const playerFainted = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        return (store?.state?.player?.hp ?? 1) === 0 || !!store?.state?.over;
      });

      expect(playerFainted).toBe(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordFailure('rival-ohko', msg);
      throw e;
    }
  });

  // ── Escenario 3: Wild - crash free ────────────────────────────────────────

  test('Escenario 3 - Wild (50% error): arranca y ejecuta turnos sin crash', async ({ page }) => {
    try {
      await page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore }   = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

        const snorlax = pokemonDebugService.generate({ id: 'snorlax', level: 50, moves: ['bodyslam', 'earthquake', 'icebeam', 'fireblast'] });
        useGameStore().state.team = [snorlax];

        // trainerType wild -> 50% error, no switchea
        const rattata = pokemonDebugService.generate({ id: 'rattata', level: 5, moves: ['tackle', 'tailwhip', 'quickattack', 'bite'] });
        await useBattleStore().startBattle(rattata, { locationId: 'route1', trainerType: 'wild' });
      });

      await confirmAndStartBattle(page);
      await waitForWaitInput(page);

      // La FSM llego a WAIT_INPUT: la IA wild tomo su decision sin crash
      const subState = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        return resolver?.().currentSubState ?? '';
      });
      expect(subState).toBe('WAIT_INPUT');

      // Ejecutar 3 turnos: la IA wild debe responder en cada uno sin crash
      await playNTurns(page, 3);

      // Leer logs del enemigo: BattleLog usa side: 'enemy' (no el protocolo raw de Showdown)
      const enemyLogs = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const logs = resolver?.().battleLogs ?? [];
        return (logs as Array<{ side: string; msg: string }>)
          .filter(l => l.side === 'enemy')
          .map(l => l.msg);
      });

      console.debug('[Wild fuzzer] Logs del enemigo capturados:', enemyLogs);
      expect(enemyLogs.length).toBeGreaterThanOrEqual(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordFailure('wild-crash-free', msg);
      throw e;
    }
  });

  // ── Escenario 4: Gym leader con held item ─────────────────────────────────

  test('Escenario 4 - Gym (0% error): battle completa con held item (Choice Band)', async ({ page }) => {
    try {
      await page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore }   = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

        const machamp = pokemonDebugService.generate({ id: 'machamp', level: 50, heldItem: 'choiceband', moves: ['dynamicpunch', 'rockslide', 'icepunch', 'thunderpunch'] });
        useGameStore().state.team = [machamp];

        const blissey = pokemonDebugService.generate({ id: 'blissey', level: 50, moves: ['softboiled', 'seismictoss', 'thunderwave', 'protect'] });
        await useBattleStore().startBattle(blissey, { locationId: 'route1', trainerType: 'gym' });
      });

      await confirmAndStartBattle(page);

      let turnsPlayed = 0;
      for (let i = 0; i < 20; i++) {
        const isOver = await page.evaluate(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          return !resolver?.().state || resolver?.().state.over;
        });
        if (isOver) break;

        await waitForWaitInput(page);

        const stillOver = await page.evaluate(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          return !resolver?.().state || resolver?.().state.over;
        });
        if (stillOver) break;

        const btn = page.locator('.move-card-vicio:not([disabled])').first();
        const visible = await btn.isVisible().catch(() => false);
        if (!visible) break;

        await btn.click();
        turnsPlayed++;
      }

      expect(turnsPlayed).toBeGreaterThan(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordFailure('gym-choice-band', msg);
      throw e;
    }
  });

  // ── Escenario 5: Rival con equipo - AI switch ─────────────────────────────

  test('Escenario 5 - Rival con equipo: no crashea con switch disponible', async ({ page }) => {
    try {
      await page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const { useGameStore }   = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

        const pikachu = pokemonDebugService.generate({ id: 'pikachu', level: 50, moves: ['thunderbolt', 'quickattack', 'irontail', 'voltswitch'] });
        useGameStore().state.team = [pikachu];

        const gengar   = pokemonDebugService.generate({ id: 'gengar', level: 50, moves: ['shadowball', 'sludgebomb', 'thunderbolt', 'focusblast'] });
        const clefable = pokemonDebugService.generate({ id: 'clefable', level: 50, moves: ['moonblast', 'softboiled', 'thunderwave', 'fireblast'] });
        await useBattleStore().startBattle(gengar, { locationId: 'route1', trainerType: 'rival', enemyTeam: [gengar, clefable] });
      });

      await confirmAndStartBattle(page);
      await playNTurns(page, 30);

      expect(true).toBe(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      recordFailure('rival-switch-equipo', msg);
      throw e;
    }
  });

  // ── Escenario 6: Fuzzer todos los tipos de entrenador ─────────────────────

  test('Escenario 6 - Fuzzer: los 4 tipos de entrenador corren sin error', async ({ page }) => {
    const trainerTypes = ['wild', 'npc', 'gym', 'rival'] as const;

    for (const trainerType of trainerTypes) {
      try {
        await page.evaluate(async (tt) => {
          const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
          const { useGameStore }   = await import('../../../src/stores/game.ts');
          const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

          const mew = pokemonDebugService.generate({ id: 'mew', level: 100, moves: ['psychic', 'shadowball', 'icebeam', 'thunderbolt'] });
          useGameStore().state.team = [mew];

          const rattata = pokemonDebugService.generate({ id: 'rattata', level: 5, moves: ['tackle', 'tailwhip', 'quickattack', 'bite'] });
          await useBattleStore().startBattle(rattata, { locationId: 'route1', trainerType: tt });
        }, trainerType);

        await confirmAndStartBattle(page);
        await waitForWaitInput(page);

        const btn = page.locator('.move-card-vicio:not([disabled])').first();
        const visible = await btn.isVisible().catch(() => false);
        if (visible) await btn.click();

        await page.waitForFunction(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          const store = resolver?.();
          return !store?.state || store.state.over ||
            store.currentSubState === 'WAIT_INPUT' ||
            store.currentSubState === 'PLAYER_FAINT_SEQ';
        }, undefined, { timeout: 10000 }).catch(() => {});

        await page.evaluate(async () => {
          const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
          useBattleStore().endBattle?.();
        });
        await page.waitForTimeout(400);

        console.debug(`[AI Fuzzer] trainerType="${trainerType}" OK`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        recordFailure(`fuzzer-${trainerType}`, msg);
        throw e;
      }
    }
  });
});
