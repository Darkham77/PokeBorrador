// fallow-ignore-file security-sink
import type { Page } from '@playwright/test';
import { BaseE2ESimulation } from './base_simulation.ts';
import {
  MAX_PER_ACTION_TIMEOUT_MS,
  SIMULATION_GSAP_TIME_SCALE,
  DEFAULT_SEED_VAL,
  PRIME_MODULO_BASE,
  SEED_SCALE_MULTIPLIER,
  MAX_IV_VAL,
  DEBUG_ITEM_MAX_QUANTITY
} from './simulation_config.ts';
import { armBattleFlowCompletion, armBattleReadyForInput, awaitBattleFlowCompletion, awaitBattleReadyForInput, confirmAndStartBattle, executeAutoBattle, executeNativeAutoBattle, clickResilient, type CertifiedTestBatch, type WindowWithResolver } from './e2e_helpers.ts';
import type { BattleReadyForInputDetail } from '../../src/types/battle/battleEvents.ts';
import type { ItemId } from '../../src/data/inventory/items.ts';
import { createCertifiedBattleInventory } from './fuzzer/core/certifiedBattleInventory.ts';



/** Shape of a single Pokémon entry inside a fuzzer-certified batch team list. */
interface FuzzerTeamSet {
  uid?: string;
  species: string;
  level?: number;
  ability?: string;
  moves?: string[];
  item?: string;
  name?: string;
  nature?: string;
  gender?: string;
  shiny?: boolean;
  ivs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
  evs?: { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number };
}

/** Shape returned by getBattleStoreState — covers the active pokémon and bench. */
export interface BattleStoreSnapshot {
  activePlayerName: string;
  activePlayerUid: string;
  playerHp: number;
  playerMaxHp: number;
  playerStatus: string | null;
  playerTeam: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string | null }>;
}

export abstract class BaseBattleSimulation extends BaseE2ESimulation {
  private lastBattleReady: BattleReadyForInputDetail | null = null

  constructor(page: Page, username: string, logBuffer?: string[]) {
    super(page, username, logBuffer);
  }

  public override async setup(): Promise<void> {
    await super.setup();
    await this.speedUpAnimations(SIMULATION_GSAP_TIME_SCALE);
    await this.disableAutoMode();
  }

  /**
   * Acelera la escala de tiempo global de GSAP para que todas las animaciones de batalla ocurran n-veces más rápido.
   */
  public async speedUpAnimations(scale = SIMULATION_GSAP_TIME_SCALE): Promise<void> {
    await this.page.evaluate((s) => {
      const winWithGsap = window as Window & { gsap?: { globalTimeline: { timeScale: (n: number) => void } } };
      if (winWithGsap.gsap) {
        winWithGsap.gsap.globalTimeline.timeScale(s);
      }
    }, scale);
  }

