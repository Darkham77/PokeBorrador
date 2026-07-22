import { logger } from '../utils/logger.ts'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { advanceChoiceIndices } from './helpers/choiceIndexer.ts';
import { extractTeamHpAndStatus } from './helpers/showdownSyncHelper.ts';
import { findMatchingPokemon } from './showdownUidMapper.ts';

type GameStoreType = ReturnType<typeof useGameStore>;
type BattleStoreType = ReturnType<typeof useBattleStore>;

export let showdownWorker: Worker | null = null;
export function setShowdownWorker(worker: Worker | null) {
  showdownWorker = worker;
}

export interface SynchronizedPokemonState {
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
      if (match) {
        match.hp = monState.hp;
        match.status = (monState.status === '' || monState.status.toLowerCase() === 'fnt') ? null : monState.status as Pokemon['status'];
        if (monState.fainted || monState.hp <= 0) {
          match.hp = 0;
        }
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
    activeMon.status = (activeState.status === '' || activeState.status.toLowerCase() === 'fnt') ? null : activeState.status as Pokemon['status'];
  }
}

export async function syncTeamsFromLastWorkerState(): Promise<void> {
  let battleStore: BattleStoreType | null = null;
  let gameStore: GameStoreType | null = null;

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.getGameStore) {
    gameStore = window.__VITE_DEBUG__.getGameStore() as unknown as GameStoreType;
    battleStore = ((gameStore as unknown as { gs?: BattleStoreType })?.gs) || (typeof window !== 'undefined' ? (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => BattleStoreType }).__VITE_DEBUG_STORE_RESOLVER__?.() : null) || null;
  }

  if (!gameStore) {
    const { useGameStore } = await import('@/stores/game');
    gameStore = useGameStore();
  }
  if (!battleStore) {
    const { useBattleStore } = await import('@/stores/battle/battle');
    battleStore = useBattleStore();
  }

  const p1State = lastSyncTeamStates.p1;
  if (p1State) {
    if (gameStore.state?.team) {
      syncPokemonState(p1State, gameStore.state.team);
    }
    if (battleStore?.state?.playerTeam) {
      syncPokemonState(p1State, battleStore.state.playerTeam);
    }
    syncActiveCombatant(battleStore.state?.player, p1State);
  }

  const p2State = lastSyncTeamStates.p2;
  if (p2State) {
    if (battleStore.state?.enemyTeam) {
      syncPokemonState(p2State, battleStore.state.enemyTeam);
    }
    syncActiveCombatant(battleStore.state?.enemy, p2State);
  }
}

