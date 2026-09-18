import type { Pokemon } from '@/types/pokemon/pokemon';

export interface ReqMoveEntry {
  id?: string;
  move?: string;
  disabled?: boolean | 'pp';
}

const CONTROLS_DISABLED_STATES_LIST = [
  'INITIALIZING',
  'FIRST_INTRO',
  'LEVEL_UP_MODAL',
  'REWARDS_PHASE'
] as const;
export type ControlsDisabledState = (typeof CONTROLS_DISABLED_STATES_LIST)[number];
export const CONTROLS_DISABLED_STATES: ReadonlySet<ControlsDisabledState> = new Set(CONTROLS_DISABLED_STATES_LIST);

const AUTO_BATTLE_SUBSTATES_LIST = [
  'COMBAT_OR_FLEE',
  'SILHOUETTE_MODE'
] as const;
export type AutoBattleSubstate = (typeof AUTO_BATTLE_SUBSTATES_LIST)[number];
export const AUTO_BATTLE_SUBSTATES: ReadonlySet<AutoBattleSubstate> = new Set(AUTO_BATTLE_SUBSTATES_LIST);

const FINISH_OVERLAY_SEARCH_SUBSTATES_LIST = [
  'WAIT_INPUT',
  'COMBAT_OR_FLEE',
  'PARALLEL_PREP',
  'BUSH_VISIBLE',
  'SILHOUETTE_MODE',
  'GEN_NEW_S2'
] as const;
export type FinishOverlaySearchSubstate = (typeof FINISH_OVERLAY_SEARCH_SUBSTATES_LIST)[number];
export const FINISH_OVERLAY_SEARCH_SUBSTATES: ReadonlySet<FinishOverlaySearchSubstate> = new Set(FINISH_OVERLAY_SEARCH_SUBSTATES_LIST);

export function isControlsDisabledState(state: string | null | undefined): boolean {
  return state ? CONTROLS_DISABLED_STATES.has(state as ControlsDisabledState) : false;
}

export function isAutoBattleSubstate(subState: string | null | undefined): boolean {
  return subState ? AUTO_BATTLE_SUBSTATES.has(subState as AutoBattleSubstate) : false;
}

export function isFinishOverlaySearchSubstate(subState: string | null | undefined): boolean {
  return subState ? FINISH_OVERLAY_SEARCH_SUBSTATES.has(subState as FinishOverlaySearchSubstate) : false;
}

function isRechargeMoveRequired(p: Pokemon, reqMoves?: ReqMoveEntry[]): boolean {
  if ((p.volatileCounters?.['mustrecharge'] ?? 0) > 0) return true;
  if (reqMoves && reqMoves.length === 1) {
    const first = reqMoves[0];
    return first?.id === 'recharge' || first?.move === 'Recharge';
  }
  return false;
}

function resolveLockedOrTwoTurnMoveIndex(p: Pokemon, reqMoves?: ReqMoveEntry[]): number | null {
  const hasLockedMove = (p.volatileCounters?.['lockedmove'] ?? 0) > 0;
  const hasTwoTurn = (p.volatileCounters?.['twoturnmove'] ?? 0) > 0;
  const hasThrash = (p.thrashTurns ?? 0) > 0;

  if (!hasLockedMove && !hasTwoTurn && !hasThrash) return null;

  const singleReqId = reqMoves && reqMoves.length === 1 ? reqMoves[0]?.id : undefined;
  const targetId = singleReqId || p.lastMove?.id;
  if (targetId) {
    const forcedIdx = p.moves.findIndex(m => m?.id === targetId);
    if (forcedIdx !== -1) return forcedIdx;
  }
  if (hasThrash) {
    const thrashIdx = p.moves.findIndex(m => m?.id === 'thrash');
    if (thrashIdx !== -1) return thrashIdx;
  }
  return null;
}

export function resolveForcedMoveIndex(
  subState: string | null | undefined,
  isProcessing: boolean,
  p: Pokemon | null | undefined,
  reqMoves?: ReqMoveEntry[]
): number | null {
  if (String(subState) !== 'WAIT_INPUT' || isProcessing || !p) return null;

  const nonDisabledReqMoves = reqMoves ? reqMoves.filter(m => !m.disabled) : undefined;
  if (nonDisabledReqMoves && nonDisabledReqMoves.length > 1) {
    if (p.volatileCounters?.['lockedmove']) {
      delete p.volatileCounters['lockedmove'];
    }
    return null;
  }

  if (isRechargeMoveRequired(p, reqMoves)) return 0;

  return resolveLockedOrTwoTurnMoveIndex(p, reqMoves);
}
