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
  ctx.timerManager.stopTurnTimer();
  ctx.timerManager.stopReconnectCountdown();
  ctx.isReconnecting.value = false;
  ctx.battleState.active = false;
  ctx.battleState.phase = 'over';
  if (ctx.battleState.ch) ctx.battleState.ch.unsubscribe();

  let eloDelta = 0;
  if (ctx.battleState.isRanked) {
    eloDelta = await ctx.pvpStore.updateElo(won, ctx.battleState.opponentElo);
    if (ctx.battleState.opponentId && ctx.battleState.config?.isAsynchronous && ctx.gameStore.db) {
      const defenderDelta = -eloDelta;
      await ctx.gameStore.db.rpc('record_passive_battle_result', {
        p_defender_id: ctx.battleState.opponentId,
        p_result: won ? 'defeat' : 'victory',
        p_delta_elo: defenderDelta,
        p_report_data: {
          opponent: ctx.authStore.user?.user_metadata?.username || ctx.gameStore.state.trainer || 'Rival',
          turns: ctx.battleState.logs.length,
          endedAt: Temporal.Now.instant().toString()
        }
      });
    }
  }

  ctx.uiStore.notify(
    `${reason || (won ? '¡Has ganado!' : 'Has perdido.')}${eloDelta !== 0 ? ` (${eloDelta > 0 ? '+' : ''}${eloDelta} ELO)` : ''}`,
    won ? '🏆' : '💀'
  );

  // Record to personal match history
  const battleCode = generateBattleCode();
  ctx.pvpStore.recordMatchResult({
    id: `match_${Temporal.Now.instant().epochMilliseconds}_${Math.random().toString(36).slice(2, 7)}`,
    battleCode,
    opponentId: ctx.battleState.opponentId || 'trainer',
    opponentName: ctx.battleState.opponentName || 'Rival',
    format: (ctx.battleState.config?.format || '3v3') as PvpMatchFormat,
    isRanked: !!ctx.battleState.isRanked,
    result: won ? 'victory' : 'defeat',
    deltaElo: eloDelta,
    turnsCount: ctx.battleState.logs.length || 1,
    timestamp: Temporal.Now.instant().toString()
  });

  if (ctx.gameStore.state) {
    ctx.gameStore.state.activeBattle = null;
    ctx.gameStore.save(false);
  }

  clearActivePvPSession();

  // Clean up Showdown battle in BattleStore and transition FSM
  if (ctx.battleStore.isBattleActive) {
    await ctx.battleStore.endBattle(won, false);
  }
}
