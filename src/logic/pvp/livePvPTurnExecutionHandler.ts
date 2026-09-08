import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';
import type { PvPAction, PvpTurnStreamPayload, PvpChallengeConfig } from '@/types/battle/pvp';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PvPTimerManager } from './pvpTimerHelper.ts';
import { ShowdownPerspectiveAdapter } from '@/logic/battle/helpers/showdownPerspectiveAdapter.ts';
import { determineLegalAutoPick } from '@/logic/pvp/pvpReconnectHelper';
import type { useBattleStore } from '@/stores/battle/battle.ts';
import type { useUIStore } from '@/stores/ui.ts';

export interface TurnExecutionBattleStateLike {
  isHost: boolean;
  phase: string;
  myPick: PvPAction | null;
  enemyPick: PvPAction | null;
  ch?: Pick<RealtimeChannel, 'send' | 'unsubscribe'> | null;
  config?: PvpChallengeConfig;
  logs: string[];
}

export async function executeResolveTurn(ctx: {
  battleState: TurnExecutionBattleStateLike;
  battleStore: ReturnType<typeof useBattleStore>;
  timerManager: PvPTimerManager;
  uiStore: ReturnType<typeof useUIStore>;
  endBattle: (won: boolean, reason: string) => Promise<void>;
  resolveTurnRecursion: () => Promise<void>;
}): Promise<void> {
  if (!ctx.battleState.isHost) return;
  const hostPick = ctx.battleState.myPick;
  const guestPick = ctx.battleState.enemyPick;

  ctx.battleState.phase = 'resolving';

  try {
    const p1Choice = hostPick
      ? (hostPick.choiceString || (hostPick.type === 'switch' ? `switch ${(hostPick.switchIndex ?? 0) + 1}` : `move ${(hostPick.moveIndex ?? 0) + 1}`))
      : 'pass';
    const p2Choice = guestPick
      ? (guestPick.choiceString || (guestPick.type === 'switch' ? `switch ${(guestPick.switchIndex ?? 0) + 1}` : `move ${(guestPick.moveIndex ?? 0) + 1}`))
      : 'pass';

    const { executeCanonicalTurn } = await import('@/logic/battle/helpers/canonicalTurnRunner');
    const result = await executeCanonicalTurn(
      ctx.battleStore.getContext(),
      p1Choice,
      p2Choice,
      false,
      false,
      (turnRes) => {
        if (ctx.battleState.ch) {
          const turnCount = (ctx.battleStore.state?.turnCount || 0) + 1;
          ctx.battleState.ch.send({
            type: 'broadcast',
            event: 'pvp_turn_stream',
            payload: {
              streamLines: turnRes.logs,
              turnNumber: turnCount,
              turn: turnCount,
              over: turnRes.isOver,
              winnerSide: turnRes.winner as 'p1' | 'p2' | null,
              request: turnRes.p2Request
            }
          });
        }
      }
    );

    if (result.isOver) {
      const won = result.winner === 'p1';
      await ctx.endBattle(won, won ? '¡Victoria en PvP!' : 'Derrota en PvP.');
    } else if (ctx.battleState.config?.isAsynchronous) {
      ctx.battleState.myPick = null;
      ctx.battleState.enemyPick = null;

      const p1NeedsSwitch = Boolean(result.p1Request?.forceSwitch?.[0]);
      const p2NeedsSwitch = Boolean(result.p2Request?.forceSwitch?.[0]);
      const { computePassiveEnemyChoice } = await import('@/logic/pvp/passiveMatchmakingHelper');

      if (p1NeedsSwitch && p2NeedsSwitch) {
        ctx.battleState.enemyPick = computePassiveEnemyChoice(result.p2Request);
        ctx.battleState.phase = 'faint_switch';
        ctx.uiStore.isBattleSwitchForced = true;
      } else if (p1NeedsSwitch) {
        ctx.battleState.enemyPick = null;
        ctx.battleState.phase = 'faint_switch';
        ctx.uiStore.isBattleSwitchForced = true;
      } else if (p2NeedsSwitch) {
        ctx.battleState.myPick = null;
        ctx.battleState.enemyPick = computePassiveEnemyChoice(result.p2Request);
        await ctx.resolveTurnRecursion();
      } else {
        ctx.battleState.phase = 'choosing';
        ctx.timerManager.startTurnTimer();
      }
    } else {
      ctx.battleState.myPick = null;
      ctx.battleState.enemyPick = null;
      if (result.p1Request?.forceSwitch?.[0]) {
        ctx.battleState.phase = 'faint_switch';
        ctx.uiStore.isBattleSwitchForced = true;
      } else if (result.p2Request?.forceSwitch?.[0]) {
        ctx.battleState.phase = 'waiting';
      } else {
        ctx.battleState.phase = 'choosing';
        ctx.timerManager.startTurnTimer();
      }
    }
  } catch (err) {
    console.error('[resolveTurn Error]', err);
    ctx.battleState.phase = 'choosing';
  }
}

