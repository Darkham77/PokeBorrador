// fallow-ignore-file security-sink
import { type Page } from '@playwright/test';
import { BaseE2ESimulation } from './base_simulation.ts';
import { confirmAndStartBattle, executeAutoBattle, clickResilient, waitForWaitInput, type CertifiedTestBatch, type WindowWithResolver } from './e2e_helpers.ts';

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
  constructor(page: Page, username: string, logBuffer?: string[]) {
    super(page, username, logBuffer);
  }

  /**
   * Selects an item from the battle quick bag and uses it on a specific target Pokémon by its UID.
   * Inherited by all battle simulation wrappers to eliminate duplication.
   */
  public async useItemOnPokemon(itemId: string, pokemonUid: string): Promise<void> {
    await waitForWaitInput(this.page);

    const card = this.page.locator(`.quick-item-card[data-item-id="${itemId}"]:not(.is-disabled)`).first();
    await card.waitFor({ state: 'visible', timeout: 5000 });
    await clickResilient(card);

    const targetBtn = this.page.locator(`.selection-container [data-pokemon-uid="${pokemonUid}"]`).first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await clickResilient(targetBtn);
    await this.page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      return resolver?.()?.isProcessing || resolver?.()?.currentSubState === 'APPLY_MOVE';
    }, undefined, { timeout: 5000 }).catch(() => {});
    await this.page.locator('.modal-overlay').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
    await waitForWaitInput(this.page);
  }

  /**
   * Opens the battle switch modal and switches to a specific target Pokémon by its UID.
   * Inherited by all battle simulation wrappers to eliminate duplication.
   */
  public async voluntarySwitch(pokemonUid: string): Promise<void> {
    await waitForWaitInput(this.page);
    const activeUid = await this.page.evaluate(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      const storeObj = store as unknown as Record<string, Record<string, { uid?: string }>>;
      return store?.player?.uid || storeObj?.activeBattle?.player?.uid;
    });

    if (activeUid === pokemonUid) {
      return;
    }

    const cambiarBtn = this.page.locator('button.switch-btn:not([disabled])').first();
    await clickResilient(cambiarBtn);

    const targetBtn = this.page.locator(`.selection-container [data-pokemon-uid="${pokemonUid}"]`).first();
    await targetBtn.waitFor({ state: 'visible', timeout: 5000 });
    await clickResilient(targetBtn);
    await waitForWaitInput(this.page);
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
        playerStatus: store.state.player?.status ?? null,
        playerTeam: (store.state.playerTeam ?? []).map((p: { uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }) => ({
          uid: p?.uid ?? '',
          name: p?.name ?? '',
          hp: p?.hp ?? 0,
          maxHp: p?.maxHp ?? 0,
          status: p?.status ?? null
        }))
      };
    });
  }

  /**
   * Forces the enemy AI to use a specific choice on the next turn.
   * Accepts the same choice strings that Showdown uses: 'move tackle', 'switch 2', etc.
   */
  public async forceEnemyChoice(choice: string): Promise<void> {
    await this.page.evaluate((c) => {
      window.__VITE_DEBUG__ = window.__VITE_DEBUG__ ?? {};
      window.__VITE_DEBUG__.nextEnemyChoice = c;
    }, choice);
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
   * Selects a move by index on the battle UI using resilient clicking.
   * Inherited by all battle simulations to eliminate duplication.
   */
  public async selectMove(moveIndex = 0): Promise<void> {
    await waitForWaitInput(this.page);
    const moveBtn = this.page.locator('.move-card-vicio:not([disabled]):not(.is-disabled)').nth(moveIndex);
    await clickResilient(moveBtn);
    await waitForWaitInput(this.page);
  }

  /**
   * Configura e inyecta el escenario del fuzzer de manera idéntica al último commit de producción,
   * garantizando paridad matemática de semillas, LCG, reseteo de workers y mapeo de slots de equipos.
   */
  public async setupFuzzerScenario(b: CertifiedTestBatch): Promise<void> {
    await this.page.evaluate(async (batchData) => {
      // 1. Sobrescribir Math.random con una función determinista basada en semilla (LCG)
      let seed = 12345;
      Math.random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      interface ViteDebugApi {
        testResetShowdownWorker?: () => void;
        useBattleStore: () => {
          state: { p1SlotOrder?: string[]; p2SlotOrder?: string[] } | null;
          fsm: { currentSubState: string | null; currentState: string };
          startBattle: (enemy: unknown, opts: unknown) => Promise<void>;
        };
        useGameStore: () => {
          state: { team: unknown[]; inventory: Record<string, number> };
        };
        useMapStore: () => {
          setGlobalWeather: (weather: string) => void;
        };
        pokemonDebugService: {
          generate: (opts: Record<string, unknown>) => { uid: string };
        };
        injectDebugSeed?: (seed: [number, number, number, number]) => void;
      }

      // Inyectar contexto a través de la API debug global expuesta en window
      const debug = (window as unknown as { __VITE_DEBUG__: ViteDebugApi }).__VITE_DEBUG__;
      if (debug && debug.testResetShowdownWorker) {
        debug.testResetShowdownWorker();
      }

      const battleStore = debug.useBattleStore();
      const gameStore = debug.useGameStore();

      battleStore.state = null;
      battleStore.fsm.currentSubState = 'WAIT_INPUT';
      battleStore.fsm.currentState = 'INITIALIZING';
      gameStore.state.team = [];

      // Esperar reactivamente a que Vue procese el desmontado del componente de batalla previo usando ciclos de animación nativos
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Forzar el clima a despejado ('clear') en el MapStore para coincidir 1:1 con el fuzzer
      debug.useMapStore().setGlobalWeather('clear');

      // Generar equipo local para el jugador usando la API de depuración con el formato de nicknames correcto
      const localPlayerTeam = batchData.playerTeam.map((set: FuzzerTeamSet) => {
        return debug.pokemonDebugService.generate({
          uid: set.uid,
          id: set.species.toLowerCase(),
          level: set.level ?? 100,
          ability: set.ability,
          moves: set.moves,
          heldItem: set.item,
          nickname: set.name,
          nature: set.nature,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...set.ivs },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
          gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
          isShiny: set.shiny ?? false
        });
      });

      // Generar equipo local para el enemigo (NPC)
      const localEnemyTeam = batchData.enemyTeam.map((set: FuzzerTeamSet) => {
        return debug.pokemonDebugService.generate({
          uid: set.uid,
          id: set.species.toLowerCase(),
          level: set.level ?? 100,
          ability: set.ability,
          moves: set.moves,
          heldItem: set.item,
          nickname: set.name,
          nature: set.nature,
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31, ...set.ivs },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
          gender: set.gender === 'M' ? 'male' : set.gender === 'F' ? 'female' : 'genderless',
          isShiny: set.shiny ?? false
        });
      });

      // Sobrescribir el equipo del jugador en el GameStore
      gameStore.state.team = localPlayerTeam;

      // Inyectar un inventario completo de prueba para asegurar disponibilidad de objetos
      gameStore.state.inventory = {
        potion: 99,
        superpotion: 99,
        hyperpotion: 99,
        maxpotion: 99,
        revive: 99,
        revivemax: 99
      };

      // Inyectar el seed de Showdown y las decisiones del enemigo P2 para reproducibilidad exacta
      const w = window as WindowWithResolver;
      w.__VITE_DEBUG__ = w.__VITE_DEBUG__ ?? {};
      const debugObj = w.__VITE_DEBUG__;
      debugObj.battleSeed = (batchData.seed ?? undefined) as [number, number, number, number] | undefined;
      debugObj.isDeterministicSimulation = true;
      debugObj.isScriptedReplayMode = true;
      const enemyChoices: string[] = batchData.enemyChoices
        ?? (batchData.history as Array<{ p2Choice: string }> | undefined)?.map(h => h.p2Choice)
        ?? [];
      debugObj.enemyChoices = [...enemyChoices];
      debugObj.mockEnemyChoices = [...enemyChoices];
      
      const playerChoices: string[] = batchData.playerChoices
        ?? (batchData.history as Array<{ p1Choice: string }> | undefined)?.map(h => h.p1Choice)
        ?? [];
      debugObj.playerChoices = [...playerChoices];
      
      debugObj.p1ChoiceIdx = 0;
      debugObj.p2ChoiceIdx = 0;
      debugObj.enemyChoiceIndex = 0;
      debugObj.cheats = batchData.cheats ?? [];

      if (batchData.seed && debug.injectDebugSeed) {
        debug.injectDebugSeed(batchData.seed as [number, number, number, number]);
      }

      // Iniciar la batalla
      const firstEnemy = localEnemyTeam[0];
      if (!firstEnemy) throw new Error('No enemy generated');

      await battleStore.startBattle(firstEnemy, {
        isTrainer: true,
        enemyTeam: localEnemyTeam,
        trainerName: 'Simulador E2E',
        locationId: 'route1'
      });

      // Speed up GSAP animations to 30x to run tests extremely fast
      const winWithGsap = w as unknown as { gsap?: { globalTimeline: { timeScale: (n: number) => void } } };
      if (winWithGsap.gsap) {
        winWithGsap.gsap.globalTimeline.timeScale(30);
      }

      const bState = battleStore.state as { p1SlotOrder?: string[]; p2SlotOrder?: string[] } | null;
      if (bState) {
        bState.p1SlotOrder = localPlayerTeam.map((p: { uid: string }) => p.uid);
        bState.p2SlotOrder = localEnemyTeam.map((p: { uid: string }) => p.uid);
      }
    }, b);
  }

  /**
   * Ejecuta el combate automático determinista (genérico o fuzzer)
   */
  public async playBattle(
    batchIndex?: number,
    startingTurn = 0,
    playerChoices?: string[],
    cheats?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }>,
    finalState?: CertifiedTestBatch['finalState']
  ): Promise<void> {
    await executeAutoBattle(this.page, batchIndex as number, startingTurn, playerChoices, cheats, finalState);
  }

  /**
   * Cierra el modal de finalización de batalla usando los selectores unificados
   */
  public async closeBattleModal(timeout = 15000): Promise<void> {
    await this.clickElement('button.modal-close-btn, button.modal-close-btn-floating', timeout);
  }

  /**
   * Espera a retornar al mapa garantizando que el estado de batalla en el store se limpie
   */
  public async awaitReturnToMap(timeout = 10000): Promise<void> {
    await this.page.waitForFunction(() => {
      const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
      const store = resolver?.();
      return !store?.state;
    }, undefined, { timeout });
  }
}

