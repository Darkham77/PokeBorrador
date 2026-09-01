import { logger } from '../utils/logger.ts'
import type { SideID } from '@pkmn/sim'
import type { ShowdownPlayerRequest, BattleState } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { extractTeamHpAndStatus } from './helpers/showdownSyncHelper.ts';
import { findMatchingPokemon } from './showdownUidMapper.ts';

type GameStoreType = ReturnType<typeof useGameStore>;
type BattleStoreType = ReturnType<typeof useBattleStore>;

export let showdownWorker: Worker | null = null;
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

export function getShowdownWorker(): Worker | null { // result-ok
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
  let battleStore: BattleStoreType | null = null;
  let gameStore: GameStoreType | null = null;

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.getGameStore) {
    const debug = window.__VITE_DEBUG__ as Record<string, unknown>; // open-record
    gameStore = (debug.getGameStore as () => GameStoreType)();
    battleStore = (Reflect.get(gameStore, 'gs') as BattleStoreType | undefined) || ((window.__VITE_DEBUG_STORE_RESOLVER__ as (() => BattleStoreType) | undefined)?.()) || null;
  }

  if (!gameStore) {
    const { useGameStore } = await import('@/stores/game');
    gameStore = useGameStore();
  }
  if (!battleStore) {
    const { useBattleStore } = await import('@/stores/battle/battle');
    battleStore = useBattleStore();
  }

  const activeBattle = battleStore?.state;
  const p1State = lastSyncTeamStates.p1;
  if (p1State) {
    if (gameStore.state?.team) {
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

export async function getSimulatorState(): Promise<{ p1: unknown[]; p2: unknown[] }> {
  if (!showdownWorker) throw new Error('showdownWorker is null');
  showdownWorker.postMessage({ type: 'GET_SIMULATOR_STATE' });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (showdownWorker) showdownWorker.removeEventListener('message', handler);
      reject(new Error('[ShowdownWorkerClient] Timeout waiting for GET_SIMULATOR_STATE_RESPONSE'));
    }, 5000);

    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { p1: unknown[]; p2: unknown[] } };
      const { type, payload } = data;
      if (type === 'GET_SIMULATOR_STATE_RESPONSE') {
        clearTimeout(timer);
        showdownWorker!.removeEventListener('message', handler);
        resolve(payload);
      }
    };
    showdownWorker!.addEventListener('message', handler);
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

