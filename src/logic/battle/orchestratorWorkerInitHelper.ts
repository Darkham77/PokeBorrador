import type { ShowdownPlayerRequest } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';

import { logger } from '../utils/logger.ts';
import { generateRandomSeed } from './battleSeedManager.ts';
import { prepareSeatPayload } from './orchestratorPayloadHelper.ts';
import {
  getShowdownWorker,
  preloadShowdownWorker,
  getSimulatorState
} from './showdownWorkerClient.ts';

interface WorkerInitResponsePayload {
  debugLogs?: string[];
  p1Request?: ShowdownPlayerRequest;
  p2Request?: ShowdownPlayerRequest;
  message?: string;
  logs?: string[];
}

function resolveWindowDebugSeed(): number[] | null {
  if (typeof globalThis.window !== 'undefined') {
    const debugSeed = globalThis.__VITE_DEBUG__?.battleSeed ?? null;
    logger.debug(
      `[E2E-SEED-ORCHESTRATOR-DEBUG] Read seed directly from window: ${JSON.stringify(debugSeed)}`
    );
    return debugSeed;
  }
  return null;
}

function resolveBattleTeams(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  debugSeed: number[] | null
): {
  p1Data: ReturnType<typeof prepareSeatPayload>;
  p2Data: ReturnType<typeof prepareSeatPayload>;
} {
  const battleState = ctx.activeBattle.value;
  const effectiveTeam =
    battleState?.isPvP && battleState?.playerTeam && battleState.playerTeam.length > 0
      ? battleState.playerTeam
      : ctx.gs.state.team || [];
  const rawPlayerTeam = [...effectiveTeam];
  const p1Data = prepareSeatPayload(rawPlayerTeam, initialPlayer, debugSeed, 'Player');

  const isWild = Boolean(
    battleState && !battleState.isTrainer && !battleState.isGym && !battleState.isPvP
  );
  const rawEnemyTeam = isWild
    ? initialEnemy
      ? [initialEnemy]
      : []
    : [...(battleState?.enemyTeam || (initialEnemy ? [initialEnemy] : []))];
  const p2Data = prepareSeatPayload(
    rawEnemyTeam,
    initialEnemy,
    debugSeed,
    battleState?.trainerName || 'Enemy'
  );

  return { p1Data, p2Data };
}

function buildInitPayload(
  p1Data: ReturnType<typeof prepareSeatPayload>,
  p2Data: ReturnType<typeof prepareSeatPayload>,
  initialWeather: string,
  seedArr: number[]
): {
  type: string;
  payload: {
    p1: { name: string; team: ReturnType<typeof prepareSeatPayload>['team'] };
    p2: { name: string; team: ReturnType<typeof prepareSeatPayload>['team'] };
    p1Hps: ReturnType<typeof prepareSeatPayload>['hps'];
    p2Hps: ReturnType<typeof prepareSeatPayload>['hps'];
    p1Statuses: ReturnType<typeof prepareSeatPayload>['statuses'];
    p2Statuses: ReturnType<typeof prepareSeatPayload>['statuses'];
    p1MovesPP: ReturnType<typeof prepareSeatPayload>['movesPP'];
    p2MovesPP: ReturnType<typeof prepareSeatPayload>['movesPP'];
    weather: string;
    seed: number[];
    isDeterministicSimulation: boolean;
    history: unknown[];
  };
} {
  return {
    type: 'INIT_BATTLE',
    payload: {
      p1: { name: p1Data.name, team: p1Data.team },
      p2: { name: p2Data.name, team: p2Data.team },
      p1Hps: p1Data.hps,
      p2Hps: p2Data.hps,
      p1Statuses: p1Data.statuses,
      p2Statuses: p2Data.statuses,
      p1MovesPP: p1Data.movesPP,
      p2MovesPP: p2Data.movesPP,
      weather: initialWeather,
      seed: seedArr,
      isDeterministicSimulation: Boolean(
        typeof globalThis.window !== 'undefined' &&
        globalThis.__VITE_DEBUG__?.isDeterministicSimulation
      ),
      history:
        (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__?.history) || []
    }
  };
}

function detachWorkerInitListeners(
  worker: Worker,
  msgHandler: (e: MessageEvent) => void,
  errHandler: (e: ErrorEvent) => void
): void {
  if (worker.removeEventListener) {
    worker.removeEventListener('message', msgHandler);
    worker.removeEventListener('error', errHandler);
  } else {
    worker.onmessage = null;
  }
}

function handleWorkerLogMessage(responsePayload?: { message?: string }): void {
  const stage = responsePayload?.message ?? 'missing-stage';
  logger.debug(`[WORKER] ${stage}`);
  if (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__) {
    globalThis.__VITE_DEBUG__.lastWorkerInitStage = stage;
  }
}

async function handleInitBattleSuccessLogs(
  targetCtx: BattleContext,
  responsePayload?: { logs?: string[]; debugLogs?: string[] }
): Promise<void> {
  if (!responsePayload) return;
  const rawLogs = responsePayload.logs || responsePayload.debugLogs;
  if (!rawLogs || rawLogs.length === 0) return;

  if (targetCtx.activeBattle.value) {
    if (!targetCtx.activeBattle.value.rawShowdownLogs) {
      targetCtx.activeBattle.value.rawShowdownLogs = [];
    }
    targetCtx.activeBattle.value.rawShowdownLogs.push(...rawLogs);
  }

  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts');
  const filteredLogs = filterShowdownLogs(rawLogs);
  for (const logLine of filteredLogs) {
    if (
      logLine.startsWith('|-ability|') ||
      logLine.startsWith('|-transform|') ||
      logLine.startsWith('|-start|') ||
      logLine.startsWith('|-weather|')
    ) {
      await parseShowdownLogLine(targetCtx, logLine);
    }
  }
}

