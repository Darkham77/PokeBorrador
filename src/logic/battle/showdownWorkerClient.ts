import { logger } from '../utils/logger.ts';
import type { ShowdownPlayerRequest, WinnerSide } from '@/types/battle/battle';
import {
  showdownWorker,
  setShowdownWorker,
  getShowdownWorker,
  preloadShowdownWorker,
  testResetShowdownWorker,
  registerShowdownStoreResolvers,
  cleanWorkerListener
} from './showdownWorkerInstance.ts';
import {
  syncTeamsFromLastWorkerState,
  prepareTurnStateForWorker,
  syncWorkerTurnSuccessToClient,
  type WorkerSuccessPayload
} from './showdownTurnSyncHelper.ts';
import {
  validateAndTraceSimulationReplay,
  generateWorkerReproductionError
} from './showdownReplayTraceHelper.ts';

export {
  showdownWorker,
  setShowdownWorker,
  getShowdownWorker,
  preloadShowdownWorker,
  testResetShowdownWorker,
  registerShowdownStoreResolvers,
  syncTeamsFromLastWorkerState
};

export {
  getSimulatorState,
  isPlayerTrappedInWorker,
  applyCheatsInWorker,
  applyDebugStatusInWorker,
  notifyWorkerBattleWin
} from './showdownWorkerDebugActions.ts';

export {
  requestTrainerTeam,
  requestRivalTeam,
  registerTeamGeneratorHandler,
  TEAM_GENERATOR_TYPES,
  type RequestTrainerTeamOptions,
  type RequestRivalTeamOptions,
  type TeamGeneratorType
} from './showdownTeamGeneratorClient.ts';

export async function executeTurnInWorker(
  p1Choice: string,
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): Promise<{
  logs: string[];
  isOver: boolean;
  winner: string | null;
  winnerSide?: WinnerSide | null;
  p1ForceSwitch?: boolean;
  p2ForceSwitch?: boolean;
  p1Request?: ShowdownPlayerRequest;
  p2Request?: ShowdownPlayerRequest;
}> {
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
