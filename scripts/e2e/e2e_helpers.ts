// fallow-ignore-file security-sink
import { type Page, type Locator, expect } from '@playwright/test';
import { toID } from '@pkmn/sim';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  MAX_E2E_CLICK_RETRIES,
  E2E_CLICK_TIMEOUT_MS,
  E2E_FALLBACK_TIMEOUT_MS,
  MAX_UI_SETTLE_TIMEOUT_MS,
  MS_TO_SECONDS_DIVISOR,
  SWITCH_SLOT_OFFSET_2
} from './simulation_config.ts';
export { MAX_PER_ACTION_TIMEOUT_MS };
import { isMatchingUid } from '../../src/logic/battle/showdownUidMapper.ts';
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

export async function clickResilient(locator: Locator, options: { force?: boolean; timeout?: number } = {}): Promise<void> {
  const cleanOptions = { ...options };
  delete cleanOptions.force; // Prohibición estricta de force-clicks en tests
  
  // Capturar el estado/subestado de la FSM antes de intentar el clic
  const preClickState = await locator.page().evaluate(() => {
    const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return null;
    const store = resolver();
    return { fsm: store.currentFsmState, sub: store.currentSubState };
  }).catch(() => null);

  for (let i = 0; i < MAX_E2E_CLICK_RETRIES; i++) {
    try {
      await locator.click({ timeout: E2E_CLICK_TIMEOUT_MS, ...cleanOptions });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err);
      
      if (msg.includes('detached')) {
        logE2EDebug(locator.page(), '[E2E-CLICK-SUCCESS] Click triggered element detachment successfully.');
        return;
      }
      if (msg.includes('visible') || msg.includes('stable') || msg.includes('intercepts pointer events')) {
        // Fallback: If standard click is intercepted (e.g. by a PVTooltip overlay),
        // try focusing the element and triggering via Enter key to bypass pointer-events.
        try {
          logE2EDebug(locator.page(), '[E2E-CLICK-FALLBACK] Click intercepted or unstable. Trying focus + Enter key...');
          await locator.focus({ timeout: E2E_FALLBACK_TIMEOUT_MS });
          await locator.page().keyboard.press('Enter');
          return;
        } catch (fallbackErr) {
          logE2EDebug(locator.page(), `[E2E-CLICK-FALLBACK-FAILED] Focus + Enter failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
        }

        const postClickState = await locator.page().evaluate(() => {
          const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return null;
          const store = resolver();
          return { fsm: store.currentFsmState, sub: store.currentSubState };
        }).catch(() => null);

        if (!preClickState || !postClickState || preClickState.fsm !== postClickState.fsm || preClickState.sub !== postClickState.sub) {
          logE2EDebug(locator.page(), '[E2E-CLICK-SUCCESS] Click triggered a state transition successfully.');
          return;
        }

        logE2EDebug(locator.page(), `[E2E-RETRY] Element transitioning, retrying click (${i + 1}/${MAX_E2E_CLICK_RETRIES})...`);
        await locator.page().waitForFunction(() => !document.querySelector('.is-ui-locked'), undefined, { timeout: E2E_FALLBACK_TIMEOUT_MS }).catch(() => null);
        continue;
      }
      throw err; // Re-throw other unexpected errors (e.g. syntax, timeout of non-visible elements)
    }
  }
  throw new Error(`[E2E-CLICK-FAILED] Click failed after ${MAX_E2E_CLICK_RETRIES} retries on locator without force bypass.`);
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
           !document.querySelector('.loading-overlay') &&
           !document.querySelector('.auth-loading-text');
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => {});

  // The local form does not exist until its server tab has rendered.
  const localTab = page.locator('#server-tab-local').first();
  await localTab.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await localTab.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

  const userInput = page.locator('#local-username-input').first();
  await userInput.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await userInput.fill(testUser);

  const jugarBtn = page.locator('#local-login-btn').first();
  await jugarBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await jugarBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

  await page.waitForFunction(() => localStorage.getItem('pokevicio_session_mode') === 'offline', undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  await page.waitForURL(url => url.pathname !== '/login', { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  await waitForStoreReady(page);

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
      
      const { ShowdownTeamResolver } = (await import('../../src/logic/battle/showdownTeamResolver.ts')) as unknown as { ShowdownTeamResolver: { getPokemonByShowdownSlot: (team: unknown[], request: unknown, slot: number) => { uid?: string } | null | undefined } };
      
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
  const isStartVisible = await startBtn.isVisible().catch(() => false);
  if (isStartVisible) {
    await clickResilient(startBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } else {
    await page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      await useBattleStore().startEncounter();
    });
  }
}

/**
 * Espera a que el FSM de batalla transicione a un estado listo para input o termine
 */
export async function waitForWaitInput(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return false;
    const store = resolver();
    if (!store || !store.state) return false;
    return !store.isProcessing && (
      (store.currentFsmState === 'ACTIVE_BATTLE' && 
       (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
      store.state.over
    );
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
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
        const switchIdx = switchSlot - SWITCH_SLOT_OFFSET_2; // slot 1 = activo, slot 2 = índice 0 de banca
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
    const firstMoveBtn = page.locator('[id^="move-btn-"]:not([disabled])').first();
    const isVisible = await firstMoveBtn.isVisible().catch(() => false);
    if (isVisible) {
      const isDisabled = await firstMoveBtn.isDisabled().catch(() => true);
      if (!isDisabled) {
        await firstMoveBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
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
          moveBtn = struggleOverlay.locator('[id^="move-btn-"]');
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

          moveBtn = page.locator('#move-panel [id^="move-btn-"]').nth(resolvedVisualIdx);
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
        const switchSlot = parseInt(cleanChoice.split(' ')[1] || String(SWITCH_SLOT_OFFSET_2), 10);
        
        const targetUid = await resolveTargetUidForSlot(page, switchSlot, 'SWITCH');

        if (targetUid) {
          const cardBtn = page.locator(`.quick-card-override[data-pokemon-uid="${targetUid}"]`).first();
          await cardBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
          await clickResilient(cardBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
        } else {
          const switchIdx = switchSlot - SWITCH_SLOT_OFFSET_2;
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

    const success = await page.evaluate(async () => {
      if (window.__VITE_DEBUG__ && typeof window.__VITE_DEBUG__.executeScriptedAction === 'function') {
        return await window.__VITE_DEBUG__.executeScriptedAction();
      }
      return false;
    });

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

    if (!success) {
      throw new Error(`[E2E-TURN-FAIL] executeScriptedAction returned false when FSM emitted ready event.`);
    }
  }

  // Esperar a que la batalla sea declarada como finalizada en el store (hasta MAX_PER_ACTION_TIMEOUT_MS)
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    const store = resolver();
    return !store.state || store.state.over || store.currentFsmState !== 'ACTIVE_BATTLE';
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
      const isReplayComplete = Array.isArray(history) && typeof historyIndex === 'number' && historyIndex >= history.length;
      const workerEnded = Reflect.get(debug ?? {}, 'certifiedReplayWorkerEnded') === true;
      return isReplayComplete && workerEnded;
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
    const state = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return { over: !store?.state || store.state.over, subState: store?.currentSubState ?? null };
    });
    if (state.over) return;

    if (state.subState === 'WAIT_INPUT') {
      const moveBtn = page.locator('button[id^="move-btn-"]:not([disabled])').first();
      await moveBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
      // Use focus() + keyboard Enter instead of mouse click to avoid triggering PVTooltip hover.
      // Playwright's click() internally moves the mouse to the element's center, which hovers the
      // "?" info zone inside the move slot and causes the MoveTooltip popup to appear and intercept
      // subsequent pointer events. Keyboard activation bypasses pointer-events entirely.
      await moveBtn.focus();
      await page.keyboard.press('Enter');
      continue;
    }

    if (state.subState === 'SWITCH_MENU') {
      const target = page.locator('[id^="battle-switch-"]:not(.is-active):not(.is-fainted)').first();
      await target.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
      await clickResilient(target, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
      continue;
    }

    throw new Error(`[E2E-NATIVE-AUTO] Battle awaited a UI action from an unsupported FSM substate. context=${JSON.stringify(state)}`);
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
  const isNavOpen = await page.locator('#debug-nav').isVisible().catch(() => false);
  if (!isNavOpen) {
    const trigger = page.locator('#debug-trigger-btn, #debug-trigger').first();
    const isTriggerVisible = await trigger.isVisible().catch(() => false);
    if (isTriggerVisible) {
      await clickResilient(trigger);
    } else {
      await page.keyboard.press('Control+Shift+D').catch(() => {});
    }
  }

  const categoryMap: Record<string, string> = {
    entren: 'trainers',
    entrenadores: 'trainers',
    tiempo: 'time',
    clase: 'class',
    modal: 'modals',
    misi: 'missions',
  };
  const categoryId = categoryMap[category.toLowerCase()] || category.toLowerCase();
  const navBtn = page.locator(`#debug-tab-${categoryId}, [id^="debug-tab-${categoryId}"]`).first();
  await navBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => {});
  await clickResilient(navBtn, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
}

export async function playFishingMinigameNaturally(page: Page): Promise<void> {
  const modalContainer = page.locator('#rhythm-container').first();
  const isVisible = await modalContainer.isVisible({ timeout: E2E_CLICK_TIMEOUT_MS }).catch(() => false);
  if (isVisible) {
    const closeBtn = page.locator('#fishing-modal-close-btn, .modal-close-btn').first();
    const isCloseVisible = await closeBtn.isVisible().catch(() => false);
    if (isCloseVisible) {
      await clickResilient(closeBtn).catch(() => {});
    }
    await modalContainer.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => {});
  }
}

export async function playArchaeologyMinigameNaturally(page: Page): Promise<void> {
  const grid = page.locator('#archaeology-grid').first();
  const isVisible = await grid.isVisible({ timeout: E2E_CLICK_TIMEOUT_MS }).catch(() => false);
  if (isVisible) {
    // Cierra/abandona la arqueología de forma natural por UI usando el botón de cerrar modal
    const closeBtn = page.locator('#archaeology-modal-close-btn, .modal-close-btn').first();
    const isCloseVisible = await closeBtn.isVisible().catch(() => false);
    if (isCloseVisible) {
      await clickResilient(closeBtn).catch(() => {});
    }
    await grid.waitFor({ state: 'detached', timeout: MAX_PER_ACTION_TIMEOUT_MS }).catch(() => {});
  }
}
