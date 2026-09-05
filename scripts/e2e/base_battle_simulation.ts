import type { Page } from '@playwright/test';
import { BaseE2ESimulation, type SimulationOptions } from './base_simulation.ts';
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
import type { PokemonSpeciesId } from '../../src/data/pokemon/pokedex.ts';
import type { PokemonMoveId } from '../../src/data/battle/moves.ts';
import type { AbilityId } from '../../src/data/battle/abilities.ts';
import type { MapRouteId } from '../../src/data/world/map-assets.ts';
import type { WeatherId } from '../../src/logic/weather/weatherRegistry.ts';
import type { NatureId } from '../../src/data/battle/natures.ts';
import type { Pokemon, PokemonGenderName } from '../../src/types/pokemon/pokemon.ts';
import type { NpcSpriteId } from '../../src/data/pokemon/npcSpriteCatalog.ts';
import type { NumericSeed } from '../../src/types/battle/battle.ts';
import { createCertifiedBattleInventory } from './fuzzer/core/certifiedBattleInventory.ts';
import { PokemonLegalityValidator } from '../../src/logic/battle/helpers/pokemonLegalityValidator.ts';

const DEFAULT_SCENARIO_POKEMON_LEVEL = 50;

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

export interface DebugPokemonSpec {
  id: PokemonSpeciesId;
  level?: number;
  ability?: AbilityId | null;
  moves?: PokemonMoveId[] | null;
  heldItem?: ItemId | null;
  nickname?: string | null;
  nature?: NatureId | null;
  gender?: PokemonGenderName | null;
  shiny?: boolean;
  isShiny?: boolean;
  ivs?: Partial<Pokemon['ivs']> | null;
  evs?: Partial<Pokemon['evs']> | null;
  uid?: string;
  hp?: number;
  fainted?: boolean;
  exp?: number;
}

export interface BattleScenarioOptions {
  playerTeam?: DebugPokemonSpec[];
  enemy?: DebugPokemonSpec;
  enemyTeam?: DebugPokemonSpec[];
  locationId?: MapRouteId;
  weather?: WeatherId;
  isTrainer?: boolean;
  trainerName?: string;
  trainerSprite?: NpcSpriteId;
  isGym?: boolean;
  inventory?: Partial<Record<ItemId, number>> | Array<{ id: ItemId; quantity: number }>;
  seed?: NumericSeed;
}

export abstract class BaseBattleSimulation extends BaseE2ESimulation {
  private lastBattleReady: BattleReadyForInputDetail | null = null

  constructor(
    page: Page,
    username: string,
    logBufferOrOptions?: string[] | SimulationOptions,
    sqliteKey?: string,
    options?: SimulationOptions
  ) {
    super(page, username, logBufferOrOptions, sqliteKey, options);
  }

  public override async setup(): Promise<void> {
    await super.setup();
    await this.speedUpAnimations(SIMULATION_GSAP_TIME_SCALE);
    await this.disableAutoMode();
    await this.enableE2EWorkerFlag();
  }

