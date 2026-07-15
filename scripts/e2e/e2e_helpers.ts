import { type Page, type Locator, expect } from '@playwright/test';

export async function clickResilient(locator: Locator, options: { force?: boolean; timeout?: number } = {}, retries = 3): Promise<void> {
  const cleanOptions = { ...options };
  delete cleanOptions.force; // Prohibición estricta de force-clicks en tests
  
  // Capturar el estado/subestado de la FSM antes de intentar el clic
  const preClickState = await locator.page().evaluate(() => {
    const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return null;
    const store = resolver();
    return { fsm: store.currentFsmState, sub: store.currentSubState };
  }).catch(() => null);

  for (let i = 0; i < retries; i++) {
    try {
      await locator.click({ timeout: 2000, ...cleanOptions });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err);
      
      // Si el elemento se desmontó pero el clic ya provocó la transición de la FSM, consideramos que el clic fue exitoso.
      if (msg.includes('detached') || msg.includes('visible') || msg.includes('stable')) {
        const postClickState = await locator.page().evaluate(() => {
          const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return null;
          const store = resolver();
          return { fsm: store.currentFsmState, sub: store.currentSubState };
        }).catch(() => null);

        if (preClickState && postClickState && (preClickState.fsm !== postClickState.fsm || preClickState.sub !== postClickState.sub)) {
          console.debug('[E2E-CLICK-SUCCESS] Click triggered a state transition successfully despite DOM detachment.');
          return;
        }

        console.debug(`[E2E-RETRY] Element detached or transitioning, retrying click (${i + 1}/${retries})...`);
        continue;
      }
      throw err;
    }
  }
  await locator.click(cleanOptions);
}

export interface DebugStore {
  isProcessing: boolean;
  currentSubState: string;
  currentFsmState?: string;
  isIntroAnimating?: boolean;
  player?: {
    uid: string;
    hp: number;
    maxHp: number;
    moves?: Array<{ id: string; pp: number; maxpp?: number } | null>;
  } | null;
  enemy?: {
    uid: string;
    hp: number;
    maxHp: number;
  } | null;
  state: {
    over: boolean;
    turnCount: number;
    player?: {
      uid: string;
      hp: number;
      maxHp: number;
      status?: string | null;
      moves?: Array<{ id: string; pp: number } | null>;
    } | null;
    enemy?: {
      uid: string;
      hp: number;
      maxHp: number;
      status?: string | null;
    } | null;
    playerTeam?: Array<{ uid: string; name: string; hp: number; maxHp: number; status?: string | null }> | null;
    enemyTeam?: Array<{ uid: string; name: string; hp: number; maxHp: number; fainted?: boolean }> | null;
    playerRequest?: {
      wait?: boolean;
      active?: Array<{
        moves?: Array<{ id: string; disabled?: boolean | string } | null> | null;
      } | null> | null;
      side?: {
        pokemon?: Array<{ uid?: string; name: string; condition: string; active?: boolean }>;
      };
    } | null;
    enemyRequest?: {
      active?: Array<{
        moves?: Array<{ id: string; disabled?: boolean | string } | null> | null;
      } | null> | null;
    } | null;
    p1SlotOrder?: string[];
  } | null;
}

export type WindowWithResolver = Window & {
  __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
  __VITE_DEBUG__?: {
    cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>;
    mockEnemyChoices?: string[];
    enemyChoiceIndex?: number;
    getGameStore?: () => { state: { team: unknown[] } };
  };
};


/**
 * Configura los permisos iniciales mockeados en localstorage y globales
 */
