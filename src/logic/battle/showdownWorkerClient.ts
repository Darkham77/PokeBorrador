import { logger } from '../utils/logger.ts'
import type { SideID, PokemonSet } from '@pkmn/sim'
import type { ShowdownPlayerRequest, BattleState } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { extractTeamHpAndStatus } from './helpers/showdownSyncHelper.ts';
import { findMatchingPokemon } from './showdownUidMapper.ts';
import { buildCombatReplayPayload } from './helpers/combatReplayHelper.ts';

interface BattleStoreAccess {
  state?: BattleState | null;
  [key: string]: unknown;
}

interface GameStoreAccess {
  state?: { team?: Pokemon[] };
  [key: string]: unknown;
}

let showdownStoreResolvers: {
  getBattleStore?: () => BattleStoreAccess | null | undefined;
  getGameStore?: () => GameStoreAccess | null | undefined;
} = {}; // singleton-ok: Singleton instance state container

export function registerShowdownStoreResolvers(resolvers: {
  getBattleStore?: () => BattleStoreAccess | null | undefined;
  getGameStore?: () => GameStoreAccess | null | undefined;
}): void {
  showdownStoreResolvers = { ...showdownStoreResolvers, ...resolvers };
}

function resolveBattleStore(): BattleStoreAccess | null { // result-ok: Operation result wrapper payload
  if (showdownStoreResolvers.getBattleStore) {
    const s = showdownStoreResolvers.getBattleStore();
    if (s) return s;
  }
  if (typeof window !== 'undefined') {
    const resolver = window.__VITE_DEBUG_STORE_RESOLVER__;
    if (resolver) return resolver() as BattleStoreAccess;
    const debug = window.__VITE_DEBUG__;
    if (debug?.getGameStore) {
      const gs = debug.getGameStore();
      const bs = Reflect.get(gs, 'gs') as BattleStoreAccess | undefined;
      if (bs) return bs;
    }
  }
  return null;
}

function resolveGameStore(): GameStoreAccess | null { // result-ok: Operation result wrapper payload
  if (showdownStoreResolvers.getGameStore) {
    const s = showdownStoreResolvers.getGameStore();
    if (s) return s;
  }
  if (typeof window !== 'undefined') {
    const debug = window.__VITE_DEBUG__;
    if (debug?.getGameStore) {
      return debug.getGameStore() as GameStoreAccess;
    }
  }
  return null;
}

export let showdownWorker: Worker | null = null; // singleton-ok: Singleton instance state container
export function setShowdownWorker(worker: Worker | null) {
  showdownWorker = worker;
  if (typeof window !== 'undefined') {
    if (worker) {
      window.__showdownWorker__ = worker;
    } else {
      delete window.__showdownWorker__;
    }
  }
}

export function getShowdownWorker(): Worker | null { // result-ok: Operation result wrapper payload
  if (!showdownWorker && typeof window !== 'undefined' && window.__showdownWorker__) {
    showdownWorker = window.__showdownWorker__;
  }
  return showdownWorker;
}

export function preloadShowdownWorker(): void {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || getShowdownWorker()) return

  const worker = new Worker(new URL('./showdown.worker.ts', import.meta.url), { type: 'module' })
  setShowdownWorker(worker)
}

interface SynchronizedPokemonState {
  uid: string;
  hp: number;
  maxHp?: number;
  status: string;
  fainted: boolean;
}

const lastSyncTeamStates: Record<string, Array<SynchronizedPokemonState | null> | null> = {
  p1: null,
  p2: null,
  p3: null,
  p4: null
};

function syncPokemonState(
  teamState: Array<SynchronizedPokemonState | null> | null,
  targetList: Array<Pokemon | null> | undefined
) {
  if (!teamState || !targetList) return;
  teamState.forEach(monState => {
    if (monState && monState.uid) {
      const match = findMatchingPokemon(monState.uid, targetList);
      if (!match) {
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
          throw new Error(`[ShowdownWorkerClient] Certified worker state could not resolve a client Pokémon by UID. context=${JSON.stringify({ workerUid: monState.uid, workerHp: monState.hp, workerMaxHp: monState.maxHp, workerFainted: monState.fainted, clientUids: targetList.map(p => p?.uid ?? null) })}`);
        }
        return;
      }
      if (monState.maxHp && match.maxHp && monState.maxHp !== match.maxHp) {
        match.hp = Math.min(match.maxHp, Math.round((monState.hp / monState.maxHp) * match.maxHp));
      } else {
        match.hp = monState.hp;
      }
      match.status = monState.status as Pokemon['status'];
      match.fainted = monState.fainted || monState.hp <= 0;
      if (monState.fainted || monState.hp <= 0) {
        match.hp = 0;
      }
    }
  });
}

