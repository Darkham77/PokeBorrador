import type { Page } from '@playwright/test';

interface DebugPokemon {
  uid?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  status?: string;
}

interface DebugGameStore {
  state?: {
    team?: Array<DebugPokemon | null>;
  } | null;
}

interface DebugPinia {
  _s?: Map<string, DebugGameStore>;
}

export interface DebugStore {
  currentFsmState?: string;
  currentSubState?: string;
  isProcessing?: boolean;
  isIntroAnimating?: boolean;
  /** Pinia internals — accessed to reach sibling stores */
  _p?: DebugPinia;
  fsm?: {
    currentState?: { value?: string };
    currentSubState?: { value?: string };
  };
  state?: {
    over?: boolean;
    turnCount?: number;
    player?: DebugPokemon | null;
    enemy?: DebugPokemon | null;
    enemyTeam?: Array<DebugPokemon | null>;
    activeBattle?: {
      player?: DebugPokemon | null;
      enemy?: DebugPokemon | null;
    } | null;
  } | null;
}

export type WindowWithResolver = typeof window & {
  __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
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
 * Hace clic en el botón de combatir para iniciar la batalla
 */
export async function confirmAndStartBattle(page: Page): Promise<void> {
  const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
  await combatirBtn.waitFor({ state: 'visible', timeout: 15000 });
  await combatirBtn.click();
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
  // Esperar a que el estado de procesamiento termine (microtasks/animaciones) antes de decidir
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return true;
    return !resolver().isProcessing;
  }, undefined, { timeout: 2000 }).catch(() => {});

  const isProcessing = await page.evaluate(async () => {
    const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
    return useBattleStore().isProcessing;
  });

  if (isProcessing) {
    return false;
  }

  const subState = await page.evaluate(async () => {
    const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
    return useBattleStore().currentSubState;
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

  const activeSwitchBtn = page.locator('.quick-card-override:not(.is-active):not(.is-fainted):not(.is-disabled)').first();

  if (subState === 'SWITCH_MENU') {
    await activeSwitchBtn.waitFor({ state: 'visible', timeout: 5000 });
    await activeSwitchBtn.click({ timeout: 5000 });
    return true;
  }

  if (choice) {
    try {
      const cleanChoice = choice.trim().toLowerCase();
      if (cleanChoice.startsWith('move ')) {
        const moveIdx = parseInt(cleanChoice.split(' ')[1] || '1', 10) - 1;
        const moveBtn = page.locator('.move-card-vicio').nth(moveIdx);
        await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
        await moveBtn.click({ timeout: 5000 });
        return true;
      } else if (cleanChoice.startsWith('switch ')) {
        // En Showdown, slot 1 es el activo, y slots 2-6 son la banca (sana o completa según la fase).
        // Por ende, switch N corresponds al índice N-2 de los elementos disponibles en la banca de la UI.
        const switchIdx = parseInt(cleanChoice.split(' ')[1] || '2', 10) - 2;

        // Obtener el estado de la FSM de una sola vez
        const fsmData = await page.evaluate(() => {
          try {
            const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
            if (!resolver) return null;
            const battleStore = resolver();
            return {
              currentState: battleStore.fsm?.currentState?.value || '',
              currentSubState: battleStore.fsm?.currentSubState?.value || ''
            };
          } catch (_e) {
            return null;
          }
        });

        const isForcedSwitch = fsmData && 
          (fsmData.currentSubState === 'SWITCH_MENU' || fsmData.currentSubState === 'PLAYER_FAINT_SEQ');

        let switchBtn;
        if (isForcedSwitch) {
          // Obtener el UID del pokemon sano en el índice switchIdx desde la banca de la UI de forma dinámica
          const targetUid = await page.evaluate((idx) => {
            try {
              const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
              if (!resolver) return null;
              const battleStore = resolver();
              const pinia = battleStore._p;
              const gameStore = pinia?._s?.get('game');
              const team = gameStore?.state?.team || [];
              // Filtrar los Pokémon sanos de la banca (excluyendo el activo si está vivo, pero como es cambio forzado por debilitación el activo tiene 0 HP)
              const healthyBackup = team.filter((p: { uid?: string; hp?: number } | null) => p && p.hp && p.hp > 0 && p.uid !== battleStore.state?.player?.uid);
              return healthyBackup[idx]?.uid || null;
            } catch (_e) {
              return null;
            }
          }, switchIdx);

          if (targetUid) {
            switchBtn = page.locator(`[data-pokemon-uid="${targetUid}"].list-item`).first();
          } else {
            const modalBtnList = page.locator('.list-item');
            await modalBtnList.first().waitFor({ state: 'visible', timeout: 5000 });
            switchBtn = modalBtnList.nth(switchIdx);
          }
        } else {
          // En cambios voluntarios, la barra lateral muestra los Pokémon de la banca completa (excluyendo el activo)
          switchBtn = page.locator('.quick-card-override:not(.is-active)').nth(switchIdx);
        }

        await switchBtn.waitFor({ state: 'visible', timeout: 5000 });
        await switchBtn.click({ force: true, timeout: 5000 });
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
          await quickCard.click({ force: true, timeout: 5000 });
        } else {
          // Si no está en la bolsa rápida (ej. Revivir), abrir la mochila completa
          const bagBtn = page.locator('.bag-btn');
          await bagBtn.waitFor({ state: 'visible', timeout: 5000 });
          await bagBtn.click({ force: true, timeout: 5000 });

          // Esperar a que aparezca la tarjeta en el modal de la mochila
          const backpackItem = page.locator('.inventory-item-card', { hasText: translatedName }).first();
          await backpackItem.waitFor({ state: 'visible', timeout: 5000 });
          await backpackItem.click({ force: true, timeout: 5000 });
        }

        // Obtener el UID del pokemon en el índice targetIdx alineando el orden con Showdown
        const targetUid = await page.evaluate((idx) => {
          try {
            const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
            if (!resolver) return null;
            const battleStore = resolver();
            const pinia = battleStore._p;
            const gameStore = pinia?._s?.get('game');
            const team = [...(gameStore?.state?.team || [])].filter((p): p is NonNullable<typeof p> => p != null);
            const activePoke = battleStore.state?.activeBattle?.player;
            
            const ordered = [];
            if (activePoke) {
              const activeInTeam = team.find(p => p.uid === activePoke.uid);
              if (activeInTeam) ordered.push(activeInTeam);
              team.forEach(p => {
                if (p.uid !== activePoke.uid) ordered.push(p);
              });
            } else {
              ordered.push(...team);
            }
            return ordered[idx]?.uid || null;
          } catch (_e) {
            return null;
          }
        }, targetIdx);

        let targetBtn = page.locator('.list-item').nth(targetIdx);
        if (targetUid) {
          targetBtn = page.locator(`[data-pokemon-uid="${targetUid}"].list-item`).first();
        }

        await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
        await targetBtn.click({ force: true, timeout: 5000 });
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
