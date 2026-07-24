// fallow-ignore-file security-sink unit-size
import { type Page, type Locator, expect } from '@playwright/test';

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

  for (let i = 0; i < 5; i++) {
    try {
      await locator.click({ timeout: 1500, ...cleanOptions });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err);
      
      if (msg.includes('detached')) {
        console.debug('[E2E-CLICK-SUCCESS] Click triggered element detachment successfully.');
        return;
      }
      if (msg.includes('visible') || msg.includes('stable') || msg.includes('intercepts pointer events')) {
        const postClickState = await locator.page().evaluate(() => {
          const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return null;
          const store = resolver();
          return { fsm: store.currentFsmState, sub: store.currentSubState };
        }).catch(() => null);

        if (!preClickState || !postClickState || preClickState.fsm !== postClickState.fsm || preClickState.sub !== postClickState.sub) {
          console.debug('[E2E-CLICK-SUCCESS] Click triggered a state transition successfully.');
          return;
        }

        console.debug(`[E2E-RETRY] Element transitioning, retrying click (${i + 1}/5)...`);
        await locator.page().waitForTimeout(100);
        continue;
      }
      throw err;
    }
  }
  await locator.click({ force: true, ...cleanOptions });
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
export async function setupE2ESession(page: Page, logBuffer?: string[]): Promise<void> {
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
    
    if (logBuffer) {
      logBuffer.push(formatted);
    } else {
      if (msg.type() === 'error') {
        console.error(formatted);
      } else if (msg.type() === 'warning') {
        console.warn(formatted);
      } else {
        console.log(formatted);
      }
    }

    if (msg.type() === 'error' && (text.includes('[CRITICAL]') || text.includes('ReferenceError') || text.includes('TypeError'))) {
      throw new Error(`[CRITICAL-CONSOLE-ERROR] ${text}`);
    }
  });

  page.on('pageerror', err => {
    const formatted = `[BROWSER-PAGEERROR] ${err.message}\nStack: ${err.stack}`;
    if (logBuffer) {
      logBuffer.push(formatted);
    }
    console.error(formatted);
    throw new Error(`[CRITICAL-E2E-PAGE-ERROR] ${err.message}`);
  });

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__E2E__ = true;
    localStorage.setItem('pwa_permissions_accepted', 'true');
    localStorage.setItem('auto-battle', 'false');
    if ('Notification' in window) {
      Object.defineProperty(Notification, 'permission', {
        get() { return 'granted'; }
      });
    }
  });
}

export async function loginE2ETestUser(page: Page, username = 'E2ETestUser', logBuffer?: string[]): Promise<void> {
  await setupE2ESession(page, logBuffer);
  await loginTestUser(page, username);
}

/**
 * Realiza el login de test en el servidor local
 */
export async function loginTestUser(page: Page, testUser: string): Promise<void> {
  // Navegar al Login
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  // Seleccionar servidor local
  const localTab = page.locator('#server-tab-local').first();
  await localTab.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  if (await localTab.isVisible().catch(() => false)) {
    await clickResilient(localTab);
  }

  // Iniciar sesión
  const userInput = page.locator('#local-username-input').first();
  await userInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await userInput.fill(testUser);

  const jugarBtn = page.locator('#local-login-btn').first();
  await jugarBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await clickResilient(jugarBtn);

  // Esperar de forma no bloqueante a que aparezca la pantalla de inicial o la pantalla principal directamente
  const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
  const mapaBtn = page.locator('button.map-btn').first();

  await Promise.race([
    starterCard.waitFor({ state: 'visible', timeout: 5000 }).then(() => 'starter'),
    mapaBtn.waitFor({ state: 'attached', timeout: 5000 }).then(() => 'map')
  ]).then(async (resolvedScreen) => {
    if (resolvedScreen === 'starter') {
      console.log(`[E2E-LOGIN] Pantalla de inicial detectada. Seleccionando Bulbasaur...`);
      await clickResilient(starterCard);
    } else {
      console.log(`[E2E-LOGIN] Interfaz principal detectada directamente (inicial ya seleccionado anteriormente).`);
    }
  }).catch((err) => {
    console.debug(`[E2E-LOGIN] Error en transición de login: ${String(err)}`);
  });

  // Asegurar que estamos en el mapa para iniciar el test
  await mapaBtn.waitFor({ state: 'attached', timeout: 5000 });
}

