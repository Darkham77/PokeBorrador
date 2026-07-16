import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';

class GymProgressionSimulation extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupMewtwoTeam(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const gameStore = useGameStore();

      const mewtwo = pokemonDebugService.generate({
        id: 'mewtwo',
        level: 100,
        moves: ['psychic']
      });

      gameStore.updateState({ team: [mewtwo], starterChosen: true });
      await gameStore.saveGame();
    });
  }

  public async challengeBrock(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGymsStore } = await import('../../../src/stores/gyms.ts');
      const gymsStore = useGymsStore();
      await gymsStore.challengeGym('pewter', 'easy');
    });
  }

  public async verifyBadgeEarned(): Promise<{ badgesCount: number; hasBadgeId: boolean }> {
    return await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const gameStore = useGameStore();
      const badgesCount = gameStore.state.badges ?? 0;
      const hasBadgeId = gameStore.state.defeatedGyms.includes('pewter');
      return { badgesCount, hasBadgeId };
    });
  }
}

test.describe('Gym Progression & Badges Challenge Simulation', () => {
  test.beforeEach(({ page }) => {
    page.on('console', msg => {
      console.log(`[BROWSER-${msg.type().toUpperCase()}] ${msg.text()}`);
    });
  });

  test('should challenge Pewter Gym, defeat Brock, and earn the Rock Badge', async ({ page }) => {
    const testUser = `TEST_GYM_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new GymProgressionSimulation(page, testUser);

    // 1. Setup session y login
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Cargar Mewtwo nivel 100
    await sim.setupMewtwoTeam();

    // 3. Habilitar flags en el worker y desafiar al gimnasio de Brock
    await sim.enableE2EWorkerFlag();
    await sim.challengeBrock();

    // 4. Iniciar y jugar el combate
    await sim.startBattle();
    await sim.playBattle();

    // 5. Cerrar combate y retornar al mapa
    await sim.closeBattleModal();
    await sim.awaitReturnToMap();

    // 6. Validar que la medalla Roca esté registrada
    const progress = await sim.verifyBadgeEarned();
    expect(progress.badgesCount).toBe(1);
    expect(progress.hasBadgeId).toBe(true);
  });
});