function syncActiveCombatant(
  activeMon: Pokemon | null | undefined,
  teamState: Array<SynchronizedPokemonState | null> | null
) {
  if (!activeMon || !teamState) return;
  const activeState = findMatchingPokemon(activeMon.uid, teamState);
  if (activeState) {
    console.debug(`[E2E-SYNC-DEBUG] Syncing active combatant (${activeMon.name}) HP: ${activeMon.hp} -> ${activeState.hp}`);
    activeMon.hp = activeState.fainted || activeState.hp <= 0 ? 0 : activeState.hp;
    activeMon.status = activeState.status as Pokemon['status'];
  }
}

export async function syncTeamsFromLastWorkerState(): Promise<void> {
  const gameStore = resolveGameStore();
  const battleStore = resolveBattleStore();

  const activeBattle = battleStore?.state;
  const p1State = lastSyncTeamStates.p1;
  if (p1State) {
    if (gameStore?.state?.team) {
      syncPokemonState(p1State, gameStore.state.team);
    }
    if (activeBattle?.playerTeam) {
      syncPokemonState(p1State, activeBattle.playerTeam);
    }
    syncActiveCombatant(activeBattle?.player, p1State);
  }

  const p2State = lastSyncTeamStates.p2;
  if (p2State) {
    if (activeBattle?.enemyTeam) {
      syncPokemonState(p2State, activeBattle.enemyTeam);
    }
    syncActiveCombatant(activeBattle?.enemy, p2State);
  }
}

const SIMULATOR_STATE_TIMEOUT_MS = 5000;

export async function getSimulatorState(): Promise<{ p1: unknown[]; p2: unknown[] }> {
  const worker = getShowdownWorker();
  if (!worker) throw new Error('showdownWorker is null');
  worker.postMessage({ type: 'GET_SIMULATOR_STATE' });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener('message', handler);
      reject(new Error('[ShowdownWorkerClient] Timeout waiting for GET_SIMULATOR_STATE_RESPONSE'));
    }, SIMULATOR_STATE_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { p1: unknown[]; p2: unknown[] } };
      const { type, payload } = data;
      if (type === 'GET_SIMULATOR_STATE_RESPONSE') {
        clearTimeout(timer);
        worker.removeEventListener('message', handler);
        resolve(payload);
      }
    };
    worker.addEventListener('message', handler);
  });
}

interface WorkerSuccessPayload {
  logs: string[];
  isOver: boolean;
  winner: string | null;
  p1ForceSwitch?: boolean;
  p2ForceSwitch?: boolean;
  p1Request?: ShowdownPlayerRequest;
  p2Request?: ShowdownPlayerRequest;
  p1TeamState?: Array<{ uid: string; hp: number; maxHp: number; status: string; fainted: boolean } | null>;
  p2TeamState?: Array<{ uid: string; hp: number; maxHp: number; status: string; fainted: boolean } | null>;
  p1ActionConsumed?: boolean;
  p2ActionConsumed?: boolean;
  p1ChoiceIdx?: number;
  p2ChoiceIdx?: number;
  message?: string;
}

interface SimulationValidationResult {
  shouldBypass: boolean;
  replayContext: string;
  isSimulation: boolean;
  history?: unknown;
  certifiedHistoryStep?: number;
}

interface ReplayTraceContextArgs {
  isSimulation: boolean;
  p1Choice: string;
  p2Choice?: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  p1UsedBattleItem?: boolean;
  certifiedHistoryStep?: number;
  historyLength?: number;
}

function isReplayExecutionComplete(
  debugObj: Record<string, unknown>,
  history: unknown,
  certifiedHistoryIndex: number | undefined
): boolean {
  const isEnded = Reflect.get(debugObj, 'certifiedReplayWorkerEnded') === true;
  return isEnded || (Array.isArray(history) && typeof certifiedHistoryIndex === 'number' && certifiedHistoryIndex >= history.length);
}

