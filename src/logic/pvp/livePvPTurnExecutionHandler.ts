import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';
import type { PvPAction, PvpTurnStreamPayload, PvpChallengeConfig } from '@/types/battle/pvp';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PvPTimerManager } from './pvpTimerHelper.ts';
import { ShowdownPerspectiveAdapter } from '@/logic/battle/helpers/showdownPerspectiveAdapter.ts';
import { determineLegalAutoPick } from '@/logic/pvp/pvpReconnectHelper';
import type { useBattleStore } from '@/stores/battle/battle.ts';
import type { useUIStore } from '@/stores/ui.ts';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine.ts';

export interface TurnExecutionBattleStateLike {
  isHost: boolean;
  phase: string;
  myPick: PvPAction | null;
  enemyPick: PvPAction | null;
  ch?: Pick<RealtimeChannel, 'send' | 'unsubscribe'> | null;
  config?: PvpChallengeConfig;
  logs: string[];
}

interface TurnStreamPayloadSource {
  logs: string[];
  isOver: boolean;
  winnerSide?: string | null;
  winner?: string | null;
  p2Request?: ShowdownPlayerRequest;
}

interface TurnWinnerResultLike {
  isOver: boolean;
  winnerSide?: string | null;
  winner?: string | null;
}

interface TurnRequestsResultLike {
  p1Request?: ShowdownPlayerRequest;
  p2Request?: ShowdownPlayerRequest;
}

interface BattleStoreStateLike {
  winnerResult?: string;
  playerNames?: Partial<Record<string, string>>;
}

interface TurnPostTransitionContext {
  battleState: TurnExecutionBattleStateLike;
  battleStore: ReturnType<typeof useBattleStore>;
  timerManager: PvPTimerManager;
  uiStore: ReturnType<typeof useUIStore>;
}

function formatPvpChoice(pick: PvPAction | null): string {
  if (!pick) return 'pass';
  if (pick.choiceString) return pick.choiceString;
  if (pick.type === 'switch') return `switch ${(pick.switchIndex ?? 0) + 1}`;
  return `move ${(pick.moveIndex ?? 0) + 1}`;
}

function broadcastHostTurnStream(
  ch: Pick<RealtimeChannel, 'send' | 'unsubscribe'> | null | undefined,
  turnRes: TurnStreamPayloadSource,
  turnCount: number
): void {
  if (!ch) return;
  const resolvedWinnerSide = turnRes.winnerSide || (turnRes.winner === 'p1' || turnRes.winner === 'Player' ? 'p1' : (turnRes.winner ? 'p2' : null));
  ch.send({
    type: 'broadcast',
    event: 'pvp_turn_stream',
    payload: {
      streamLines: turnRes.logs,
      turnNumber: turnCount,
      turn: turnCount,
      over: turnRes.isOver,
      winnerSide: resolvedWinnerSide,
      request: turnRes.p2Request
    }
  });
}

function isHostVictory(
  result: TurnWinnerResultLike,
  battleStoreState: BattleStoreStateLike | null | undefined
): boolean {
  return Boolean(
    battleStoreState?.winnerResult === 'player'
    || result.winnerSide === 'p1'
    || result.winner === 'p1'
    || result.winner === 'Player'
    || (battleStoreState?.playerNames && battleStoreState.playerNames[result.winner || ''] === 'player')
  );
}