async function handleInitBattleSuccess(
  targetCtx: BattleContext,
  responsePayload: WorkerInitResponsePayload | undefined,
  cleanup: () => void,
  onResolve: () => void
): Promise<void> {
  logger.info('ShowdownWorker', 'Batalla inicializada con éxito en el worker.');
  logger.debug(
    '[E2E-ORCHESTRATOR-INIT-DEBUG] responsePayload keys:',
    Object.keys(responsePayload || {})
  );
  await handleInitBattleSuccessLogs(targetCtx, responsePayload);

  if (targetCtx.activeBattle.value && responsePayload) {
    targetCtx.activeBattle.value.playerRequest = responsePayload.p1Request;
    targetCtx.activeBattle.value.enemyRequest = responsePayload.p2Request;
  }
  if (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__) {
    globalThis.__VITE_DEBUG__.p1ChoiceIdx = globalThis.__VITE_DEBUG__.p1ChoiceIdx ?? 0;
    globalThis.__VITE_DEBUG__.p2ChoiceIdx = globalThis.__VITE_DEBUG__.p2ChoiceIdx ?? 0;
    globalThis.dispatchEvent(new CustomEvent('worker-init-complete'));
  }
  cleanup();
  onResolve();
}

async function handleInitBattleError(
  responsePayload: { message?: string } | undefined,
  cleanup: () => void,
  onReject: (reason?: unknown) => void
): Promise<void> {
  const errorText = responsePayload?.message || 'Error desconocido';
  logger.error('ShowdownWorker', `Error del simulador al inicializar batalla: ${errorText}`);
  if (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__) {
    globalThis.__VITE_DEBUG__.lastWorkerInitError = errorText;
  }
  cleanup();
  const { useErrorStore } = await import('@/stores/errorStore');
  useErrorStore().setError(new Error(errorText), {
    type: 'Simulator Initialization Error',
    source: 'ShowdownWorker INIT_BATTLE'
  });
  onReject(new Error(errorText));
}

function attachWorkerInitListeners(
  worker: Worker,
  ctx: BattleContext,
  resolve: () => void,
  reject: (reason?: unknown) => void
): void {
  const handleWorkerError = (event: ErrorEvent): void => {
    const errorText = event.message || 'Showdown worker failed before initializing the battle';
    logger.error('ShowdownWorker', `Error del worker al inicializar batalla: ${errorText}`);
    if (typeof globalThis.window !== 'undefined' && globalThis.__VITE_DEBUG__) {
      globalThis.__VITE_DEBUG__.lastWorkerInitError = errorText;
    }
    detachWorkerInitListeners(worker, initHandler, handleWorkerError);
    reject(new Error(errorText));
  };
  if (worker.addEventListener) {
    worker.addEventListener('error', handleWorkerError);
  }

  const initHandler = async (e: MessageEvent): Promise<void> => {
    const data = e.data as {
      type: string;
      payload?: WorkerInitResponsePayload;
    };
    const { type: responseType, payload: responsePayload } = data;
    if (responseType === 'WORKER_LOG') {
      handleWorkerLogMessage(responsePayload);
      return;
    }
    const cleanup = (): void => detachWorkerInitListeners(worker, initHandler, handleWorkerError);
    if (responseType === 'INIT_BATTLE_SUCCESS' || responseType === 'INIT_SUCCESS') {
      await handleInitBattleSuccess(ctx, responsePayload, cleanup, resolve);
    } else if (responseType === 'ERROR') {
      await handleInitBattleError(responsePayload, cleanup, reject);
    }
  };

  if (worker.addEventListener) {
    worker.addEventListener('message', initHandler);
  } else {
    worker.onmessage = initHandler;
  }
}

export async function initWorkerForBattle(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon
): Promise<void> {
  if (typeof globalThis.window === 'undefined' || typeof Worker === 'undefined') return;

  preloadShowdownWorker();
  const workerInstance = getShowdownWorker()!;
  const winObj = typeof globalThis.window !== 'undefined' ? globalThis.window : null;
  if (winObj) {
    winObj.__showdownWorker__ = workerInstance;
    const viteDebug = winObj.__VITE_DEBUG__;
    if (viteDebug) {
      viteDebug.getSimulatorState = getSimulatorState;
    }
  }

  const debugSeed = resolveWindowDebugSeed();
  const seedArr = debugSeed || generateRandomSeed();
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.seed = seedArr;
    ctx.activeBattle.value.battleHistory = [];
  }

  const battleState = ctx.activeBattle.value;
  const { p1Data, p2Data } = resolveBattleTeams(ctx, initialPlayer, initialEnemy, debugSeed);
  const initialWeatherOfficial = battleState?.weather?.type || 'none';

  logger.debug(
    `[E2E-SEED-DEBUG] Initializing worker battle. context=${JSON.stringify({ initialWeatherOfficial, debugSeed, seedArr })}`
  );

  return new Promise<void>((resolve, reject) => {
    const worker = getShowdownWorker()!;
    attachWorkerInitListeners(worker, ctx, resolve, reject);

    const initPayload = buildInitPayload(p1Data, p2Data, initialWeatherOfficial, seedArr);
    try {
      worker.postMessage(initPayload);
    } catch (error: unknown) {
      reject(
        new Error(
          `[ShowdownWorker] INIT_BATTLE payload could not be transferred: ${(error as Error).message}`,
          { cause: error }
        )
      );
    }
  });
}
