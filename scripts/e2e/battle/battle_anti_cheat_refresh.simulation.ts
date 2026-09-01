/**
 * Battle Anti-Cheat Page Refresh (F5) Simulation.
 * Tests multiple scenarios after completing 2 sequential battles where the player attempts
 * to cheat by refreshing (F5) to reroll encounters or evade outcomes.
 *
 * Requirements:
 * 1. Standard wild battles in combat MUST be faithfully restored (same Pokemon, UID, HP, turn).
 * 2. Trainer encounters in combat MUST be faithfully restored (same Trainer, team, turn).
 * 3. Fishing minigames MUST NOT be restored on F5; they return to search loop to prevent retries.
 * 4. Archaeology minigames MUST NOT be restored on F5; they return to search loop to prevent retries.
 */
import { test, expect, type Page } from '@playwright/test';
import { BaseBattleSimulation } from '../base_battle_simulation.ts';
import {
  waitForStoreReady,
  confirmAndStartBattle,
  waitForWaitInput,
  clickResilient,
  MAX_PER_ACTION_TIMEOUT_MS,
  type WindowWithResolver,
  type CertifiedTestBatch
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

class AntiCheatRefreshSimWrapper extends BaseBattleSimulation {
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
          id: 'rayquaza',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['flamethrower', 'extremespeed', 'outrage', 'hyperbeam']
        });
        const rayquaza2 = pokemonDebugService.generate({
          id: 'rayquaza',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['flamethrower', 'extremespeed', 'outrage', 'hyperbeam']
        });
        const rayquaza3 = pokemonDebugService.generate({
          id: 'rayquaza',
          level: opts.SUPER_RAYQUAZA_LEVEL,
          moves: ['flamethrower', 'extremespeed', 'outrage', 'hyperbeam']
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

  public override async navigateToRoute1(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useUIStore } = await import('../../../src/stores/ui.ts');
      useUIStore().activeTab = 'map';
    });
    const mapCard = this.page.locator('#map-card-route1');
    await mapCard.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(mapCard, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  }

  public async forceHealAll(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useShopStore } = await import('../../../src/stores/inventory/shop.ts');
      useShopStore().healAllPokemon(0);
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

  public override async playBattle(
    finalState?: CertifiedTestBatch['finalState']
  ): Promise<void> {
    await super.playBattle(finalState);
    try {
      await this.page.waitForFunction(() => {
        const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        if (!store || store.isProcessing) return false;
        const fsmState = store.currentFsmState;
        const fsmSubState = store.currentSubState;
        return fsmState === 'SEARCH_PHASE' ||
               (fsmState === 'INITIALIZING' && fsmSubState === 'MINIGAME_CHECK') ||
               fsmState === 'EXIT_BATTLE';
      }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } catch (err: unknown) {
      const debugInfo = await this.page.evaluate(() => {
        const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
        return {
          fsmState: store?.currentFsmState,
          fsmSubState: store?.currentSubState,
          isProcessing: store?.isProcessing,
          over: store?.state?.over,
          stateNull: !store?.state,
        };
      });
      console.error('[E2E-DEBUG] playBattle waitForFunction failed. State:', JSON.stringify(debugInfo));
      throw err;
    }
  }

  public async startEncounterFromUi(type: SearchEncounterType): Promise<void> {
    await this.page.waitForFunction((encounterType) => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      const isSearchConfirmation = fsmState === 'SEARCH_PHASE'
        && (fsmSubState === 'COMBAT_OR_FLEE' || fsmSubState === 'WAIT_FOR_SELECTION');
      const isBattleInput = fsmState === 'ACTIVE_BATTLE'
        && fsmSubState === 'WAIT_INPUT';
      const isExpectedMinigame = (encounterType === 'fishing' || encounterType === 'archaeology')
        && fsmState === 'INITIALIZING'
        && fsmSubState === 'MINIGAME_CHECK';
      return isSearchConfirmation || isBattleInput || isExpectedMinigame;
    }, type, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const startButton = this.page.locator('#start-encounter-btn').first();
    if (await startButton.isVisible()) await confirmAndStartBattle(this.page);
  }

  public async awaitMinigameCheck(type: SearchMinigameType): Promise<void> {
    const selector = type === 'fishing'
      ? '#fishing-modal, .fishing-modal, .fishing-container, .fishing-minigame-overlay, #fishing-minigame-modal, .rhythm-game-modal'
      : '#archaeology-modal, .archaeology-modal, .archaeology-container, .archaeology-minigame-overlay, #archaeology-minigame-modal, .fossil-game-modal';

    await Promise.race([
      this.page.locator(selector).first().waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS }),
      this.page.waitForFunction((minigameType) => {
        const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
        const store = resolver?.();
        if (!store) return false;
        const isExpectedMinigame = minigameType === 'fishing'
          ? (store.state?.minigame === 'fishing' || !!document.querySelector('#fishing-modal, .fishing-modal, .fishing-container, .fishing-minigame-overlay, #fishing-minigame-modal, .rhythm-game-modal'))
          : (store.state?.minigame === 'archaeology' || !!document.querySelector('#archaeology-modal, .archaeology-modal, .archaeology-container, .archaeology-minigame-overlay, #archaeology-minigame-modal, .fossil-game-modal'));
        return isExpectedMinigame;
      }, type, { timeout: MAX_PER_ACTION_TIMEOUT_MS })
    ]);
  }
}

