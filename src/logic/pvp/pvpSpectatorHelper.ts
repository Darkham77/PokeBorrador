import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

export interface PvpSpectateSyncPayload {
  matchId: string;
  turnCount: number;
  hostTrainerName: string;
  guestTrainerName: string;
  hostTeam: Pokemon[];
  guestTeam: Pokemon[];
  hostActiveUid?: string;
  guestActiveUid?: string;
  logs: string[];
  weather?: string;
}

/**
 * Builds an authoritative snapshot payload from the Host's active battle state
 * to synchronize newly joined spectators.
 */
export function buildSpectateSyncPayload(
  matchId: string,
  ctx: BattleContext,
  guestTrainerName: string
): PvpSpectateSyncPayload | null {
  const active = ctx.activeBattle.value;
  if (!active) return null;

  const playerTeam = active.playerTeam || [];
  const enemyTeam = active.enemyTeam || [];

  return {
    matchId,
    turnCount: active.turnCount || 0,
    hostTrainerName: ctx.gs.state.trainer || 'Anfitrión',
    guestTrainerName,
    hostTeam: cloneReactive(playerTeam),
    guestTeam: cloneReactive(enemyTeam),
    hostActiveUid: active.player?.uid,
    guestActiveUid: active.enemy?.uid,
    logs: (ctx.battleLogs.value || []).map(l => (typeof l === 'string' ? l : l.msg)),
    weather: typeof active.weather === 'string' ? active.weather : active.weather?.type
  };
}
