import type { Page } from '@playwright/test';
import {
  DEFAULT_SEED_VAL,
  PRIME_MODULO_BASE,
  SEED_SCALE_MULTIPLIER,
  MAX_IV_VAL,
  SIMULATION_GSAP_TIME_SCALE,
  DEBUG_ITEM_MAX_QUANTITY
} from '../simulation_config.ts';
import type { CertifiedTestBatch, WindowWithResolver } from '../e2e_helpers.ts';
import type { ItemId } from '../../../src/data/inventory/items.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { PokemonMoveId } from '../../../src/data/battle/moves.ts';
import type { AbilityId } from '../../../src/data/battle/abilities.ts';
import type { MapRouteId } from '../../../src/data/world/map-assets.ts';
import type { WeatherId } from '../../../src/logic/weather/weatherRegistry.ts';
import type { NatureId } from '../../../src/data/battle/natures.ts';
import type { Pokemon, PokemonGenderName } from '../../../src/types/pokemon/pokemon.ts';
import type { NpcSpriteId } from '../../../src/data/pokemon/npcSpriteCatalog.ts';
import type { NumericSeed } from '../../../src/types/battle/battle.ts';
import { createCertifiedBattleInventory } from '../fuzzer/core/certifiedBattleInventory.ts';
import { PokemonLegalityValidator } from '../../../src/logic/battle/engine/pokemonLegalityValidator.ts';

const DEFAULT_SCENARIO_POKEMON_LEVEL = 50;
const REPLAY_RANDOM_SCALE = 10000;
const INITIAL_SEED_VAL = 12345;

