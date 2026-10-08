import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleState, ShowdownPlayerRequest } from '@/types/battle/battle';
import { extractTeamHpAndStatus } from './helpers/showdownSyncHelper.ts';
import { findMatchingPokemon } from './showdownUidMapper.ts';
import { resolveBattleStore, resolveGameStore } from './showdownWorkerInstance.ts';

export interface SynchronizedPokemonState {
  uid: string;
  hp: number;
  maxHp?: number;
  status: string;
  fainted: boolean;
}

export const lastSyncTeamStates: Record<string, Array<SynchronizedPokemonState | null> | null> = {
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

export interface WorkerSuccessPayload {
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

export interface PreparedTurnState {
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weatherVal: string;
}

export function prepareTurnStateForWorker(p1Choice: string, p2Choice: string, replayContext: string): PreparedTurnState {
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

export function syncWorkerTurnSuccessToClient(payload: WorkerSuccessPayload): void {
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
