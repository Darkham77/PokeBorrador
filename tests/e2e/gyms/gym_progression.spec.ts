import { test, expect, Page } from '@playwright/test';

interface DebugStore {
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

type WindowWithResolver = typeof window & {
  __VITE_DEBUG_STORE_RESOLVER__?: () => DebugStore;
};

async function waitForWaitInput(page: Page) {
  await page.waitForFunction(() => {
    const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
    if (!resolver) return false;
    const store = resolver();
    return (store.currentFsmState === 'ACTIVE_BATTLE' && 
            (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU')) || 
            !store.state || store.state.over;
  }, undefined, { timeout: 15000 });
}

async function confirmAndStartBattle(page: Page) {
  const combatirBtn = page.locator('button:has-text("¡COMBATIR!")').first();
  await combatirBtn.waitFor({ state: 'visible', timeout: 15000 });
  await combatirBtn.click();
}

async function handleBattleInput(page: Page): Promise<boolean> {
  const activeMoveBtn = page.locator('.move-card-vicio:not([disabled])').first();
  try {
    await activeMoveBtn.waitFor({ state: 'visible', timeout: 2000 });
    await activeMoveBtn.click();
    return true;
  } catch (_e) {
    return false;
  }
}

async function executeAutoBattle(page: Page) {
  let turnCount = 0;
  const maxTurns = 50;

  while (turnCount < maxTurns) {
    const isOver = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });

    if (isOver) {
      break;
    }

    await waitForWaitInput(page);

    const isOverAfterWait = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return !store.state || store.state.over;
    });

    if (isOverAfterWait) {
      break;
    }

    const inputPerformed = await handleBattleInput(page);
    if (inputPerformed) {
      turnCount++;
      await page.waitForTimeout(200); // Pequeño buffer para transiciones
    } else {
      await page.waitForTimeout(100);
    }
  }
}

test.describe('Gym Progression & Badges E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E__ = true;
      localStorage.setItem('pwa_permissions_accepted', 'true');
      localStorage.setItem('auto-battle', 'false');
    });

    await page.goto('/login');
    await page.locator('button:has-text("Local")').click();
    const testUser = `TEST_GYM_${Date.now()}`;
    await page.fill('input[placeholder="Nombre de Entrenador"]', testUser);
    await page.click('button:has-text("JUGAR LOCAL")');

    const starterCard = page.locator('.starter-card.grass, #starter-img-bulbasaur').first();
    try {
      await starterCard.waitFor({ state: 'visible', timeout: 5000 });
      await starterCard.click();
    } catch (_e) {
      // Ignore if starter already chosen
    }

    const mapaBtn = page.locator('button:has-text("MAPA")').first();
    await mapaBtn.waitFor({ state: 'attached', timeout: 30000 });
  });

  test('should challenge Pewter Gym, defeat Brock, and earn the Rock Badge', async ({ page }) => {
    // 1. Setup inicial: dar un Mewtwo nivel 100 super dotado en el equipo para ganar sin problemas
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      
      const gameStore = useGameStore();

      // Mewtwo nivel 100
      const mewtwo = pokemonDebugService.generate({
        id: 'mewtwo',
        level: 100,
        moves: ['psychic']
      });

      gameStore.state.team = [mewtwo];
      await gameStore.saveGame();
    });

    await page.reload();
    const mapaBtn = page.locator('button:has-text("MAPA")').first();
    await mapaBtn.waitFor({ state: 'visible', timeout: 15000 });

    // 2. Lanzar combate de gimnasio Pewter en dificultad fácil
    await page.evaluate(async () => {
      const { useGymsStore } = await import('../../../src/stores/gyms.ts');
      const gymsStore = useGymsStore();
      await gymsStore.challengeGym('pewter', 'easy');
    });

    // 3. Confirmar e iniciar combate
    await confirmAndStartBattle(page);

    // 4. Jugar automáticamente hasta ganar la batalla completa (Brock tiene 2 Pokémon: Geodude y Onix)
    await executeAutoBattle(page);

    // 5. Verificar que el combate se haya cerrado y hayamos retornado al mapa
    await page.waitForFunction(() => {
      const resolver = (window as unknown as Record<string, () => DebugStore>).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return true;
      const store = resolver();
      return !store.state || store.state.over;
    }, undefined, { timeout: 15000 });

    await mapaBtn.waitFor({ state: 'visible', timeout: 10000 });

    // 6. Validar que la medalla Roca ('pewter') esté registrada y el HUD muestre 1 medalla
    const progress = await page.evaluate(() => {
      interface MockGameStore {
        state: {
          badges: number;
          defeatedGyms: string[];
        };
      }
      const win = window as unknown as Record<string, () => MockGameStore>;
      const getStore = win.useGameStore;
      if (!getStore) return { badgesCount: 0, hasBadgeId: false };
      const gameStore = getStore();
      const badgesCount = gameStore.state.badges ?? 0;
      const hasBadgeId = gameStore.state.defeatedGyms.includes('pewter');
      return { badgesCount, hasBadgeId };
    });

    expect(progress.badgesCount).toBe(1);
    expect(progress.hasBadgeId).toBe(true);
  });
});
