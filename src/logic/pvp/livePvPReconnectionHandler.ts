/**
 * src/logic/pvp/livePvPReconnectionHandler.ts
 *
 * Helper for live PvP match reconnection and spectator synchronization.
 * Handles rehydration of ongoing battles and spectator channel events.
 */

import { gsap } from 'gsap';
import type { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper.ts';
import type { PvpReconnectPayload } from '@/types/battle/pvp';
import type { PvpSpectateSyncPayload } from '@/logic/pvp/pvpSpectatorHelper';
import { buildHostSpectateBroadcast } from '@/logic/pvp/pvpRoomActionsHelper';
import { useBattleStore } from '@/stores/battle/battle.ts';
import type { RealtimeChannel } from '@supabase/supabase-js';

const RECONNECT_BROADCAST_DELAY_SEC = 0.8 as const;
const DEFAULT_TURN_NUMBER = 1 as const;

type RealtimeSendPayload = Parameters<RealtimeChannel['send']>[0];

export interface PvpChannelSender {
  send: (args: RealtimeSendPayload) => unknown;
}

export interface ReconnectionHandlerContext {
  battleState: {
    active: boolean;
    inviteId: string | null;
    isHost: boolean;
    isRanked: boolean;
    opponentId: string | null;
    opponentName: string;
    ch: PvpChannelSender | null;
  };
  timerManager: PvPTimerManager;
  isReconnecting: { value: boolean };
  setupBattleChannel: (inviteId: string) => void;
}

export function executeReconnectBattle(
  restoredBattle: unknown,
  ctx: ReconnectionHandlerContext
): void {
  const b = restoredBattle as {
    matchId?: string;
    pvpMatchId?: string; // uuid-ok: Supabase battle match uuid
    isPvP?: boolean;
    isHost?: boolean;
    pvpIsHost?: boolean;
    opponentId?: string | null;
    pvpOpponentId?: string | null; // uuid-ok: Supabase opponent user uuid
    opponentName?: string;
    isRanked?: boolean;
    turnCount?: number;
  };

  const matchId = b?.matchId || b?.pvpMatchId;
  if (!matchId) return;

  ctx.battleState.active = true;
  ctx.battleState.inviteId = matchId;
  ctx.battleState.isHost = Boolean(b.isHost ?? b.pvpIsHost);
  ctx.battleState.opponentId = (b.opponentId !== undefined ? b.opponentId : b.pvpOpponentId) || null;
  if (b.opponentName) {
    ctx.battleState.opponentName = b.opponentName;
  }
  if (typeof b.isRanked === 'boolean') {
    ctx.battleState.isRanked = b.isRanked;
  }

  ctx.setupBattleChannel(matchId);

  // Notify opponent of reconnection and start reconnect timer window
  ctx.timerManager.startReconnectCountdown();
  ctx.isReconnecting.value = true;

  const payload: PvpReconnectPayload = {
    matchId,
    side: ctx.battleState.isHost ? 'p1' : 'p2',
    lastTurnNumber: b.turnCount || DEFAULT_TURN_NUMBER
  };

  gsap.delayedCall(RECONNECT_BROADCAST_DELAY_SEC, () => {
    if (ctx.battleState.ch) {
      ctx.battleState.ch.send({ type: 'broadcast', event: 'pvp_reconnect', payload });
    }
  });
}

export interface SpectatorHandlerContext {
  battleState: {
    active: boolean;
    inviteId: string | null;
    isHost: boolean;
    opponentName: string;
    ch: PvpChannelSender | null;
  };
  isSpectator: { value: boolean };
  setupBattleChannel: (inviteId: string) => void;
  userId?: string;
  hasDb: boolean;
}

export function executeSpectateMatch(
  matchId: string,
  ctx: SpectatorHandlerContext
): void {
  if (!ctx.hasDb) return;
  ctx.isSpectator.value = true;
  ctx.battleState.active = true;
  ctx.battleState.inviteId = matchId;

  ctx.setupBattleChannel(matchId);

  if (ctx.battleState.ch) {
    ctx.battleState.ch.send({
      type: 'broadcast',
      event: 'pvp_spectate_join',
      payload: { spectatorId: ctx.userId || 'anon' }
    });
  }
}

export function executeHandleSpectateJoin(
  ctx: {
    battleState: {
      isHost: boolean;
      inviteId: string | null;
      opponentName: string;
      ch: PvpChannelSender | null;
    };
  }
): void {
  if (!ctx.battleState.isHost) return;
  const battleStore = useBattleStore();
  const snapshot = buildHostSpectateBroadcast(
    ctx.battleState.inviteId || '',
    battleStore.getContext(),
    ctx.battleState.opponentName
  );
  if (snapshot && ctx.battleState.ch) {
    ctx.battleState.ch.send({
      type: 'broadcast',
      event: 'pvp_spectate_sync',
      payload: snapshot
    });
  }
}

export function executeHandleSpectateSync(
  payload: PvpSpectateSyncPayload,
  isSpectator: boolean
): void {
  if (!isSpectator) return;
  const battleStore = useBattleStore();
  const enemyLeader = payload.guestTeam[0];
  if (enemyLeader) {
    battleStore.startBattle(enemyLeader, {
      isPvP: true,
      pvpMatchId: payload.matchId,
      isTrainer: true,
      trainerName: payload.guestTrainerName,
      playerTeam: payload.hostTeam,
      enemyTeam: payload.guestTeam,
      locationId: 'gym'
    });
    if (battleStore.state) {
      battleStore.state.turnCount = payload.turnCount;
    }
  }
}

export function executeHandleOpponentReconnect(
  payload: PvpReconnectPayload,
  ctx: {
    notify: (msg: string, icon?: string) => void;
    timerManager: PvPTimerManager;
    isReconnecting: { value: boolean };
  }
): void {
  ctx.notify(`El rival se ha reconectado (Turno ${payload.lastTurnNumber}).`, '🔄');
  ctx.timerManager.stopReconnectCountdown();
  ctx.isReconnecting.value = false;
}

