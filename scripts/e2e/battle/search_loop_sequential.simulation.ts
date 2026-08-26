// fallow-ignore-file security-sink
/**
 * Sequential Search Loop 10 Battles Simulation.
 * Guarantees zero regressions across 10 uninterrupted sequential encounters in the search loop
 * including wild encounters, trainers, rivals, fishing minigames, and archaeology minigames.
 */
import { test, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  confirmAndStartBattle,
  playFishingMinigameNaturally,
  playArchaeologyMinigameNaturally,
  type WindowWithResolver,
  type CertifiedTestBatch
} from '../e2e_helpers.ts';
import {
  DEBUG_ITEM_MAX_QUANTITY,
  E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT,
  SUPER_RAYQUAZA_LEVEL,
  SUPER_RAYQUAZA_MAX_HP,
  SUPER_RAYQUAZA_STAT_VAL,
  SEARCH_LOOP_SUITE_TIMEOUT_MS
} from '../simulation_config.ts';

const _SEARCH_ENCOUNTER_TYPES = ['wild', 'trainer', 'rival', 'fishing', 'archaeology'] as const;
type SearchEncounterType = (typeof _SEARCH_ENCOUNTER_TYPES)[number];
type SearchMinigameType = Extract<SearchEncounterType, 'fishing' | 'archaeology'>;

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
        const rayquaza1 = pokemonDebugService.generate({
          id: 'mewtwo',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['psystrike', 'thunderbolt', 'icebeam', 'aurasphere'],
          heldItem: 'focussash'
        });
        const rayquaza2 = pokemonDebugService.generate({
          id: 'mewtwo',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['psystrike', 'thunderbolt', 'icebeam', 'aurasphere'],
          heldItem: 'focussash'
        });
        const rayquaza3 = pokemonDebugService.generate({
          id: 'mewtwo',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['psystrike', 'thunderbolt', 'icebeam', 'aurasphere'],
          heldItem: 'focussash'
        });

        useGameStore().state.team = [rayquaza1, rayquaza2, rayquaza3];
        useGameStore().state.starterChosen = true;
        useGameStore().state.playerClass = 'entrenador';
        useGameStore().state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] },
          officialRouteId: 'route1',
          officialRouteTimestamp: String(Temporal.Now.instant().epochMilliseconds)
        };

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
        delete w.__VITE_DEBUG__.forceEncounterType;
      },
      {
        SUPER_RAYQUAZA_LEVEL,
        SUPER_RAYQUAZA_MAX_HP,
        SUPER_RAYQUAZA_STAT_VAL,
        DEBUG_ITEM_MAX_QUANTITY
      }
    );
    await this.speedUpAnimations();
  }

  public async navigateToRoute1(): Promise<void> {
    await this.page.locator('#map-card-route1').click();
  }

  public async forceHealAll(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useShopStore } = await import('../../../src/stores/inventory/shop.ts');
      useShopStore().healAllPokemon(0);
    });
  }

  public override async playBattle(
    finalState?: CertifiedTestBatch['finalState']
  ): Promise<void> {
    await super.playBattle(finalState);
    const isRewards = await this.page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return store?.currentFsmState === 'REWARDS_PHASE';
    });
    if (isRewards) {
      await this.page.evaluate(async () => {
        const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
        await useBattleStore().completeBattleFlow('search');
      });
    }
    await this.page.waitForFunction(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return (fsmState === 'SEARCH_PHASE' && fsmSubState === 'COMBAT_OR_FLEE') ||
             (fsmState === 'INITIALIZING' && fsmSubState === 'MINIGAME_CHECK') ||
             fsmState === 'EXIT_BATTLE';
    }, undefined, { timeout: 15000 });
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

  public async startEncounterFromUi(type: SearchEncounterType): Promise<void> {
    await this.page.waitForFunction((encounterType) => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      const isSearchConfirmation = fsmState === 'SEARCH_PHASE'
        && fsmSubState === 'COMBAT_OR_FLEE';
      const isBattleInput = fsmState === 'ACTIVE_BATTLE'
        && fsmSubState === 'WAIT_INPUT';
      const isExpectedMinigame = (encounterType === 'fishing' || encounterType === 'archaeology')
        && fsmState === 'INITIALIZING'
        && fsmSubState === 'MINIGAME_CHECK';
      return isSearchConfirmation || isBattleInput || isExpectedMinigame;
    }, type, { timeout: 15000 });

    const startButton = this.page.locator('#start-encounter-btn').first();
    if (await startButton.isVisible()) await confirmAndStartBattle(this.page);
  }

  public async awaitMinigameCheck(type: SearchMinigameType): Promise<void> {
    await this.page.waitForFunction(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return (fsmState === 'INITIALIZING' && fsmSubState === 'MINIGAME_CHECK') ||
             (fsmState === 'SEARCH_PHASE' && fsmSubState === 'COMBAT_OR_FLEE');
    }, undefined, { timeout: 15000 });

    const selector = type === 'fishing'
      ? '#fishing-modal, #rhythm-container, .rhythm-container, .fishing-hint'
      : '#archaeology-modal, #archaeology-grid, .archaeology-grid';

    await this.page.locator(selector).first().waitFor({ state: 'attached', timeout: 15000 });
  }
}

test.describe('Sequential Search Loop Battles Simulation', () => {
  test('should execute 10 sequential battles in the search loop without initialization or UID errors', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new SearchLoopSimWrapper(page, 'SearchLoopRunner');
    await sim.setup();
    await sim.setupRayquaza();

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

    await sim.forceEncounterType(encountersToTest[0]!.type);
    await sim.navigateToRoute1();

    for (let i = 0; i < encountersToTest.length; i++) {
      const enc = encountersToTest[i]!;
      const nextEnc = encountersToTest[i + 1];
      console.debug(`[E2E-TEST] --- Iniciando Combate ${enc.num}: ${enc.label} ---`);
      
      await sim.forceHealAll();

      if (enc.type === 'archaeology') {
        await sim.startEncounterFromUi(enc.type);
        if (nextEnc) await sim.forceEncounterType(nextEnc.type);
        await playArchaeologyMinigameNaturally(page);
      } else if (enc.type === 'fishing') {
        await sim.startEncounterFromUi(enc.type);
        await playFishingMinigameNaturally(page);
        if (nextEnc) await sim.forceEncounterType(nextEnc.type);
        await sim.startEncounterFromUi('wild');
        await sim.playBattle();
      } else {
        await sim.startEncounterFromUi(enc.type);
        if (nextEnc) await sim.forceEncounterType(nextEnc.type);
        await sim.playBattle();
      }
      console.debug(`[E2E-TEST] Combate ${enc.num} finalizado con éxito.`);
    }

    console.debug(`[E2E-TEST] ¡Bucle de ${E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT} combates secuenciales completado con éxito absoluto!`);
  });
});