function recordReplayTrace(
  debugObj: Record<string, unknown>,
  p1Choice: string,
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): void {
  const trace = Reflect.get(debugObj, 'certifiedReplaySubmissionTrace');
  const entries = (Array.isArray(trace) ? trace : []) as Record<string, unknown>[]; // open-record: Generic key-value data dictionary container
  entries.push({
    historyIndex: Reflect.get(debugObj, 'replayHistoryIdx'),
    p1Choice,
    p2Choice: p2Choice ?? '',
    p1Skip: !!p1Skip,
    p2Skip: !!p2Skip,
    p1UsedBattleItem: !!p1UsedBattleItem
  });
  Reflect.set(debugObj, 'certifiedReplaySubmissionTrace', entries);
}

function serializeReplayContext(args: ReplayTraceContextArgs): string {
  const viteDebug = typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined;
  return JSON.stringify({
    isSimulation: args.isSimulation,
    p1Choice: args.p1Choice,
    p2Choice: args.p2Choice,
    p1Skip: !!args.p1Skip,
    p2Skip: !!args.p2Skip,
    p1UsedBattleItem: !!args.p1UsedBattleItem,
    p1ChoiceIdx: viteDebug?.p1ChoiceIdx,
    p2ChoiceIdx: viteDebug?.p2ChoiceIdx,
    playerChoiceCount: Array.isArray(viteDebug?.playerChoices) ? viteDebug.playerChoices.length : undefined,
    enemyChoiceCount: Array.isArray(viteDebug?.enemyChoices) ? viteDebug.enemyChoices.length : undefined,
    historyCount: args.historyLength,
    certifiedHistoryStep: args.certifiedHistoryStep,
  });
}

function validateAndTraceSimulationReplay(
  p1Choice: string,
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): SimulationValidationResult {
  const isSimulation = typeof window !== 'undefined' && !!window.__VITE_DEBUG__?.isScriptedReplayMode;
  const debugObj = (typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined) as Record<string, unknown> | undefined; // open-record: Generic key-value data dictionary container
  const history = debugObj?.history;
  const certifiedHistoryIndex = isSimulation && debugObj
    ? (Reflect.get(debugObj, 'replayHistoryIdx') as number | undefined)
    : undefined;

  if (isSimulation && debugObj && isReplayExecutionComplete(debugObj, history, certifiedHistoryIndex)) {
    console.warn('[ShowdownWorkerClient] Bypassing executeTurnInWorker because certified replay has already finished all history steps.');
    return { shouldBypass: true, replayContext: '', isSimulation, history };
  }

  if (isSimulation && (typeof certifiedHistoryIndex !== 'number' || certifiedHistoryIndex < 0)) {
    throw new Error(`[ShowdownWorkerClient] Certified replay submission is missing its atomic history cursor. context=${JSON.stringify({ certifiedHistoryIndex, historyLength: Array.isArray(history) ? history.length : undefined, p1Choice, p2Choice })}`);
  }

  const certifiedHistoryStep = typeof certifiedHistoryIndex === 'number' ? certifiedHistoryIndex + 1 : undefined;
  if (isSimulation && debugObj) {
    recordReplayTrace(debugObj, p1Choice, p2Choice, p1Skip, p2Skip, p1UsedBattleItem);
  }

  const replayContext = serializeReplayContext({
    isSimulation,
    p1Choice,
    p2Choice,
    p1Skip,
    p2Skip,
    p1UsedBattleItem,
    certifiedHistoryStep,
    historyLength: Array.isArray(history) ? history.length : undefined,
  });

  return { shouldBypass: false, replayContext, isSimulation, history, certifiedHistoryStep };
}

interface PreparedTurnState {
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weatherVal: string;
}