export async function resolveTargetUidForSlot(page: Page, slotNum: number, label: string): Promise<string | null> {
  return await page.evaluate(async ({ slotNum, label }) => {
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
        console.log(`[E2E-DEBUG-${label}] Dynamic slotNum: ${slotNum} -> Resolved via ShowdownTeamResolver: ${pokemon.uid}`);
        return pokemon.uid;
      }
      return null;
    } catch (err: unknown) {
      console.log(`[E2E-DEBUG-${label}] Error resolving slotNum ${slotNum} via ShowdownTeamResolver:`, (err as Error).message);
      return null;
    }
  }, { slotNum, label });
}

/**
 * Hace clic en el botón de combatir para iniciar la batalla
 */
export async function confirmAndStartBattle(page: Page): Promise<void> {
  const startBtn = page.locator('#start-encounter-btn').first();
  try {
    await startBtn.waitFor({ state: 'visible', timeout: 3000 });
    await clickResilient(startBtn, { timeout: 3000 });

    // If clicking SEARCH opens a trainer/rival dialogue modal with a fight button, confirm it
    const fightModalBtn = page.locator('#confirm-battle-btn').first();
    const isModalVisible = await fightModalBtn.isVisible().catch(() => false);
    if (isModalVisible) {
      await clickResilient(fightModalBtn, { timeout: 3000 });
    }
  } catch (_e) {
    console.debug('[confirmAndStartBattle] Start/Combat button not found or battle already active. Proceeding...');
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
    return !store.isProcessing && (
      (store.currentFsmState === 'ACTIVE_BATTLE' && 
       (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
      !store.state || store.state.over
    );
  }, undefined, { timeout: 15000 });
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
  }, undefined, { timeout: 2000 }).catch(() => {});

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
    console.debug(`[E2E-INPUT-DEBUG] cannot proceed: isProcessing is true`);
    return false;
  }

  const isUiLocked = await page.locator('.battle-controls-layout.is-ui-locked').count() > 0;
  if (isUiLocked) {
    console.debug(`[E2E-INPUT-DEBUG] cannot proceed: .is-ui-locked overlay is present in the DOM`);
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
    console.debug(`[E2E-INPUT-DEBUG] cannot proceed: a blocking base modal is open while in WAIT_INPUT`);
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
        await cardBtn.waitFor({ state: 'visible', timeout: 5000 });
        await cardBtn.click({ timeout: 5000 });
      } else {
        // Fallback posicional si no se pudo resolver el UID
        const switchIdx = switchSlot - 2; // slot 1 = activo, slot 2 = índice 0 de banca
        const allBenchCards = page.locator('.quick-card-override:not(.is-active)');
        await allBenchCards.first().waitFor({ state: 'visible', timeout: 5000 });
        await allBenchCards.nth(switchIdx).click({ timeout: 5000 });
      }
      return true;
    }
    // Choice no es un switch (es el move del turno siguiente): manejar con el primer disponible
    // sin consumir el choice — el loop externo reintentará con el mismo turnCount.
    const activeSwitchBtn = page.locator('.quick-card-override:not(.is-active):not(.is-fainted):not(.is-disabled)').first();
    const isVisible = await activeSwitchBtn.isVisible().catch(() => false);
    if (isVisible) {
      await activeSwitchBtn.click({ timeout: 5000 });
      return !choice;
    }
    return false;
  }

  if (!choice) {
    const firstMoveBtn = page.locator('.move-card-vicio').first();
    const isVisible = await firstMoveBtn.isVisible().catch(() => false);
    if (isVisible) {
      const isDisabled = await firstMoveBtn.isDisabled().catch(() => true);
      if (!isDisabled) {
        await firstMoveBtn.click({ timeout: 5000 });
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
        const struggleOverlay = page.locator('.struggle-overlay');
        const isStruggleActive = await struggleOverlay.isVisible().catch(() => false);

        let moveBtn;
        if (isStruggleActive) {
          // Click the struggle button inside the overlay
          moveBtn = struggleOverlay.locator('.move-card-vicio');
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

          moveBtn = page.locator('#move-panel .move-card-vicio').nth(resolvedVisualIdx);
        }

        await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
        const btnHtml = await moveBtn.evaluate((el) => el.outerHTML);
        console.debug(`[E2E-INPUT-DEBUG] Target move button outerHTML: ${btnHtml}`);
        const isDisabled = await moveBtn.isDisabled().catch((err: Error) => {
          console.debug(`[E2E-INPUT-DEBUG] isDisabled check threw error: ${err.message}`);
          return true;
        });
        if (isDisabled) {
          console.debug(`[E2E-INPUT-DEBUG] cannot proceed: move button is disabled`);
          return false;
        }
        await clickResilient(moveBtn, { timeout: 5000 });
        return true;
      } else if (cleanChoice.startsWith('switch ')) {
        // En Showdown, slot 1 es el activo, y slots 2-6 son la banca (sana o completa según la fase).
        // Por ende, switch N corresponds al índice N-2 de los elementos disponibles en la banca de la UI.
        const switchSlot = parseInt(cleanChoice.split(' ')[1] || '2', 10);
        
        const targetUid = await resolveTargetUidForSlot(page, switchSlot, 'SWITCH');

        if (targetUid) {
          const cardBtn = page.locator(`.quick-card-override[data-pokemon-uid="${targetUid}"]`).first();
          await cardBtn.waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(cardBtn, { timeout: 5000 });
        } else {
          const switchIdx = switchSlot - 2;
          const allBenchCards = page.locator('.quick-card-override:not(.is-active)');
          await allBenchCards.first().waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(allBenchCards.nth(switchIdx), { timeout: 5000 });
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
          await clickResilient(quickCard, { timeout: 5000 });
        } else {
          // Si no está en la bolsa rápida (ej. Revivir), abrir la mochila completa
          const bagBtn = page.locator('.bag-btn');
          await bagBtn.waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(bagBtn, { timeout: 5000 });

          // Esperar a que aparezca la tarjeta en el modal de la mochila
          const backpackItem = page.locator('.inventory-item-card', { hasText: translatedName }).first();
          await backpackItem.waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(backpackItem, { timeout: 5000 });
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

        let targetBtn = page.locator('.list-item').nth(targetIdx);
        if (targetUid) {
          targetBtn = page.locator(`[data-pokemon-uid="${targetUid}"].list-item`).first();
        }

        await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
        await clickResilient(targetBtn, { timeout: 5000 });
        return true;
      } else {
        return true;
      }
     } catch (e) {
       console.error(`[E2E] Strict Choice '${choice}' failed to execute in the UI. Aborting test. Error:`, e);
       throw e;
     }
   }
   await page.waitForTimeout(30);
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
        console.log(`[E2E-INVALID-CHECK] wait request is active (wait: true) -> choice "${ch}" is invalid/skipped`);
        return true;
      }

      const clean = ch.trim().toLowerCase();
      if (clean.startsWith('move ')) {
        const moveIdx = parseInt(clean.split(' ')[1] || '1', 10) - 1;
        const move = battle.player?.moves?.[moveIdx];
        const reqMove = req?.active?.[0]?.moves?.[moveIdx];
        const isInvalid = !move || (reqMove && reqMove.disabled);
        console.log(`[E2E-INVALID-CHECK] ch: ${ch}, move exists: ${!!move}, reqMove disabled: ${reqMove?.disabled} -> isInvalid: ${isInvalid}`);
        return !!isInvalid;
      } else if (clean.startsWith('switch ')) {
        const slotNum = parseInt(clean.split(' ')[1] || '2', 10);
        const slotOrder = req?.side?.pokemon || [];
        const targetPoke = slotOrder[slotNum - 1];
        if (!targetPoke) {
          console.log(`[E2E-INVALID-CHECK] ch: ${ch}, no targetPoke at slot ${slotNum} -> isInvalid: true`);
          return true;
        }
        const isFnt = targetPoke.condition.endsWith(' fnt') || targetPoke.condition.startsWith('0/');
        const isInvalid = !!targetPoke.active || isFnt;
        console.log(`[E2E-INVALID-CHECK] ch: ${ch}, targetPoke active: ${targetPoke.active}, condition: ${targetPoke.condition} -> isInvalid: ${isInvalid}`);
        return !!isInvalid;
      }
      return false;
    } catch (e: unknown) {
      console.error(`[E2E-INVALID-CHECK] Error:`, (e as Error).message);
      return false;
    }
  }, choice);
}

