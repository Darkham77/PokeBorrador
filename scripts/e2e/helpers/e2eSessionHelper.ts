import { setTimeout } from 'node:timers/promises';
import type { Page } from '@playwright/test';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';
import type { GameStoreReadyDetail, StarterSelectReadyDetail } from '../../../src/types/system/gameEvents.ts';
import {
  armGameStoreReady,
  awaitGameStoreReady,
  armStarterSelectReady,
  awaitStarterSelectReady,
  type WindowWithResolver
} from './battleEventHelpers.ts';
import type { E2EPage } from './e2eLogger.ts';

const MAX_SETUP_NETWORK_RETRIES = 3;
const NETWORK_RETRY_DELAY_MS = 1000;
const GSAP_E2E_TIME_SCALE = 100;
const POSTGRES_JWT_IAT = 1600000000;
const POSTGRES_JWT_EXP = 2500000000;
const POSTGRES_DB_VERSION = 3;

/**
 * Determina si un mensaje de la consola del navegador representa un error crítico que debe abortar el test.
 */
export function isCriticalConsoleMessage(text: string, msgType: string): boolean {
  if (text.includes('[Vue warn]') || text.includes('[Vue error]')) {
    return true;
  }
  if (text.includes('Failed to resolve component') || text.includes('Failed to resolve directive')) {
    return true;
  }
  if (text.includes('Vue Render Error')) {
    return true;
  }
  if (msgType === 'error') {
    if (text.includes('[CRITICAL]') || text.includes('ReferenceError')) {
      return true;
    }
    if (text.includes('TypeError') && !text.includes('Failed to fetch dynamically imported module')) {
      return true;
    }
  }
  return false;
}

/**
 * Determina de forma determinista si un error o mensaje corresponde a un microcorte transitorio
 * de red o transporte de infraestructura a nivel de host/Chromium.
 */
export function isTransientNetworkError(error: unknown): boolean {
  if (!error) return false;
  const text = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));
  if (!text || typeof text !== 'string') return false;

  if (
    text.includes('net::ERR_NETWORK_CHANGED') ||
    text.includes('net::ERR_CONNECTION_RESET') ||
    text.includes('net::ERR_CONNECTION_REFUSED') ||
    text.includes('net::ERR_INTERNET_DISCONNECTED') ||
    text.includes('net::ERR_NAME_NOT_RESOLVED') ||
    text.includes('ECONNREFUSED')
  ) {
    return true;
  }

  if (text.includes('Failed to fetch dynamically imported module')) {
    return true;
  }

  return false;
}

/**
 * Determina si un fallo de ejecución fue ocasionado por microcorte de red examinando el buffer de logs.
 */
export function isTransientNetworkFailure(error: unknown, logBuffer?: readonly string[]): boolean {
  if (isTransientNetworkError(error)) {
    return true;
  }
  if (logBuffer && logBuffer.length > 0) {
    return logBuffer.some(log => isTransientNetworkError(log));
  }
  return false;
}