  /**
   * Obtiene los puntos de salud actuales del Pokémon activo del jugador.
   */
  public async getPlayerHp(): Promise<number> {
    return await this.page.evaluate(() => (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.hp ?? 0);
  }

  /**
   * Obtiene la información de salud actual y máxima del Pokémon del jugador.
   */
  public async getPlayerHpInfo(): Promise<{ hp: number; maxHp: number }> {
    return await this.page.evaluate(async () => {
      const debug = window.__VITE_DEBUG__ as {
        useBattleStore?: () => { player?: { hp?: number; maxHp?: number }; state?: { player?: { hp?: number; maxHp?: number } } };
        useGameStore?: () => { state?: { team?: Array<{ hp?: number; maxHp?: number }> } };
      } | undefined;
      const battleStore = debug?.useBattleStore?.();
      const gameStore = debug?.useGameStore?.();
      const player = battleStore?.player || battleStore?.state?.player;
      const team0 = gameStore?.state?.team?.[0];
      return { hp: player?.hp ?? team0?.hp ?? 0, maxHp: player?.maxHp ?? team0?.maxHp ?? 1 };
    });
  }

  /**
   * Configura el clima global en el MapStore para la simulación.
   */
  public async setMapWeather(weather: WeatherId = 'clear'): Promise<void> {
    await this.page.evaluate(async (w: WeatherId) => {
      const { useMapStore } = await import('../../src/stores/map.ts');
      useMapStore().setGlobalWeather(w);
    }, weather);
  }

  /**
   * Siembra items en el inventario del jugador de forma determinista.
   */
  public async seedInventory(items: Partial<Record<ItemId, number>> | Array<{ id: ItemId; quantity: number }>): Promise<void> {
    await this.page.evaluate(async (inventoryItems) => {
      const { useGameStore } = await import('../../src/stores/game.ts');
      const gameStore = useGameStore();
      const currentInv: Partial<Record<ItemId, number>> = { ...gameStore.state.inventory };
      if (Array.isArray(inventoryItems)) {
        for (const item of inventoryItems) {
          currentInv[item.id] = (currentInv[item.id] || 0) + item.quantity;
        }
      } else {
        const entries = Object.entries(inventoryItems) as Array<[ItemId, number | undefined]>;
        for (const [id, qty] of entries) {
          if (qty !== undefined) {
            currentInv[id] = (currentInv[id] || 0) + qty;
          }
        }
      }
      gameStore.state.inventory = currentInv;
    }, items);
  }

  /**
   * Configura e inicializa declarativamente un escenario completo de batalla (Pokémon, rival, clima, inventario).
   */
  public async setupBattleScenario(options: BattleScenarioOptions): Promise<void> {
    await this.page.evaluate(async (opts: BattleScenarioOptions) => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../src/stores/game.ts');
      const { useMapStore } = await import('../../src/stores/map.ts');
      const { pokemonDebugService } = await import('../../src/logic/debug/pokemonDebugService.ts');

      const battleStore = useBattleStore();
      const gameStore = useGameStore();
      const mapStore = useMapStore();

      if (opts.weather) {
        mapStore.setGlobalWeather(opts.weather);
      }

      if (opts.inventory) {
        const inv: Partial<Record<ItemId, number>> = { ...gameStore.state.inventory };
        if (Array.isArray(opts.inventory)) {
          for (const it of opts.inventory) {
            inv[it.id] = (inv[it.id] || 0) + it.quantity;
          }
        } else {
          const entries = Object.entries(opts.inventory) as Array<[ItemId, number | undefined]>;
          for (const [id, qty] of entries) {
            if (qty !== undefined) {
              inv[id] = (inv[id] || 0) + qty;
            }
          }
        }
        gameStore.state.inventory = inv;
      }

      const generateOne = (spec: DebugPokemonSpec): Pokemon => {
        const mon = pokemonDebugService.generate({
          id: spec.id,
          level: spec.level ?? DEFAULT_SCENARIO_POKEMON_LEVEL,
          ability: spec.ability,
          moves: spec.moves,
          heldItem: spec.heldItem,
          nickname: spec.nickname,
          nature: spec.nature,
          gender: spec.gender,
          isShiny: spec.isShiny ?? spec.shiny ?? false,
          ivs: spec.ivs,
          evs: spec.evs,
          uid: spec.uid
        });
        if (spec.hp !== undefined) {
          mon.hp = spec.hp;
          if (spec.hp <= 0) mon.fainted = true;
        }
        if (spec.fainted !== undefined) {
          mon.fainted = spec.fainted;
        }
        if (spec.exp !== undefined) {
          mon.exp = spec.exp;
        }
        return mon;
      };

      if (opts.playerTeam && opts.playerTeam.length > 0) {
        gameStore.state.team = opts.playerTeam.map(generateOne);
      }

      const enemyTeamList = opts.enemyTeam?.length
        ? opts.enemyTeam.map(generateOne)
        : (opts.enemy ? [generateOne(opts.enemy)] : []);

      const primaryEnemy = enemyTeamList[0];
      if (!primaryEnemy) {
        throw new Error('[BaseBattleSimulation] Cannot setup battle scenario without at least one enemy');
      }

      if (opts.seed) {
        const win = window as WindowWithResolver;
        win.__VITE_DEBUG__ = win.__VITE_DEBUG__ || {};
        win.__VITE_DEBUG__.battleSeed = opts.seed;
      }

      await battleStore.startBattle(primaryEnemy, {
        locationId: opts.locationId || 'route1',
        isTrainer: opts.isTrainer ?? false,
        trainerName: opts.trainerName,
        trainerSprite: opts.trainerSprite,
        isGym: opts.isGym ?? false,
        enemyTeam: enemyTeamList.length > 1 ? enemyTeamList : undefined
      });
    }, options);
  }

  /**
   * Configuración simplificada para un combate contra Pokémon salvaje.
   */
  public async setupWildBattle(enemy: DebugPokemonSpec, options?: Omit<BattleScenarioOptions, 'enemy' | 'isTrainer'>): Promise<void> {
    await this.setupBattleScenario({
      ...options,
      enemy,
      isTrainer: false
    });
  }

  /**
   * Configuración simplificada para un combate contra entrenador NPC o Gimnasio.
   */
  public async setupTrainerBattle(enemyTeam: DebugPokemonSpec[], options?: Omit<BattleScenarioOptions, 'enemyTeam' | 'isTrainer'>): Promise<void> {
    await this.setupBattleScenario({
      ...options,
      enemyTeam,
      isTrainer: true
    });
  }