export interface CertifiedTestBatch {
  id?: string;
  seed?: [number, number, number, number];
  playerTeam: Array<{ species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean; uid?: string }>;
  enemyTeam: Array<{ species: string; level?: number; ability?: string; moves?: string[]; item?: string; name?: string; nature?: string; ivs?: Record<string, number>; evs?: Record<string, number>; gender?: string; shiny?: boolean; uid?: string }>;
  playerChoices: string[];
  enemyChoices: string[];
  cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>;
  finalState?: {
    p1: Array<{ name: string; hp: number; maxHp: number; fainted: boolean }>;
    p2: Array<{ name: string; hp: number; maxHp: number; fainted: boolean }>;
  };
  abilitiesToTest?: string[];
  movesToTest?: string[];
  history?: Array<{ p1Choice: string; p2Choice: string }>;
  ended?: boolean;
}

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
    }, undefined, { timeout: 15000 });
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
  _batchIndex: number, 
  _startingTurn = 0, 
  _playerChoices?: string[], 
  _cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>, 
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
  }, undefined, { timeout: 10000 }).catch(() => {});

  let over = false;
  while (!over) {
    const eventDetail = (await page.evaluate(async () => {
      if (window.__VITE_DEBUG__ && typeof window.__VITE_DEBUG__.waitForBattleReady === 'function') {
        return await window.__VITE_DEBUG__.waitForBattleReady();
      }
      throw new Error('window.__VITE_DEBUG__.waitForBattleReady is not defined');
    })) as { subState: string; over: boolean; p1ChoiceIdx: number; p2ChoiceIdx: number };

    if (eventDetail.over) {
      break;
    }

    if (eventDetail.subState === 'WAIT_INPUT') {
      await verifyHpParity(page);
    }

    const currentP1Idx = eventDetail.p1ChoiceIdx;
    const currentP2Idx = eventDetail.p2ChoiceIdx ?? 0;

    // Mandar a ejecutar la acción correspondiente con reintento reactivo si la FSM está completando animaciones GSAP
    let success = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      success = await page.evaluate(async () => {
        if (window.__VITE_DEBUG__ && typeof window.__VITE_DEBUG__.executeScriptedAction === 'function') {
          return await window.__VITE_DEBUG__.executeScriptedAction();
        }
        return false;
      });
      if (success) break;

      const isEndingOrOver = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        if (!store?.state || store.state.over) return true;
        const activePoke = store.state.player;
        const playerFainted = !activePoke || (activePoke.hp !== undefined && activePoke.hp <= 0);
        const sub = String(store.currentSubState || '');
        const state = String(store.currentFsmState || '');
        const endingSubStates = [
          'PLAYER_FAINT_SEQ', 'PLAY_ENEMY_FAINT', 'ENEMY_DEFEAT', 'DISTRIBUTE_XP',
          'EVAL_HP', 'EVAL_CONTINUE', 'ALL_FAINTED', 'DEFEAT_SCREEN', 'CLEANUP_MEMORY',
          'EXIT_BATTLE', 'REWARDS_PHASE', 'LEVEL_UP_MODAL'
        ];
        return playerFainted || state !== 'ACTIVE_BATTLE' || endingSubStates.includes(sub);
      });

      if (isEndingOrOver) {
        await page.waitForFunction(() => {
          const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
          const store = resolver?.();
          return !store?.state || store.state.over;
        }, undefined, { timeout: 15000 }).catch(() => {});
        over = true;
        break;
      }

      // Esperar reactivamente a que la FSM y animaciones GSAP terminen de estabilizarse
      await page.waitForFunction(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        if (!store?.state || store.state.over) return true;
        const sub = String(store.currentSubState || '');
        const bState = store.state as unknown as Record<string, unknown>;
        return !store.isProcessing && !store.isIntroAnimating && !bState?.switchingToPlayer && (sub === 'WAIT_INPUT' || sub === 'SWITCH_MENU');
      }, undefined, { timeout: 3000 }).catch(() => {});
    }

    if (over) break;

    if (!success) {
      const finalIsEnding = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        if (!store?.state || store.state.over) return true;
        const activePoke = store.state.player;
        return !activePoke || (activePoke.hp !== undefined && activePoke.hp <= 0);
      });
      if (finalIsEnding) {
        over = true;
        break;
      }
      throw new Error(`[E2E-TURN-FAIL] executeScriptedAction falló al ejecutar la acción tras aguardar la estabilización de la FSM.`);
    }

    // Esperar reactivamente a que la elección sea procesada e incrementada
    await page.waitForFunction(([prevP1, prevP2]) => {
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      const gameStore = debug?.getGameStore?.();
      const activePoke = store?.state?.player;
      const subStateVal = store?.currentSubState ? String(store.currentSubState) : '';
      const endingSubStates = [
        'PLAYER_FAINT_SEQ', 'PLAY_ENEMY_FAINT', 'ENEMY_DEFEAT', 'DISTRIBUTE_XP',
        'EVAL_HP', 'EVAL_CONTINUE', 'ALL_FAINTED', 'DEFEAT_SCREEN', 'CLEANUP_MEMORY',
        'EXIT_BATTLE', 'REWARDS_PHASE', 'LEVEL_UP_MODAL'
      ];
      const team = gameStore?.state?.team as Array<{ hp?: number }> | undefined;
      const allPlayerFainted = !activePoke || (team && team.every(p => !p || (p.hp !== undefined && p.hp <= 0)));
      const isOver = !store?.state || store.state.over || allPlayerFainted || endingSubStates.includes(subStateVal) || store?.currentFsmState !== 'ACTIVE_BATTLE';
      if (isOver) return true;
      if (!debug) return false;

      const isReady = store.currentFsmState === 'ACTIVE_BATTLE' &&
                      ['WAIT_INPUT', 'SWITCH_MENU', 'ENEMY_REPLACEMENT_SEQ'].includes(subStateVal) &&
                      !store.isProcessing &&
                      !store.isIntroAnimating;

      const enemyChoices = debug.enemyChoices as string[] | undefined;
      const isReplayComplete = debug.playerChoices && Array.isArray(debug.playerChoices) && (debug.p1ChoiceIdx ?? 0) >= debug.playerChoices.length && (!enemyChoices || (debug.p2ChoiceIdx ?? 0) >= enemyChoices.length);
      if (isReplayComplete) return true;

      const p1 = prevP1 ?? 0;
      const p2 = prevP2 ?? 0;
      return isReady && ((debug.p1ChoiceIdx ?? 0) > p1 || (debug.p2ChoiceIdx ?? 0) > p2 || !debug.isScriptedReplayMode);
    }, [currentP1Idx, currentP2Idx], { timeout: 30000 });

    const currentIsOver = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store?.state || store.state.over || store.currentFsmState !== 'ACTIVE_BATTLE') return true;
      const subStateVal = store.currentSubState ? String(store.currentSubState) : '';
      const endingSubStates = [
        'PLAYER_FAINT_SEQ', 'PLAY_ENEMY_FAINT', 'ENEMY_DEFEAT', 'DISTRIBUTE_XP',
        'EVAL_HP', 'EVAL_CONTINUE', 'ALL_FAINTED', 'DEFEAT_SCREEN', 'CLEANUP_MEMORY',
        'EXIT_BATTLE', 'REWARDS_PHASE', 'LEVEL_UP_MODAL'
      ];
      const debug = (window as WindowWithResolver).__VITE_DEBUG__;
      const gameStore = debug?.getGameStore?.();
      const activePoke = store.state.player;
      const team = gameStore?.state?.team as Array<{ hp?: number }> | undefined;
      const allPlayerFainted = !activePoke || (team && team.every(p => !p || (p.hp !== undefined && p.hp <= 0)));
      const enemyChoices = debug?.enemyChoices as string[] | undefined;
      const isReplayComplete = debug?.playerChoices && Array.isArray(debug.playerChoices) && (debug.p1ChoiceIdx ?? 0) >= debug.playerChoices.length && (!enemyChoices || (debug.p2ChoiceIdx ?? 0) >= enemyChoices.length);

      return allPlayerFainted || endingSubStates.includes(subStateVal) || isReplayComplete;
    }).catch(() => true);

    if (currentIsOver) {
      over = true;
      break;
    }

    const nextDetail = (await page.evaluate(async () => {
      if (window.__VITE_DEBUG__ && typeof window.__VITE_DEBUG__.waitForBattleReady === 'function') {
        return await window.__VITE_DEBUG__.waitForBattleReady();
      }
      throw new Error('window.__VITE_DEBUG__.waitForBattleReady is not defined');
    })) as { subState: string; over: boolean; p1ChoiceIdx: number; p2ChoiceIdx: number };
    over = nextDetail.over;
  }

  // Esperar a que la batalla sea declarada como finalizada en el store (hasta 30s)
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    const store = resolver();
    return !store.state || store.state.over || store.currentFsmState !== 'ACTIVE_BATTLE';
  }, undefined, { timeout: 30000 }).catch(() => {});

  const isBattleOver = await page.evaluate(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    const store = resolver();
    return !store.state || store.state.over || store.currentFsmState !== 'ACTIVE_BATTLE';
  }).catch(() => true);

  if (finalState || (_playerChoices && _playerChoices.length > 0)) {
    expect(isBattleOver).toBe(true);
  }

  if (finalState) {
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
        const clientPoke = clientState[seat].find(p => p.uid && p.uid.startsWith(expected.name));
        if (clientPoke) {
          expect(clientPoke.fainted).toBe(expected.fainted);
          expect(clientPoke.maxHp).toBe(expected.maxHp);
          if (!expected.fainted) {
            expect(clientPoke.hp).toBe(expected.hp);
            if ((expected as { status?: string }).status !== undefined) {
              expect(clientPoke.status).toBe((expected as { status?: string }).status || '');
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
    return !!store && (store.isReady === true || (store as unknown as { isDataLoaded?: boolean }).isDataLoaded === true);
  }, undefined, { timeout: 30000 });
}

export async function openDebugTab(page: Page, category: string): Promise<void> {
  const isNavOpen = await page.locator('.debug-nav').isVisible().catch(() => false);
  if (!isNavOpen) {
    const trigger = page.locator('.debug-trigger .trigger-btn, .debug-trigger, button.trigger-btn').first();
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
  await navBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await clickResilient(navBtn, { timeout: 5000 });
}

export async function playFishingMinigameNaturally(page: Page): Promise<void> {
  const modalContainer = page.locator('.rhythm-container').first();
  const isVisible = await modalContainer.isVisible({ timeout: 2000 }).catch(() => false);
  if (isVisible) {
    const closeBtn = page.locator('.modal-close-btn, .modal-close-btn-floating').first();
    const isCloseVisible = await closeBtn.isVisible().catch(() => false);
    if (isCloseVisible) {
      await clickResilient(closeBtn).catch(() => {});
    }
    await modalContainer.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

export async function playArchaeologyMinigameNaturally(page: Page): Promise<void> {
  const grid = page.locator('.archaeology-grid').first();
  const isVisible = await grid.isVisible({ timeout: 2000 }).catch(() => false);
  if (isVisible) {
    // Cierra/abandona la arqueología de forma natural por UI usando el botón de cerrar modal
    const closeBtn = page.locator('.modal-close-btn, .modal-close-btn-floating').first();
    const isCloseVisible = await closeBtn.isVisible().catch(() => false);
    if (isCloseVisible) {
      await clickResilient(closeBtn).catch(() => {});
    }
    await grid.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}
