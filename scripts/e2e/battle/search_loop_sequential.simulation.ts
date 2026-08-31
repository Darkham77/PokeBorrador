/**
 * Sequential Search Loop 10 Battles Simulation.
 * Guarantees zero regressions across 10 uninterrupted sequential encounters in the search loop
 * including wild encounters, trainers, rivals, fishing minigames, and archaeology minigames.
 */
import { test, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  confirmAndStartBattle,
  executeNativeAutoBattle,
  playFishingMinigameNaturally,
  playArchaeologyMinigameNaturally,
  type WindowWithResolver
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
    page.on('console', msg => console.log(`[BROWSER-${username}] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGEERROR-${username}]:`, err));
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
    const card = this.page.locator('#map-card-route1').first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await card.click();
  }

  public async forceHealAll(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useShopStore } = await import('../../../src/stores/inventory/shop.ts');
      useShopStore().healAllPokemon(0);
    });
  }

  public override async playBattle(): Promise<void> {
    await executeNativeAutoBattle(this.page);
    await this.page.waitForFunction(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return (fsmState === 'SEARCH_PHASE' && fsmSubState === 'COMBAT_OR_FLEE') ||
             (fsmState === 'INITIALIZING' && fsmSubState === 'MINIGAME_CHECK') ||
             (fsmState === 'ACTIVE_BATTLE' && fsmSubState === 'WAIT_INPUT') ||
             (fsmState === 'FIRST_INTRO') ||
             (fsmState === 'REWARDS_PHASE') ||
             fsmState === 'EXIT_BATTLE';
    }, undefined, { timeout: 20000 });
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
  // SUITE 1: Modo Manual (autoBattle = false)
  test('should execute 10 sequential battles in the search loop with autoBattle = false (manual confirmation & full animations)', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new SearchLoopSimWrapper(page, 'SearchLoopManualRunner');
    await sim.setup();
    await sim.setupRayquaza();

    // Asegurar autoBattle = false
    await page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      useUIStore().setAutoBattle(false);
    });

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
      console.debug(`[E2E-MANUAL-TEST] --- Iniciando Combate ${enc.num}: ${enc.label} ---`);
      
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
      console.debug(`[E2E-MANUAL-TEST] Combate ${enc.num} finalizado con éxito.`);
    }

    console.debug(`[E2E-MANUAL-TEST] ¡Bucle de ${E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT} combates manuales completado con éxito absoluto!`);
  });

  // SUITE 2: Modo Automático (autoBattle = true)
  test('should execute consecutive battles automatically with autoBattle = true (auto start, active move panel, animations progression)', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new SearchLoopSimWrapper(page, 'SearchLoopAutoRunner');
    await sim.setup();
    await sim.setupRayquaza();

    // Activar auto-combatir en UIStore
    await page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      useUIStore().setAutoBattle(true);
    });

    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();

    const AUTO_BATTLES_COUNT = 3;
    for (let i = 1; i <= AUTO_BATTLES_COUNT; i++) {
      console.debug(`[E2E-AUTOBATTLE-TEST] --- Combate automático ${i} de ${AUTO_BATTLES_COUNT} ---`);
      await sim.forceHealAll();

      // Esperar a que el combate entre en WAIT_INPUT automáticamente
      await page.waitForFunction(() => {
        const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        if (!store) return false;
        return store.currentFsmState === 'ACTIVE_BATTLE' && store.currentSubState === 'WAIT_INPUT' && !store.isProcessing;
      }, undefined, { timeout: 20000 });

      // Validar que el panel de movimientos NO esté bloqueado en gris (.is-ui-locked)
      const moveLayout = page.locator('.battle-controls-layout').first();
      await moveLayout.waitFor({ state: 'visible', timeout: 5000 });
      const isLocked = await moveLayout.evaluate(el => el.classList.contains('is-ui-locked'));
      if (isLocked) {
        throw new Error(`[E2E-AUTOBATTLE-TEST] Move controls are locked in grayscale (.is-ui-locked) on battle ${i}`);
      }

      await sim.forceEncounterType('wild');
      await sim.playBattle();
      console.debug(`[E2E-AUTOBATTLE-TEST] Combate automático ${i} completado con éxito.`);
    }

    console.debug('[E2E-AUTOBATTLE-TEST] ¡Todos los combates automáticos se ejecutaron con animaciones y sin bloqueo de UI!');
  });
});