export async function setupE2ESession(
  page: Page,
  logBuffer?: string[],
  sqliteKey?: string,
  driver: 'sqlite' | 'postgres' = 'sqlite'
): Promise<void> {
  const activeBuffer = logBuffer || [];
  (page as E2EPage)._e2eLogBuffer = activeBuffer;

  page.on('console', msg => {
    const text = msg.text();
    let formatted: string;
    if (msg.type() === 'error') {
      formatted = `[BROWSER-ERROR] ${text}`;
    } else if (msg.type() === 'warning') {
      formatted = `[BROWSER-WARN] ${text}`;
    } else {
      formatted = `[BROWSER-LOG] ${text}`;
    }
    activeBuffer.push(formatted);

    if (isCriticalConsoleMessage(text, msg.type())) {
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

  await page.addInitScript(({ key, dbDriver, scale }: { key?: string; dbDriver: string; scale: number }) => {
    (window as WindowWithResolver).__E2E__ = true;
    (window as WindowWithResolver).__E2E_DRIVER__ = dbDriver as 'sqlite' | 'postgres';
    try {
      localStorage.setItem('pwa_permissions_accepted', 'true');
      localStorage.setItem('auto-battle', 'false');
      if (dbDriver === 'postgres') {
        localStorage.setItem('pokevicio_session_mode', 'online');
        localStorage.setItem('pokevicio_selected_server_id', 'test_postgres');
      } else {
        localStorage.setItem('pokevicio_session_mode', 'offline');
      }
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

    let _gsapInstance: unknown = undefined;
    Object.defineProperty(window, 'gsap', {
      configurable: true,
      enumerable: true,
      get() { return _gsapInstance; },
      set(val: unknown) {
        _gsapInstance = val;
        try {
          if (val && typeof val === 'object' && 'globalTimeline' in val && val.globalTimeline && typeof (val.globalTimeline as { timeScale: (n: number) => void }).timeScale === 'function') {
            (val.globalTimeline as { timeScale: (n: number) => void }).timeScale(scale);
          }
        } catch (_e) {
          void 0;
        }
      }
    });

    (window as WindowWithResolver).__E2E_GAME_STORE_READY__ = new Promise<GameStoreReadyDetail>((resolve) => {
      window.addEventListener('game-store-ready', (e) => {
        resolve((e as CustomEvent).detail as GameStoreReadyDetail);
      }, { once: true });
    });
    (window as WindowWithResolver).__E2E_STARTER_SELECT_READY__ = new Promise<StarterSelectReadyDetail>((resolve) => {
      window.addEventListener('starter-select-ready', (e) => {
        resolve((e as CustomEvent).detail as StarterSelectReadyDetail);
      }, { once: true });
    });
  }, { key: sqliteKey, dbDriver: driver, scale: GSAP_E2E_TIME_SCALE });
}

export async function loginE2ETestUser(
  page: Page,
  username = 'E2ETestUser',
  logBuffer?: string[],
  sqliteKey?: string,
  driver: 'sqlite' | 'postgres' = 'sqlite'
): Promise<void> {
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      await setupE2ESession(page, logBuffer, sqliteKey, driver);
      await loginTestUser(page, username, driver);
      break;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isNetFailure = isTransientNetworkFailure(errorMsg, logBuffer);
      if (isNetFailure && attempt <= MAX_SETUP_NETWORK_RETRIES) {
        const reason = isTransientNetworkError(errorMsg)
          ? errorMsg
          : (logBuffer?.find(log => isTransientNetworkError(log)) || errorMsg);
        console.warn(`⚠️ [SETUP-NETWORK-RETRY] Microcorte de red detectado durante login de "${username}" (intento ${attempt}/${MAX_SETUP_NETWORK_RETRIES}): ${reason.slice(0, 120)}. Purgando logs y reintentando login en 1s...`);
        if (logBuffer) {
          logBuffer.length = 0;
        }
        await setTimeout(NETWORK_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }
}

export async function loginTestUser(
  page: Page,
  testUser: string,
  driver: 'sqlite' | 'postgres' = 'sqlite'
): Promise<void> {
  if (driver === 'postgres') {
    const crypto = await import('node:crypto');
    const { createSignedJwt, POSTGRES_URL } = await import('../../testing/postgres_test_container.js');
    const postgres = (await import('postgres')).default;
    const sha = crypto.createHash('sha256').update(testUser).digest('hex');
    const userId = `${sha.slice(0, 8)}-${sha.slice(8, 12)}-4${sha.slice(13, 16)}-8${sha.slice(17, 20)}-${sha.slice(20, 32)}`;
    const userEmail = `${testUser.toLowerCase().replace(/[^a-z0-9_]/g, '')}@test.local`;

    const sql = postgres(POSTGRES_URL, { max: 1 });
    await sql`INSERT INTO auth.users (id, email, created_at) VALUES (${userId}, ${userEmail}, NOW()) ON CONFLICT (id) DO NOTHING;`;
    await sql`INSERT INTO public.profiles (id, username, email, gender, db_version, created_at) VALUES (${userId}, ${testUser}, ${userEmail}, 'h', ${POSTGRES_DB_VERSION}, NOW()) ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username;`;
    await sql.end();

    const userJwt = createSignedJwt({
      sub: userId,
      role: 'authenticated',
      email: userEmail,
      iss: 'supabase',
      iat: POSTGRES_JWT_IAT,
      exp: POSTGRES_JWT_EXP
    });

    await page.addInitScript(({ username, uid, email, token, dbVer }) => {
      try {
        const testUserObj = {
          id: uid,
          email: email,
          user_metadata: { username, full_name: username, gender: 'h' as const },
          db_version: dbVer
        };
        localStorage.setItem('pokevicio_session_mode', 'online');
        localStorage.setItem('pokevicio_selected_server_id', 'test_postgres');
        localStorage.setItem('pokevicio_local_user', JSON.stringify(testUserObj));
        localStorage.setItem('pokevicio_auth_token', token);
      } catch (_e) {
        void 0;
      }
    }, { username: testUser, uid: userId, email: userEmail, token: userJwt, dbVer: POSTGRES_DB_VERSION });

    await armGameStoreReady(page);
    await armStarterSelectReady(page);
    await page.goto('/', { waitUntil: 'load' });
    await awaitGameStoreReady(page);
  } else {
    await page.goto('/login', { waitUntil: 'load' });

    await page.waitForFunction(() => {
      const win = window as WindowWithResolver;
      return win.pwa_app_mounted === true &&
             typeof win.initSqlJs === 'function' &&
             !document.querySelector('#pv-loading-overlay') &&
             !document.querySelector('.auth-loading-text');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const localTab = page.locator('#server-tab-local').first();
    await localTab.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await localTab.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const userInput = page.locator('#local-username-input').first();
    await userInput.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await userInput.fill(testUser);

    const jugarBtn = page.locator('#local-login-btn').first();
    await jugarBtn.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await armGameStoreReady(page);
    await armStarterSelectReady(page);
    await jugarBtn.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.waitForFunction(() => localStorage.getItem('pokevicio_session_mode') === 'offline', undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await page.waitForURL(url => url.pathname !== '/login', { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await awaitGameStoreReady(page);
  }

  const needsStarter = await page.evaluate(async () => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_GAME_STORE_RESOLVER__;
    if (resolver) {
      return resolver().state.starterChosen === false;
    }
    const { useGameStore } = await import('../../../src/stores/game.ts');
    return useGameStore().state.starterChosen === false;
  });

  if (needsStarter) {
    await awaitStarterSelectReady(page);
    const starterCard = page.locator('[id^="starter-card-"]').first();
    await starterCard.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await starterCard.click({ timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await page.waitForFunction(async () => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_GAME_STORE_RESOLVER__;
      const gameStore = resolver ? resolver() : (await import('../../../src/stores/game.ts')).useGameStore();
      const { useLoadingStore } = await import('../../../src/stores/loading.ts');
      const isChooseStarterActive = useLoadingStore().stack.some(item => item.id === 'choose_starter');
      return gameStore.state.starterChosen === true && !isChooseStarterActive;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await page.evaluate(async () => {
      const { saveCoordinator } = await import('../../../src/logic/auth/saveCoordinator.ts');
      await saveCoordinator.flushPendingSave();
    });
  } else {
    await page.evaluate(() => {
      delete (window as WindowWithResolver).__E2E_STARTER_SELECT_READY__;
    });
  }
}
