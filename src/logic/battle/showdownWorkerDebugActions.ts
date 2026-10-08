import type { SideID } from '@pkmn/sim';
import { getShowdownWorker, resolveBattleStore, cleanWorkerListener } from './showdownWorkerInstance.ts';
import {
  lastSyncTeamStates,
  syncTeamsFromLastWorkerState,
  type SynchronizedPokemonState,
  type WorkerSuccessPayload
} from './showdownTurnSyncHelper.ts';

const SIMULATOR_STATE_TIMEOUT_MS = 5000 as const;

export async function getSimulatorState(): Promise<{ p1: unknown[]; p2: unknown[] }> {
  const worker = getShowdownWorker();
  if (!worker) throw new Error('showdownWorker is null');
  worker.postMessage({ type: 'GET_SIMULATOR_STATE' });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { // timer-ok: Web Worker message response timeout with SIMULATOR_STATE_TIMEOUT_MS
      cleanWorkerListener(worker, handler);
      reject(new Error('[ShowdownWorkerClient] Timeout waiting for GET_SIMULATOR_STATE_RESPONSE'));
    }, SIMULATOR_STATE_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { p1: unknown[]; p2: unknown[] } };
      const { type, payload } = data;
      if (type === 'GET_SIMULATOR_STATE_RESPONSE') {
        clearTimeout(timer); // timer-ok: Web Worker message response timeout with SIMULATOR_STATE_TIMEOUT_MS
        cleanWorkerListener(worker, handler);
        resolve(payload);
      }
    };
    if (worker.addEventListener) {
      worker.addEventListener('message', handler);
    } else {
      worker.onmessage = handler;
    }
  });
}

export async function isPlayerTrappedInWorker(): Promise<boolean> {
  const worker = getShowdownWorker();
  if (!worker) return false;
  const { promise, resolve } = Promise.withResolvers<boolean>();
  const handler = (event: MessageEvent) => {
    const data = event.data as { type: string; payload: { trapped: boolean } };
    const { type, payload } = data;
    if (type === 'CHECK_TRAPPED_RESPONSE') {
      cleanWorkerListener(worker, handler);
      resolve(!!payload.trapped);
    }
  };
  if (worker.addEventListener) {
    worker.addEventListener('message', handler);
  } else {
    worker.onmessage = handler;
  }
  worker.postMessage({
    type: 'CHECK_TRAPPED'
  });
  return promise;
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
        cleanWorkerListener(worker, handler);
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
      cleanWorkerListener(worker, handler);
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
    if (worker.addEventListener) {
      worker.addEventListener('message', handler);
    } else {
      worker.onmessage = handler;
    }
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