export async function setupE2ESession(page: Page): Promise<void> {
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

export async function loginE2ETestUser(page: Page, username = 'E2ETestUser'): Promise<void> {
  await setupE2ESession(page);
  await loginTestUser(page, username);
}

/**
 * Realiza el login de test en el servidor local
 */
export async function loginTestUser(page: Page, testUser: string): Promise<void> {
  // Navegar al Login
  await page.goto('/login');

  // Seleccionar servidor local
  const localTab = page.locator('button:has-text("Local")');
  await localTab.click();

  // Iniciar sesión
  await page.fill('input[placeholder="Nombre de Entrenador"]', testUser);
  await page.click('button:has-text("JUGAR LOCAL")');

  // Esperar de forma no bloqueante a que aparezca la pantalla de inicial o la pantalla principal directamente
  const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
  const mapaBtn = page.locator('button.map-btn').first();

  await Promise.race([
    starterCard.waitFor({ state: 'visible', timeout: 30000 }).then(() => 'starter'),
    mapaBtn.waitFor({ state: 'attached', timeout: 30000 }).then(() => 'map')
  ]).then(async (resolvedScreen) => {
    if (resolvedScreen === 'starter') {
      console.log(`[E2E-LOGIN] Pantalla de inicial detectada. Seleccionando Bulbasaur...`);
      await starterCard.click();
    } else {
      console.log(`[E2E-LOGIN] Interfaz principal detectada directamente (inicial ya seleccionado anteriormente).`);
    }
  }).catch((err) => {
    console.debug(`[E2E-LOGIN] Error en transición de login: ${String(err)}`);
  });

  // Asegurar que estamos en el mapa para iniciar el test
  await mapaBtn.waitFor({ state: 'attached', timeout: 15000 });
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
  const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
  try {
    await combatirBtn.waitFor({ state: 'visible', timeout: 2000 });
    await combatirBtn.click();
  } catch (_e) {
    console.debug('[confirmAndStartBattle] "¡COMBATIR!" button not found or battle already started. Proceeding...');
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
    return (store.currentFsmState === 'ACTIVE_BATTLE' && 
            (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
            !store.state || store.state.over;
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

          moveBtn = page.locator('.move-card-vicio').nth(resolvedVisualIdx);
        }

        await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
        const btnHtml = await moveBtn.evaluate((el) => el.outerHTML);
        console.debug(`[E2E-INPUT-DEBUG] Target move button outerHTML: ${btnHtml}`);
        const isDisabled = await moveBtn.isDisabled().catch(() => true);
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

export async function waitForWaitInputFsmSync(page: Page, turnCount: number, batchIndex: number, expectedSimulatorTurn: number, lastSubState: string) {
  try {
    let resolved = false;
    while (!resolved) {
      await page.waitForFunction(({ expectedTurn, lastSub, isFirst }) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        const isReady = (store.currentFsmState === 'ACTIVE_BATTLE' && 
                        (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU' || store.currentSubState === 'ENEMY_REPLACEMENT_SEQ' || store.currentSubState === 'POKEMON_CALL') &&
                        !store.isProcessing && !store.isIntroAnimating) || 
                        !store.state || store.state.over;
        
        console.debug(`[E2E-FSM-Wait] turnCount: ${expectedTurn}, lastSub: "${lastSub}", isFirst: ${isFirst}, currentSubState: "${store.currentSubState}", isProcessing: ${store.isProcessing}, isIntro: ${store.isIntroAnimating}, isReady: ${isReady}`);
        
        return isReady;
      }, { expectedTurn: expectedSimulatorTurn, lastSub: lastSubState, isFirst: turnCount === 0 }, { timeout: 45000 });

      // Esperar al siguiente frame de renderizado para asegurar que Vue actualizó el DOM tras el microtask gap
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));

      // Re-verificar si seguimos en un estado listo para input (WAIT_INPUT o SWITCH_MENU o ENEMY_REPLACEMENT_SEQ o POKEMON_CALL o batalla terminada)
      const stillReady = await page.evaluate(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        try {
          const store = resolver();
          return (store.currentFsmState === 'ACTIVE_BATTLE' && 
                  (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU' || store.currentSubState === 'ENEMY_REPLACEMENT_SEQ' || store.currentSubState === 'POKEMON_CALL') &&
                  !store.isProcessing && !store.isIntroAnimating) || 
                  !store.state || store.state.over;
        } catch (_e) {
          return false;
        }
      });

      if (stillReady) {
        resolved = true;
      } else {
        console.debug(`[E2E] Falsa alarma detectada (microtask gap). Re-esperando FSM...`);
      }
    }
  } catch (_e) {
    await page.screenshot({ path: `scratch/lock-batch-${batchIndex}-turn-${turnCount}.png` });
    throw new Error(`Bloqueo detectado: La FSM de combate se quedó trabada en el turno ${turnCount}. Captura guardada en scratch/.`);
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
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
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
  batchIndex: number, 
  startingTurn = 0, 
  playerChoices?: string[], 
  cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>, 
  finalState?: CertifiedTestBatch['finalState']
) {
  let p1ChoiceIdx = startingTurn;
  let p2ChoiceIdx = startingTurn;
  const appliedCheatsTurns = new Set<number>();
  const { MAX_E2E_BATTLE_TURNS } = await import('./e2e_constants.ts');
  const maxIterations = MAX_E2E_BATTLE_TURNS;
  let iterations = 0;
  let lastSimulatorTurn = 0;
  let lastSubState = '';

  // Esperar a que el estado de la batalla esté inicializado en el store
  await page.waitForFunction(() => {
    const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
    return !!resolver?.().state;
  }, undefined, { timeout: 10000 }).catch(() => {});

  while (iterations < maxIterations) {
    iterations++;

    p1ChoiceIdx = await page.evaluate(() => window.__VITE_DEBUG__?.p1ChoiceIdx ?? 0);
    p2ChoiceIdx = await page.evaluate(() => window.__VITE_DEBUG__?.p2ChoiceIdx ?? 0);

    const isOver = await page.evaluate(() => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return true;
      const store = resolver();
      return !store.state || store.state.over;
    }).catch((err) => {
      console.log(`[E2E-ERROR-EVAL] isOver check failed: ${String(err)}`);
      return true;
    });

    if (isOver) {
      break;
    }

    if (playerChoices && p1ChoiceIdx >= playerChoices.length) {
      break;
    }

    await waitForWaitInputFsmSync(page, p1ChoiceIdx, batchIndex, lastSimulatorTurn, lastSubState);

    const isOverAfterWait = await page.evaluate(() => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return true;
      const store = resolver();
      return !store.state || store.state.over;
    }).catch(() => true);

    if (isOverAfterWait) {
      break;
    }

    const subState = await page.evaluate(() => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return 'WAIT_INPUT';
      const store = resolver();
      return store.currentSubState;
    }).catch(() => 'WAIT_INPUT');
    if (subState === 'WAIT_INPUT') {
      await verifyHpParity(page);
    }

    const reqStatus = await page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return { hasChoice: false, turn: 0, subState: '' };
      const store = resolver();
      const req = store.state?.playerRequest;
      return {
        hasChoice: !!req && !req.wait,
        turn: store.state?.turnCount ?? 1,
        subState: store.currentSubState || ''
      };
    });

    lastSimulatorTurn = reqStatus.turn;
    lastSubState = reqStatus.subState;

    if (cheats && cheats.length > 0 && !appliedCheatsTurns.has(lastSimulatorTurn)) {
      const currentCheats = cheats.filter(c => c.turn === lastSimulatorTurn);
      if (currentCheats.length > 0) {
        appliedCheatsTurns.add(lastSimulatorTurn);
        await page.evaluate(async ({ cheatsList, currentTurn }) => {
          const currentCheatsInner = cheatsList.filter(c => c.turn === currentTurn);
          if (currentCheatsInner.length > 0) {
            console.debug(`[E2E] Applying cheats at turn ${currentTurn}: ${JSON.stringify(currentCheatsInner)}`);
            const { applyCheatsInWorker } = await import('@/logic/battle/showdownWorkerClient.ts');
            await applyCheatsInWorker(currentCheatsInner);
          }
        }, { cheatsList: cheats, currentTurn: lastSimulatorTurn });
      }
    }

    await page.evaluate((idx) => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (resolver) {
        const store = resolver();
        const pinia = store._p;
        const gameStore = pinia?._s?.get('game') as { state: { team: Array<{ name: string; hp: number; maxHp: number; uid: string; moves: Array<{ id: string; pp: number }> }> } } | undefined;
        const teamInfo = gameStore?.state?.team?.map((p, tIdx: number) => 
          `[${tIdx}] ${p?.name} HP:${p?.hp}/${p?.maxHp} UID:${p?.uid} Moves:[${p?.moves?.map(m => `${m?.id}(pp:${m?.pp})`).join(',')}]`
        ).join(' | ');
        const reqMoves = store.state?.playerRequest?.active?.[0]?.moves?.map((m: { id?: string, pp?: number, maxpp?: number, disabled?: boolean | string }) => `${m?.id}(pp:${m?.pp}/${m?.maxpp},disabled:${m?.disabled})`).join(',');
        const activePoke = store.state?.player;
        const volatiles = activePoke?.volatileCounters ? JSON.stringify(activePoke.volatileCounters) : 'none';
        console.log(`[E2E-TEAM-STATE] ChoiceIndex: ${idx} | FSM: ${store.currentSubState} | ActivePlayer: ${store.state?.player?.name} (UID:${store.state?.player?.uid}) | Volatiles: ${volatiles} | RequestMoves:[${reqMoves || 'none'}] | Team: ${teamInfo}`);
      }
    }, p1ChoiceIdx);

    await page.evaluate((idx) => {
      if (window.__VITE_DEBUG__ && window.__VITE_DEBUG__.enemyChoices) {
        window.__VITE_DEBUG__.nextEnemyChoice = (window.__VITE_DEBUG__.enemyChoices as string[])[idx];
        console.log(`[E2E-MOCK-CENTRAL-DEBUG] Inyectada elección del enemigo para el índice de elección P2 ${idx}: ${window.__VITE_DEBUG__.nextEnemyChoice}`);
      }
    }, p2ChoiceIdx);

    if (reqStatus.hasChoice) {
      if (playerChoices && p1ChoiceIdx >= playerChoices.length) {
        break;
      }

      const currentChoice = playerChoices ? playerChoices[p1ChoiceIdx] : undefined;
      
      if (playerChoices && p1ChoiceIdx < playerChoices.length && (currentChoice === '' || currentChoice === undefined)) {
        console.log(`[E2E] Fuzzer choice at index ${p1ChoiceIdx} is empty (P1 has no choice in fuzzer). Skipping.`);
        p1ChoiceIdx++;
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
        continue;
      }

      const isPlayerChoiceValid = await page.evaluate((choiceStr) => {
        try {
          if (!choiceStr) return true;
          const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
          if (!resolver) return true;
          const store = resolver();
          const playerRequest = store.state?.playerRequest;
          if (!playerRequest) return true;

          if (choiceStr.startsWith('switch ')) {
            const switchSlot = parseInt(choiceStr.split(' ')[1] || '2', 10);
            const targetPoke = playerRequest.side?.pokemon?.[switchSlot - 1];
            if (!targetPoke) return false;
            const isFainted = targetPoke.condition?.includes('fnt');
            const isActive = !!targetPoke.active;
            if (isFainted || isActive) return false;
          } else if (choiceStr.startsWith('move ')) {
            const moveIdx = parseInt(choiceStr.split(' ')[1] || '1', 10) - 1;
            const reqMove = playerRequest.active?.[0]?.moves?.[moveIdx];
            if (reqMove && reqMove.disabled) return false;
          }
          return true;
        } catch (_e) {
          return true;
        }
      }, currentChoice);

      if (!isPlayerChoiceValid) {
        console.log(`[E2E] Choice "${currentChoice}" at index ${p1ChoiceIdx} is invalid for P1. Skipping to match fuzzer.`);
        p1ChoiceIdx++;
        await page.evaluate(() => {
          if (window.__VITE_DEBUG__) {
            window.__VITE_DEBUG__.p1ChoiceIdx = (window.__VITE_DEBUG__.p1ChoiceIdx ?? 0) + 1;
          }
        });
        continue;
      }

      const inputPerformed = await handleBattleInput(page, currentChoice);
      if (!inputPerformed) {
        throw new Error(`[E2E-TURN-FAIL] handleBattleInput returned false at choice index ${p1ChoiceIdx} for choice "${currentChoice}". UI is blocked or desynced.`);
      }
    }
  }

  const isBattleOver = await page.evaluate(() => {
    const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    const store = resolver();
    return !store.state || store.state.over;
  }).catch(() => true);

  expect(isBattleOver).toBe(true);

  if (finalState) {
    const clientState = await page.evaluate(() => {
      const resolver = (window as any).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return { p1: [], p2: [] };
      const store = resolver();
      const p1 = store.state?.playerTeam?.map((p: any) => ({
        name: p.name,
        hp: p.hp,
        maxHp: p.maxHp,
        fainted: p.hp <= 0
      })) || [];
      const p2 = store.state?.enemyTeam?.map((p: any) => ({
        name: p.name,
        hp: p.hp,
        maxHp: p.maxHp,
        fainted: p.hp <= 0
      })) || [];
      return { p1, p2 };
    });

    finalState.p1.forEach((expected, i) => {
      const clientPoke = clientState.p1[i];
      if (clientPoke) {
        expect(clientPoke.fainted).toBe(expected.fainted);
        if (!expected.fainted) {
          expect(clientPoke.hp).toBe(expected.hp);
        }
      }
    });

    finalState.p2.forEach((expected, i) => {
      const clientPoke = clientState.p2[i];
      if (clientPoke) {
        expect(clientPoke.fainted).toBe(expected.fainted);
        if (!expected.fainted) {
          expect(clientPoke.hp).toBe(expected.hp);
        }
      }
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