export async function executeTurnInWorker(
  p1Choice: string, 
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): Promise<{ logs: string[]; isOver: boolean; winner: string | null; p1ForceSwitch?: boolean; p2ForceSwitch?: boolean; p1Request?: ShowdownPlayerRequest; p2Request?: ShowdownPlayerRequest }> {
  if (!showdownWorker) {
    throw new Error('showdownWorker is null')
  }

  const isSimulation = typeof window !== 'undefined' && !!window.__VITE_DEBUG__?.isScriptedReplayMode;
  const finalP2Choice = p2Choice;
  const debugObj = (typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined) as Record<string, unknown> | undefined; // open-record
  const history = debugObj?.history;
  const certifiedHistoryIndex = isSimulation && debugObj
    ? (Reflect.get(debugObj, 'replayHistoryIdx') as number | undefined)
    : undefined;
  if (isSimulation && (typeof certifiedHistoryIndex !== 'number' || certifiedHistoryIndex < 0)) {
    throw new Error(`[ShowdownWorkerClient] Certified replay submission is missing its atomic history cursor. context=${JSON.stringify({ certifiedHistoryIndex, historyLength: Array.isArray(history) ? history.length : undefined, p1Choice, p2Choice: finalP2Choice })}`);
  }
  const certifiedHistoryStep = typeof certifiedHistoryIndex === 'number' ? certifiedHistoryIndex + 1 : undefined;
  if (isSimulation && debugObj) {
    const trace = Reflect.get(debugObj, 'certifiedReplaySubmissionTrace');
    const entries = (Array.isArray(trace) ? trace : []) as Record<string, unknown>[]; // open-record
    entries.push({ historyIndex: Reflect.get(debugObj, 'replayHistoryIdx'), p1Choice, p2Choice: finalP2Choice ?? '', p1Skip: !!p1Skip, p2Skip: !!p2Skip, p1UsedBattleItem: !!p1UsedBattleItem });
    Reflect.set(debugObj, 'certifiedReplaySubmissionTrace', entries);
  }
  const replayContext = JSON.stringify({
    isSimulation,
    p1Choice,
    p2Choice: finalP2Choice,
    p1Skip: !!p1Skip,
    p2Skip: !!p2Skip,
    p1UsedBattleItem: !!p1UsedBattleItem,
    p1ChoiceIdx: typeof window !== 'undefined' ? window.__VITE_DEBUG__?.p1ChoiceIdx : undefined,
    p2ChoiceIdx: typeof window !== 'undefined' ? window.__VITE_DEBUG__?.p2ChoiceIdx : undefined,
    playerChoiceCount: typeof window !== 'undefined' && Array.isArray(window.__VITE_DEBUG__?.playerChoices) ? window.__VITE_DEBUG__.playerChoices.length : undefined,
    enemyChoiceCount: typeof window !== 'undefined' && Array.isArray(window.__VITE_DEBUG__?.enemyChoices) ? window.__VITE_DEBUG__.enemyChoices.length : undefined,
    historyCount: Array.isArray(history) ? history.length : undefined,
    certifiedHistoryStep,
  });



  // Registrar elección en el historial local del combate y extraer HPs/estados reactivos para sincronizar cheats con el simulador
  let p1Hps: Record<string, number> | undefined = undefined;
  let p2Hps: Record<string, number> | undefined = undefined;
  let p1Statuses: Record<string, string> | undefined = undefined;
  let p2Statuses: Record<string, string> | undefined = undefined;
  let weatherVal = 'none';

  try {
    const { useBattleStore } = await import('@/stores/battle/battle');
    const battleStore = useBattleStore();
    const activeState = ((battleStore.state as { value?: BattleState } | undefined)?.value || battleStore.state) as BattleState | null | undefined;
    if (activeState) {
      weatherVal = typeof activeState.weather === 'string' ? activeState.weather : ((activeState.weather as { type?: string } | null)?.type ?? 'none');
      if (!activeState.battleHistory) {
        activeState.battleHistory = [];
      }
      activeState.battleHistory.push({
        turnCount: activeState.turnCount,
        p1Choice,
        p2Choice: finalP2Choice || ''
      });
    }

    const { useGameStore } = await import('@/stores/game');
    const gameStore = useGameStore();
    const sourcePlayerTeam = battleStore?.state?.playerTeam || gameStore?.state?.team;
    if (sourcePlayerTeam) {
      const p1Data = extractTeamHpAndStatus(sourcePlayerTeam);
      p1Hps = p1Data.hps;
      p1Statuses = p1Data.statuses;
      console.debug(`[ORCHESTRATOR-EXECUTE-DEBUG] Sending p1Hps:`, JSON.stringify(p1Hps), `p1Statuses:`, JSON.stringify(p1Statuses));
    }
    if (battleStore.state?.enemyTeam) {
      const p2Data = extractTeamHpAndStatus(battleStore.state.enemyTeam);
      p2Hps = p2Data.hps;
      p2Statuses = p2Data.statuses;
    }
  } catch (e) {
    throw new Error(`[ShowdownWorkerClient] Failed to load battle state before worker turn. context=${replayContext}; cause=${e instanceof Error ? e.message : String(e)}`)
  }

  return new Promise((resolve, reject) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      const { type, payload } = data;
      if (type === 'WORKER_LOG') {
        logger.debug('ShowdownWorker', `[WORKER] ${String(payload)}`);
        return;
      }
      const worker = showdownWorker!
      if (type === 'ERROR' || type === 'TURN_ERROR') {
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }
        const errPayload = payload as { message?: string } | string | null | undefined;
        const msg = typeof errPayload === 'object' && errPayload?.message ? errPayload.message : (typeof errPayload === 'string' ? errPayload : JSON.stringify(errPayload || 'Showdown Worker Error'));
        reject(new Error(`[ShowdownWorkerClient] Worker rejected turn. context=${replayContext}; workerPayload=${msg}`))
        return
      }
      if (type === 'TURN_SUCCESS') {
        console.debug(`[ORCHESTRATOR-EXECUTE-DEBUG] Received TURN_SUCCESS. p1Request pokemon condition:`, JSON.stringify(payload.p1Request?.side?.pokemon?.map((p: Required<ShowdownPlayerRequest>['side']['pokemon'][number]) => ({ uid: p.uid, cond: p.condition }))));
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }

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
          console.debug(`[E2E-SYNC-LOGS-DEBUG] Turn resolved. Final window choice indices -> P1: ${window.__VITE_DEBUG__.p1ChoiceIdx}, P2: ${window.__VITE_DEBUG__.p2ChoiceIdx}`);
        }

        // Sincronizar de forma segura las HPs de la banca de vuelta al store reactivo de la UI por índice de slot
        try {
          let battleStore: BattleStoreType | null = null;
          let gameStore: GameStoreType | null = null;

          if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.getGameStore) {
            const debug = window.__VITE_DEBUG__ as Record<string, unknown>; // open-record
            gameStore = (debug.getGameStore as () => GameStoreType)();
            battleStore = (Reflect.get(gameStore, 'gs') as BattleStoreType | undefined) || ((window.__VITE_DEBUG_STORE_RESOLVER__ as (() => BattleStoreType) | undefined)?.()) || null;
          }

          if (!gameStore) {
            const { useGameStore } = await import('@/stores/game');
            gameStore = useGameStore();
          }
          if (!battleStore) {
            const { useBattleStore } = await import('@/stores/battle/battle');
            battleStore = useBattleStore();
          }

          const activeState = ((battleStore?.state as { value?: BattleState } | undefined)?.value || battleStore?.state) as BattleState | null | undefined;
          if (activeState) {
            activeState.playerRequest = payload.p1Request;
            activeState.enemyRequest = payload.p2Request;
          }
          ['p1', 'p2', 'p3', 'p4'].forEach(seatId => {
            const seatStateKey = `${seatId}TeamState` as keyof WorkerSuccessPayload;
            const seatState = payload[seatStateKey] as Array<SynchronizedPokemonState | null> | undefined;
            if (seatState) {
              lastSyncTeamStates[seatId] = seatState;
            }
          });
          await syncTeamsFromLastWorkerState();
        } catch (error: unknown) {
          reject(new Error(`[ShowdownWorkerClient] Worker turn succeeded but client synchronization failed. context=${replayContext}; cause=${error instanceof Error ? error.message : String(error)}`))
          return
        }

        resolve(payload)
      } else if (type === 'ERROR' || type === 'WORKER_ERROR') {
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }

        // Generar reporte de reproducción detallado
        let reproductionReport = '';
        try {
          const { useBattleStore } = await import('@/stores/battle/battle');
          const battleStore = useBattleStore();
          const active = battleStore.state;
          if (active) {
            const reportObj = {
              seed: active.seed || [],
              p1Team: active.playerTeam?.map((p: Pokemon) => ({
                id: p.id,
                level: p.level,
                ability: p.ability,
                moves: p.moves.map((m: { id?: string } | null) => m?.id || ''),
                gender: p.gender,
                hp: p.hp,
                maxHp: p.maxHp,
                stats: { hp: p.maxHp, atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe }
              })) || [],
              p2Team: active.enemyTeam?.map((p: Pokemon) => ({
                id: p.id,
                level: p.level,
                ability: p.ability,
                moves: p.moves.map((m: { id?: string } | null) => m?.id || ''),
                gender: p.gender,
                hp: p.hp,
                maxHp: p.maxHp,
                stats: { hp: p.maxHp, atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe }
              })) || [],
              history: active.battleHistory || []
            };
            reproductionReport = `\n\n--- REPRODUCE BATTLE TEST CASE ---\nJSON Payload:\n${JSON.stringify(reportObj, null, 2)}\n----------------------------------`;
          }
        } catch (_e) {
          // Ignorar fallo al generar reporte
        }

        const errorMsg = (payload.message || '') + reproductionReport;
        const err = new Error(errorMsg);
        if (errorMsg.includes('INVALID_CHOICE')) {
          err.name = 'InvalidChoiceError';
        }
        reject(err);
      }
    }
    const worker = showdownWorker;
    if (!worker) {
      reject(new Error('showdownWorker is null'));
      return;
    }
    if (worker.addEventListener) {
      worker.addEventListener('message', handler)
    } else {
      worker.onmessage = handler
    }
    worker.postMessage({
      type: 'EXECUTE_TURN',
      payload: { p1Choice, p2Choice: finalP2Choice, p1Skip, p2Skip, p1UsedBattleItem, p1Hps, p2Hps, p1Statuses, p2Statuses, history, certifiedHistoryStep, weather: weatherVal, isFuzzerSimulation: isSimulation }
    })
  })
}

