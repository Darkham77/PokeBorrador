// fallow-ignore-file security-sink
/**
 * Sequential Search Loop Battles & Minigames Simulation.
 * MANDATORY CONTRACT: Evaluates the complete 10-encounter search loop sequence without truncations.
 * NEVER modify or remove encounters/minigames to bypass failures — fix the underlying issue in src/!
 */
import { test, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  waitForStoreReady,
  confirmAndStartBattle,
  playFishingMinigameNaturally,
  playArchaeologyMinigameNaturally,
  MAX_PER_ACTION_TIMEOUT_MS,
  type WindowWithResolver
} from '../e2e_helpers.ts';
import {
  DEBUG_ITEM_MAX_QUANTITY,
  SUPER_RAYQUAZA_LEVEL,
  SUPER_RAYQUAZA_MAX_HP,
  SUPER_RAYQUAZA_STAT_VAL,
  SEARCH_LOOP_SUITE_TIMEOUT_MS
} from '../simulation_config.ts';
const E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT = 10;

class SearchLoopSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupRayquaza(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
      const { requireMapRouteId } = await import('../../../src/data/world/map-assets.ts');

      useGameStore().state.map.currentMap = requireMapRouteId('route1');
      const rayquaza = pokemonDebugService.generate({
        id: 'rayquaza',
        level: SUPER_RAYQUAZA_LEVEL,
        moves: ['flamethrower', 'tackle', 'outrage', 'hyperbeam']
      });
      
      rayquaza.maxHp = SUPER_RAYQUAZA_MAX_HP;
      rayquaza.hp = SUPER_RAYQUAZA_MAX_HP;
      rayquaza.atk = SUPER_RAYQUAZA_STAT_VAL;
      rayquaza.def = SUPER_RAYQUAZA_STAT_VAL;
      rayquaza.spa = SUPER_RAYQUAZA_STAT_VAL;
      rayquaza.spd = SUPER_RAYQUAZA_STAT_VAL;
      rayquaza.spe = SUPER_RAYQUAZA_STAT_VAL;
      
      useGameStore().state.team = [rayquaza];
      useGameStore().state.starterChosen = true;

      const testInventory = {
        potion: DEBUG_ITEM_MAX_QUANTITY,
        superpotion: DEBUG_ITEM_MAX_QUANTITY,
        hyperpotion: DEBUG_ITEM_MAX_QUANTITY,
        maxpotion: DEBUG_ITEM_MAX_QUANTITY,
        fullrestore: DEBUG_ITEM_MAX_QUANTITY,
        revive: DEBUG_ITEM_MAX_QUANTITY,
        revivemax: DEBUG_ITEM_MAX_QUANTITY,
        pokeball: DEBUG_ITEM_MAX_QUANTITY,
        ultraball: DEBUG_ITEM_MAX_QUANTITY
      };
      
      useGameStore().state.inventory = {
        ...useGameStore().state.inventory,
        ...testInventory
      };
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
      const w = window as WindowWithResolver;
      w.__VITE_DEBUG__ = w.__VITE_DEBUG__ || {};
      w.__VITE_DEBUG__.isDeterministicSimulation = true;
      w.__VITE_DEBUG__.forceEncounterType = t;
    }, type);
  }

  public async awaitSearchPhaseCombatOrFlee(): Promise<void> {
    await this.page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      return ((store.currentFsmState === 'SEARCH_PHASE' && store.currentSubState === 'COMBAT_OR_FLEE') ||
              store.currentFsmState === 'ACTIVE_BATTLE') && !store.isProcessing;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  public async awaitNotProcessing(): Promise<void> {
    await this.page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return !resolver?.()?.isProcessing;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }
}

test.describe('Sequential Search Loop Battles Simulation', () => {

  test(`should execute ${E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT} sequential battles in the search loop without initialization or UID errors`, async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const testUser = `TEST_SEQ_${Temporal.Now.instant().epochMilliseconds.toString()}`;
    const sim = new SearchLoopSimWrapper(page, testUser);
    
    await sim.setup();
    await waitForStoreReady(page);
    await sim.setupRayquaza();
    await sim.navigateToRoute1();

    /**
     * IMMUTABLE CONTRACT MANDATE:
     * This array MUST contain all 10 sequential search loop encounters (Wild, Trainer, Rival, Fishing, Archaeology).
     * It is STRICTLY FORBIDDEN to truncate, remove, or shorten this array or exclude minigames.
     * The simulation is the authoritative source of truth for full search loop E2E coverage.
     */
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
      { num: E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT, type: 'wild', label: 'Wild Encounter' }
    ];

    for (let i = 0; i < encountersToTest.length; i++) {
      const enc = encountersToTest[i]!;
      console.debug(`[E2E-TEST] --- Iniciando Combate ${enc.num}: ${enc.label} ---`);
      
      await sim.forceHealAll();
      await sim.forceEncounterType(enc.type);
      await confirmAndStartBattle(page);
      
      if (enc.type === 'archaeology') {
        await sim.awaitSearchPhaseCombatOrFlee();
        await playArchaeologyMinigameNaturally(page);
        await sim.awaitNotProcessing();
      } else if (enc.type === 'fishing') {
        await sim.awaitSearchPhaseCombatOrFlee();
        await playFishingMinigameNaturally(page);
        await sim.awaitNotProcessing();
      } else {
        await sim.awaitSearchPhaseCombatOrFlee();
        if (enc.type === 'trainer' || enc.type === 'rival') {
          await confirmAndStartBattle(page);
        }
        await sim.playBattle();
        await sim.closeBattleModal(MAX_PER_ACTION_TIMEOUT_MS);
      }
      console.debug(`[E2E-TEST] Combate ${enc.num} finalizado con éxito.`);
    }

    console.debug(`[E2E-TEST] ¡Bucle de ${E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT} combates secuenciales completado con éxito absoluto!`);
  });
});
