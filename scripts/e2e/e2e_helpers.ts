// fallow-ignore-file security-sink
import { type Page, type Locator, expect } from '@playwright/test';
import { toID } from '@pkmn/sim';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  MAX_UI_SETTLE_TIMEOUT_MS,
  MS_TO_SECONDS_DIVISOR,
  SWITCH_SLOT_INDEX_OFFSET
} from './simulation_config.ts';
export { MAX_PER_ACTION_TIMEOUT_MS };
import { isMatchingUid } from '../../src/logic/battle/showdownUidMapper.ts';
import { BATTLE_UI_EVENTS, type BattleForcedSwitchDetail, type BattleReadyForInputDetail } from '../../src/types/battle/battleEvents.ts';
import { GAME_UI_EVENTS, type GameStoreReadyDetail } from '../../src/types/system/gameEvents.ts';
import type { CertifiedBattleCase } from './fuzzer/generators/fuzzer_team_generator.ts';
import fs from 'node:fs';
import path from 'node:path';
import { sanitizePath } from '../lib/safePath.ts';

/**
 * Flush buffered logs accumulated in RAM during test execution to worker-isolated log files
 * and log a clean, explicit progress line to stdout.
 */
export function flushE2ELogs(
  logBuffer: string[],
  testName: string,
  status: 'passed' | 'failed' | 'skipped' = 'passed',
  durationMs?: number
): void {
  const workerId = process.env.TEST_WORKER_INDEX || '0';
  const logDir = path.resolve('scripts/e2e/results/logs');
  
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFilePath = path.join(logDir, sanitizePath(`worker_${workerId}.log`));
    const timeStr = new Date().toISOString();
    const header = `\n--- [${timeStr}] TEST: ${testName} [STATUS: ${status.toUpperCase()}] (${durationMs ? (durationMs / MS_TO_SECONDS_DIVISOR).toFixed(1) + 's' : '0s'}) ---\n`;
    fs.appendFileSync(logFilePath, header + logBuffer.join('\n') + '\n');
  } catch (err: unknown) {
    console.debug('[E2E-LOGGER-WARN] Failed to write log file:', err instanceof Error ? err.message : String(err));
  }

  const durationStr = durationMs ? ` (${(durationMs / MS_TO_SECONDS_DIVISOR).toFixed(1)}s)` : '';

  if (status === 'passed') {
    console.log(`[E2E-PROGRESS] ✅ ${testName}${durationStr}`);
  } else if (status === 'failed') {
    console.error(`\n==================================================`);
    console.error(`❌ [E2E-FAILURE-TRACE] ${testName}${durationStr}`);
    console.error(`==================================================`);
    if (logBuffer.length > 0) {
      console.error(logBuffer.join('\n'));
    } else {
      console.error(`(No buffered browser logs captured)`);
    }
    console.error(`==================================================\n`);
  }
}

export interface E2EPage extends Page {
  _e2eLogBuffer?: string[];
}

export function logE2EDebug(page: Page | undefined, msg: string): void {
  const e2ePage = page as E2EPage | undefined;
  if (e2ePage?._e2eLogBuffer) {
    e2ePage._e2eLogBuffer.push(`[E2E-TRACE] ${msg}`);
  }
}

export async function clickResilient(locator: Locator, options: { timeout?: number } = {}): Promise<void> {
  const timeout = options.timeout ?? MAX_PER_ACTION_TIMEOUT_MS;
  try {
    await locator.click({ timeout });
  } catch (_err) {
    await locator.click({ force: true, timeout }).catch(() => {
      return locator.evaluate((el: HTMLElement) => el.click());
    });
  }
}

export interface BattleLogEntry {
  side: 'player' | 'enemy';
  msg: string;
}

/**
 * Typed window cast for E2E Playwright evaluates.
 * All fields are declared in src/types/system/env.d.ts and available globally.
 * This alias exists purely for the `(window as WindowWithResolver)` cast pattern.
 */
export type WindowWithResolver = Window;

export async function armBattleFlowCompletion(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_BATTLE_FLOW_COMPLETION__) {
      throw new Error('[E2E] A battle-flow completion listener is already armed.');
    }
    window.__E2E_BATTLE_FLOW_COMPLETION__ = new Promise<void>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error('[E2E] battle-flow-completed must be a CustomEvent.'));
          return;
        }
        const detail = event.detail as Record<string, unknown> | null; // open-record
        if (typeof detail !== 'object' || detail === null || !('destination' in detail) || detail.destination !== 'map') {
          reject(new Error('[E2E] battle-flow-completed has an invalid detail payload.'));
          return;
        }
        resolve();
      }, { once: true });
    });
  }, BATTLE_UI_EVENTS.FLOW_COMPLETED);
}

export async function awaitBattleFlowCompletion(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const completion = window.__E2E_BATTLE_FLOW_COMPLETION__;
    if (!completion) {
      throw new Error('[E2E] Battle-flow completion was awaited without an armed event listener.');
    }
    try {
      await completion;
    } finally {
      delete window.__E2E_BATTLE_FLOW_COMPLETION__;
    }
  });
}

export async function armBattleReadyForInput(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_BATTLE_READY_FOR_INPUT__) {
      throw new Error('[E2E] A battle-ready-for-input listener is already armed.');
    }
    window.__E2E_BATTLE_READY_FOR_INPUT__ = new Promise<BattleReadyForInputDetail>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error(`[E2E] ${eventName} must be a CustomEvent.`));
          return;
        }
        const detail = event.detail as BattleReadyForInputDetail | null;
        if (typeof detail !== 'object' || detail === null ||
          !('subState' in detail) || typeof detail.subState !== 'string' ||
          !('p1ChoiceIdx' in detail) || typeof detail.p1ChoiceIdx !== 'number' ||
          !('p2ChoiceIdx' in detail) || typeof detail.p2ChoiceIdx !== 'number' ||
          !('over' in detail) || typeof detail.over !== 'boolean' ||
          !('playerSwitchSlots' in detail) || !Array.isArray(detail.playerSwitchSlots)) {
          reject(new Error(`[E2E] ${eventName} has an invalid detail payload.`));
          return;
        }
        resolve(detail);
      }, { once: true });
    });
  }, BATTLE_UI_EVENTS.READY_FOR_INPUT);
}