export async function isPlayerTrappedInWorker(): Promise<boolean> {
  if (!showdownWorker) return false
  showdownWorker.postMessage({
    type: 'CHECK_TRAPPED'
  })
  return new Promise((resolve) => {
    if (!showdownWorker) return resolve(false)
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { trapped: boolean } };
      const { type, payload } = data;
      const worker = showdownWorker!
      if (type === 'CHECK_TRAPPED_RESPONSE') {
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }
        resolve(!!payload.trapped)
      }
    }
    if (showdownWorker.addEventListener) {
      showdownWorker.addEventListener('message', handler)
    } else {
      showdownWorker.onmessage = handler
    }
  })
}


export async function applyCheatsInWorker(cheats: Array<{ side: SideID; type: 'heal' }>): Promise<void> {
  const worker = showdownWorker;
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
        const { useBattleStore } = await import('@/stores/battle/battle');
        const battleStore = useBattleStore();
        if (battleStore.state) {
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
  const worker = showdownWorker;
  if (!worker) return;
  worker.postMessage({ type: 'APPLY_DEBUG_STATUS', payload: { debugStatus: { side, uid, status } } });
  return new Promise((resolve) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      if (data.type !== 'APPLY_DEBUG_STATUS_DONE') return;
      worker.removeEventListener('message', handler);
      lastSyncTeamStates.p1 = data.payload.p1TeamState ?? null;
      lastSyncTeamStates.p2 = data.payload.p2TeamState ?? null;
      const battleStore = useBattleStore();
      if (battleStore.state) {
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
  if (showdownWorker) {
    showdownWorker.postMessage({
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
