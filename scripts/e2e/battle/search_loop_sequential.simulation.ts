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

const _SEARCH_ENCOUNTER_TYPES = ['wild', 'trainer', 'rival', 'fishing', 'archaeology'] as const;
type SearchEncounterType = (typeof _SEARCH_ENCOUNTER_TYPES)[number];
type SearchMinigameType = Extract<SearchEncounterType, 'fishing' | 'archaeology'>;

const E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT = 10;

class SearchLoopSimWrapper extends BaseBattleSimulation {
  constructor(page: Page, username: string) {
    super(page, username);
  }

  public async setupRayquaza(): Promise<void> {
    await this.page.evaluate(
      async (opts) => {
        const { useGameStore } = await import('../../../src/stores/game.ts');
        const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');
        const { requireMapRouteId } = await import('../../../src/data/world/map-assets.ts');

        useGameStore().state.map.currentMap = requireMapRouteId('route1');
        const rayquaza = pokemonDebugService.generate({
          id: 'rayquaza',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['flamethrower', 'tackle', 'outrage', 'hyperbeam']
        });
        
        rayquaza.maxHp = opts.SUPER_RAYQUAZA_MAX_HP;
        rayquaza.hp = opts.SUPER_RAYQUAZA_MAX_HP;
        rayquaza.atk = opts.SUPER_RAYQUAZA_STAT_VAL;
        rayquaza.def = opts.SUPER_RAYQUAZA_STAT_VAL;
        rayquaza.spa = opts.SUPER_RAYQUAZA_STAT_VAL;
        rayquaza.spd = opts.SUPER_RAYQUAZA_STAT_VAL;
        rayquaza.spe = opts.SUPER_RAYQUAZA_STAT_VAL;

        useGameStore().state.team = [rayquaza];
        useGameStore().state.starterChosen = true;

        const testInventory = {
          potion: opts.DEBUG_ITEM_MAX_QUANTITY,
          superpotion: opts.DEBUG_ITEM_MAX_QUANTITY,
          hyperpotion: opts.DEBUG_ITEM_MAX_QUANTITY,
          maxpotion: opts.DEBUG_ITEM_MAX_QUANTITY,
          fullrestore: opts.DEBUG_ITEM_MAX_QUANTITY,
          revive: opts.DEBUG_ITEM_MAX_QUANTITY,
          revivemax: opts.DEBUG_ITEM_MAX_QUANTITY,
          pokeball: opts.DEBUG_ITEM_MAX_QUANTITY,
          ultraball: opts.DEBUG_ITEM_MAX_QUANTITY
        };

        useGameStore().state.inventory = {
          ...useGameStore().state.inventory,
          ...testInventory
        };
        await useGameStore().saveGame();

        const w = window as WindowWithResolver;
        w.__VITE_DEBUG__ = w.__VITE_DEBUG__ || {};
        w.__VITE_DEBUG__.isDeterministicSimulation = true;

      },
      {
        SUPER_RAYQUAZA_LEVEL,
        SUPER_RAYQUAZA_MAX_HP,
        SUPER_RAYQUAZA_STAT_VAL,
        DEBUG_ITEM_MAX_QUANTITY
      }
    );
  }

  public async navigateToRoute1(): Promise<void> {
    await this.page.locator('#map-card-route1').click();
  }

  public async forceHealAll(): Promise<void> {
    await this.page.evaluate(() => {
      (window as WindowWithResolver).__VITE_DEBUG__?.healAll?.();
    });
  }

  public async forceEncounterType(type: SearchEncounterType): Promise<void> {
    await this.page.evaluate((t) => {
      const w = window as WindowWithResolver;
      w.__VITE_DEBUG__ = w.__VITE_DEBUG__ || {};
      w.__VITE_DEBUG__.isDeterministicSimulation = true;
      w.__VITE_DEBUG__.forceEncounterType = t;
    }, type);
  }

  public async clearForcedEncounterType(): Promise<void> {
    await this.page.evaluate(() => {
      delete (window as WindowWithResolver).__VITE_DEBUG__?.forceEncounterType;
    });
  }