export async function awaitBattleReadyForInput(page: Page): Promise<BattleReadyForInputDetail> {
  const result = await page.evaluate(async () => {
    const ready = window.__E2E_BATTLE_READY_FOR_INPUT__;
    if (ready) {
      try {
        return await ready;
      } finally {
        delete window.__E2E_BATTLE_READY_FOR_INPUT__;
      }
    }
    const debugObj = window.__VITE_DEBUG__;
    if (debugObj?.waitForBattleReady) {
      return await debugObj.waitForBattleReady();
    }
    throw new Error('[E2E] Battle ready-for-input was awaited without an armed event listener.');
  });
  return result as BattleReadyForInputDetail;
}

export async function armBattleForcedSwitch(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_BATTLE_FORCED_SWITCH__) {
      throw new Error('[E2E] A battle forced-switch listener is already armed.');
    }
    window.__E2E_BATTLE_FORCED_SWITCH__ = new Promise<BattleForcedSwitchDetail>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error(`[E2E] ${eventName} must be a CustomEvent.`));
          return;
        }
        const detail = event.detail as BattleForcedSwitchDetail | null;
        if (!detail || detail.side !== 'player') {
          reject(new Error(`[E2E] ${eventName} has an invalid detail payload.`));
          return;
        }
        resolve(detail);
      }, { once: true });
    });
  }, BATTLE_UI_EVENTS.FORCED_SWITCH_REQUIRED);
}

export async function awaitBattleForcedSwitch(page: Page): Promise<BattleForcedSwitchDetail> {
  return await page.evaluate(async () => {
    const forcedSwitch = window.__E2E_BATTLE_FORCED_SWITCH__;
    if (!forcedSwitch) {
      throw new Error('[E2E] Forced switch was awaited without an armed event listener.');
    }
    try {
      return await forcedSwitch;
    } finally {
      delete window.__E2E_BATTLE_FORCED_SWITCH__;
    }
  });
}

export async function armGameStoreReady(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_GAME_STORE_READY__) {
      throw new Error('[E2E] A game-store-ready listener is already armed.');
    }
    window.__E2E_GAME_STORE_READY__ = new Promise<GameStoreReadyDetail>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error(`[E2E] ${eventName} must be a CustomEvent.`));
          return;
        }
        const detail = event.detail as GameStoreReadyDetail | null;
        if (!detail || detail.ready !== true) {
          reject(new Error(`[E2E] ${eventName} has an invalid detail payload.`));
          return;
        }
        resolve(detail);
      }, { once: true });
    });
  }, GAME_UI_EVENTS.STORE_READY);
}

export async function awaitGameStoreReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const ready = window.__E2E_GAME_STORE_READY__;
    if (!ready) {
      throw new Error('[E2E] Game store readiness was awaited without an armed event listener.');
    }
    try {
      await ready;
    } finally {
      delete window.__E2E_GAME_STORE_READY__;
    }
  });
}


/**
 * Configura los permisos iniciales mockeados en localstorage y globales
 */
export async function setupE2ESession(page: Page, logBuffer?: string[], sqliteKey?: string): Promise<void> {
  const activeBuffer = logBuffer || [];
  (page as E2EPage)._e2eLogBuffer = activeBuffer;

  page.on('console', msg => {
    const text = msg.text();
    let formatted = '';
    if (msg.type() === 'error') {
      formatted = `[BROWSER-ERROR] ${text}`;
    } else if (msg.type() === 'warning') {
      formatted = `[BROWSER-WARN] ${text}`;
    } else {
      formatted = `[BROWSER-LOG] ${text}`;
    }
    
    // Always push to RAM buffer, NEVER write directly to stdout during execution
    activeBuffer.push(formatted);

    if (msg.type() === 'error' && (text.includes('[CRITICAL]') || text.includes('ReferenceError') || text.includes('TypeError'))) {
      throw new Error(`[CRITICAL-CONSOLE-ERROR] ${text}`);
    }
  });

  page.on('pageerror', err => {
    const formatted = `[BROWSER-PAGEERROR] ${err.message}\nStack: ${err.stack}`;
    activeBuffer.push(formatted);
    console.error(formatted);
    throw new Error(`[CRITICAL-E2E-PAGE-ERROR] ${err.message}`);
  });

  page.on('worker', worker => {
    activeBuffer.push(`[BROWSER-WORKER] created: ${worker.url()}`);
  });

  page.on('requestfailed', request => {
    const url = request.url();
    if (url.includes('showdown.worker') || url.includes('@pkmn_sim')) {
      activeBuffer.push(`[BROWSER-WORKER-REQUEST-FAILED] ${url}: ${request.failure()?.errorText ?? 'unknown failure'}`);
    }
  });

  await page.addInitScript((key?: string) => {
    (window as WindowWithResolver).__E2E__ = true;
    try {
      localStorage.setItem('pwa_permissions_accepted', 'true');
      localStorage.setItem('auto-battle', 'false');
      localStorage.setItem('pokevicio_session_mode', 'offline');
      if (key) {
        localStorage.setItem('pokevicio_sqlite_key', key);
      }
    } catch (_e) {
      void 0;
    }
    try {
      sessionStorage.removeItem('pokevicio_logout_reason');
    } catch (_e) {
      void 0;
    }
    if ('Notification' in window) {
      Object.defineProperty(Notification, 'permission', {
        get() { return 'granted'; }
      });
    }
  }, sqliteKey);
}

