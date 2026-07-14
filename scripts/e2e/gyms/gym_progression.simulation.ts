import { test, expect, Page } from '@playwright/test';
import { setupE2ESession, loginTestUser, confirmAndStartBattle, waitForWaitInput, handleBattleInput } from '../e2e_helpers.ts';

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

test.describe('Gym Progression & Badges Challenge Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ESession(page);
    page.on('console', msg => {
      console.log(`[BROWSER-${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    const testUser = `TEST_GYM_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    await loginTestUser(page, testUser);
  });

  test('should challenge Pewter Gym, defeat Brock, and earn the Rock Badge', async ({ page }) => {
    // 1. Setup inicial: dar un Mewtwo nivel 100 super dotado en el equipo para ganar sin problemas
    await page.waitForTimeout(2000);
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

      gameStore.updateState({ team: [mewtwo], starterChosen: true });
      console.log('TEST-DEBUG: team len:', gameStore.state.team.length, 'starterChosen:', gameStore.state.starterChosen);
      await gameStore.saveGame();
    });

    await page.waitForTimeout(2000);
    await page.reload();
    const mapaBtn = page.locator('button.map-btn').filter({ visible: true }).first();
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

    // 5. Cerrar el combate haciendo clic en el botón de cerrar del modal
    const closeBtn = page.locator('button.modal-close-btn, button.modal-close-btn-floating').filter({ visible: true }).first();
    await closeBtn.waitFor({ state: 'visible', timeout: 15000 });
    await closeBtn.click();

    // Esperar a retornar al mapa
    await page.locator('button.map-btn').filter({ visible: true }).first().waitFor({ state: 'visible', timeout: 10000 });

    // 6. Validar que la medalla Roca ('pewter') esté registrada y el HUD muestre 1 medalla
    const progress = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      const badgesCount = gameStore.state.badges ?? 0;
      const hasBadgeId = gameStore.state.defeatedGyms.includes('pewter');
      return { badgesCount, hasBadgeId };
    });

    expect(progress.badgesCount).toBe(1);
    expect(progress.hasBadgeId).toBe(true);
  });
});