export async function executeHandleTurnStream(
  payload: PvpTurnStreamPayload & { request?: ShowdownPlayerRequest },
  ctx: {
    battleState: TurnExecutionBattleStateLike;
    battleStore: ReturnType<typeof useBattleStore>;
    timerManager: PvPTimerManager;
    uiStore: ReturnType<typeof useUIStore>;
    isSpectator: boolean;
    endBattle: (won: boolean, reason: string) => Promise<void>;
  }
): Promise<void> {
  if (ctx.battleState.isHost && !ctx.isSpectator) return;

  const { filterShowdownLogs } = await import('@/logic/battle/showdownBridge');
  const { parseLogsWithSkip } = await import('@/logic/battle/helpers/turnActionResolver');
  const { syncTeamsFromLastWorkerState } = await import('@/logic/battle/showdownWorkerClient');

  const streamLines = ctx.isSpectator
    ? payload.streamLines
    : ShowdownPerspectiveAdapter.invertStream(payload.streamLines);

  ctx.battleState.logs.push(...streamLines);

  if (ctx.battleStore.state) {
    ctx.battleStore.state.turnCount = payload.turnNumber ?? payload.turn ?? ((ctx.battleStore.state.turnCount || 0) + 1);
    if (payload.request && !ctx.isSpectator) {
      ctx.battleStore.state.playerRequest = ShowdownPerspectiveAdapter.invertRequest(payload.request);
    }
  }

  const filteredLogs = filterShowdownLogs(streamLines);
  await parseLogsWithSkip(ctx.battleStore.getContext(), filteredLogs, false, false);
  await syncTeamsFromLastWorkerState();

  if (payload.over) {
    const won = payload.winnerSide === 'p2';
    if (!ctx.isSpectator) {
      await ctx.endBattle(won, won ? '¡Victoria en PvP!' : 'Derrota en PvP.');
    } else {
      ctx.uiStore.notify(`Batalla finalizada. Ganador: ${payload.winnerSide?.toUpperCase()}`, '🏁');
    }
  } else if (!ctx.isSpectator) {
    ctx.battleState.myPick = null;
    ctx.battleState.enemyPick = null;
    const guestNeedsSwitch = Boolean(ctx.battleStore.state?.playerRequest?.forceSwitch?.[0]);
    const enemyFainted = (ctx.battleStore.state?.enemy?.hp ?? 1) <= 0;
    if (guestNeedsSwitch) {
      ctx.battleState.phase = 'faint_switch';
      ctx.uiStore.isBattleSwitchForced = true;
    } else if (enemyFainted) {
      ctx.battleState.phase = 'waiting';
    } else {
      ctx.battleState.phase = 'choosing';
      ctx.timerManager.startTurnTimer();
    }
  }
}

export function executeCheckReadyToResolve(
  battleState: TurnExecutionBattleStateLike,
  battleStore: ReturnType<typeof useBattleStore>,
  resolveTurn: () => Promise<void>
): void {
  if (!battleState.isHost) return;
  const p1Req = battleStore.state?.playerRequest;
  const p2Req = battleStore.state?.enemyRequest;

  const p1NeedsSwitch = Boolean(p1Req?.forceSwitch?.[0]);
  const p2NeedsSwitch = Boolean(p2Req?.forceSwitch?.[0]);
  const isFaintSwitchTurn = p1NeedsSwitch || p2NeedsSwitch;

  if (isFaintSwitchTurn) {
    const p1Ready = !p1NeedsSwitch || Boolean(battleState.myPick);
    const p2Ready = !p2NeedsSwitch || Boolean(battleState.enemyPick);
    if (p1Ready && p2Ready) {
      void resolveTurn();
    }
  } else {
    if (battleState.myPick && battleState.enemyPick) {
      void resolveTurn();
    }
  }
}