export async function getSimulatorState(): Promise<{ p1: unknown[]; p2: unknown[] }> {
  if (!showdownWorker) throw new Error('showdownWorker is null');
  showdownWorker.postMessage({ type: 'GET_SIMULATOR_STATE' });
  return new Promise(resolve => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { p1: unknown[]; p2: unknown[] } };
      const { type, payload } = data;
      if (type === 'GET_SIMULATOR_STATE_RESPONSE') {
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
  message?: string;
}

export async function executeTurnInWorker(
  p1Choice: string, 
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean
): Promise<{ logs: string[]; isOver: boolean; winner: string | null; p1ForceSwitch?: boolean; p2ForceSwitch?: boolean; p1Request?: ShowdownPlayerRequest; p2Request?: ShowdownPlayerRequest }> {
  console.debug(`[DEBUG-ORCHESTRATOR] window.__VITE_DEBUG__ keys:`, typeof window !== 'undefined' && window.__VITE_DEBUG__ ? JSON.stringify(Object.keys(window.__VITE_DEBUG__)) : 'none');
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    const cheatsArray = window.__VITE_DEBUG__.cheats;
    const cheatsLength = Array.isArray(cheatsArray) ? cheatsArray.length : typeof cheatsArray;
    console.debug(`[DEBUG-ORCHESTRATOR] cheats type/length: ${cheatsLength}`);
    if (Array.isArray(cheatsArray)) {
      cheatsArray.forEach((c, i: number) => {
        console.debug(`[DEBUG-ORCHESTRATOR] cheat #${i}: turn=${c.turn}, side=${c.side}, type=${c.type}`);
      });
    }
  }
  if (!showdownWorker) {
    throw new Error('showdownWorker is null')
  }

  const finalP2Choice = p2Choice;
  let turnCheats: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }> = [];

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.cheats) {
    const cheats = window.__VITE_DEBUG__.cheats;
    // Pasar todos los cheats al worker para que los evalúe contra battle.turn de forma robusta y evitar desalineamientos por turnCount de la UI
    if (Array.isArray(cheats)) {
      turnCheats = cheats;
    }
  }

  const isSimulation = typeof window !== 'undefined' && !!window.__VITE_DEBUG__?.isScriptedReplayMode;



  // Registrar elección en el historial local del combate y extraer HPs/estados reactivos para sincronizar cheats con el simulador
  let p1Hps: Record<string, number> | undefined = undefined;
  let p2Hps: Record<string, number> | undefined = undefined;
  let p1Statuses: Record<string, string> | undefined = undefined;
  let p2Statuses: Record<string, string> | undefined = undefined;
  let weatherVal = 'none';

  try {
    const { useBattleStore } = await import('@/stores/battle/battle');
    const battleStore = useBattleStore();
    if (battleStore.state) {
      weatherVal = typeof battleStore.state.weather === 'string' ? battleStore.state.weather : ((battleStore.state.weather as { type?: string } | null)?.type ?? 'none');
      if (!battleStore.state.battleHistory) {
        battleStore.state.battleHistory = [];
      }
      battleStore.state.battleHistory.push({
        turnCount: battleStore.state.turnCount,
        p1Choice,
        p2Choice: finalP2Choice || 'struggle'
      });
    }

    const { useGameStore } = await import('@/stores/game');
    const gameStore = useGameStore();
    if (gameStore?.state?.team) {
      const p1Data = extractTeamHpAndStatus(gameStore.state.team);
      p1Hps = p1Data.hps;
      p1Statuses = p1Data.statuses;
      console.debug(`[ORCHESTRATOR-EXECUTE-DEBUG] Sending p1Hps:`, JSON.stringify(p1Hps), `p1Statuses:`, JSON.stringify(p1Statuses));
    }
    if (battleStore.state?.enemyTeam) {
      const p2Data = extractTeamHpAndStatus(battleStore.state.enemyTeam);
      p2Hps = p2Data.hps;
      p2Statuses = p2Data.statuses;
    }
  } catch (_e) {
    // Ignorar si se ejecuta fuera de contexto de tienda
  }

  showdownWorker.postMessage({
    type: 'EXECUTE_TURN',
    payload: { p1Choice, p2Choice: finalP2Choice, p1Skip, p2Skip, p1Hps, p2Hps, p1Statuses, p2Statuses, cheats: turnCheats, weather: weatherVal, isFuzzerSimulation: isSimulation }
  })
  return new Promise((resolve, reject) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      const { type, payload } = data;
      if (type === 'WORKER_LOG') {
        logger.debug('ShowdownWorker', `[WORKER] ${String(payload)}`);
        return;
      }
      const worker = showdownWorker!
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
          const p1ChoiceIdx = window.__VITE_DEBUG__.p1ChoiceIdx ?? 0;
          const p2ChoiceIdx = window.__VITE_DEBUG__.p2ChoiceIdx ?? 0;

          const nextIndices = advanceChoiceIndices({
            p1ChoiceIdx,
            p2ChoiceIdx,
            p1ActionConsumed: !!(payload as unknown as Record<string, unknown>).p1ActionConsumed,
            p2ActionConsumed: !!(payload as unknown as Record<string, unknown>).p2ActionConsumed,
            logs: payload.logs,
            isSimulation
          });

          window.__VITE_DEBUG__.p1ChoiceIdx = nextIndices.p1ChoiceIdx;
          window.__VITE_DEBUG__.p2ChoiceIdx = nextIndices.p2ChoiceIdx;
          console.debug(`[E2E-SYNC-LOGS-DEBUG] Turn resolved. Final window choice indices -> P1: ${nextIndices.p1ChoiceIdx}, P2: ${nextIndices.p2ChoiceIdx}`);
        }

        // Sincronizar de forma segura las HPs de la banca de vuelta al store reactivo de la UI por índice de slot
        try {
          let battleStore: BattleStoreType | null = null;
          let gameStore: GameStoreType | null = null;

          if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.getGameStore) {
            gameStore = window.__VITE_DEBUG__.getGameStore() as unknown as GameStoreType;
            battleStore = ((gameStore as unknown as { gs?: BattleStoreType })?.gs) || (typeof window !== 'undefined' ? (window as unknown as { __VITE_DEBUG_STORE_RESOLVER__?: () => BattleStoreType }).__VITE_DEBUG_STORE_RESOLVER__?.() : null) || null;
          }

          if (!gameStore) {
            const { useGameStore } = await import('@/stores/game');
            gameStore = useGameStore();
          }
          if (!battleStore) {
            const { useBattleStore } = await import('@/stores/battle/battle');
            battleStore = useBattleStore();
          }

          if (battleStore?.state) {
            battleStore.state.playerRequest = payload.p1Request;
            battleStore.state.enemyRequest = payload.p2Request;
          }
          ['p1', 'p2', 'p3', 'p4'].forEach(seatId => {
            const seatStateKey = `${seatId}TeamState` as keyof WorkerSuccessPayload;
            const seatState = payload[seatStateKey] as Array<SynchronizedPokemonState | null> | undefined;
            if (seatState) {
              lastSyncTeamStates[seatId] = seatState;
            }
          });
          await syncTeamsFromLastWorkerState();
        } catch (_e) {
          // Ignorar errores de sincronización
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
    if (!showdownWorker) {
      reject(new Error('showdownWorker is null'));
      return;
    }
    if (showdownWorker.addEventListener) {
      showdownWorker.addEventListener('message', handler)
    } else {
      showdownWorker.onmessage = handler
    }
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


export async function applyCheatsInWorker(cheats: Array<{ side: 'p1' | 'p2'; type: 'heal' }>): Promise<void> {
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

export function notifyWorkerBattleWin(side: 'p1' | 'p2' = 'p1'): void {
  if (showdownWorker) {
    showdownWorker.postMessage({
      type: 'WIN_BATTLE',
      payload: { side }
    });
  }
}

export function notifyWorkerBattleEnd(): void {
  if (showdownWorker) {
    showdownWorker.postMessage({
      type: 'FORCED_END_BATTLE',
      payload: {}
    });
  }
}

export function testResetShowdownWorker(): void {
  if (showdownWorker) {
    showdownWorker.terminate();
    showdownWorker = null;
  }
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __showdownWorker__?: { terminate: () => void } | null };
    if (w.__showdownWorker__) {
      w.__showdownWorker__.terminate();
      w.__showdownWorker__ = null;
    }
  }
}