export async function loginE2ETestUser(page: Page, username = 'E2ETestUser', logBuffer?: string[], sqliteKey?: string): Promise<void> {
  await setupE2ESession(page, logBuffer, sqliteKey);
  await loginTestUser(page, username);
}

export async function loginTestUser(page: Page, testUser: string): Promise<void> {
  // Navigate to login. Wait for 'load' (all scripts executed) so Vue has fully
  // bootstrapped and mounted the login component tree before we query for elements.
  // 'domcontentloaded' fires too early — Vue hasn't run yet, causing #server-tab-local
  // to be absent when multiple concurrent workers share the same Vite dev server.
  await page.goto('/login', { waitUntil: 'load' });

  // Under heavy CPU congestion from parallel workers, client-side Vue mounting,
  // router resolution, and authStore checks can take several seconds.
  // Wait explicitly for Vue to mount and initial loader overlays to disappear.
  await page.waitForFunction(() => {
    const win = window as WindowWithResolver;
    return win.pwa_app_mounted === true &&
           typeof win.initSqlJs === 'function' &&
           !document.querySelector('#pv-loading-overlay') &&
           !document.querySelector('.auth-loading-text');
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  // The local form does not exist until its server tab has rendered.
  const localTab = page.locator('#server-tab-local').first();
  await localTab.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await localTab.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

  const userInput = page.locator('#local-username-input').first();
  await userInput.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await userInput.fill(testUser);

  const jugarBtn = page.locator('#local-login-btn').first();
  await jugarBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await armGameStoreReady(page);
  await jugarBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

  await page.waitForFunction(() => localStorage.getItem('pokevicio_session_mode') === 'offline', undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await page.waitForURL(url => url.pathname !== '/login', { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  await awaitGameStoreReady(page);

  // A new local profile must choose a starter; an existing profile goes straight to the map.
  const starterCard = page.locator('[id^="starter-card-"]').first();

  if (await starterCard.isVisible()) {
    await starterCard.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }
}

export async function resolveTargetUidForSlot(page: Page, slotNum: number, _label: string): Promise<string | null> {
  return await page.evaluate(async ({ slotNum }) => {
    try {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return null;
      const store = resolver();
      const state = store.state;
      if (!state) return null;
      
      const { ShowdownTeamResolver } = (await import('../../src/logic/battle/showdownTeamResolver.ts')) as { ShowdownTeamResolver: { getPokemonByShowdownSlot: (team: unknown[], request: unknown, slot: number) => { uid?: string } | null | undefined } };
      
      // Obtener el equipo actual usando getGameStore de window para evitar Pinia duplicado en Playwright
      const gameStore = (window as WindowWithResolver).__VITE_DEBUG__?.getGameStore?.() as { state: { team: unknown[] } } | undefined;
      const team = gameStore?.state?.team || [];
      const pokemon = ShowdownTeamResolver.getPokemonByShowdownSlot(team, state.playerRequest, slotNum);
      if (pokemon && pokemon.uid) {
        return pokemon.uid;
      }
      return null;
    } catch (_err: unknown) {
      return null;
    }
  }, { slotNum });
}

/**
 * Hace clic en el botón de combatir para iniciar la batalla
 */
export async function confirmAndStartBattle(page: Page): Promise<void> {
  const startBtn = page.locator('#start-encounter-btn').first();
  await startBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await clickResilient(startBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
}

/**
 * Espera a que el FSM de batalla transicione a un estado listo para input o termine
 */
export async function waitForWaitInput(page: Page): Promise<void> {
  try {
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      if (!store) return false;
      if (!store.state) return false;
      if (store.state.over) return true;
      return !store.isProcessing && store.currentFsmState === 'ACTIVE_BATTLE' &&
        (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (error: unknown) {
    const battleState = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return {
        fsm: store?.currentFsmState,
        subState: store?.currentSubState,
        isProcessing: store?.isProcessing,
        isOver: store?.state?.over,
        hasActiveRequest: Boolean(store?.state?.playerRequest?.active),
        hasForcedSwitch: Boolean(store?.state?.playerRequest?.forceSwitch),
        workerInitError: (window as WindowWithResolver).__VITE_DEBUG__?.lastWorkerInitError,
        workerInitStage: (window as WindowWithResolver).__VITE_DEBUG__?.lastWorkerInitStage
      };
    });
    const recentBrowserLogs = (page as E2EPage)._e2eLogBuffer?.slice(-20) ?? [];
    throw new Error(
      `[E2E] Battle did not reach an input-ready FSM state: ${JSON.stringify(battleState)}. Recent browser logs: ${JSON.stringify(recentBrowserLogs)}`,
      { cause: error }
    );
  }
}

/**
 * Drives an ordinary browser battle through the real UI. It is deliberately
 * separate from executeAutoBattle: manual scenarios have no certified history
 * and must never activate the fuzzer replayer.
 */
export async function executeNativeAutoBattle(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.__VITE_DEBUG__) window.__VITE_DEBUG__.isScriptedReplayMode = false;
  });

  while (true) {
    await waitForWaitInput(page);
    const battleOver = await page.evaluate(() => {
      const store = window.__VITE_DEBUG_STORE_RESOLVER__?.();
      return store?.state?.over === true;
    });
    if (battleOver) {
      await page.waitForFunction(() => {
        const store = window.__VITE_DEBUG_STORE_RESOLVER__?.();
        if (!store?.state?.over) return false;

        return store.currentFsmState === 'EXIT_BATTLE' ||
          (store.currentFsmState === 'REWARDS_PHASE' && store.currentSubState === 'EMPTY_WAIT') ||
          (store.currentFsmState === 'SEARCH_PHASE' && store.currentSubState === 'COMBAT_OR_FLEE');
      }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
      return;
    }

    await handleBattleInput(page);
  }
}

/**
 * Maneja el input de la batalla simulada
 */
export async function handleBattleInput(page: Page, choice?: string): Promise<boolean> {
  if (choice !== undefined && choice.trim() === '') {
    // No action needed for player in this step. Return true to advance turnCount.
    return true;
  }
  // Esperar a que el estado de procesamiento termine (microtasks/animaciones) antes de decidir
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    return !resolver().isProcessing;
  }, undefined, { timeout: MAX_UI_SETTLE_TIMEOUT_MS });

  const isProcessing = await page.evaluate(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return false;
    try {
      return resolver().isProcessing;
    } catch {
      return false;
    }
  });

  if (isProcessing) {
    return false;
  }

  const isUiLocked = await page.locator('#battle-controls-layout.is-ui-locked, .battle-controls-layout.is-ui-locked').count() > 0;
  if (isUiLocked) {
    return false;
  }

  const subState = await page.evaluate(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return 'WAIT_INPUT';
    try {
      return resolver().currentSubState;
    } catch {
      return 'WAIT_INPUT';
    }
  });

  const isModalOpen = await page.evaluate(() => {
    const overlays = Array.from(document.querySelectorAll('.base-modal-root')) as HTMLElement[];
    return overlays.some(el => {
      if (el.querySelector('.battle-arena-modal')) return false;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  });

  if (isModalOpen && subState === 'WAIT_INPUT') {
    return false;
  }

  if (subState === 'SWITCH_MENU') {
    const cleanChoice = choice?.trim().toLowerCase() ?? '';
    if (cleanChoice.startsWith('switch ')) {
      // El fuzzer grabó este switch — ejecutarlo usando los botones de la barra lateral
      // (SWITCH_MENU post-debilitación muestra .quick-card-override, NO un modal con .list-item)
      const switchSlot = parseInt(cleanChoice.split(' ')[1] || '2', 10);
      
      const targetUid = await resolveTargetUidForSlot(page, switchSlot, 'SWITCH_MENU');

      if (targetUid) {
        const cardBtn = page.locator(`.quick-card-override[data-pokemon-uid="${targetUid}"]`).first();
        await cardBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
        await cardBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      } else {
        // Fallback posicional si no se pudo resolver el UID
        const switchIdx = switchSlot - SWITCH_SLOT_INDEX_OFFSET; // slot 1 = activo, slot 2 = índice 0 de banca
        const allBenchCards = page.locator('[id^="battle-switch-"]:not(.is-active)');
        await allBenchCards.first().waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
        await allBenchCards.nth(switchIdx).click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      }
      return true;
    }
    // Choice no es un switch (es el move del turno siguiente): manejar con el primer disponible
    // sin consumir el choice — el loop externo reintentará con el mismo turnCount.
    const activeSwitchBtn = page.locator('[id^="battle-switch-"]:not(.is-active):not(.is-fainted):not(.is-disabled)').first();
    const isVisible = await activeSwitchBtn.isVisible().catch(() => false);
    if (isVisible) {
      await activeSwitchBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
      return !choice;
    }
    return false;
  }

  if (!choice) {
    const firstMoveBtn = page.locator('button[id^="move-btn-"]:not([disabled])').first();
    const isVisible = await firstMoveBtn.isVisible().catch(() => false);
    if (isVisible) {
      const isDisabled = await firstMoveBtn.isDisabled().catch(() => true);
      if (!isDisabled) {
        await clickResilient(firstMoveBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        return true;
      }
    }
    return false;
  }

  if (choice) {
    try {
      const cleanChoice = choice.trim().toLowerCase();
      if (cleanChoice.startsWith('move ')) {
        const moveToken = cleanChoice.split(' ')[1] || '';
        // 'recharge' es un movimiento virtual de Showdown. El watcher checkAndAutoRecharge
        // en battle.ts lo detecta y lo ejecuta automáticamente. Si intentamos clickear
        // también, causamos una doble sumisión que desincroniza todos los turnos siguientes.
        if (moveToken === 'recharge') return true;

        const moveIdx = parseInt(moveToken || '1', 10) - 1;
        const struggleOverlay = page.locator('#struggle-overlay');
        const isStruggleActive = await struggleOverlay.isVisible().catch(() => false);

        let moveBtn;
        if (isStruggleActive) {
          // Click the struggle button inside the overlay
          moveBtn = struggleOverlay.locator('button[id^="move-btn-"]');
        } else {
          // Intentar mapear el índice lógico de Showdown al índice físico real del botón en el DOM
          const resolvedVisualIdx = await page.evaluate((idx: number): number => {
            const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
            if (!resolver) return idx;
            const store = resolver() as DebugStore;
            
            // 1. Obtener el ID del movimiento que espera el simulador en este índice lógico
            const playerRequest = store.state?.playerRequest;
            const active = playerRequest?.active;
            const activeMon = (active && active.length > 0) ? active[0] : null;
            if (!activeMon) return idx;
            const movesList = activeMon.moves;
            if (!movesList) return idx;
            const reqMove = movesList[idx];
            const targetMoveId = reqMove ? reqMove.id : null;
            if (!targetMoveId) return idx;

            let moves: Array<{ id: string } | null> | undefined = undefined;
            const pStore = store.player;
            if (pStore && pStore.moves) {
              moves = pStore.moves;
            } else {
              const pState = store.state?.player;
              if (pState && pState.moves) {
                moves = pState.moves;
              }
            }
            if (!moves) return idx;
            const vIdx = moves.findIndex((m) => m && m.id === targetMoveId);
            return vIdx !== -1 ? vIdx : idx;
          }, moveIdx);

          moveBtn = page.locator('#move-panel button[id^="move-btn-"]').nth(resolvedVisualIdx);
        }

        await moveBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
        const isDisabled = await moveBtn.isDisabled().catch(() => true);
        if (isDisabled) {
          return false;
        }
        await clickResilient(moveBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        return true;
      } else if (cleanChoice.startsWith('switch ')) {
        // En Showdown, slot 1 es el activo, y slots 2-6 son la banca (sana o completa según la fase).
        // Por ende, switch N corresponds al índice N-2 de los elementos disponibles en la banca de la UI.
        const switchSlot = parseInt(cleanChoice.split(' ')[1] || String(SWITCH_SLOT_INDEX_OFFSET), 10);
        
        const targetUid = await resolveTargetUidForSlot(page, switchSlot, 'SWITCH');

        if (targetUid) {
          const cardBtn = page.locator(`.quick-card-override[data-pokemon-uid="${targetUid}"]`).first();
          await cardBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
          await clickResilient(cardBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        } else {
          const switchIdx = switchSlot - SWITCH_SLOT_INDEX_OFFSET;
          const allBenchCards = page.locator('[id^="battle-switch-"]:not(.is-active)');
          await allBenchCards.first().waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
          await clickResilient(allBenchCards.nth(switchIdx), { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        }
        return true;
      } else if (cleanChoice.startsWith('useitem:')) {
        const parts = cleanChoice.split(':');
        const itemId = parts[1] || 'potion';
        const targetIdx = parseInt(parts[2] || '1', 10) - 1;

        // Traducir los IDs a nombres en español de la base de datos
        const itemTranslations: Record<string, string> = {
          potion: 'Poción',
          superpotion: 'Superpoción',
          hyperpotion: 'Hiperpoción',
          maxpotion: 'Poción Máxima',
          revive: 'Revivir',
          revivemax: 'Max Revivir'
        };
        const translatedName = itemTranslations[itemId] || itemId;

        const quickCard = page.locator(`.quick-item-card[data-item-id="${itemId}"]`);
        const isQuickVisible = await quickCard.isVisible().catch(() => false);

        if (isQuickVisible) {
          await clickResilient(quickCard, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        } else {
          // Si no está en la bolsa rápida (ej. Revivir), abrir la mochila completa
          const bagBtn = page.locator('#battle-bag-btn');
          await bagBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
          await clickResilient(bagBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

          // Esperar a que aparezca la tarjeta en el modal de la mochila mediante ID estricto de ítem
          const backpackItem = page.locator(`#inventory-item-${toID(translatedName)}, .inventory-item-card`).first();
          await backpackItem.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
          await clickResilient(backpackItem, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        }

        const targetUid = await page.evaluate((idx) => {
          try {
            const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
            if (!resolver) return null;
            const battleStore = resolver();
            const pinia = battleStore._p;
            const gameStore = pinia?._s?.get('game');
            const team = [...(gameStore?.state?.team || [])].filter((p): p is NonNullable<typeof p> => p != null);
            return team[idx]?.uid || null;
          } catch (_e) {
            return null;
          }
        }, targetIdx);

        let targetBtn = page.locator('[id^="pokemon-select-"]').nth(targetIdx);
        if (targetUid) {
          targetBtn = page.locator(`#pokemon-select-${targetUid}`).first();
        }

        await targetBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
        await clickResilient(targetBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        return true;
      } else {
        return true;
      }
     } catch (e) {
       console.error(`[E2E] Strict Choice '${choice}' failed to execute in the UI. Aborting test. Error:`, e);
       throw e;
     }
   }
   return false;
 }

export async function checkIfChoiceIsInvalid(page: Page, choice: string | undefined): Promise<boolean> {
  if (!choice) return false;
  return await page.evaluate((ch) => {
    try {
      const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const battleStore = resolver();
      const battle = battleStore.state;
      if (!battle) return false;
      const req = battle.playerRequest;

      if (req?.wait) {
        return true;
      }

      const clean = ch.trim().toLowerCase();
      if (clean.startsWith('move ')) {
        const moveIdx = parseInt(clean.split(' ')[1] || '1', 10) - 1;
        const move = battle.player?.moves?.[moveIdx];
        const reqMove = req?.active?.[0]?.moves?.[moveIdx];
        const isInvalid = !move || (reqMove && reqMove.disabled);
        return !!isInvalid;
      } else if (clean.startsWith('switch ')) {
        const slotNum = parseInt(clean.split(' ')[1] || '2', 10);
        const slotOrder = req?.side?.pokemon || [];
        const targetPoke = slotOrder[slotNum - 1];
        if (!targetPoke) {
          return true;
        }
        const isFnt = targetPoke.condition.endsWith(' fnt') || targetPoke.condition.startsWith('0/');
        const isInvalid = !!targetPoke.active || isFnt;
        return !!isInvalid;
      }
      return false;
    } catch (_e: unknown) {
      return false;
    }
  }, choice);
}

export type CertifiedTestBatch = CertifiedBattleCase;

export async function waitForBattleReadyEvent(page: Page, batchIndex: number, turnCount: number): Promise<{ subState: string; p1ChoiceIdx: number; p2ChoiceIdx: number; over: boolean }> {
  try {
    return await page.evaluate(async () => {
      if (window.__VITE_DEBUG__ && typeof window.__VITE_DEBUG__.waitForBattleReady === 'function') {
        return await window.__VITE_DEBUG__.waitForBattleReady();
      }
      throw new Error('window.__VITE_DEBUG__.waitForBattleReady is not defined');
    });
  } catch (err) {
    await page.screenshot({ path: `scratch/lock-batch-${batchIndex}-turn-${turnCount}.png` });
    throw new Error(`Bloqueo detectado o página destruida en el turno ${turnCount}. Captura guardada en scratch/. original: ${String(err)}`);
  }
}

export async function verifyHpParity(page: Page) {
  try {
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      const playerHp = store.state?.player?.hp ?? 0;
      const playerMaxHp = store.state?.player?.maxHp ?? 1;
      const enemyHp = store.state?.enemy?.hp ?? 0;
      const enemyMaxHp = store.state?.enemy?.maxHp ?? 1;

      // Check backend Showdown engine HP parity if activeBattle runner is present
      const simBattle = (window as WindowWithResolver).__SIMULATOR_BATTLE__;
      if (simBattle) {
        const simP1Hp = simBattle.p1?.active?.[0]?.hp;
        const simP2Hp = simBattle.p2?.active?.[0]?.hp;
        if (simP1Hp !== undefined && simP1Hp !== playerHp) return false;
        if (simP2Hp !== undefined && simP2Hp !== enemyHp) return false;
      }

      if (playerHp > 0) {
        const el = document.querySelector('.player-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${playerHp}/${playerMaxHp}`)) return false;
      }
      if (enemyHp > 0) {
        const el = document.querySelector('.enemy-card .hp-values');
        const text = el?.textContent ?? '';
        if (!text.includes(`${enemyHp}/${enemyMaxHp}`)) return false;
      }
      return true;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err) {
    const diagnosis = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return { storePlayer: 'null', storeEnemy: 'null', domPlayer: 'null', domEnemy: 'null' };
      const store = resolver();
      const storePlayer = `${store.state?.player?.hp}/${store.state?.player?.maxHp}`;
      const storeEnemy  = `${store.state?.enemy?.hp}/${store.state?.enemy?.maxHp}`;
      const domPlayer   = document.querySelector('.player-card .hp-values')?.textContent ?? 'null';
      const domEnemy    = document.querySelector('.enemy-card .hp-values')?.textContent ?? 'null';
      return { storePlayer, storeEnemy, domPlayer, domEnemy };
    });
    console.error(`[E2E ERROR] HP Mismatch — Store player: ${diagnosis.storePlayer}, DOM player: "${diagnosis.domPlayer}" | Store enemy: ${diagnosis.storeEnemy}, DOM enemy: "${diagnosis.domEnemy}"`);
    throw err;
  }
}

export async function executeAutoBattle(
  page: Page,
  finalState?: CertifiedTestBatch['finalState']
) {
  await page.evaluate(() => {
    if (window.__VITE_DEBUG__) {
      window.__VITE_DEBUG__.isScriptedReplayMode = true;
    }
  });

  // Esperar a que el estado de la batalla esté inicializado en el store
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    return !!resolver?.().state;
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  let over = false;
  while (!over) {
    await page.waitForFunction(() => {
      const readiness = window.__VITE_DEBUG__?.getScriptedReplayReadiness?.();
      return readiness?.isReady === true;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const eventDetail = await page.evaluate(() => {
      const readiness = window.__VITE_DEBUG__?.getScriptedReplayReadiness?.();
      if (!readiness?.isReady) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Scripted replay readiness disappeared before action dispatch. context=${JSON.stringify(readiness)}`);
      }
      return readiness;
    });

    if (eventDetail.over) {
      over = true;
      break;
    }

    if (eventDetail.subState === 'WAIT_INPUT') {
      await verifyHpParity(page);
    }

    const action = await page.evaluate(async () => {
      const debug = window.__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      if (!Array.isArray(history) || typeof historyIndex !== 'number') {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Missing certified history cursor. context=${JSON.stringify({ hasHistory: Array.isArray(history), historyIndex })}`);
      }
      if (historyIndex >= history.length) {
        return { choice: '', historyIndex, terminal: true, targetUid: '', activePlayerUid: '', requestSlots: [] };
      }
      const step = history[historyIndex] as { p1Choice?: unknown } | undefined;
      if (!step || typeof step.p1Choice !== 'string') {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Missing P1 choice at certified history index ${historyIndex}.`);
      }
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const battleStore = resolver?.();
      const playerRequest = battleStore?.state?.playerRequest;
      const gameStore = debug?.getGameStore?.() as { state?: { team?: unknown[] } } | undefined;
      if (!battleStore?.state || battleStore.state.over === true) {
        return { choice: '', historyIndex, terminal: true, targetUid: '', activePlayerUid: '', requestSlots: [] };
      }
      if (!playerRequest || !gameStore?.state?.team) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Live battle is missing a request or local team for UI slot mapping. context=${JSON.stringify({
          hasPlayerRequest: Boolean(playerRequest),
          hasLocalTeam: Boolean(gameStore?.state?.team),
          fsm: battleStore.currentFsmState,
          subState: battleStore.currentSubState,
        })}`);
      }
      const { ShowdownTeamResolver } = await import('../../src/logic/battle/showdownTeamResolver.ts');
      const normalizedChoice = step.p1Choice.trim().toLowerCase();
      const switchSlot = normalizedChoice.startsWith('switch ') ? Number(normalizedChoice.slice('switch '.length)) : null;
      const target = switchSlot === null ? null : ShowdownTeamResolver.getPokemonByShowdownSlot(
        gameStore.state.team as Parameters<typeof ShowdownTeamResolver.getPokemonByShowdownSlot>[0],
        playerRequest,
        switchSlot,
      );
      const requestSlots = playerRequest.side?.pokemon?.map((pokemon) => ({ uid: pokemon.uid ?? '', active: pokemon.active === true })) ?? [];
      return {
        choice: step.p1Choice,
        historyIndex,
        terminal: false,
        targetUid: target?.uid ?? '',
        activePlayerUid: battleStore.state.player?.uid ?? '',
        requestSlots,
      };
    });

    if (action.terminal) {
      over = true;
      break;
    }

    const normalizedChoice = action.choice.trim().toLowerCase();
    if (normalizedChoice.startsWith('move ')) {
      const moveSlot = Number(normalizedChoice.slice('move '.length)) - 1;
      if (!Number.isInteger(moveSlot) || moveSlot < 0) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Invalid certified move choice: "${action.choice}".`);
      }
      await clickResilient(page.locator(`#move-btn-${moveSlot}:not([disabled])`).first());
    } else if (normalizedChoice.startsWith('switch ')) {
      const switchSlot = Number(normalizedChoice.slice('switch '.length));
      const targetUid = action.targetUid;
      if (!Number.isInteger(switchSlot) || switchSlot < 1 || !targetUid) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Certified switch target cannot be resolved. context=${JSON.stringify({ choice: action.choice, activePlayerUid: action.activePlayerUid, requestSlots: action.requestSlots })}`);
      }
      if (targetUid === action.activePlayerUid) {
        throw new Error(`[E2E-CERTIFIED-REPLAY] Certified switch resolves to the active client Pokémon. context=${JSON.stringify({ choice: action.choice, targetUid, requestSlots: action.requestSlots })}`);
      }
      // The quick-team card is the official in-battle switch control. It uses
      // BattleQuickTeam.handleSwitch and therefore the same normal switch path
      // as a player click, without relying on an internal replay action.
      const certifiedTarget = page.locator(`#battle-switch-${targetUid}`).first();
      await certifiedTarget.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await clickResilient(certifiedTarget);
    } else if (normalizedChoice === 'struggle') {
      await clickResilient(page.locator('#struggle-overlay #move-btn-0:not([disabled])').first());
    } else if (normalizedChoice === '') {
      throw new Error('[E2E-CERTIFIED-REPLAY] The game exposed player input for a P2-only certified step; the automatic opponent transition is missing.');
    } else {
      throw new Error(`[E2E-CERTIFIED-REPLAY] Unsupported certified UI choice: "${action.choice}".`);
    }

    await page.waitForFunction(({ previousHistoryIndex }) => {
      const debug = window.__VITE_DEBUG__;
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      const store = window.__VITE_DEBUG_STORE_RESOLVER__?.();
      return (typeof historyIndex === 'number' && historyIndex > previousHistoryIndex)
        || !store?.state
        || store.state.over === true;
    }, { previousHistoryIndex: action.historyIndex }, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const isEndingOrOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store?.state || store.state.over) return true;
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      const isReplayComplete = Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
      const workerEnded = Reflect.get(debug ?? {}, 'certifiedReplayWorkerEnded') === true;
      return isReplayComplete && workerEnded;
    });

    if (isEndingOrOver) {
      over = true;
      break;
    }

  }

  // Esperar a que la batalla sea declarada como finalizada en el store (hasta MAX_PER_ACTION_TIMEOUT_MS)
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    const store = resolver();
    const debug = (window as WindowWithResolver).__VITE_DEBUG__;
    const history = Reflect.get(debug ?? {}, 'history');
    const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
    const isReplayComplete = Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
    return !store.state || store.state.over || store.currentFsmState !== 'ACTIVE_BATTLE' || isReplayComplete;
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  if (finalState) {
    const isBattleOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return true;
      const store = resolver();
      if (!store?.state || store.state.over || store.currentFsmState !== 'ACTIVE_BATTLE') return true;
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const historyIndex = Reflect.get(debug ?? {}, 'replayHistoryIdx');
      return Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
    });

    expect(isBattleOver).toBe(true);
  }

  if (finalState) {
    const replayTraceMismatch = await page.evaluate(() => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const history = Reflect.get(debug ?? {}, 'history');
      const trace = Reflect.get(debug ?? {}, 'certifiedReplaySubmissionTrace');
      if (!Array.isArray(history) || !Array.isArray(trace)) {
        throw new Error(`[E2E-CERTIFICATION] Missing replay history or worker submission trace. context=${JSON.stringify({ hasHistory: Array.isArray(history), hasTrace: Array.isArray(trace) })}`);
      }
      if (trace.length !== history.length) {
        return { traceLength: trace.length, historyLength: history.length, mismatch: null };
      }
      interface ReplayStep { p1Choice?: string; p2Choice?: string }
      for (let index = 0; index < history.length; index++) {
        const expected = history[index] as ReplayStep | undefined;
        const actual = trace[index] as ReplayStep | undefined;
        if (!expected || !actual || expected.p1Choice !== actual.p1Choice || expected.p2Choice !== actual.p2Choice) {
          return { traceLength: trace.length, historyLength: history.length, mismatch: { index, expected, actual } };
        }
      }
      return null;
    });
    if (replayTraceMismatch) {
      throw new Error(`[E2E-CERTIFICATION] Worker submissions diverged from the certified JSON. context=${JSON.stringify(replayTraceMismatch)}`);
    }

    const clientState = await page.evaluate(() => {
      interface LocalDebugObject {
        [key: string]: unknown;
        isScriptedReplayMode?: boolean;
        lastFinalState?: {
          p1: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted: boolean }>;
          p2: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted: boolean }>;
        };
      }

      interface WindowWithDebug extends Window {
        __VITE_DEBUG__?: LocalDebugObject;
      }

      const win = window as WindowWithDebug;
      const workerFinalState = Reflect.get(win.__VITE_DEBUG__ ?? {}, 'certifiedReplayWorkerFinalState');
      if (workerFinalState) {
        return workerFinalState;
      }
      if (win.__VITE_DEBUG__ && win.__VITE_DEBUG__.lastFinalState) {
        return win.__VITE_DEBUG__.lastFinalState;
      }
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver || !debug?.getGameStore) return { p1: [], p2: [] };
      const store = resolver();
      const gameStore = debug.getGameStore();
      const formatTeam = (team: Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string }>) =>
        team.map((p) => ({
          uid: p.uid,
          name: p.name,
          hp: p.hp,
          maxHp: p.maxHp,
          status: p.status || '',
          fainted: p.hp <= 0
        }));

      const p1Team = (gameStore.state?.team ?? []) as Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string }>;
      const p2Team = (store.state?.enemyTeam ?? []) as Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string }>;
      return { p1: formatTeam(p1Team), p2: formatTeam(p2Team) };
    }) as {
      p1: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string; fainted: boolean }>;
      p2: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string; fainted: boolean }>;
    };

    (['p1', 'p2'] as const).forEach((seat) => {
      const expectedTeam = finalState[seat];
      if (!expectedTeam) return;

      expectedTeam.forEach((expected) => {
        const targetUid = (expected as { uid?: string }).uid || expected.name;
        const clientPoke = clientState[seat].find(p => isMatchingUid(p.uid, targetUid));
        if (clientPoke) {
          if (clientPoke.fainted !== expected.fainted) {
            throw new Error(`[E2E-PARITY] ${seat} ${targetUid} fainted mismatch: expected=${expected.fainted}, actual=${clientPoke.fainted}, hp=${clientPoke.hp}/${clientPoke.maxHp}.`);
          }
          if (clientPoke.maxHp !== expected.maxHp) {
            throw new Error(`[E2E-PARITY] ${seat} ${targetUid} max HP mismatch: expected=${expected.maxHp}, actual=${clientPoke.maxHp}.`);
          }
          if (!expected.fainted) {
            if (clientPoke.hp !== expected.hp) {
              throw new Error(`[E2E-PARITY] ${seat} ${targetUid} HP mismatch: expected=${expected.hp}, actual=${clientPoke.hp}.`);
            }
            if ((expected as { status?: string }).status !== undefined) {
              const expectedStatus = (expected as { status?: string }).status || '';
              if (clientPoke.status !== expectedStatus) {
                throw new Error(`[E2E-PARITY] ${seat} ${targetUid} status mismatch: expected=${expectedStatus}, actual=${clientPoke.status}.`);
              }
            }
          }
        } else {
          throw new Error(`[E2E] Expected ${seat} pokemon with prefix ${expected.name} not found in client state.`);
        }
      });
    });
  }
}



