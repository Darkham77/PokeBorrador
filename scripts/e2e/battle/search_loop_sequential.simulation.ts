// fallow-ignore-file security-sink
import { test, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import { waitForStoreReady, confirmAndStartBattle, playFishingMinigameNaturally, playArchaeologyMinigameNaturally, type WindowWithResolver } from '../e2e_helpers.ts';

class SearchLoopSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupRayquaza(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

      const rayquaza = pokemonDebugService.generate({
        id: 'rayquaza',
        level: 100,
        moves: ['flamethrower', 'thunderbolt', 'icebeam', 'surf']
      });
      
      rayquaza.maxHp = 9999;
      rayquaza.hp = 9999;
      rayquaza.atk = 999;
      rayquaza.def = 999;
      rayquaza.spa = 999;
      rayquaza.spd = 999;
      rayquaza.spe = 999;
      
      useGameStore().state.team = [rayquaza];
      useGameStore().state.starterChosen = true;
      await useGameStore().saveGame();

      const w = window as WindowWithResolver;
      w.__VITE_DEBUG__ = w.__VITE_DEBUG__ || {};
      w.__VITE_DEBUG__.isDeterministicSimulation = true;

      // Interceptar minijuegos para eclosión/win rápido
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      const modalStore = useModalStore();
      const originalOpen = modalStore.open;
      modalStore.open = function(name: string, props?: Record<string, unknown>) {
        if (name === 'Fishing') {
          const p = props as { onWin?: () => void } | undefined;
          p?.onWin?.();
          return null;
        }
        if (name === 'Archaeology') {
          const p = props as { onWin?: (difficulty: string) => void } | undefined;
          p?.onWin?.('hard');
          return null;
        }
        return originalOpen.call(this, name, props);
      };
    });
  }

  public async navigateToRoute1(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useMapStore } = await import('../../../src/stores/map.ts');
      await useMapStore().navigate('route1');
    });
  }

  public async forceHealAll(): Promise<void> {
    await this.page.evaluate(() => {
      (window as WindowWithResolver).__VITE_DEBUG__?.healAll?.();
    });
  }

  public async forceEncounterType(type: string): Promise<void> {
    await this.page.evaluate((t) => {
      if ((window as WindowWithResolver).__VITE_DEBUG__) {
        (window as WindowWithResolver).__VITE_DEBUG__!.forceEncounterType = t;
      }
    }, type);
  }

  public async awaitSearchPhaseCombatOrFlee(): Promise<void> {
    await this.page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return store.currentFsmState === 'SEARCH_PHASE' && 
             store.currentSubState === 'COMBAT_OR_FLEE' &&
             !store.isProcessing;
    }, undefined, { timeout: 15000 });
  }

  public async awaitNotProcessing(): Promise<void> {
    await this.page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return !resolver?.()?.isProcessing;
    }, undefined, { timeout: 5000 });
  }
}

test.describe('Sequential Search Loop Battles Simulation', () => {

  test('should execute 10 sequential battles in the search loop without initialization or UID errors', async ({ page }) => {
    test.setTimeout(240000);

    const testUser = `TEST_SEQ_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new SearchLoopSimWrapper(page, testUser);
    
    await sim.setup();
    await waitForStoreReady(page);
    await sim.setupRayquaza();
    await sim.navigateToRoute1();

    const encountersToTest = [
      { num: 1, type: 'wild', label: 'Wild Encounter' },
      { num: 2, type: 'trainer', label: 'Trainer Encounter' },
      { num: 3, type: 'rival', label: 'Rival Encounter' },
      { num: 4, type: 'fishing', label: 'Fishing Minigame + Battle' },
      { num: 5, type: 'archaeology', label: 'Archaeology Minigame' },
      { num: 6, type: 'wild', label: 'Wild Encounter' },
      { num: 7, type: 'trainer', label: 'Trainer Encounter' },
      { num: 8, type: 'rival', label: 'Rival Encounter' },
      { num: 9, type: 'fishing', label: 'Fishing Minigame + Battle' },
      { num: 10, type: 'wild', label: 'Wild Encounter' }
    ];

    for (let i = 0; i < encountersToTest.length; i++) {
      const enc = encountersToTest[i]!;
      console.debug(`[E2E-TEST] --- Iniciando Combate ${enc.num}: ${enc.label} ---`);
      
      await sim.forceHealAll();
      await sim.awaitSearchPhaseCombatOrFlee();
      await sim.forceEncounterType(enc.type);
      await confirmAndStartBattle(page);

      if (enc.type === 'archaeology') {
        await playArchaeologyMinigameNaturally(page);
        await sim.awaitNotProcessing();
      } else if (enc.type === 'fishing') {
        await playFishingMinigameNaturally(page);
        await sim.awaitNotProcessing();
      } else {
        await sim.playBattle();
        await sim.closeBattleModal(5000).catch(() => {});
      }
      console.debug(`[E2E-TEST] Combate ${enc.num} finalizado con éxito.`);
    }

    console.debug('[E2E-TEST] ¡Bucle de 10 combates secuenciales completado con éxito absoluto!');
  });
});