/** Shape of a single Pokémon entry inside a fuzzer-certified batch team list. */
export interface FuzzerTeamSet {
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

/**
 * Configura el clima global en el MapStore para la simulación.
 */
export async function setSimulationMapWeather(page: Page, weather: WeatherId = 'clear'): Promise<void> {
  await page.evaluate(async (w: WeatherId) => {
    const { useMapStore } = await import('../../../src/stores/map.ts');
    useMapStore().setGlobalWeather(w);
  }, weather);
}

/**
 * Siembra items en el inventario del jugador de forma determinista.
 */
export async function seedSimulationInventory(
  page: Page,
  items: Partial<Record<ItemId, number>> | Array<{ id: ItemId; quantity: number }>
): Promise<void> {
  await page.evaluate(async (inventoryItems) => {
    const { useGameStore } = await import('../../../src/stores/game.ts');
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
 * Configura e inicializa declarativamente un escenario completo de batalla.
 */
export async function setupBattleScenarioHelper(page: Page, options: BattleScenarioOptions): Promise<void> {
  if (options.weather) {
    await setSimulationMapWeather(page, options.weather);
  }
  if (options.inventory) {
    await seedSimulationInventory(page, options.inventory);
  }

  await page.evaluate(async (opts: BattleScenarioOptions) => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const { pokemonDebugService } = await import('../../../src/logic/debug/pokemonDebugService.ts');

    const battleStore = useBattleStore();
    const gameStore = useGameStore();

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
 * Resetea completamente el cliente a bajo nivel según los 7 pilares de aislamiento.
 */
export async function resetSimulationToCleanState(
  page: Page,
  driver: 'sqlite' | 'postgres',
  username: string,
  queryTestDbFn: (query: string, params?: unknown[]) => Promise<unknown[]>
): Promise<void> {
  if (driver === 'postgres') {
    try {
      await queryTestDbFn(
        `DELETE FROM game_saves WHERE user_id IN (SELECT id FROM profiles WHERE username = $1);`,
        [username]
      );
    } catch (error: unknown) {
      console.debug(`[E2E Scenario] Optional cleanup of game_saves for ${username} ignored:`, error instanceof Error ? error.message : String(error));
    }
  }

  await page.evaluate(async ({ simTimeScale, initialSeedVal, replayRandomScale }) => {
    const win = window as Window & {
      gsap?: { killTweensOf: (target: unknown) => void; globalTimeline: { clear: () => void; timeScale: (n: number) => void } };
      __VITE_DEBUG__?: Record<string, unknown>;
      __E2E_BATTLE_READY_FOR_INPUT__?: unknown;
      __E2E_BATTLE_FORCED_SWITCH__?: unknown;
      __E2E_BATTLE_FLOW_COMPLETION__?: unknown;
    };

    const debug = win.__VITE_DEBUG__;
    const testResetShowdownWorker = debug?.testResetShowdownWorker as (() => void) | undefined;
    if (testResetShowdownWorker) {
      testResetShowdownWorker();
    }

    if (win.gsap) {
      win.gsap.killTweensOf('*');
      win.gsap.globalTimeline.clear();
      win.gsap.globalTimeline.timeScale(simTimeScale);
    }

    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const { useUIStore } = await import('../../../src/stores/ui.ts');
    const { useModalStore } = await import('../../../src/stores/modals.ts');
    const { useMapStore } = await import('../../../src/stores/map.ts');
    const { useErrorStore } = await import('../../../src/stores/errorStore.ts');
    const { BATTLE_STATES } = await import('../../../src/logic/battle/battleStateMachine.ts');

    const battleStore = useBattleStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const modalStore = useModalStore();
    const mapStore = useMapStore();
    const errorStore = useErrorStore();

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

    gameStore.state.team = [];
    gameStore.state.inventory = {};
    gameStore.state.starterChosen = true;
    gameStore.state.notificationHistory = [];
    gameStore.state.activeBattle = null;

    uiStore.activeTab = 'battle';
    uiStore.isBattleSwitchForced = false;
    modalStore.closeAll();

    mapStore.setGlobalWeather('clear');
    errorStore.clearError();

    document.querySelectorAll('[id^="toast-item-"]').forEach(el => el.remove());
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    let seedVal = initialSeedVal;
    Math.random = () => {
      const x = Math.sin(seedVal++) * replayRandomScale;
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

    delete win.__E2E_BATTLE_READY_FOR_INPUT__;
    delete win.__E2E_BATTLE_FORCED_SWITCH__;
    delete win.__E2E_BATTLE_FLOW_COMPLETION__;
  }, {
    simTimeScale: SIMULATION_GSAP_TIME_SCALE,
    initialSeedVal: INITIAL_SEED_VAL,
    replayRandomScale: REPLAY_RANDOM_SCALE
  });
}

/**
 * Configura e inyecta el escenario del fuzzer en el navegador.
 */
export async function setupFuzzerScenarioHelper(page: Page, b: CertifiedTestBatch): Promise<void> {
  PokemonLegalityValidator.assertTeamLegality(b.playerTeam, `Certified Batch ${b.id} Player Team`);
  PokemonLegalityValidator.assertTeamLegality(b.enemyTeam, `Certified Batch ${b.id} Enemy Team`);
  const certifiedItemIds = b.history.flatMap((entry) => entry.p1GameAction?.kind === 'bag-item'
    ? [entry.p1GameAction.itemId]
    : []);
  const certifiedInventory = createCertifiedBattleInventory(certifiedItemIds, DEBUG_ITEM_MAX_QUANTITY);
  await page.evaluate(async ({ batchData, certifiedInitialInventory, constants }) => {
    const debug = window.__VITE_DEBUG__;
    if (!debug || !debug.useBattleStore || !debug.useGameStore || !debug.useMapStore || !debug.pokemonDebugService) return;

    const battleStore = debug.useBattleStore();
    const gameStore = debug.useGameStore();

    const localPlayerTeam = batchData.playerTeam.map((set: FuzzerTeamSet) => {
      return debug.pokemonDebugService!.generate({
        uid: set.uid,
        id: set.species.toLowerCase(),
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

    const localEnemyTeam = batchData.enemyTeam.map((set: FuzzerTeamSet) => {
      return debug.pokemonDebugService!.generate({
        uid: set.uid,
        id: set.species.toLowerCase(),
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

    gameStore.state.team = localPlayerTeam;
    Reflect.set(gameStore.state, 'inventory', certifiedInitialInventory);

    const w = window as WindowWithResolver;
    w.__VITE_DEBUG__ = w.__VITE_DEBUG__ ?? {};
    const debugObj = w.__VITE_DEBUG__;
    debugObj.battleSeed = (batchData.seed ?? undefined) as NumericSeed | undefined;
    debugObj.isDeterministicSimulation = true;
    debugObj.isScriptedReplayMode = true;
    const enemyChoices: string[] = batchData.enemyChoices ?? [];
    debugObj.enemyChoices = [...enemyChoices];
    debugObj.mockEnemyChoices = [...enemyChoices];

    const playerChoices: string[] = batchData.playerChoices ?? [];
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

    const firstEnemy = localEnemyTeam[0];
    if (!firstEnemy) throw new Error('No enemy generated');

    await battleStore.startBattle(firstEnemy, {
      isTrainer: true,
      enemyTeam: localEnemyTeam,
      trainerName: 'youngster',
      locationId: 'route1',
      wasSearchingOpt: false
    });

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