test.describe('Battle Anti-Cheat Page Refresh (F5) Simulation', () => {
  test.describe.configure({ mode: 'serial' });

  test('should faithfully restore wild battle (same Pokemon, UID, HP, turn) after F5 in 3rd encounter', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new AntiCheatRefreshSimWrapper(page, 'AntiCheatWild');
    await sim.setup();
    await sim.setupRayquaza();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();

    // 1. Complete Battle 1 (Wild)
    console.debug('[E2E-TEST] --- Completando Combate 1 (Salvaje) ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('wild');
    await sim.playBattle();

    // 2. Complete Battle 2 (Wild, prepare Encounter 3 to be Wild)
    console.debug('[E2E-TEST] --- Completando Combate 2 (Salvaje) ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('wild');
    await sim.playBattle();

    // 3. Initiate Encounter 3 (Wild)
    console.debug('[E2E-TEST] --- Iniciando Encuentro 3 (Salvaje) para prueba de F5 Anti-Cheat ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await waitForWaitInput(page);

    // Capture pre-reload battle state
    const preReloadState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        enemyId: store.state?.enemy?.id,
        enemyUid: store.state?.enemy?.uid,
        enemyHp: store.state?.enemy?.hp,
        turnCount: store.state?.turnCount,
        locationId: store.state?.locationId,
      };
    });

    expect(preReloadState.enemyUid).toBeTruthy();
    expect(preReloadState.enemyId).toBeTruthy();

    // Save game before reload
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      useBattleStore().persistBattle();
      await useGameStore().saveGame();
    });

    // 4. Cheat attempt: Player refreshes (F5) during active battle
    console.debug('[E2E-TEST] --- Intentando F5 para reiniciar/cambiar combate salvaje ---');
    await page.reload();
    await waitForStoreReady(page);
    await sim.speedUpAnimations();
    await waitForWaitInput(page);

    // 5. Verify Anti-Cheat: EXACT same wild Pokemon and battle state was restored
    const postReloadState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        isActive: store.isBattleActive,
        enemyId: store.state?.enemy?.id,
        enemyUid: store.state?.enemy?.uid,
        enemyHp: store.state?.enemy?.hp,
        turnCount: store.state?.turnCount,
        locationId: store.state?.locationId,
        minigame: store.state?.minigame,
      };
    });

    expect(postReloadState.isActive).toBe(true);
    expect(postReloadState.enemyUid).toBe(preReloadState.enemyUid);
    expect(postReloadState.enemyId).toBe(preReloadState.enemyId);
    expect(postReloadState.enemyHp).toBe(preReloadState.enemyHp);
    expect(postReloadState.turnCount).toBe(preReloadState.turnCount);
    expect(postReloadState.minigame).toBeFalsy();

    // Finish battle cleanly
    console.debug('[E2E-TEST] --- Finalizando combate restaurado ---');
    await sim.playBattle();
    console.debug('[E2E-TEST] Combate 3 finalizado con éxito tras restauración F5.');
  });

  test('should faithfully restore trainer encounter (same trainer, team, UID) after F5 in 3rd encounter', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new AntiCheatRefreshSimWrapper(page, 'AntiCheatTrainer');
    await sim.setup();
    await sim.setupRayquaza();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();

    // 1. Complete Battle 1 (Wild)
    console.debug('[E2E-TEST] --- Completando Combate 1 ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('wild');
    await sim.playBattle();

    // 2. Complete Battle 2 (Wild, prepare Encounter 3 to be Trainer)
    console.debug('[E2E-TEST] --- Completando Combate 2 (preparando Entrenador para Combate 3) ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('trainer');
    await sim.playBattle();

    // 3. Initiate Encounter 3 (Trainer)
    console.debug('[E2E-TEST] --- Esperando generación de Entrenador para Encuentro 3 ---');
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return Boolean(store.state?.isTrainer === true
        && fsmState === 'SEARCH_PHASE'
        && fsmSubState === 'COMBAT_OR_FLEE');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS * 2 });

    console.debug('[E2E-TEST] --- Iniciando Encuentro 3 (Entrenador) para prueba de F5 Anti-Cheat ---');
    await sim.forceHealAll();
    await confirmAndStartBattle(page);
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return Boolean(store.state?.isTrainer === true
        && store.state?.over === false
        && fsmState === 'ACTIVE_BATTLE'
        && fsmSubState === 'WAIT_INPUT');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS * 2 });

    // Capture pre-reload trainer battle state
    const preReloadState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        isTrainer: store.state?.isTrainer,
        trainerName: store.state?.trainerName,
        enemyUid: store.state?.enemy?.uid,
        enemyTeamLength: store.state?.enemyTeam?.length,
        turnCount: store.state?.turnCount,
      };
    });

    expect(preReloadState.isTrainer).toBe(true);
    expect(preReloadState.enemyUid).toBeTruthy();

    // Save game before reload
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      useBattleStore().persistBattle();
      await useGameStore().saveGame();
    });

    // 4. Cheat attempt: Player refreshes (F5) during trainer battle
    console.debug('[E2E-TEST] --- Intentando F5 para evadir o reiniciar combate con entrenador ---');
    await page.reload();
    await waitForStoreReady(page);
    await sim.speedUpAnimations();
    await waitForWaitInput(page);

    // 5. Verify Anti-Cheat: EXACT same trainer and enemy Pokemon restored
    const postReloadState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        isActive: store.isBattleActive,
        isTrainer: store.state?.isTrainer,
        trainerName: store.state?.trainerName,
        enemyUid: store.state?.enemy?.uid,
        enemyTeamLength: store.state?.enemyTeam?.length,
        turnCount: store.state?.turnCount,
      };
    });

    expect(postReloadState.isActive).toBe(true);
    expect(postReloadState.isTrainer).toBe(true);
    expect(postReloadState.trainerName).toBe(preReloadState.trainerName);
    expect(postReloadState.enemyUid).toBe(preReloadState.enemyUid);
    expect(postReloadState.enemyTeamLength).toBe(preReloadState.enemyTeamLength);

    // Finish trainer battle
    console.debug('[E2E-TEST] --- Finalizando combate de entrenador restaurado ---');
    await sim.playBattle();
    console.debug('[E2E-TEST] Combate con entrenador finalizado con éxito tras restauración F5.');
  });

  test('should discard fishing minigame and return to search loop upon F5 without persisting minigame', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new AntiCheatRefreshSimWrapper(page, 'AntiCheatFishing');
    await sim.setup();
    await sim.setupRayquaza();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();

    // 1. Complete Battle 1
    console.debug('[E2E-TEST] --- Completando Combate 1 ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('wild');
    await sim.playBattle();

    // 2. Complete Battle 2 (prepare Encounter 3 to be 'fishing')
    console.debug('[E2E-TEST] --- Completando Combate 2 (preparando Pesca para Encuentro 3) ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('fishing');
    await sim.playBattle();

    // 3. Initiate Encounter 3 (Fishing Minigame opens immediately)
    console.debug('[E2E-TEST] --- Esperando Minijuego de Pesca para prueba de F5 Anti-Cheat ---');
    await sim.forceHealAll();
    await sim.awaitMinigameCheck('fishing');

    // Verify minigame is currently active
    const minigameActive = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.minigame;
    });
    expect(minigameActive).toBe('fishing');

    // Save game before reload
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      useBattleStore().persistBattle();
      await useGameStore().saveGame();
    });

    // 4. Cheat attempt: Player refreshes (F5) during fishing minigame to retry or exploit
    console.debug('[E2E-TEST] --- Intentando F5 durante minijuego de pesca ---');
    await page.reload();
    await waitForStoreReady(page);
    await sim.speedUpAnimations();

    // 5. Verify Anti-Cheat: Minigame was NOT persisted and player is cleanly on the map
    const postReloadActiveBattle = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      return {
        hasActiveBattle: !!useGameStore().state.activeBattle,
        isFishingModalOpen: useModalStore().isOpen('Fishing'),
      };
    });

    expect(postReloadActiveBattle.hasActiveBattle).toBe(false);
    expect(postReloadActiveBattle.isFishingModalOpen).toBe(false);

    // Player can return to Route 1 and resume searching normally
    await sim.clearForcedEncounterType();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();
    await sim.startEncounterFromUi('wild');
    await sim.playBattle();
    console.debug('[E2E-TEST] Minijuego de pesca ignorado correctamente por Anti-Cheat y búsqueda continuada.');
  });

  test('should discard archaeology minigame and return to search loop upon F5 without persisting minigame', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new AntiCheatRefreshSimWrapper(page, 'AntiCheatArchaeology');
    await sim.setup();
    await sim.setupRayquaza();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();

    // 1. Complete Battle 1
    console.debug('[E2E-TEST] --- Completando Combate 1 ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('wild');
    await sim.playBattle();

    // 2. Complete Battle 2 (prepare Encounter 3 to be 'archaeology')
    console.debug('[E2E-TEST] --- Completando Combate 2 (preparando Arqueología para Encuentro 3) ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('archaeology');
    await sim.playBattle();

    // 3. Initiate Encounter 3 (Archaeology Minigame opens immediately)
    console.debug('[E2E-TEST] --- Esperando Minijuego de Arqueología para prueba de F5 Anti-Cheat ---');
    await sim.forceHealAll();
    await sim.awaitMinigameCheck('archaeology');

    // Verify minigame is currently active
    const minigameActive = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      return useBattleStore().state?.minigame;
    });
    expect(minigameActive).toBe('archaeology');

    // Save game before reload
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      useBattleStore().persistBattle();
      await useGameStore().saveGame();
    });

    // 4. Cheat attempt: Player refreshes (F5) during archaeology minigame
    console.debug('[E2E-TEST] --- Intentando F5 durante minijuego de arqueología ---');
    await page.reload();
    await waitForStoreReady(page);
    await sim.speedUpAnimations();

    // 5. Verify Anti-Cheat: Minigame was NOT persisted and player is cleanly on the map
    const postReloadActiveBattle = await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useModalStore } = await import('../../../src/stores/modals.ts');
      return {
        hasActiveBattle: !!useGameStore().state.activeBattle,
        isArchaeologyModalOpen: useModalStore().isOpen('Archaeology'),
      };
    });

    expect(postReloadActiveBattle.hasActiveBattle).toBe(false);
    expect(postReloadActiveBattle.isArchaeologyModalOpen).toBe(false);

    // Player can return to Route 1 and resume searching normally
    await sim.clearForcedEncounterType();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();
    await sim.startEncounterFromUi('wild');
    await sim.playBattle();
    console.debug('[E2E-TEST] Minijuego de arqueología ignorado correctamente por Anti-Cheat y búsqueda continuada.');
  });

  test('should faithfully restore rival encounter (same rival, team, UID) after F5 in 3rd encounter', async ({ page }) => {
    test.setTimeout(SEARCH_LOOP_SUITE_TIMEOUT_MS);

    const sim = new AntiCheatRefreshSimWrapper(page, 'AntiCheatRival');
    await sim.setup();
    await sim.setupRayquaza();
    await sim.forceEncounterType('wild');
    await sim.navigateToRoute1();

    // 1. Complete Battle 1 (Wild)
    console.debug('[E2E-TEST] --- Completando Combate 1 ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('wild');
    await sim.playBattle();

    // 2. Complete Battle 2 (Wild, prepare Encounter 3 to be Rival)
    console.debug('[E2E-TEST] --- Completando Combate 2 (preparando Rival para Combate 3) ---');
    await sim.forceHealAll();
    await sim.startEncounterFromUi('wild');
    await sim.forceEncounterType('rival');
    await sim.playBattle();

    // 3. Initiate Encounter 3 (Rival)
    console.debug('[E2E-TEST] --- Esperando generación de Rival para Encuentro 3 ---');
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return Boolean(store.state?.isTrainer === true
        && fsmState === 'SEARCH_PHASE'
        && fsmSubState === 'COMBAT_OR_FLEE');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS * 2 });

    console.debug('[E2E-TEST] --- Iniciando Encuentro 3 (Rival) para prueba de F5 Anti-Cheat ---');
    await sim.forceHealAll();
    await confirmAndStartBattle(page);
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      if (!store || store.isProcessing) return false;
      const fsmState = store.currentFsmState;
      const fsmSubState = store.currentSubState;
      return Boolean(store.state?.isTrainer === true
        && store.state?.over === false
        && fsmState === 'ACTIVE_BATTLE'
        && fsmSubState === 'WAIT_INPUT');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS * 2 });

    // Capture pre-reload rival battle state
    const preReloadState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        isTrainer: store.state?.isTrainer,
        trainerName: store.state?.trainerName,
        enemyUid: store.state?.enemy?.uid,
        enemyTeamLength: store.state?.enemyTeam?.length,
        turnCount: store.state?.turnCount,
      };
    });

    expect(preReloadState.enemyUid).toBeTruthy();

    // Save game before reload
    await page.evaluate(async () => {
      const { useGameStore } = await import('../../../src/stores/game.ts');
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      useBattleStore().persistBattle();
      await useGameStore().saveGame();
    });

    // 4. Cheat attempt: Player refreshes (F5) during rival battle
    console.debug('[E2E-TEST] --- Intentando F5 para evadir o reiniciar combate con Rival ---');
    await page.reload();
    await waitForStoreReady(page);
    await sim.speedUpAnimations();
    await waitForWaitInput(page);

    // 5. Verify Anti-Cheat: EXACT same rival and enemy Pokemon restored
    const postReloadState = await page.evaluate(async () => {
      const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      return {
        isActive: store.isBattleActive,
        isTrainer: store.state?.isTrainer,
        trainerName: store.state?.trainerName,
        enemyUid: store.state?.enemy?.uid,
        enemyTeamLength: store.state?.enemyTeam?.length,
        turnCount: store.state?.turnCount,
      };
    });

    expect(postReloadState.isActive).toBe(true);
    expect(postReloadState.enemyUid).toBe(preReloadState.enemyUid);
    expect(postReloadState.enemyTeamLength).toBe(preReloadState.enemyTeamLength);

    // Finish rival battle
    console.debug('[E2E-TEST] --- Finalizando combate con Rival restaurado ---');
    await sim.playBattle();
    console.debug('[E2E-TEST] Combate con Rival finalizado con éxito tras restauración F5.');
  });
});