function prepareTurnStateForWorker(p1Choice: string, p2Choice: string, replayContext: string): PreparedTurnState {
  let p1Hps: Record<string, number> | undefined = undefined;
  let p2Hps: Record<string, number> | undefined = undefined;
  let p1Statuses: Record<string, string> | undefined = undefined;
  let p2Statuses: Record<string, string> | undefined = undefined;
  let weatherVal = 'none';

  try {
    const battleStore = resolveBattleStore();
    const activeState = ((battleStore?.state as { value?: BattleState } | undefined)?.value || battleStore?.state) as BattleState | null | undefined;
    if (activeState) {
      weatherVal = typeof activeState.weather === 'string' ? activeState.weather : ((activeState.weather as { type?: string } | null)?.type ?? 'none');
      if (!activeState.battleHistory) {
        activeState.battleHistory = [];
      }
      activeState.battleHistory.push({
        turnCount: activeState.turnCount,
        p1Choice,
        p2Choice
      });
    }

    const gameStore = resolveGameStore();
    const sourcePlayerTeam = battleStore?.state?.playerTeam || gameStore?.state?.team;
    if (sourcePlayerTeam) {
      const p1Data = extractTeamHpAndStatus(sourcePlayerTeam);
      p1Hps = p1Data.hps;
      p1Statuses = p1Data.statuses;
    }
    if (battleStore?.state?.enemyTeam) {
      const p2Data = extractTeamHpAndStatus(battleStore.state.enemyTeam);
      p2Hps = p2Data.hps;
      p2Statuses = p2Data.statuses;
    }
  } catch (e) {
    throw new Error(`[ShowdownWorkerClient] Failed to load battle state before worker turn. context=${replayContext}; cause=${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }

  return { p1Hps, p2Hps, p1Statuses, p2Statuses, weatherVal };
}

function cleanWorkerListener(worker: Worker, handler: (e: MessageEvent) => void): void {
  if (worker.removeEventListener) {
    worker.removeEventListener('message', handler);
  } else {
    worker.onmessage = null;
  }
}

function syncWorkerTurnSuccessToClient(payload: WorkerSuccessPayload): void {
  ['p1', 'p2', 'p3', 'p4'].forEach(seatId => {
    const seatStateKey = `${seatId}TeamState` as keyof WorkerSuccessPayload;
    const seatState = payload[seatStateKey] as Array<SynchronizedPokemonState | null> | undefined;
    lastSyncTeamStates[seatId] = seatState || null;
  });

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.certifiedReplayWorkerEnded = payload.isOver;
    if (payload.isOver) {
      window.__VITE_DEBUG__.certifiedReplayWorkerFinalState = {
        p1: payload.p1TeamState ?? [],
        p2: payload.p2TeamState ?? [],
      };
    }
    if (typeof payload.p1ChoiceIdx === 'number') {
      window.__VITE_DEBUG__.p1ChoiceIdx = payload.p1ChoiceIdx;
    }
    if (typeof payload.p2ChoiceIdx === 'number') {
      window.__VITE_DEBUG__.p2ChoiceIdx = payload.p2ChoiceIdx;
    }
  }

  const battleStore = resolveBattleStore();
  const activeState = ((battleStore?.state as { value?: BattleState } | undefined)?.value || battleStore?.state) as BattleState | null | undefined;
  if (activeState) {
    activeState.playerRequest = payload.p1Request;
    activeState.enemyRequest = payload.p2Request;
    if (Array.isArray(payload.logs)) {
      if (!activeState.rawShowdownLogs) {
        activeState.rawShowdownLogs = [];
      }
      activeState.rawShowdownLogs.push(...payload.logs);
    }
  }
}

function generateWorkerReproductionError(payloadMessage?: string): Error {
  let reproductionReport = '';
  try {
    const battleStore = resolveBattleStore();
    const active = ((battleStore?.state as { value?: BattleState } | undefined)?.value || battleStore?.state) as BattleState | null | undefined;
    if (active) {
      const reportObj = buildCombatReplayPayload(active);
      reproductionReport = `\n\n--- REPRODUCE BATTLE TEST CASE ---\nJSON Payload:\n${JSON.stringify(reportObj, null, 2)}\n----------------------------------`;
    }
  } catch (err) {
    logger.warn('[showdownWorkerClient] Fallo al generar reporte de reproducción:', err);
  }

  const errorMsg = (payloadMessage || '') + reproductionReport;
  const err = new Error(errorMsg);
  if (errorMsg.includes('INVALID_CHOICE')) {
    err.name = 'InvalidChoiceError';
  }
  return err;
}

export async function executeTurnInWorker(
  p1Choice: string, 
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): Promise<{ logs: string[]; isOver: boolean; winner: string | null; winnerSide?: 'p1' | 'p2' | null; p1ForceSwitch?: boolean; p2ForceSwitch?: boolean; p1Request?: ShowdownPlayerRequest; p2Request?: ShowdownPlayerRequest }> {
  const worker = getShowdownWorker();
  if (!worker) {
    throw new Error('showdownWorker is null');
  }

  const finalP2Choice = p2Choice;
  const simCheck = validateAndTraceSimulationReplay(p1Choice, finalP2Choice, p1Skip, p2Skip, p1UsedBattleItem);
  if (simCheck.shouldBypass) {
    return { logs: [], isOver: true, winner: null };
  }

  const { replayContext, isSimulation, history, certifiedHistoryStep } = simCheck;
  const { p1Hps, p2Hps, p1Statuses, p2Statuses, weatherVal } = prepareTurnStateForWorker(p1Choice, finalP2Choice || '', replayContext);

  return new Promise((resolve, reject) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      const { type, payload } = data;
      if (type === 'WORKER_LOG') {
        logger.debug('ShowdownWorker', `[WORKER] ${String(payload)}`);
        return;
      }
      if (type === 'ERROR' || type === 'TURN_ERROR') {
        cleanWorkerListener(worker, handler);
        const errPayload = payload as { message?: string } | string | null | undefined;
        const msg = typeof errPayload === 'object' && errPayload?.message ? errPayload.message : (typeof errPayload === 'string' ? errPayload : JSON.stringify(errPayload || 'Showdown Worker Error'));
        reject(new Error(`[ShowdownWorkerClient] Worker rejected turn. context=${replayContext}; workerPayload=${msg}`));
        return;
      }
      if (type === 'TURN_SUCCESS') {
        cleanWorkerListener(worker, handler);
        try {
          syncWorkerTurnSuccessToClient(payload);
        } catch (error: unknown) {
          reject(new Error(`[ShowdownWorkerClient] Worker turn succeeded but client synchronization failed. context=${replayContext}; cause=${error instanceof Error ? error.message : String(error)}`));
          return;
        }
        resolve(payload);
      } else if (type === 'WORKER_ERROR') {
        cleanWorkerListener(worker, handler);
        reject(generateWorkerReproductionError(payload.message));
      }
    };

    if (worker.addEventListener) {
      worker.addEventListener('message', handler);
    } else {
      worker.onmessage = handler;
    }
    worker.postMessage({
      type: 'EXECUTE_TURN',
      payload: { p1Choice, p2Choice: finalP2Choice, p1Skip, p2Skip, p1UsedBattleItem, p1Hps, p2Hps, p1Statuses, p2Statuses, history, certifiedHistoryStep, weather: weatherVal, isFuzzerSimulation: isSimulation }
    });
  });
}

export async function isPlayerTrappedInWorker(): Promise<boolean> {
  const worker = getShowdownWorker()
  if (!worker) return false
  const { promise, resolve } = Promise.withResolvers<boolean>()
  const handler = (event: MessageEvent) => {
    const data = event.data as { type: string; payload: { trapped: boolean } };
    const { type, payload } = data;
    if (type === 'CHECK_TRAPPED_RESPONSE') {
      if (worker.removeEventListener) {
        worker.removeEventListener('message', handler)
      } else {
        worker.onmessage = null
      }
      resolve(!!payload.trapped)
    }
  }
  if (worker.addEventListener) {
    worker.addEventListener('message', handler)
  } else {
    worker.onmessage = handler
  }
  worker.postMessage({
    type: 'CHECK_TRAPPED'
  })
  return promise
}


export async function applyCheatsInWorker(cheats: Array<{ side: SideID; type: 'heal' }>): Promise<void> {
  const worker = getShowdownWorker();
  if (!worker) return;
  worker.postMessage({
    type: 'APPLY_CHEATS',
    payload: { cheats }
  });
  return new Promise((resolve) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      if (data.type === 'APPLY_CHEATS_DONE') {
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler);
        } else {
          worker.onmessage = null;
        }
        ['p1', 'p2', 'p3', 'p4'].forEach(seatId => {
          const seatStateKey = `${seatId}TeamState` as keyof WorkerSuccessPayload;
          const seatState = data.payload[seatStateKey] as Array<SynchronizedPokemonState | null> | undefined;
          lastSyncTeamStates[seatId] = seatState || null;
        });
        const battleStore = resolveBattleStore();
        if (battleStore?.state) {
          battleStore.state.playerRequest = data.payload.p1Request;
          battleStore.state.enemyRequest = data.payload.p2Request;
        }
        await syncTeamsFromLastWorkerState();
        resolve();
      }
    };
    if (worker.addEventListener) {
      worker.addEventListener('message', handler);
    } else {
      worker.onmessage = handler;
    }
  });
}

export async function applyDebugStatusInWorker(side: SideID, uid: string, status: string): Promise<void> {
  const worker = getShowdownWorker();
  if (!worker) return;
  worker.postMessage({ type: 'APPLY_DEBUG_STATUS', payload: { debugStatus: { side, uid, status } } });
  return new Promise((resolve) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      if (data.type !== 'APPLY_DEBUG_STATUS_DONE') return;
      worker.removeEventListener('message', handler);
      lastSyncTeamStates.p1 = data.payload.p1TeamState ?? null;
      lastSyncTeamStates.p2 = data.payload.p2TeamState ?? null;
      const battleStore = resolveBattleStore();
      if (battleStore?.state) {
        battleStore.state.playerRequest = data.payload.p1Request;
        battleStore.state.enemyRequest = data.payload.p2Request;
      }
      await syncTeamsFromLastWorkerState();
      resolve();
    };
    worker.addEventListener('message', handler);
  });
}

export function notifyWorkerBattleWin(side: SideID = 'p1'): void {
  const worker = getShowdownWorker();
  if (worker) {
    worker.postMessage({
      type: 'WIN_BATTLE',
      payload: { side }
    });
  }
}

export function testResetShowdownWorker(): void {
  if (showdownWorker) {
    showdownWorker.terminate();
    showdownWorker = null;
  }
  if (typeof window !== 'undefined') {
    if (window.__showdownWorker__) {
      window.__showdownWorker__.terminate();
      delete window.__showdownWorker__;
    }
  }
}

export interface RequestTrainerTeamOptions {
  level: number;
  teamSize: number;
  allowedSpecies: Iterable<string>;
  aceSpeciesId?: string;
}

export interface RequestRivalTeamOptions {
  level: number;
  teamSize: number;
  aceSpeciesId: string;
  allowedSpecies?: Iterable<string>;
}

type TeamGeneratorHandler = (type: 'TRAINER' | 'RIVAL', payload: unknown) => Promise<PokemonSet[]>;
let teamGeneratorHandler: TeamGeneratorHandler | null = null; // singleton-ok: Singleton instance state container

export function registerTeamGeneratorHandler(handler: TeamGeneratorHandler | null): void {
  teamGeneratorHandler = handler;
}

export async function requestTrainerTeam(options: RequestTrainerTeamOptions): Promise<PokemonSet[]> {
  if (teamGeneratorHandler) {
    return teamGeneratorHandler('TRAINER', options);
  }
  let worker = getShowdownWorker();
  if (!worker) {
    preloadShowdownWorker();
    worker = getShowdownWorker();
  }
  if (!worker) {
    throw new Error('[ShowdownWorkerClient] showdownWorker is null. Call preloadShowdownWorker or registerTeamGeneratorHandler.');
  }

  const requestId = `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload?: { requestId: string; team: PokemonSet[]; message?: string } };
      if (data && data.type === 'GENERATE_TRAINER_TEAM_RESPONSE' && data.payload?.requestId === requestId) {
        cleanWorkerListener(worker!, handler);
        resolve(data.payload.team);
      } else if (data && data.type === 'ERROR' && data.payload?.message) {
        cleanWorkerListener(worker!, handler);
        reject(new Error(`[ShowdownWorkerClient] Error generating trainer team: ${data.payload.message}`));
      }
    };
    worker!.addEventListener('message', handler);
    worker!.postMessage({
      type: 'GENERATE_TRAINER_TEAM',
      payload: {
        requestId,
        level: options.level,
        teamSize: options.teamSize,
        allowedSpecies: Array.from(options.allowedSpecies),
        aceSpeciesId: options.aceSpeciesId
      }
    });
  });
}