async function handlePostTurnTransitions(
  result: TurnRequestsResultLike,
  ctx: TurnPostTransitionContext
): Promise<void> {
  ctx.battleState.myPick = null;
  ctx.battleState.enemyPick = null;

  const p1NeedsSwitch = Boolean(result.p1Request?.forceSwitch?.[0]);
  const p2NeedsSwitch = Boolean(result.p2Request?.forceSwitch?.[0]);

  if (ctx.battleState.config?.isAsynchronous) {
    const { computePassiveEnemyChoice } = await import('@/logic/pvp/passiveMatchmakingHelper');
    if (p1NeedsSwitch && p2NeedsSwitch) {
      ctx.battleState.enemyPick = computePassiveEnemyChoice(result.p2Request);
      ctx.battleState.phase = 'faint_switch';
      ctx.uiStore.isBattleSwitchForced = true;
      ctx.timerManager.startTurnTimer();
    } else if (p1NeedsSwitch) {
      ctx.battleState.enemyPick = null;
      ctx.battleState.phase = 'faint_switch';
      ctx.uiStore.isBattleSwitchForced = true;
      ctx.timerManager.startTurnTimer();
    } else {
      ctx.battleState.phase = 'choosing';
      await ctx.battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);
      ctx.timerManager.startTurnTimer();
    }
  } else {
    if (p1NeedsSwitch) {
      ctx.battleState.phase = 'faint_switch';
      ctx.uiStore.isBattleSwitchForced = true;
      ctx.timerManager.startTurnTimer();
    } else if (p2NeedsSwitch) {
      ctx.battleState.phase = 'waiting';
    } else {
      ctx.battleState.phase = 'choosing';
      await ctx.battleStore.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT);
      ctx.timerManager.startTurnTimer();
    }
  }
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

  ctx.battleState.phase = 'resolving';

  try {
    const p1Choice = formatPvpChoice(ctx.battleState.myPick);
    const p2Choice = formatPvpChoice(ctx.battleState.enemyPick);

    const { executeCanonicalTurn } = await import('@/logic/battle/helpers/canonicalTurnRunner');
    const result = await executeCanonicalTurn(
      ctx.battleStore.getContext(),
      p1Choice,
      p2Choice,
      false,
      false,
      (turnRes) => {
        const turnCount = (ctx.battleStore.state?.turnCount || 0) + 1;
        broadcastHostTurnStream(ctx.battleState.ch, turnRes, turnCount);
      }
    );

    if (result.isOver) {
      const won = Boolean(isHostVictory(result, ctx.battleStore.state));
      await ctx.endBattle(won, won ? '¡Victoria en PvP!' : 'Derrota en PvP.');
    } else {
      await handlePostTurnTransitions(result, ctx);
    }
  } catch (err) {
    console.error('[resolveTurn Error]', err);
    ctx.battleState.phase = 'choosing';
  }
}

function updateStoreTurnState(
  battleStore: ReturnType<typeof useBattleStore>,
  payload: PvpTurnStreamPayload & { request?: ShowdownPlayerRequest },
  isSpectator: boolean
): void {
  if (!battleStore.state) return;

  battleStore.state.turnCount = payload.turnNumber ?? payload.turn ?? ((battleStore.state.turnCount || 0) + 1);
  if (payload.request && !isSpectator) {
    battleStore.state.playerRequest = ShowdownPerspectiveAdapter.invertRequest(payload.request);
  }
}

function resolveGuestPhaseAfterStream(
  battleState: TurnExecutionBattleStateLike,
  battleStore: ReturnType<typeof useBattleStore>,
  uiStore: ReturnType<typeof useUIStore>,
  timerManager: PvPTimerManager
): void {
  battleState.myPick = null;
  battleState.enemyPick = null;
  const guestNeedsSwitch = Boolean(battleStore.state?.playerRequest?.forceSwitch?.[0]);
  const enemyFainted = (battleStore.state?.enemy?.hp ?? 1) <= 0;

  if (guestNeedsSwitch) {
    battleState.phase = 'faint_switch';
    uiStore.isBattleSwitchForced = true;
    timerManager.startTurnTimer();
  } else if (enemyFainted) {
    battleState.phase = 'waiting';
  } else {
    battleState.phase = 'choosing';
    timerManager.startTurnTimer();
  }
}

async function handleStreamCompletionOrTransitions(
  payload: PvpTurnStreamPayload,
  ctx: {
    battleState: TurnExecutionBattleStateLike;
    battleStore: ReturnType<typeof useBattleStore>;
    timerManager: PvPTimerManager;
    uiStore: ReturnType<typeof useUIStore>;
    isSpectator: boolean;
    endBattle: (won: boolean, reason: string) => Promise<void>;
  }
): Promise<void> {
  if (payload.over) {
    const won = payload.winnerSide === 'p2';
    if (!ctx.isSpectator) {
      await ctx.endBattle(won, won ? '¡Victoria en PvP!' : 'Derrota en PvP.');
    } else {
      ctx.uiStore.notify(`Batalla finalizada. Ganador: ${payload.winnerSide?.toUpperCase()}`, '🏁');
    }
  } else if (!ctx.isSpectator) {
    resolveGuestPhaseAfterStream(ctx.battleState, ctx.battleStore, ctx.uiStore, ctx.timerManager);
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

  updateStoreTurnState(ctx.battleStore, payload, ctx.isSpectator);

  const filteredLogs = filterShowdownLogs(streamLines);
  await parseLogsWithSkip(ctx.battleStore.getContext(), filteredLogs, false, false);
  await syncTeamsFromLastWorkerState();

  await handleStreamCompletionOrTransitions(payload, ctx);
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
  },
  isManual = true
): Promise<void> {
  if (ctx.battleState.phase !== 'choosing' && ctx.battleState.phase !== 'faint_switch') return;
  ctx.timerManager.stopTurnTimer();
  if (isManual) {
    ctx.timerManager.resetStrikes();
    ctx.afkStrikes.value = 0;
  }

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
  commitPick: (pick: PvPAction, isManual?: boolean) => void;
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
    ctx.commitPick(autoPick, false);
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
      ctx.timerManager.startTurnTimer();
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