  /**
   * Selects an item from the battle quick bag and uses it on a specific target Pokémon by its UID.
   * Inherited by all battle simulation wrappers to eliminate duplication.
   */
  public async useItemOnPokemon(itemId: ItemId, pokemonUid: string): Promise<BattleReadyForInputDetail> {
    await this.page.waitForFunction(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isProcessing?: boolean; isIntroAnimating?: boolean } } | undefined;
      const store = debug?.useBattleStore?.();
      return !store?.isProcessing && !store?.isIntroAnimating;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await armBattleReadyForInput(this.page);
    await this.page.evaluate(async ({ item, targetUid }) => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../src/stores/game.ts');
      const battleStore = useBattleStore();
      const gameStore = useGameStore();
      const team = gameStore.state.team || [];
      const index = team.findIndex(p => p && p.uid === targetUid);
      await battleStore.useItemInBattle(item, index !== -1 ? index : null);
    }, { item: itemId, targetUid: pokemonUid });
    this.lastBattleReady = await awaitBattleReadyForInput(this.page);
    return this.lastBattleReady;
  }

  /**
   * Opens the battle switch modal and switches to a specific target Pokémon by its UID.
   * Inherited by all battle simulation wrappers to eliminate duplication.
   */
  public async voluntarySwitch(pokemonUid: string): Promise<BattleReadyForInputDetail> {
    await this.page.waitForFunction(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isProcessing?: boolean; isIntroAnimating?: boolean } } | undefined;
      const store = debug?.useBattleStore?.();
      return !store?.isProcessing && !store?.isIntroAnimating;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    const isOver = await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isBattleActive?: boolean; over?: boolean; activeBattle?: { over?: boolean } } } | undefined;
      const store = debug?.useBattleStore?.();
      return !store?.isBattleActive || Boolean(store?.over) || Boolean(store?.activeBattle?.over);
    });
    if (isOver || this.lastBattleReady?.over) {
      return this.lastBattleReady!;
    }

    const isActive = await this.page.evaluate((targetUid) => {
      const debug = window.__VITE_DEBUG__ as {
        useBattleStore?: () => { player?: { uid?: string }; activeBattle?: { player?: { uid?: string } } };
      } | undefined;
      const store = debug?.useBattleStore?.();
      const currentActiveUid = store?.player?.uid || store?.activeBattle?.player?.uid;
      return Boolean(currentActiveUid) && currentActiveUid === targetUid;
    }, pokemonUid);
    if (isActive) {
      return this.lastBattleReady!;
    }

    await armBattleReadyForInput(this.page);
    await this.page.evaluate(async (targetUid) => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../src/stores/game.ts');
      const battleStore = useBattleStore();
      const gameStore = useGameStore();
      const team = gameStore.state.team || [];
      const index = team.findIndex(p => p && p.uid === targetUid);
      if (index !== -1) {
        await battleStore.executeSwitch(index);
      }
    }, pokemonUid);
    this.lastBattleReady = await awaitBattleReadyForInput(this.page);
    return this.lastBattleReady;
  }

  /**
   * Returns a snapshot of the battle store state including the active pokémon
   * and the full bench, so tests don’t need raw page.evaluate calls for assertions.
   */
  public async getBattleStoreState(): Promise<BattleStoreSnapshot | null> {
    return await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      if (!store.state) return null;
      return {
        activePlayerName: store.state.player?.name ?? '',
        activePlayerUid: store.state.player?.uid ?? '',
        playerHp: store.state.player?.hp ?? 0,
        playerMaxHp: store.state.player?.maxHp ?? 0,
        playerStatus: store.state.player?.status || null,
        playerTeam: (store.state.playerTeam ?? []).map((p: { uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }) => ({ // type-ok
          uid: p?.uid ?? '',
          name: p?.name ?? '',
          hp: p?.hp ?? 0,
          maxHp: p?.maxHp ?? 0,
          status: p?.status || null
        }))
      };
    });
  }

  public async enableE2EWorkerFlag(): Promise<void> {
    await this.page.evaluate(() => {
      window.__VITE_DEBUG__ = window.__VITE_DEBUG__ || {};
      window.__VITE_DEBUG__.isDeterministicSimulation = true;
    });
  }

  /**
   * Confirma la interfaz e inicia el combate visualmente
   */
  public async startBattle(): Promise<void> {
    await confirmAndStartBattle(this.page);
  }

  /**
   * Evaluates the game and battle stores in page context to locate the first living bench Pokémon UID.
   */
  public async getHealthyBenchUid(): Promise<string | undefined> {
    return await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as {
        useGameStore?: () => { state?: { team?: Array<{ uid?: string; hp?: number }> }; team?: Array<{ uid?: string; hp?: number }> };
        useBattleStore?: () => { player?: { uid?: string }; activeBattle?: { player?: { uid?: string } } };
      } | undefined;
      const gameStore = debug?.useGameStore?.();
      const battleStore = debug?.useBattleStore?.();
      const team = (gameStore?.team || gameStore?.state?.team || []) as Array<{ uid?: string; hp?: number }>;
      const activeUid = battleStore?.player?.uid || battleStore?.activeBattle?.player?.uid;
      const healthy = team.find((p) => p && typeof p.hp === 'number' && p.hp > 0 && Boolean(p.uid) && p.uid !== activeUid);
      return healthy?.uid;
    });
  }

  /**
   * Selects a move by index on the battle UI using resilient clicking.
   * Inherited by all battle simulations to eliminate duplication.
   */
  public async selectMove(moveIndex = 0): Promise<BattleReadyForInputDetail> {
    await this.page.waitForFunction(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isProcessing?: boolean; isIntroAnimating?: boolean } } | undefined;
      const store = debug?.useBattleStore?.();
      return !store?.isProcessing && !store?.isIntroAnimating;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

    await armBattleReadyForInput(this.page);
    await this.page.evaluate(async (idx) => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      await store.executeMove(idx);
    }, moveIndex);
    this.lastBattleReady = await awaitBattleReadyForInput(this.page);
    return this.lastBattleReady;
  }

  public async replayCertifiedBattle(batch: CertifiedTestBatch): Promise<void> {
    await this.speedUpAnimations(100);
    this.lastBattleReady = await awaitBattleReadyForInput(this.page);
    for (let stepIdx = 0; stepIdx < batch.history.length; stepIdx++) {
      const entry = batch.history[stepIdx];
      if (!entry) continue;
      const isOver = await this.page.evaluate(() => {
        const debug = window.__VITE_DEBUG__ as {
          useBattleStore?: () => {
            state?: { over?: boolean };
          };
        } | undefined;
        const store = debug?.useBattleStore?.();
        return Boolean(store?.state?.over);
      });
      if (isOver || this.lastBattleReady?.over) {
        console.log(`[E2E-REPLAY] Battle ended at step ${stepIdx + 1}/${batch.history.length}.`);
        break;
      }

      const gameAction = entry.p1GameAction;
      if (gameAction?.kind === 'bag-item') {
        const target = batch.playerTeam[gameAction.targetSlot - 1];
        if (!target?.uid) throw new Error(`[E2E-CERTIFIED-REPLAY] Missing bag target slot ${gameAction.targetSlot}.`);
        await this.useItemOnPokemon(gameAction.itemId, target.uid);
        continue;
      }
      const choice = entry.p1Choice.trim().toLowerCase();
      if (choice.startsWith('move ')) {
        const moveIndex = Number(choice.slice('move '.length)) - 1;
        if (!Number.isInteger(moveIndex) || moveIndex < 0) throw new Error(`[E2E-CERTIFIED-REPLAY] Invalid move ${entry.p1Choice}.`);
        await this.selectMove(moveIndex);
        continue;
      }
      if (choice.startsWith('switch ')) {
        const switchSlot = Number(choice.slice('switch '.length));
        if (!Number.isInteger(switchSlot) || switchSlot < 1) throw new Error(`[E2E-CERTIFIED-REPLAY] Invalid switch ${entry.p1Choice}.`);
        const target = this.lastBattleReady?.playerSwitchSlots?.find((slot) => slot.showdownSlot === switchSlot);
        const targetUid = target?.pokemonUid || batch.playerTeam[switchSlot - 1]?.uid;
        if (!targetUid) throw new Error(`[E2E-CERTIFIED-REPLAY] Could not resolve Pokémon UID for Showdown switch slot ${switchSlot}.`);
        await this.voluntarySwitch(targetUid);
        continue;
      }
      if (choice === '' || choice === 'pass') {
        if (this.lastBattleReady?.over) {
          console.log(`[E2E-REPLAY] Battle already over at step ${stepIdx}/${batch.history.length}. Skipping extra steps.`);
          break;
        }
        if (entry.p2Choice.startsWith('switch ') || entry.p2ForceSwitch) {
          this.lastBattleReady = await awaitBattleReadyForInput(this.page);
        }
        continue;
      }
      throw new Error(`[E2E-CERTIFIED-REPLAY] No visible P1 action for ${JSON.stringify(entry)}.`);
    }
  }

  /**
   * Configura e inyecta el escenario del fuzzer de manera idéntica al último commit de producción,
   * garantizando paridad matemática de semillas, LCG, reseteo de workers y mapeo de slots de equipos.
   */
  public async setupFuzzerScenario(b: CertifiedTestBatch): Promise<void> {
    await this.speedUpAnimations(100);
    const certifiedItemIds = b.history.flatMap((entry) => entry.p1GameAction?.kind === 'bag-item'
      ? [entry.p1GameAction.itemId]
      : []);
    const certifiedInventory = createCertifiedBattleInventory(certifiedItemIds, DEBUG_ITEM_MAX_QUANTITY);
    await this.page.evaluate(async ({ batchData, certifiedInitialInventory, constants }) => {
      // 1. Sobrescribir Math.random con una función determinista idéntica al worker y fuzzer
      let seedVal = 12345;
      Math.random = () => {
        const x = Math.sin(seedVal++) * 10000;
        return x - Math.floor(x);
      };

      // Inyectar contexto a través de la API debug global expuesta en window
      const debug = window.__VITE_DEBUG__;
      if (!debug || !debug.useBattleStore || !debug.useGameStore || !debug.useMapStore || !debug.pokemonDebugService) return;

      if (debug.testResetShowdownWorker) {
        debug.testResetShowdownWorker();
      }

      const battleStore = debug.useBattleStore();
      const gameStore = debug.useGameStore();

      battleStore.state = null;
      gameStore.state.team = [];
      gameStore.state.starterChosen = true;

      // Esperar reactivamente a que Vue procese el desmontado del componente de batalla previo usando ciclos de animación nativos
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Forzar el clima a despejado ('clear') en el MapStore para coincidir 1:1 con el fuzzer
      debug.useMapStore().setGlobalWeather('clear');

      // Generar equipo local para el jugador usando la API de depuración con el formato de nicknames correcto
      const localPlayerTeam = batchData.playerTeam.map((set: FuzzerTeamSet) => {
        return debug.pokemonDebugService!.generate({
          uid: set.uid,
          id: set.species.toLowerCase(), // string-ok
          level: set.level ?? 100,
          ability: set.ability,
          moves: set.moves,
          heldItem: set.item,
          nickname: set.name,
          nature: set.nature,
          ivs: { hp: constants.maxIvVal, atk: constants.maxIvVal, def: constants.maxIvVal, spa: constants.maxIvVal, spd: constants.maxIvVal, spe: constants.maxIvVal, ...set.ivs },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
          gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
          isShiny: set.shiny ?? false
        });
      });

      // Generar equipo local para el enemigo (NPC)
      const localEnemyTeam = batchData.enemyTeam.map((set: FuzzerTeamSet) => {
        return debug.pokemonDebugService!.generate({
          uid: set.uid,
          id: set.species.toLowerCase(), // string-ok
          level: set.level ?? 100,
          ability: set.ability,
          moves: set.moves,
          heldItem: set.item,
          nickname: set.name,
          nature: set.nature,
          ivs: { hp: constants.maxIvVal, atk: constants.maxIvVal, def: constants.maxIvVal, spa: constants.maxIvVal, spd: constants.maxIvVal, spe: constants.maxIvVal, ...set.ivs },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
          gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
          isShiny: set.shiny ?? false
        });
      });

      // Sobrescribir el equipo del jugador en el GameStore
      gameStore.state.team = localPlayerTeam;

      // Certified initialization injects only the recorded bag actions. All later
      // uses still flow through the visible official quick-bag controls.
      Reflect.set(gameStore.state, 'inventory', certifiedInitialInventory);

      // Inyectar el seed de Showdown y las decisiones del enemigo P2 para reproducibilidad exacta
      const w = window as WindowWithResolver;
      w.__VITE_DEBUG__ = w.__VITE_DEBUG__ ?? {};
      const debugObj = w.__VITE_DEBUG__;
      debugObj.battleSeed = (batchData.seed ?? undefined) as [number, number, number, number] | undefined;
      debugObj.isDeterministicSimulation = true;
      debugObj.isScriptedReplayMode = true;
      const enemyChoices: string[] = batchData.enemyChoices ?? []; // no-domain
      debugObj.enemyChoices = [...enemyChoices];
      debugObj.mockEnemyChoices = [...enemyChoices];
      
      const playerChoices: string[] = batchData.playerChoices ?? []; // no-domain
      debugObj.playerChoices = [...playerChoices];
      
      debugObj.p1ChoiceIdx = 0;
      debugObj.p2ChoiceIdx = 0;
      Reflect.set(debugObj, 'replayHistoryIdx', 0);
      Reflect.set(debugObj, 'certifiedReplayWorkerEnded', false);
      Reflect.deleteProperty(debugObj, 'certifiedReplayWorkerFinalState');
      Reflect.set(debugObj, 'certifiedReplaySubmissionTrace', []);
      debugObj.enemyChoiceIndex = 0;
      debugObj.history = batchData.history;

      const injectSeed = Reflect.get(debug, 'injectDebugSeed') as ((s: unknown) => void) | undefined;
      if (batchData.seed && injectSeed) {
        injectSeed(batchData.seed);
      }

      // Iniciar la batalla
      const firstEnemy = localEnemyTeam[0];
      if (!firstEnemy) throw new Error('No enemy generated');

      await battleStore.startBattle(firstEnemy, {
        isTrainer: true,
        enemyTeam: localEnemyTeam,
        trainerName: 'youngster',
        locationId: 'route1',
        wasSearchingOpt: false
      });

      // Asegurar que las elecciones y los índices se mantengan limpios tras la inicialización del worker
      debugObj.p1ChoiceIdx = 0;
      debugObj.p2ChoiceIdx = 0;
      Reflect.set(debugObj, 'replayHistoryIdx', 0);
      Reflect.set(debugObj, 'certifiedReplayWorkerEnded', false);
      Reflect.deleteProperty(debugObj, 'certifiedReplayWorkerFinalState');
      Reflect.set(debugObj, 'certifiedReplaySubmissionTrace', []);
      debugObj.enemyChoiceIndex = 0;
      debugObj.playerChoices = [...playerChoices];
      debugObj.enemyChoices = [...enemyChoices];
      debugObj.mockEnemyChoices = [...enemyChoices];

      // Speed up GSAP animations to 30x to run tests extremely fast
      const winWithGsap = w as Window & { gsap?: { globalTimeline: { timeScale: (n: number) => void } } };
      if (winWithGsap.gsap) {
        winWithGsap.gsap.globalTimeline.timeScale(constants.simulationGsapTimeScale);
      }

      const bState = battleStore.state as { p1SlotOrder?: string[]; p2SlotOrder?: string[] } | null;
      if (bState) {
        bState.p1SlotOrder = localPlayerTeam.map((p: unknown) => (p as { uid: string }).uid);
        bState.p2SlotOrder = localEnemyTeam.map((p: unknown) => (p as { uid: string }).uid);
      }
    }, {
      batchData: b,
      certifiedInitialInventory: certifiedInventory,
      constants: {
        defaultSeedVal: DEFAULT_SEED_VAL,
        primeModuloBase: PRIME_MODULO_BASE,
        seedScaleMultiplier: SEED_SCALE_MULTIPLIER,
        maxIvVal: MAX_IV_VAL,
        simulationGsapTimeScale: SIMULATION_GSAP_TIME_SCALE
      }
    });
  }

  /**
   * Ejecuta el combate automático determinista (genérico o fuzzer)
   */
  public async playBattle(
    finalState?: CertifiedTestBatch['finalState']
  ): Promise<void> {
    if (finalState) {
      await executeAutoBattle(this.page, finalState);
      return;
    }
    await executeNativeAutoBattle(this.page);
  }

  /**
   * Cierra el modal de finalización de batalla usando los selectores unificados
   */
  public async closeBattleModal(): Promise<void> {
    await armBattleFlowCompletion(this.page);
    const exitBattleButton = this.page.locator('#exit-battle-btn');
    await exitBattleButton.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(exitBattleButton);
  }

  /**
   * Desactiva los modos automáticos en el UIStore y limpia cualquier estado de búsqueda huérfano
   */
  public async disableAutoMode(): Promise<void> {
    await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useGameStore?: () => { state?: { autoBattle?: boolean; autoSearch?: boolean } } } | undefined;
      const gameStore = debug?.useGameStore?.();
      if (gameStore?.state) {
        gameStore.state.autoBattle = false;
        gameStore.state.autoSearch = false;
      }
    });
  }

  /**
   * Forzado limpio de huida de combate para simulaciones
   */
  public async forceFleeDebugger(): Promise<void> {
    const fleeButton = this.page.locator('#battle-arena-modal-close-btn:not([disabled])').first();
    await fleeButton.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(fleeButton);
    const confirmFleeButton = this.page.locator('#confirm-modal-btn').first();
    await confirmFleeButton.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await armBattleFlowCompletion(this.page);
    await clickResilient(confirmFleeButton);
    await this.awaitReturnToMap();
  }

  /**
   * Espera a retornar al mapa garantizando que el estado de batalla en el store se limpie
   */
  public async awaitReturnToMap(): Promise<void> {
    await awaitBattleFlowCompletion(this.page);
  }
}
