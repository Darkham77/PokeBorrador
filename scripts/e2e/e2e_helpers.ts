import type { Page, Locator } from '@playwright/test';

async function clickResilient(locator: Locator, options: { force?: boolean; timeout?: number } = {}, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await locator.click({ timeout: 2000, ...options });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err);
      if (msg.includes('detached') || msg.includes('retrying') || msg.includes('visible') || msg.includes('stable')) {
        console.log(`[E2E-RETRY] Element detached or transitioning, retrying click (${i + 1}/${retries})...`);
        await new Promise(r => setTimeout(r, 150));
        continue;
      }
      throw err;
    }
  }
  await locator.click(options);
}

export type WindowWithResolver = Window;

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

  // Elegir inicial si aparece
  const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
  try {
    await starterCard.waitFor({ state: 'visible', timeout: 30000 });
    await starterCard.click();
  } catch (_e) {
    // Ignorar si ya se eligió o no aparece
  }

  // Esperar a que cargue la interfaz principal
  const mapaBtn = page.locator('button:has-text("MAPA")').first();
  await mapaBtn.waitFor({ state: 'attached', timeout: 45000 });
}

/**
 * Resuelve el UID de un Pokémon en un slot de Showdown
 */
export async function resolveTargetUidForSlot(page: Page, slotNum: number, label: string): Promise<string | null> {
  return await page.evaluate(async ({ slotNum, label }) => {
    try {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return null;
      const battleStore = resolver();
      const state = battleStore.state as { playerRequest?: { side?: { pokemon?: Array<{ uid?: string } | null> } } } | undefined;
      const slotOrder = state?.playerRequest?.side?.pokemon || [];
      const uid = slotOrder[slotNum - 1]?.uid || null;
      const uids = slotOrder.map(p => p?.uid || 'null');
      console.log(`[E2E-DEBUG-${label}] slotNum: ${slotNum}, slotOrder UIDs: ${JSON.stringify(uids)}, resolved targetUid: ${uid}`);
      return uid;
    } catch (_e) {
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
    console.log('[confirmAndStartBattle] "¡COMBATIR!" button not found or battle already started. Proceeding...');
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
    return false;
  }

  const isUiLocked = await page.locator('.battle-controls-layout.is-ui-locked').count() > 0;
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
        await cardBtn.waitFor({ state: 'visible', timeout: 5000 });
        await cardBtn.click({ force: true, timeout: 5000 });
      } else {
        // Fallback posicional si no se pudo resolver el UID
        const switchIdx = switchSlot - 2; // slot 1 = activo, slot 2 = índice 0 de banca
        const allBenchCards = page.locator('.quick-card-override:not(.is-active)');
        await allBenchCards.first().waitFor({ state: 'visible', timeout: 5000 });
        await allBenchCards.nth(switchIdx).click({ force: true, timeout: 5000 });
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
        const moveBtn = page.locator('.move-card-vicio').nth(moveIdx);
        await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
        // Si el botón está deshabilitado, el juego está procesando una secuencia de debilitación.
        // Retornar false para que el loop externo espere y reintente.
        const isDisabled = await moveBtn.isDisabled().catch(() => true);
        if (isDisabled) return false;
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
          await clickResilient(cardBtn, { force: true, timeout: 5000 });
        } else {
          const switchIdx = switchSlot - 2;
          const allBenchCards = page.locator('.quick-card-override:not(.is-active)');
          await allBenchCards.first().waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(allBenchCards.nth(switchIdx), { force: true, timeout: 5000 });
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
          await clickResilient(quickCard, { force: true, timeout: 5000 });
        } else {
          // Si no está en la bolsa rápida (ej. Revivir), abrir la mochila completa
          const bagBtn = page.locator('.bag-btn');
          await bagBtn.waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(bagBtn, { force: true, timeout: 5000 });

          // Esperar a que aparezca la tarjeta en el modal de la mochila
          const backpackItem = page.locator('.inventory-item-card', { hasText: translatedName }).first();
          await backpackItem.waitFor({ state: 'visible', timeout: 5000 });
          await clickResilient(backpackItem, { force: true, timeout: 5000 });
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
        await clickResilient(targetBtn, { force: true, timeout: 5000 });
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

      if (battle.playerRequest?.wait) {
        console.log(`[E2E-INVALID-CHECK] wait request is active (wait: true) -> choice "${ch}" is invalid/skipped`);
        return true;
      }

      const clean = ch.trim().toLowerCase();
      if (clean.startsWith('move ')) {
        const idx = parseInt(clean.split(' ')[1] || '1', 10) - 1;
        const move = battle.player?.moves?.[idx];
        const activeReq = battle.playerRequest?.active?.[0];
        const reqMove = activeReq?.moves?.[idx];
        const isInvalid = !move || (reqMove && reqMove.disabled);
        console.log(`[E2E-INVALID-CHECK] ch: ${ch}, move exists: ${!!move}, reqMove disabled: ${reqMove?.disabled} -> isInvalid: ${isInvalid}`);
        return !!isInvalid;
      } else if (clean.startsWith('switch ')) {
        const slotNum = parseInt(clean.split(' ')[1] || '2', 10);
        const slotOrder = battle.playerRequest?.side?.pokemon || [];
        const targetPoke = slotOrder[slotNum - 1];
        if (!targetPoke) {
          console.log(`[E2E-INVALID-CHECK] ch: ${ch}, no targetPoke at slot ${slotNum} -> isInvalid: true`);
          return true;
        }
        const isFnt = targetPoke.condition.endsWith(' fnt') || targetPoke.condition.startsWith('0/');
        const isInvalid = targetPoke.active || isFnt;
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
