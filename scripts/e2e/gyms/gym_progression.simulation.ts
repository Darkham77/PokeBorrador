// fallow-ignore-file security-sink
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForStoreReady } from '../e2e_helpers.ts';
import { MAX_SUITE_TOTAL_TIMEOUT_MS } from '../simulation_config.ts';

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
        moves: ['psychic', 'shadowball', 'solarbeam', 'icebeam']
      });

      gameStore.updateState({ team: [mewtwo], starterChosen: true });
      await gameStore.saveGame();
    });
  }

  public async challengeBrock(): Promise<void> {
    await this.disableAutoMode();
    const res = await this.page.evaluate(async () => {
      try {
        const { useGymsStore } = await import('../../../src/stores/gyms.ts');
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        const gymsStore = useGymsStore();
        const battleStore = useBattleStore();
        console.log('[E2E-CHALLENGE] Starting challengeGym pewter easy');
        await gymsStore.challengeGym('pewter', 'easy');
        console.log('[E2E-CHALLENGE] challengeGym finished. ActiveBattle:', Boolean(battleStore.state), 'FSM:', battleStore.currentFsmState, battleStore.currentSubState);
        return { success: true, activeBattle: Boolean(battleStore.state), fsm: battleStore.currentFsmState };
      } catch (err: unknown) {
        console.error('[E2E-CHALLENGE] Error in challengeGym:', err);
        return { success: false, error: String(err) };
      }
    });
    console.log('[E2E-CHALLENGE] Result from page:', JSON.stringify(res));
  }

  public async verifyBadgeEarned(): Promise<{ badgesCount: number; hasBadgeId: boolean }> {
    await waitForStoreReady(this.page);
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
  test('should challenge Pewter Gym, defeat Brock, and earn the Rock Badge', async ({ page }) => {
    test.setTimeout(MAX_SUITE_TOTAL_TIMEOUT_MS);
    const sim = new GymProgressionSimulation(page, 'GymTestUser');

    // 1. Setup session y login
    await sim.setup();
    await waitForStoreReady(page);

    // 2. Cargar Mewtwo nivel 100
    await sim.setupMewtwoTeam();

    // 3. Habilitar flags en el worker y desafiar al gimnasio de Brock
    await sim.enableE2EWorkerFlag();
    await sim.challengeBrock();

    // 4. Jugar el combate
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
