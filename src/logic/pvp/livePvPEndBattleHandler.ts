import type { Ref } from 'vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PvPTimerManager } from './pvpTimerHelper.ts';
import type { PvpForfeitPayload, PvpMatchFormat, PvpChallengeConfig } from '@/types/battle/pvp';
import type { usePvPStore } from '@/stores/pvp.ts';
import type { useGameStore } from '@/stores/game.ts';
import type { useAuthStore } from '@/stores/auth.ts';
import type { useUIStore } from '@/stores/ui.ts';
import type { useBattleStore } from '@/stores/battle/battle.ts';
import { generateBattleCode } from '@/logic/pvp/replayCodeGenerator.ts';
import { clearActivePvPSession } from '@/logic/pvp/pvpReconnectHelper';

export interface EndBattleStateLike {
  active: boolean;
  phase: string;
  isHost?: boolean;
  isRanked?: boolean;
  opponentId?: string | null;
  opponentName?: string;
  opponentElo?: number;
  deadline?: number | null;
  ch?: Pick<RealtimeChannel, 'send' | 'unsubscribe'> | null;
  inviteId?: string | null;
  config?: PvpChallengeConfig;
  logs: string[];
}

export function executeForfeit(ctx: {
  battleState: Pick<EndBattleStateLike, 'ch' | 'isHost'>;
  timerManager: PvPTimerManager;
  endBattle: (won: boolean, reason: string) => Promise<void>;
}): void {
  ctx.timerManager.stopTurnTimer();
  ctx.timerManager.stopReconnectCountdown();
  if (ctx.battleState.ch) {
    const forfeitPayload: PvpForfeitPayload = {
      actorSide: ctx.battleState.isHost ? 'p1' : 'p2',
      reason: 'forfeit'
    };
    ctx.battleState.ch.send({ type: 'broadcast', event: 'pvp_forfeit', payload: forfeitPayload });
  }
  ctx.endBattle(false, 'Te has rendido.');
}

const DEFAULT_TURNS_COUNT = 1 as const;
const DEFAULT_OPPONENT_NAME = 'Rival' as const;
const DEFAULT_OPPONENT_ID = 'trainer' as const;
const DEFAULT_PVP_FORMAT = '3v3' as const;
const MATCH_ID_SLICE_START = 2 as const;
const MATCH_ID_SLICE_END = 7 as const;

function resetPvPBattleSession(
  battleState: EndBattleStateLike,
  timerManager: PvPTimerManager,
  isReconnecting: Ref<boolean>
): void {
  timerManager.stopTurnTimer();
  timerManager.stopReconnectCountdown();
  isReconnecting.value = false;
  battleState.active = false;
  battleState.phase = 'over';
  if (battleState.ch) battleState.ch.unsubscribe();
}

async function processRankedResult(
  won: boolean,
  battleState: EndBattleStateLike,
  pvpStore: ReturnType<typeof usePvPStore>,
  gameStore: ReturnType<typeof useGameStore>,
  authStore: ReturnType<typeof useAuthStore>
): Promise<number> {
  if (!battleState.isRanked) return 0;
  const eloDelta = await pvpStore.updateElo(won, battleState.opponentElo);
  if (battleState.opponentId && battleState.config?.isAsynchronous && gameStore.db) {
    const defenderDelta = -eloDelta;
    await gameStore.db.rpc('record_passive_battle_result', {
      p_defender_id: battleState.opponentId,
      p_result: won ? 'defeat' : 'victory',
      p_delta_elo: defenderDelta,
      p_report_data: {
        opponent: authStore.user?.user_metadata?.username || gameStore.state.trainer || DEFAULT_OPPONENT_NAME,
        turns: battleState.logs.length,
        endedAt: Temporal.Now.instant().toString()
      }
    });
  }
  return eloDelta;
}

function recordPersonalMatchHistory(
  won: boolean,
  eloDelta: number,
  battleState: EndBattleStateLike,
  pvpStore: ReturnType<typeof usePvPStore>
): void {
  const battleCode = generateBattleCode();
  pvpStore.recordMatchResult({
    id: `match_${Temporal.Now.instant().epochMilliseconds}_${Math.random().toString(36).slice(MATCH_ID_SLICE_START, MATCH_ID_SLICE_END)}`,
    battleCode,
    opponentId: battleState.opponentId || DEFAULT_OPPONENT_ID,
    opponentName: battleState.opponentName || DEFAULT_OPPONENT_NAME,
    format: (battleState.config?.format || DEFAULT_PVP_FORMAT) as PvpMatchFormat,
    isRanked: !!battleState.isRanked,
    result: won ? 'victory' : 'defeat',
    deltaElo: eloDelta,
    turnsCount: battleState.logs.length || DEFAULT_TURNS_COUNT,
    timestamp: Temporal.Now.instant().toString()
  });
}

export async function executeEndBattle(
  won: boolean,
  reason: string,
  ctx: {
    battleState: EndBattleStateLike;
    timerManager: PvPTimerManager;
    isReconnecting: Ref<boolean>;
    pvpStore: ReturnType<typeof usePvPStore>;
    gameStore: ReturnType<typeof useGameStore>;
    authStore: ReturnType<typeof useAuthStore>;
    uiStore: ReturnType<typeof useUIStore>;
    battleStore: ReturnType<typeof useBattleStore>;
  }
): Promise<void> {
  resetPvPBattleSession(ctx.battleState, ctx.timerManager, ctx.isReconnecting);

  const eloDelta = await processRankedResult(won, ctx.battleState, ctx.pvpStore, ctx.gameStore, ctx.authStore);

  ctx.uiStore.notify(
    `${reason || (won ? '¡Has ganado!' : 'Has perdido.')}${eloDelta !== 0 ? ` (${eloDelta > 0 ? '+' : ''}${eloDelta} ELO)` : ''}`,
    won ? '🏆' : '💀'
  );

  recordPersonalMatchHistory(won, eloDelta, ctx.battleState, ctx.pvpStore);

  if (ctx.gameStore.state) {
    ctx.gameStore.state.activeBattle = null;
    await ctx.gameStore.save(false);
  }

  clearActivePvPSession();

  // Clean up Showdown battle in BattleStore and transition FSM
  if (ctx.battleStore.isBattleActive) {
    await ctx.battleStore.endBattle(won, false);
  }
}
