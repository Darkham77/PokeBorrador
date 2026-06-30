import type { Page } from '@playwright/test';

export interface DebugStore {
  currentFsmState?: string;
  currentSubState?: string;
  isProcessing?: boolean;
  isIntroAnimating?: boolean;
  state?: {
    over?: boolean;
    turnCount?: number;
    player?: { hp?: number; maxHp?: number } | null;
    enemy?: { hp?: number; maxHp?: number } | null;
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
    await activeSwitchBtn.click();
    return true;
  }

  if (choice) {
    const cleanChoice = choice.trim().toLowerCase();
    if (cleanChoice.startsWith('move ')) {
      const moveIdx = parseInt(cleanChoice.split(' ')[1] || '1', 10) - 1;
      const moveBtn = page.locator('.move-card-vicio').nth(moveIdx);
      await moveBtn.waitFor({ state: 'visible', timeout: 5000 });
      await moveBtn.click();
      return true;
    } else if (cleanChoice.startsWith('switch ')) {
      const pkmName = cleanChoice.replace('switch ', '').trim();
      const switchBtn = page.locator(`.quick-card-override:has-text("${pkmName}")`).first();
      await switchBtn.waitFor({ state: 'visible', timeout: 5000 });
      await switchBtn.click();
      return true;
    } else if (cleanChoice.startsWith('item ')) {
      const itemCard = page.locator(`.quick-item-card:not(.is-disabled)`).first();
      await itemCard.waitFor({ state: 'visible', timeout: 5000 });
      await itemCard.click();

      const targetBtn = page.locator('.list-item, button:has-text("Bulbasaur"), button:has-text("Mew")').first();
      await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
      await targetBtn.click();
      return true;
    } else {
      return true;
    }
  } else {
    const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
    try {
      await activeMoveBtn.waitFor({ state: 'visible', timeout: 2000 });
      await activeMoveBtn.click();
      return true;
    } catch (_e) {
      if (await activeSwitchBtn.isVisible()) {
        await activeSwitchBtn.click();
        return true;
      } else {
        await page.waitForTimeout(30);
        return false;
      }
    }
  }
}