  public async awaitSearchPhaseCombatOrFlee(): Promise<void> {
    try {
      await this.page.waitForFunction(() => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        if (!resolver) return false;
        const store = resolver();
        return store.currentFsmState === 'SEARCH_PHASE'
          && store.currentSubState === 'COMBAT_OR_FLEE'
          && !store.isProcessing;
      }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } catch (error) {
      const state = await this.page.evaluate(() => {
        const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        return {
          fsm: store?.currentFsmState,
          subState: store?.currentSubState,
          isProcessing: store?.isProcessing,
          over: store?.state?.over,
          hasPlayerRequest: Boolean(store?.state?.playerRequest),
          workerInitStage: (window as WindowWithResolver).__VITE_DEBUG__?.lastWorkerInitStage,
          workerInitError: (window as WindowWithResolver).__VITE_DEBUG__?.lastWorkerInitError
        };
      });
      throw new Error(`[E2E] Search encounter did not become playable: ${JSON.stringify(state)}`, { cause: error });
    }
  }

  public async startEncounterFromUi(type: SearchEncounterType): Promise<void> {
    await this.page.waitForFunction((encounterType) => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store || store.isProcessing) return false;
      const isSearchConfirmation = store.currentFsmState === 'SEARCH_PHASE'
        && store.currentSubState === 'COMBAT_OR_FLEE';
      const isBattleInput = store.currentFsmState === 'ACTIVE_BATTLE'
        && store.currentSubState === 'WAIT_INPUT';
      const isExpectedMinigame = (encounterType === 'fishing' || encounterType === 'archaeology')
        && store.currentFsmState === 'INITIALIZING'
        && store.currentSubState === 'MINIGAME_CHECK';
      return isSearchConfirmation || isBattleInput || isExpectedMinigame;
    }, type, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const startButton = this.page.locator('#start-encounter-btn').first();
    if (await startButton.isVisible()) await confirmAndStartBattle(this.page);
  }

  public async awaitMinigameCheck(type: SearchMinigameType): Promise<void> {
    const selector = type === 'fishing'
      ? '.fishing-minigame-overlay, #fishing-minigame-modal, .rhythm-game-modal'
      : '.archaeology-minigame-overlay, #archaeology-minigame-modal, .fossil-game-modal';
    
    await Promise.race([
      this.page.locator(selector).first().waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS }),
      this.page.waitForFunction((minigameType) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        if (!store) return false;
        const isExpectedMinigame = minigameType === 'fishing'
          ? (store.state?.isFishing === true || !!document.querySelector('.fishing-minigame-overlay, #fishing-minigame-modal, .rhythm-game-modal'))
          : (store.state?.isArchaeology === true || !!document.querySelector('.archaeology-minigame-overlay, #archaeology-minigame-modal, .fossil-game-modal'));
        return isExpectedMinigame;
      }, type, { timeout: MAX_PER_ACTION_TIMEOUT_MS })
    ]);
  }

}

test.describe('Sequential Search Loop Battles Simulation', () => {

  test(`should execute ${E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT} sequential battles in the search loop without initialization or UID errors`, async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new SearchLoopSimWrapper(page, 'SearchUser');

    await sim.setup();
    await waitForStoreReady(page);
    await sim.setupRayquaza();
    await sim.navigateToRoute1();
    await sim.startEncounterFromUi('wild');

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
    ] as const satisfies readonly { num: number; type: SearchEncounterType; label: string }[];

    for (let i = 0; i < encountersToTest.length; i++) {
      const enc = encountersToTest[i]!;
      console.debug(`[E2E-TEST] --- Iniciando Combate ${enc.num}: ${enc.label} ---`);
      
      await sim.forceHealAll();
      await sim.forceEncounterType(enc.type);
      await sim.startEncounterFromUi(enc.type);
      
      if (enc.type === 'archaeology') {
        await sim.awaitMinigameCheck(enc.type);
        await sim.clearForcedEncounterType();
        await playArchaeologyMinigameNaturally(page);
        await sim.awaitSearchPhaseCombatOrFlee();
      } else if (enc.type === 'fishing') {
        await sim.awaitMinigameCheck(enc.type);
        await sim.clearForcedEncounterType();
        await playFishingMinigameNaturally(page);
        await sim.startEncounterFromUi(enc.type);
        await sim.playBattle();
      } else {
        await sim.playBattle();
      }
      console.debug(`[E2E-TEST] Combate ${enc.num} finalizado con éxito.`);
    }

    console.debug(`[E2E-TEST] ¡Bucle de ${E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT} combates secuenciales completado con éxito absoluto!`);
  });
});