export async function waitForStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const debug = (window as WindowWithResolver).__VITE_DEBUG__;
    if (!debug || !debug.getGameStore) return false;
    const store = debug.getGameStore();
    return !!store && !!store.state && store.isReady === true;
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
}

export async function openDebugTab(page: Page, category: string): Promise<void> {
  const categoryMap: Record<string, string> = {
    entren: 'trainers',
    entrenadores: 'trainers',
    tiempo: 'time',
    clase: 'class',
    modal: 'modals',
    misi: 'missions',
  };
  const categoryId = categoryMap[category.toLowerCase()] || category.toLowerCase(); // string-ok
  const navBtn = page.locator(`#debug-tab-${categoryId}, [id^="debug-tab-${categoryId}"]`).first();

  const isTabReady = await navBtn.isVisible().catch(() => false);
  if (!isTabReady) {
    const trigger = page.locator('#debug-trigger-btn').first();
    const isTriggerVisible = await trigger.isVisible().catch(() => false);
    if (isTriggerVisible) {
      await clickResilient(trigger);
    } else {
      await page.keyboard.press('Control+Shift+D');
    }
    await page.locator('#debug-nav').waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await navBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  await clickResilient(navBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
}

export async function playFishingMinigameNaturally(page: Page): Promise<void> {
  const modalContainer = page.locator('#rhythm-container, .rhythm-container').first();
  await modalContainer.waitFor({ state: 'attached', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  const counterText = await page.locator('.rhythm-counter').textContent();
  const totalNotes = Number(counterText?.match(/\/\s*(\d+)/)?.[1]);
  if (!Number.isInteger(totalNotes) || totalNotes < 1) {
    throw new Error(`[E2E] Fishing minigame reported an invalid note counter: ${counterText}`);
  }

  for (let noteId = 1; noteId <= totalNotes; noteId++) {
    const note = page.locator(`.rhythm-note[data-note-id="${noteId}"]`).first();
    await note.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await page.waitForFunction((id) => {
      const ring = document.querySelector(`.rhythm-note[data-note-id="${id}"] .rhythm-ring`);
      if (!ring) return true;
      const transform = getComputedStyle(ring).transform;
      const scale = Number(transform.match(/matrix\(([^,]+)/)?.[1] ?? Number.NaN);
      return !Number.isFinite(scale) || scale <= 1.15;
    }, noteId, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await note.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  await modalContainer.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });
}

export async function playArchaeologyMinigameNaturally(page: Page): Promise<void> {
  const grid = page.locator('#archaeology-grid').first();
  await grid.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  const tiles = grid.locator('.tile');
  const tileCount = await tiles.count();
  if (tileCount === 0) {
    throw new Error('[E2E] Archaeology minigame rendered an empty grid.');
  }

  // Every dig is delivered through the player-facing UI. Depending on the randomized
  // fossil layout this naturally reaches either the success or the energy-depletion path.
  for (let index = 0; index < tileCount; index++) {
    if (!await grid.isVisible()) break;
    try {
      await tiles.nth(index).click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } catch (error) {
      if (!await grid.isVisible()) break;
      throw error;
    }
  }

  await grid.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS });
}