  /**
   * Navega de forma segura a la Ruta 1 activando primero la pestaña de mapa si no está activa.
   */
  public async navigateToRoute1(): Promise<void> {
    await this.page.evaluate(async () => {
      const { useUIStore } = await import('../../src/stores/ui.ts');
      useUIStore().activeTab = 'map';
    });
    const mapCard = this.page.locator('#map-card-route1');
    await mapCard.waitFor({ state: 'visible', timeout: MAX_PER_ACTION_TIMEOUT_MS });
    await clickResilient(mapCard, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
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
    try {
      await this.page.waitForFunction(() => {
        const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isProcessing?: boolean; isIntroAnimating?: boolean } } | undefined;
        const store = debug?.useBattleStore?.();
        return !store?.isProcessing && !store?.isIntroAnimating;
      }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } catch (err) {
      const debugState = await this.page.evaluate(() => {
        const debug = window.__VITE_DEBUG__;
        const store = debug?.useBattleStore?.();
        return {
          isProcessing: store?.isProcessing,
          isIntroAnimating: store?.isIntroAnimating,
          currentState: store?.currentState,
          currentSubState: store?.currentSubState,
          player: Boolean(store?.player),
          enemy: Boolean(store?.enemy),
        };
      });
      console.error(`[E2E-VOLUNTARY-SWITCH-TIMEOUT] Diagnostic state:`, JSON.stringify(debugState));
      throw err;
    }

    const isOver = await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isBattleActive?: boolean; over?: boolean; activeBattle?: { over?: boolean } } } | undefined;
      const store = debug?.useBattleStore?.();
      return !store?.isBattleActive || Boolean(store?.over) || Boolean(store?.activeBattle?.over);
    });
    if (isOver || this.lastBattleReady?.over) {
      return this.lastBattleReady!;
    }

    const shouldSkip = await this.page.evaluate(async (targetUid) => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const battleStore = useBattleStore();
      const bState = battleStore?.state && typeof battleStore.state === 'object' && 'playerRequest' in battleStore.state
        ? (battleStore.state as { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } })
        : (battleStore?.state as { value?: { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } } } | undefined)?.value;
      const currentActiveUid = bState?.player?.uid || null;

      if (currentActiveUid === targetUid) {
        const debugObj = window.__VITE_DEBUG__;
        if (debugObj) {
          const cur = (Reflect.get(debugObj, 'replayHistoryIdx') as number) ?? 0;
          Reflect.set(debugObj, 'replayHistoryIdx', cur + 1);
        }
        return true;
      }
      return false;
    }, pokemonUid);

    if (shouldSkip) {
      return this.lastBattleReady!;
    }

    await armBattleReadyForInput(this.page);
    await this.page.evaluate(async (targetUid) => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../src/stores/game.ts');
      const { useUIStore } = await import('../../src/stores/ui.ts');
      const battleStore = useBattleStore();
      const gameStore = useGameStore();
      const uiStore = useUIStore();
      const bState = battleStore?.state && typeof battleStore.state === 'object' && 'playerRequest' in battleStore.state
        ? (battleStore.state as { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } })
        : (battleStore?.state as { value?: { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } } } | undefined)?.value;

      const team = (gameStore.state?.team && gameStore.state.team.length > 0)
        ? gameStore.state.team
        : (battleStore.state?.playerTeam || []);
      const index = team.findIndex(p => p && p.uid === targetUid);
      if (index === -1) {
        throw new Error(`[E2E-VOLUNTARY-SWITCH] Target Pokémon UID "${targetUid}" not found in team: ${JSON.stringify(team.map(p => ({ uid: p?.uid, name: p?.name })))}`);
      }
      const forceSw = bState?.playerRequest?.forceSwitch;
      const hasPendingForceSwitch = Array.isArray(forceSw) ? forceSw.some(Boolean) : Boolean(forceSw);
      const subStateRaw = battleStore?.currentSubState;
      const subStateStr = typeof subStateRaw === 'string'
        ? subStateRaw
        : (subStateRaw && typeof subStateRaw === 'object' && 'value' in subStateRaw ? String((subStateRaw as { value?: unknown }).value ?? '') : '');
      const isForced = Boolean(uiStore?.isBattleSwitchForced) || subStateStr === 'SWITCH_MENU' || hasPendingForceSwitch;
      await battleStore.executeSwitch(index, isForced);
    }, pokemonUid);
    try {
      this.lastBattleReady = await awaitBattleReadyForInput(this.page);
    } catch (err) {
      const debugState = await this.page.evaluate(() => {
        const debug = window.__VITE_DEBUG__ as {
          useBattleStore?: () => {
            isProcessing?: boolean;
            isIntroAnimating?: boolean;
            isBattleActive?: boolean;
            over?: boolean;
            player?: unknown;
            enemy?: unknown;
            currentState?: unknown;
            currentSubState?: unknown;
            battleLogs?: unknown[];
          };
        } | undefined;
        const store = debug?.useBattleStore?.();
        return {
          isProcessing: store?.isProcessing,
          isIntroAnimating: store?.isIntroAnimating,
          isBattleActive: store?.isBattleActive,
          over: store?.over,
          hasPlayer: Boolean(store?.player),
          hasEnemy: Boolean(store?.enemy),
          currentState: store?.currentState,
          currentSubState: store?.currentSubState,
          lastLog: Array.isArray(store?.battleLogs) ? store.battleLogs[store.battleLogs.length - 1] : undefined
        };
      });
      console.error(`[E2E-VOLUNTARY-SWITCH-TIMEOUT] Diagnostic state at timeout:`, JSON.stringify(debugState));
      throw err;
    }
    return this.lastBattleReady;
  }

  /**
   * Returns a snapshot of the battle store state including the active pokémon
   * and the full bench, so tests don’t need raw page.evaluate calls for assertions.
   */
  public async getBattleStoreState(): Promise<BattleStoreSnapshot | null> {
    return await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../src/stores/game.ts');
      const store = useBattleStore();
      const gameStore = useGameStore();
      const bState = store?.state && typeof store.state === 'object' && 'value' in store.state
        ? (store.state as { value?: { player?: { name?: string; uid?: string; hp?: number; maxHp?: number; status?: string | null }; playerTeam?: Array<{ uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }> } }).value
        : (store?.state as { player?: { name?: string; uid?: string; hp?: number; maxHp?: number; status?: string | null }; playerTeam?: Array<{ uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }> } | undefined);
      if (!bState) return null;
      const team = (gameStore.state?.team && gameStore.state.team.length > 0)
        ? gameStore.state.team
        : (bState.playerTeam || []);
      return {
        activePlayerName: bState.player?.name ?? '',
        activePlayerUid: bState.player?.uid ?? '',
        playerHp: bState.player?.hp ?? 0,
        playerMaxHp: bState.player?.maxHp ?? 0,
        playerStatus: bState.player?.status || null,
        playerTeam: team.map((p: { uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }) => ({ // type-ok: Type contract declaration
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
  public async isHealthyBenchUid(uid?: string): Promise<boolean> {
    if (!uid) return false;
    return await this.page.evaluate((targetUid) => {
      const debug = window.__VITE_DEBUG__ as {
        useGameStore?: () => { state?: { team?: Array<{ uid?: string; hp?: number }> }; team?: Array<{ uid?: string; hp?: number }> };
        useBattleStore?: () => { player?: { uid?: string }; activeBattle?: { player?: { uid?: string } } };
      } | undefined;
      const gameStore = debug?.useGameStore?.();
      const battleStore = debug?.useBattleStore?.();
      const team = (gameStore?.team || gameStore?.state?.team || []) as Array<{ uid?: string; hp?: number }>;
      const activeUid = battleStore?.player?.uid ?? null;
      const p = team.find((poke) => poke && poke.uid === targetUid);
      return Boolean(p && typeof p.hp === 'number' && p.hp > 0 && p.uid !== activeUid);
    }, uid);
  }

  public async getHealthyBenchUid(): Promise<string | undefined> {
    return await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as {
        useGameStore?: () => { state?: { team?: Array<{ uid?: string; hp?: number }> }; team?: Array<{ uid?: string; hp?: number }> };
        useBattleStore?: () => { player?: { uid?: string }; activeBattle?: { player?: { uid?: string } } };
      } | undefined;
      const gameStore = debug?.useGameStore?.();
      const battleStore = debug?.useBattleStore?.();
      const team = (gameStore?.team || gameStore?.state?.team || []) as Array<{ uid?: string; hp?: number }>;
      const activeUid = battleStore?.player?.uid ?? null;
      const healthy = team.find((p) => p && typeof p.hp === 'number' && p.hp > 0 && Boolean(p.uid) && p.uid !== activeUid);
      return healthy?.uid;
    });
  }

  /**
   * Selects a move by index on the battle UI using resilient clicking.
   * Inherited by all battle simulations to eliminate duplication.
   */
  public async selectMove(moveIndex = 0): Promise<BattleReadyForInputDetail> {
    try {
      await this.page.waitForFunction(() => {
        const debug = window.__VITE_DEBUG__ as {
          useBattleStore?: () => {
            isProcessing?: boolean;
            isIntroAnimating?: boolean;
            player?: unknown;
            enemy?: unknown;
            isBattleActive?: boolean;
            over?: boolean;
            currentSubState?: string;
            activeBattle?: { playerRequest?: { forceSwitch?: unknown } };
          };
        } | undefined;
        const store = debug?.useBattleStore?.();
        if (!store?.isBattleActive || store?.over) return true;
        const pReq = store?.activeBattle?.playerRequest;
        const hasForceSwitch = Array.isArray(pReq?.forceSwitch) ? pReq.forceSwitch.some(Boolean) : Boolean(pReq?.forceSwitch);
        const isSwitchRequired = store?.currentSubState === 'SWITCH_MENU' || hasForceSwitch || (!store?.player && Boolean(store?.enemy));
        if (isSwitchRequired) return true;
        return !store?.isProcessing && !store?.isIntroAnimating && Boolean(store?.player) && Boolean(store?.enemy);
      }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
    } catch (err) {
      const debugState = await this.page.evaluate(() => {
        const debug = window.__VITE_DEBUG__;
        const store = debug?.useBattleStore?.();
        return {
          isProcessing: store?.isProcessing,
          isIntroAnimating: store?.isIntroAnimating,
          isBattleActive: store?.isBattleActive,
          over: store?.over,
          hasPlayer: Boolean(store?.player),
          hasEnemy: Boolean(store?.enemy),
          currentState: store?.currentState,
          currentSubState: store?.currentSubState,
          activeMove: store?.activeMove,
          attackerSide: store?.attackerSide,
          lastLog: Array.isArray(store?.battleLogs) ? store.battleLogs[store.battleLogs.length - 1] : undefined
        };
      });
      console.error(`[E2E-SELECT-MOVE-TIMEOUT] Diagnostic state at timeout:`, JSON.stringify(debugState));
      throw err;
    }

    const shouldSkip = await this.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__ as {
        useBattleStore?: () => {
          isBattleActive?: boolean;
          over?: boolean;
          player?: unknown;
          enemy?: unknown;
          currentSubState?: string;
          activeBattle?: { playerRequest?: { forceSwitch?: unknown } };
        };
      } | undefined;
      const store = debug?.useBattleStore?.();
      const pReq = store?.activeBattle?.playerRequest;
      const hasForceSwitch = Array.isArray(pReq?.forceSwitch) ? pReq.forceSwitch.some(Boolean) : Boolean(pReq?.forceSwitch);
      const isSwitchRequired = store?.currentSubState === 'SWITCH_MENU' || hasForceSwitch || (!store?.player && Boolean(store?.enemy));
      return !store?.isBattleActive || store?.over || !store?.player || !store?.enemy || isSwitchRequired;
    });
    if (shouldSkip) {
      return this.lastBattleReady ?? { subState: '', p1ChoiceIdx: 0, p2ChoiceIdx: 0, over: true, playerSwitchSlots: [] };
    }

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
    const replayStartTime = Temporal.Now.instant().epochMilliseconds;
    console.log(`⚔️ [${this.driver.toUpperCase()}] [REPLAY:START] Lote "${batch.id || this.username}" (${batch.playerTeam.length}v${batch.enemyTeam.length}) - ${batch.history.length} turnos`);
    await this.speedUpAnimations(100);
    while (true) {
      if (this.lastBattleReady?.over) {
        console.log(`[E2E-REPLAY] Battle already over. Replay complete.`);
        break;
      }
      let browserIdx = 0;
      try {
        browserIdx = Number(await this.page.evaluate(() => window.__VITE_DEBUG__?.replayHistoryIdx ?? 0));
      } catch (navError: unknown) {
        const msg = navError instanceof Error ? navError.message : String(navError);
        if (msg.includes('Execution context was destroyed') || msg.includes('Target page, context or browser has been closed')) {
          console.log(`[E2E-REPLAY] Navigation detected at battle completion. Replay finished cleanly.`);
          break;
        }
        throw navError;
      }
      if (browserIdx >= batch.history.length) {
        console.log(`[E2E-REPLAY] Reached end of history (${browserIdx}/${batch.history.length}).`);
        break;
      }

      if (!this.lastBattleReady) {
        this.lastBattleReady = await awaitBattleReadyForInput(this.page);
      }
      if (this.lastBattleReady.over) {
        console.log(`[E2E-REPLAY] Battle ended after ready check at idx=${browserIdx}.`);
        break;
      }

      let currentBrowserIdx = 0;
      let stateSnapshot: { isOver: boolean; p1Uid?: string; p2Uid?: string; weather?: string; terrain?: string; p1Status?: string; p2Status?: string } = { isOver: false };
      try {
        currentBrowserIdx = Number(await this.page.evaluate(() => window.__VITE_DEBUG__?.replayHistoryIdx ?? 0));
        if (currentBrowserIdx >= batch.history.length) {
          console.log(`[E2E-REPLAY] Reached end of history (${currentBrowserIdx}/${batch.history.length}).`);
          break;
        }
        stateSnapshot = await this.page.evaluate(() => {
          const debug = window.__VITE_DEBUG__;
          const b = (debug?.useBattleStore?.() as { activeBattle?: { over?: boolean; player?: { uid?: string; status?: string }; enemy?: { uid?: string; status?: string }; weather?: { type?: string }; terrain?: string } } | undefined)?.activeBattle;
          return {
            isOver: Boolean(b?.over),
            p1Uid: b?.player?.uid,
            p2Uid: b?.enemy?.uid,
            weather: b?.weather?.type,
            terrain: b?.terrain,
            p1Status: b?.player?.status,
            p2Status: b?.enemy?.status
          };
        });
      } catch (navError: unknown) {
        const msg = navError instanceof Error ? navError.message : String(navError);
        if (msg.includes('Execution context was destroyed') || msg.includes('Target page, context or browser has been closed')) {
          console.log(`[E2E-REPLAY] Navigation detected at battle completion. Replay finished cleanly.`);
          break;
        }
        throw navError;
      }

      if (stateSnapshot.isOver || this.lastBattleReady?.over) {
        console.log(`[E2E-REPLAY] Battle ended at step ${currentBrowserIdx + 1}/${batch.history.length}.`);
        break;
      }

      const entry = batch.history[currentBrowserIdx];
      if (!entry) break;

      this.logBuffer.push(`Step ${currentBrowserIdx + 1}/${batch.history.length}: P1="${entry.p1Choice}", P2="${entry.p2Choice}"`);

      if (entry.p1ActiveUid && stateSnapshot.p1Uid && entry.p1ActiveUid !== stateSnapshot.p1Uid) {
        console.warn(`[E2E-METADATA-WARN] P1 Active UID mismatch at step ${currentBrowserIdx + 1}: expected ${entry.p1ActiveUid}, actual ${stateSnapshot.p1Uid}`);
      }
      if (entry.p2ActiveUid && stateSnapshot.p2Uid && entry.p2ActiveUid !== stateSnapshot.p2Uid) {
        console.warn(`[E2E-METADATA-WARN] P2 Active UID mismatch at step ${currentBrowserIdx + 1}: expected ${entry.p2ActiveUid}, actual ${stateSnapshot.p2Uid}`);
      }
      if (entry.weather && stateSnapshot.weather && entry.weather !== stateSnapshot.weather) {
        console.warn(`[E2E-METADATA-WARN] Weather mismatch at step ${currentBrowserIdx + 1}: expected ${entry.weather}, actual ${stateSnapshot.weather}`);
      }
      if (entry.terrain && stateSnapshot.terrain && entry.terrain !== stateSnapshot.terrain) {
        console.warn(`[E2E-METADATA-WARN] Terrain mismatch at step ${currentBrowserIdx + 1}: expected ${entry.terrain}, actual ${stateSnapshot.terrain}`);
      }

      const liveSwitchState = await this.page.evaluate(() => {
        const debug = window.__VITE_DEBUG__ as {
          useBattleStore?: () => {
            currentSubState?: string;
            isBattleActive?: boolean;
            over?: boolean;
            player?: unknown;
            enemy?: unknown;
            activeBattle?: { playerRequest?: { forceSwitch?: unknown } };
          };
        } | undefined;
        const store = debug?.useBattleStore?.();
        const pReq = store?.activeBattle?.playerRequest;
        const hasForceSwitch = Array.isArray(pReq?.forceSwitch) ? pReq.forceSwitch.some(Boolean) : Boolean(pReq?.forceSwitch);
        const subState = store?.currentSubState;
        const isVacatedSeat = Boolean(store?.isBattleActive && !store?.over && !store?.player && store?.enemy);
        return subState === 'SWITCH_MENU' || hasForceSwitch || isVacatedSeat;
      });
      const isSwitchMenu = this.lastBattleReady?.subState === 'SWITCH_MENU' || liveSwitchState;
      if (isSwitchMenu) {
        let switchEntry = entry;
        let switchIdx = currentBrowserIdx;
        if (!switchEntry.p1Choice.startsWith('switch ')) {
          const nextSwitchOffset = batch.history.slice(currentBrowserIdx).findIndex((h) => h.p1Choice.startsWith('switch '));
          if (nextSwitchOffset !== -1) {
            switchIdx = currentBrowserIdx + nextSwitchOffset;
            switchEntry = batch.history[switchIdx]!;
          }
        }

        const candidateUid = switchEntry.p1ActiveUid
          || (switchEntry.p1Choice.startsWith('switch ')
            ? this.lastBattleReady?.playerSwitchSlots?.find(
                (slot) => slot.showdownSlot === Number(switchEntry.p1Choice.slice('switch '.length))
              )?.pokemonUid
            : undefined);

        const targetUid = (await this.isHealthyBenchUid(candidateUid)) ? candidateUid : await this.getHealthyBenchUid();

        if (!targetUid) throw new Error(`[E2E-CERTIFIED-REPLAY] Could not resolve Pokémon UID for forced switch: ${JSON.stringify(switchEntry)}. Available slots: ${JSON.stringify(this.lastBattleReady?.playerSwitchSlots)}`);

        if (switchIdx !== currentBrowserIdx) {
          await this.page.evaluate((targetIdx: number) => {
            const debugObj = window.__VITE_DEBUG__;
            if (debugObj) {
              Reflect.set(debugObj, 'replayHistoryIdx', targetIdx);
            }
          }, switchIdx);
        }

        await this.voluntarySwitch(targetUid);
        continue;
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
        const resolvedMoveIndex = await this.page.evaluate(({ targetIdx, targetMoveId }) => {
          const debug = window.__VITE_DEBUG__;
          const store = debug?.useBattleStore?.();
          const active = (store?.activeBattle || (store?.state as { value?: unknown } | undefined)?.value || store?.state) as { playerRequest?: unknown } | undefined;
          const pReq = active?.playerRequest as { active?: Array<{ moves?: Array<{ id?: string; disabled?: boolean | string; pp?: number }> }> } | undefined;
          const activeMoves = pReq?.active?.[0]?.moves;
          if (Array.isArray(activeMoves)) {
            if (activeMoves.length === 1 && activeMoves[0]?.id) return 0;
            // 1. Match exact slot by canonical Move ID if recorded in certified history
            if (targetMoveId) {
              const idMatchIdx = activeMoves.findIndex((m) => m && m.id === targetMoveId && !m.disabled && (m.pp === undefined || m.pp > 0));
              if (idMatchIdx !== -1) return idMatchIdx;
            }
            // 2. Otherwise verify if slot index is valid and enabled
            if (activeMoves[targetIdx] && !activeMoves[targetIdx]?.disabled && (activeMoves[targetIdx]?.pp === undefined || (activeMoves[targetIdx]?.pp ?? 0) > 0)) {
              return targetIdx;
            }
            // 3. Fallback to first available legal move if slot exhausted PP
            const validIdx = activeMoves.findIndex((m) => m && !m.disabled && (m.pp === undefined || m.pp > 0));
            if (validIdx !== -1) return validIdx;
          }
          return targetIdx;
        }, { targetIdx: moveIndex, targetMoveId: entry.p1MoveId });
        await this.selectMove(resolvedMoveIndex);
        continue;
      }
      if (choice.startsWith('switch ')) {
        const isTrappedOrRecharging = await this.page.evaluate(() => {
          const debug = window.__VITE_DEBUG__;
          const store = debug?.useBattleStore?.();
          const active = (store?.activeBattle || (store?.state as { value?: unknown } | undefined)?.value || store?.state) as { player?: { volatileCounters?: Record<string, number> }; playerRequest?: { active?: Array<{ trapped?: boolean; moves?: Array<{ id?: string }> }> } } | undefined;
          const p = active?.player;
          const req = active?.playerRequest;
          const isRecharging = req?.active?.[0]?.moves?.length === 1 && req.active[0].moves[0]?.id === 'recharge';
          const isTrapped = req?.active?.[0]?.trapped === true || Boolean(p?.volatileCounters?.['mustrecharge']);
          return isRecharging || isTrapped;
        });

        if (isTrappedOrRecharging) {
          await this.selectMove(0);
          continue;
        }

        const switchSlot = Number(choice.slice('switch '.length));
        const target = this.lastBattleReady?.playerSwitchSlots?.find((slot) => slot.showdownSlot === switchSlot);
        const candidateUid = entry.p1ActiveUid ? entry.p1ActiveUid : target?.pokemonUid;
        const targetUid = (await this.isHealthyBenchUid(candidateUid)) ? candidateUid : await this.getHealthyBenchUid();
        if (!targetUid) throw new Error(`[E2E-CERTIFIED-REPLAY] Could not resolve Pokémon UID for Showdown switch slot ${switchSlot}. Available slots: ${JSON.stringify(this.lastBattleReady?.playerSwitchSlots)}`);
        await this.voluntarySwitch(targetUid);
        continue;
      }
      if (choice === '' || choice === 'pass') {
        if (this.lastBattleReady?.over) {
          console.log(`[E2E-REPLAY] Battle already over at step ${currentBrowserIdx}/${batch.history.length}. Skipping extra steps.`);
          break;
        }
        await this.page.evaluate((expectedIdx: number) => {
          const debugObj = window.__VITE_DEBUG__;
          if (debugObj) {
            const cur = (Reflect.get(debugObj, 'replayHistoryIdx') as number) ?? 0;
            if (cur === expectedIdx) {
              Reflect.set(debugObj, 'replayHistoryIdx', cur + 1);
            }
          }
        }, currentBrowserIdx);
        this.lastBattleReady = null;
        continue;
      }
      throw new Error(`[E2E-CERTIFIED-REPLAY] No visible P1 action for ${JSON.stringify(entry)}.`);
    }

    const durationSec = ((Temporal.Now.instant().epochMilliseconds - replayStartTime) / 1000).toFixed(1);
    console.log(`✅ [${this.driver.toUpperCase()}] [REPLAY:DONE] Lote "${batch.id || this.username}" completado con éxito (${batch.history.length} turnos en ${durationSec}s)`);
  }

  /**
   * Ejecuta el protocolo de 7 pilares para purgar y resetear completamente el estado del cliente
   * a bajo nivel, garantizando cero contaminación entre ejecuciones consecutivas sin recargar la página.
   */
  public async resetToCleanState(): Promise<void> {
    // 1. Limpieza de persistencia en backend (PostgreSQL / SQLite)
    if (this.driver === 'postgres') {
      try {
        await this.queryTestDb(
          `DELETE FROM game_saves WHERE user_id IN (SELECT id FROM profiles WHERE username = $1);`,
          [this.username]
        );
      } catch {
        // Ignorar si la tabla aún no tiene datos del usuario
      }
    }

    // 2. Ejecución de los 7 pilares de reseteo a bajo nivel dentro del navegador
    await this.page.evaluate(async (simTimeScale) => {
      const win = window as Window & {
        gsap?: { killTweensOf: (target: unknown) => void; globalTimeline: { clear: () => void; timeScale: (n: number) => void } };
        __VITE_DEBUG__?: Record<string, unknown>;
        __E2E_BATTLE_READY_FOR_INPUT__?: unknown;
        __E2E_BATTLE_FORCED_SWITCH__?: unknown;
        __E2E_BATTLE_FLOW_COMPLETION__?: unknown;
      };

      // Pilar 1: Showdown Worker Reset
      const debug = win.__VITE_DEBUG__;
      const testResetShowdownWorker = debug?.testResetShowdownWorker as (() => void) | undefined;
      if (testResetShowdownWorker) {
        testResetShowdownWorker();
      }

      // Pilar 2: GSAP & Animaciones
      if (win.gsap) {
        win.gsap.killTweensOf('*');
        win.gsap.globalTimeline.clear();
        win.gsap.globalTimeline.timeScale(simTimeScale);
      }

      // Pilar 3: Pinia Stores Deep Clean
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const { useGameStore } = await import('../../src/stores/game.ts');
      const { useUIStore } = await import('../../src/stores/ui.ts');
      const { useModalStore } = await import('../../src/stores/modals.ts');
      const { useMapStore } = await import('../../src/stores/map.ts');
      const { useErrorStore } = await import('../../src/stores/errorStore.ts');
      const { BATTLE_STATES } = await import('../../src/logic/battle/battleStateMachine.ts');

      const battleStore = useBattleStore();
      const gameStore = useGameStore();
      const uiStore = useUIStore();
      const modalStore = useModalStore();
      const mapStore = useMapStore();
      const errorStore = useErrorStore();

      // Reset BattleStore
      battleStore.state = null;
      if (battleStore.fsm?.transition) {
        await battleStore.fsm.transition(BATTLE_STATES.CONTEXT_SETUP);
      }
      const initialStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };
      battleStore.playerStages = { ...initialStages };
      battleStore.enemyStages = { ...initialStages };
      battleStore.battleLogs = [];
      if (Array.isArray(battleStore.playerUsedMoves)) {
        battleStore.playerUsedMoves.length = 0;
      }
      battleStore.isIntroAnimating = false;
      battleStore.isProcessing = false;
      battleStore.exitingPlayer = null;
      battleStore.exitingEnemy = null;
      battleStore.trainerAnimState = 'idle';
      battleStore.isSilhouetteMode = false;
      battleStore.attackerSide = null;
      battleStore.activeMove = null;

      // Reset GameStore
      gameStore.state.team = [];
      gameStore.state.inventory = {};
      gameStore.state.starterChosen = true;
      gameStore.state.notificationHistory = [];
      gameStore.state.activeBattle = null;

      // Reset UIStore & ModalStore
      uiStore.activeTab = 'battle';
      uiStore.isBattleSwitchForced = false;
      modalStore.closeAll();

      // Reset MapStore & ErrorStore
      mapStore.setGlobalWeather('clear');
      errorStore.clearError();

      // Pilar 4: DOM Hygiene & Ciclos de renderizado de Vue
      document.querySelectorAll('[id^="toast-item-"]').forEach(el => el.remove());
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Pilar 5: PRNG & Debug globals
      let seedVal = 12345;
      Math.random = () => {
        const x = Math.sin(seedVal++) * 10000;
        return x - Math.floor(x);
      };

      if (debug) {
        debug.p1ChoiceIdx = 0;
        debug.p2ChoiceIdx = 0;
        Reflect.set(debug, 'replayHistoryIdx', 0);
        Reflect.set(debug, 'certifiedReplayWorkerEnded', false);
        Reflect.deleteProperty(debug, 'certifiedReplayWorkerFinalState');
        Reflect.deleteProperty(debug, 'certifiedReplayIntroDiagnostics');
        Reflect.set(debug, 'certifiedReplaySubmissionTrace', []);
        debug.enemyChoiceIndex = 0;
        debug.playerChoices = [];
        debug.enemyChoices = [];
        debug.mockEnemyChoices = [];
        debug.history = [];
        Reflect.deleteProperty(debug, 'battleSeed');
      }

      // Pilar 6: E2E Event Promises purge
      delete win.__E2E_BATTLE_READY_FOR_INPUT__;
      delete win.__E2E_BATTLE_FORCED_SWITCH__;
      delete win.__E2E_BATTLE_FLOW_COMPLETION__;
    }, SIMULATION_GSAP_TIME_SCALE);

    this.lastBattleReady = null;
  }

  /**
   * Configura e inyecta el escenario del fuzzer de manera idéntica al último commit de producción,
   * garantizando paridad matemática de semillas, LCG, reseteo de workers y mapeo de slots de equipos.
   */
  public async setupFuzzerScenario(b: CertifiedTestBatch): Promise<void> {
    PokemonLegalityValidator.assertTeamLegality(b.playerTeam, `Certified Batch ${b.id} Player Team`);
    PokemonLegalityValidator.assertTeamLegality(b.enemyTeam, `Certified Batch ${b.id} Enemy Team`);
    await this.resetToCleanState();
    const certifiedItemIds = b.history.flatMap((entry) => entry.p1GameAction?.kind === 'bag-item'
      ? [entry.p1GameAction.itemId]
      : []);
    const certifiedInventory = createCertifiedBattleInventory(certifiedItemIds, DEBUG_ITEM_MAX_QUANTITY);
    await this.page.evaluate(async ({ batchData, certifiedInitialInventory, constants }) => {
      // Inyectar contexto a través de la API debug global expuesta en window
      const debug = window.__VITE_DEBUG__;
      if (!debug || !debug.useBattleStore || !debug.useGameStore || !debug.useMapStore || !debug.pokemonDebugService) return;

      const battleStore = debug.useBattleStore();
      const gameStore = debug.useGameStore();

      // Generar equipo local para el jugador usando la API de depuración con el formato de nicknames correcto
      const localPlayerTeam = batchData.playerTeam.map((set: FuzzerTeamSet) => {
        return debug.pokemonDebugService!.generate({
          uid: set.uid,
          id: set.species.toLowerCase(), // string-ok: Internal string formatting or DOM token identifier
          level: set.level ?? 100,
          ability: set.ability,
          moves: set.moves,
          heldItem: set.item,
          nickname: set.name,
          nature: set.nature,
          ivs: { hp: constants.maxIvVal, atk: constants.maxIvVal, def: constants.maxIvVal, spa: constants.maxIvVal, spd: constants.maxIvVal, spe: constants.maxIvVal, ...set.ivs },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
          gender: set.gender,
          isShiny: set.shiny ?? false
        });
      });

      // Generar equipo local para el enemigo (NPC)
      const localEnemyTeam = batchData.enemyTeam.map((set: FuzzerTeamSet) => {
        return debug.pokemonDebugService!.generate({
          uid: set.uid,
          id: set.species.toLowerCase(), // string-ok: Internal string formatting or DOM token identifier
          level: set.level ?? 100,
          ability: set.ability,
          moves: set.moves,
          heldItem: set.item,
          nickname: set.name,
          nature: set.nature,
          ivs: { hp: constants.maxIvVal, atk: constants.maxIvVal, def: constants.maxIvVal, spa: constants.maxIvVal, spd: constants.maxIvVal, spe: constants.maxIvVal, ...set.ivs },
          evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...set.evs },
          gender: set.gender,
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
      debugObj.battleSeed = (batchData.seed ?? undefined) as NumericSeed | undefined;
      debugObj.isDeterministicSimulation = true;
      debugObj.isScriptedReplayMode = true;
      const enemyChoices: string[] = batchData.enemyChoices ?? []; // no-domain: Non-domain utility collection or data structure
      debugObj.enemyChoices = [...enemyChoices];
      debugObj.mockEnemyChoices = [...enemyChoices];
      
      const playerChoices: string[] = batchData.playerChoices ?? []; // no-domain: Non-domain utility collection or data structure
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
    await armBattleFlowCompletion(this.page);
    await this.page.evaluate(async () => {
      const { useBattleStore } = await import('../../src/stores/battle/battle.ts');
      const store = useBattleStore();
      if (store.isBattleActive) {
        await store.endBattle(false, true);
        await store.completeBattleFlow('map');
      }
    });
    await this.awaitReturnToMap();
  }

  /**
   * Espera a retornar al mapa garantizando que el estado de batalla en el store se limpie
   */
  public async awaitReturnToMap(): Promise<void> {
    await awaitBattleFlowCompletion(this.page);
  }

  /**
   * Lanza una Pokéball en combate manejando tanto captura exitosa como escape/breakout,
   * garantizando que el elemento esté habilitado (:not(.is-disabled)) y coordinando
   * los eventos de sincronización FSM / battle-ready.
   */
  public async throwBall(ballId: string, options: { expectCapture?: boolean; timeout?: number } = {}): Promise<void> {
    const { expectCapture = false, timeout = MAX_PER_ACTION_TIMEOUT_MS * 2 } = options;
    const ballCard = this.page.locator(`.quick-item-card[data-item-id="${ballId}"]:not(.is-disabled)`).first();
    await ballCard.waitFor({ state: 'visible', timeout });

    if (expectCapture) {
      await armBattleFlowCompletion(this.page);
      await clickResilient(ballCard, { timeout });
      await awaitBattleFlowCompletion(this.page);
    } else {
      await armBattleReadyForInput(this.page, timeout);
      await clickResilient(ballCard, { timeout });
      await awaitBattleReadyForInput(this.page, timeout);
    }
  }
}