export async function executeCommitPick(
  pick: PvPAction,
  ctx: {
    battleState: TurnExecutionBattleStateLike;
    timerManager: PvPTimerManager;
    afkStrikes: { value: number };
    battleStore: ReturnType<typeof useBattleStore>;
    resolveTurn: () => Promise<void>;
  }
): Promise<void> {
  if (ctx.battleState.phase !== 'choosing' && ctx.battleState.phase !== 'faint_switch') return;
  ctx.timerManager.stopTurnTimer();
  ctx.timerManager.resetStrikes();
  ctx.afkStrikes.value = 0;

  ctx.battleState.myPick = pick;
  ctx.battleState.phase = 'waiting';

  if (ctx.battleState.config?.isAsynchronous) {
    if (!ctx.battleState.enemyPick) {
      const { computePassiveEnemyChoice } = await import('@/logic/pvp/passiveMatchmakingHelper');
      ctx.battleState.enemyPick = computePassiveEnemyChoice(ctx.battleStore.state?.enemyRequest);
    }
    executeCheckReadyToResolve(ctx.battleState, ctx.battleStore, ctx.resolveTurn);
  } else if (ctx.battleState.isHost) {
    executeCheckReadyToResolve(ctx.battleState, ctx.battleStore, ctx.resolveTurn);
  } else {
    if (ctx.battleState.ch) {
      ctx.battleState.ch.send({ type: 'broadcast', event: 'pvp_pick', payload: pick });
    }
  }
}

export interface CheckPostTurnContext {
  battleState: {
    myHp: number[];
    enemyHp: number[];
    myActiveIdx: number;
    enemyActiveIdx: number;
    phase: string;
    myPick: PvPAction | null;
    enemyPick: PvPAction | null;
  };
  uiStore: { isBattleSwitchForced: boolean };
  timerManager: PvPTimerManager;
  endBattle: (won: boolean, reason: string) => Promise<void>;
}

export interface HandleTurnTimeoutContext {
  uiStore: ReturnType<typeof useUIStore>;
  forfeit: () => void;
  battleStore: ReturnType<typeof useBattleStore>;
  battleState: { myTeam: Pokemon[] };
  commitPick: (pick: PvPAction) => void;
}

export function executeHandleTurnTimeout(
  isForfeit: boolean,
  ctx: HandleTurnTimeoutContext
): void {
  if (isForfeit) {
    ctx.uiStore.notify('Has perdido por inactividad (2 strikes AFK).', '⚠️');
    ctx.forfeit();
  } else {
    ctx.uiStore.notify('Tiempo de turno agotado (Strike 1/2). Ejecutando acción automática.', '⏱️');
    const req = ctx.battleStore.state?.playerRequest;
    const autoPick = determineLegalAutoPick(req, ctx.battleState.myTeam);
    ctx.commitPick(autoPick);
  }
}

export function executeCheckPostTurn(ctx: CheckPostTurnContext): void {
  const myHp = ctx.battleState.myHp[ctx.battleState.myActiveIdx] || 0;
  const enHp = ctx.battleState.enemyHp[ctx.battleState.enemyActiveIdx] || 0;
  if (myHp <= 0) {
    if (!ctx.battleState.myHp.some(h => h > 0)) {
      void ctx.endBattle(false, '¡Has sido derrotado!');
    } else {
      ctx.battleState.phase = 'faint_switch';
      ctx.uiStore.isBattleSwitchForced = true;
    }
  } else if (enHp <= 0) {
    if (!ctx.battleState.enemyHp.some(h => h > 0)) {
      void ctx.endBattle(true, '¡Has ganado la batalla!');
    } else {
      ctx.battleState.phase = 'waiting';
    }
  } else {
    ctx.battleState.phase = 'choosing';
    ctx.battleState.myPick = null;
    ctx.battleState.enemyPick = null;
    ctx.timerManager.startTurnTimer();
  }
}