export async function requestRivalTeam(options: RequestRivalTeamOptions): Promise<PokemonSet[]> {
  if (teamGeneratorHandler) {
    return teamGeneratorHandler('RIVAL', options);
  }
  let worker = getShowdownWorker();
  if (!worker) {
    preloadShowdownWorker();
    worker = getShowdownWorker();
  }
  if (!worker) {
    throw new Error('[ShowdownWorkerClient] showdownWorker is null. Call preloadShowdownWorker or registerTeamGeneratorHandler.');
  }

  const requestId = `riv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload?: { requestId: string; team: PokemonSet[]; message?: string } };
      if (data && data.type === 'GENERATE_RIVAL_TEAM_RESPONSE' && data.payload?.requestId === requestId) {
        cleanWorkerListener(worker!, handler);
        resolve(data.payload.team);
      } else if (data && data.type === 'ERROR' && data.payload?.message) {
        cleanWorkerListener(worker!, handler);
        reject(new Error(`[ShowdownWorkerClient] Error generating rival team: ${data.payload.message}`));
      }
    };
    worker!.addEventListener('message', handler);
    worker!.postMessage({
      type: 'GENERATE_RIVAL_TEAM',
      payload: {
        requestId,
        level: options.level,
        teamSize: options.teamSize,
        aceSpeciesId: options.aceSpeciesId,
        allowedSpecies: options.allowedSpecies ? Array.from(options.allowedSpecies) : undefined
      }
    });
  });
}

