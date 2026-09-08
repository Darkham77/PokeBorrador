/**
 * src/logic/pvp/livePvPPassiveFallbackHandler.ts
 *
 * Handler for ranked PvP matchmaking fallback against passive defense teams.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PvpChallengeConfig, PvPBattleState } from '@/types/battle/pvp';
import type { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper.ts';
import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay.ts';
import type { DBRouter } from '@/logic/db/dbRouter.ts';

const MAX_POKEMON_3V3 = 3 as const;

export interface PassiveFallbackParams {
  opponentId: string;
  opponentName: string;
  opponentElo: number;
  enemyTeam: Pokemon[];
}

export interface PassiveFallbackContext {
  resolvePvpTeam: (format?: string) => Pokemon[];
  notify: (msg: string, icon?: string) => void;
  timerManager: PvPTimerManager;
  afkStrikes: { value: number };
  myTeamConfirmed: { value: boolean };
  enemyTeamConfirmed: { value: boolean };
  currentSeasonRules?: { maxPokemon?: number } | null;
  battleState: PvPBattleState & {
    active: boolean;
    isHost: boolean;
    isRanked: boolean;
    inviteId: string | null;
    config?: PvpChallengeConfig;
    opponentId: string | null;
    opponentName: string;
    opponentElo: number;
    ch: unknown;
  };
}

export function executeStartPassiveBattle(
  params: PassiveFallbackParams,
  ctx: PassiveFallbackContext
): void {
  const maxP = ctx.currentSeasonRules?.maxPokemon;
  const format = maxP && maxP <= MAX_POKEMON_3V3 ? '3v3' : '6v6';
  const myTeam = ctx.resolvePvpTeam(format);
  const hasIllegal = myTeam.some((p: Pokemon) => p && p.isIllegal);
  if (hasIllegal) {
    ctx.notify('No puedes participar en PvP con Pokémon ilegales en tu equipo.', '⚠️');
    return;
  }

  ctx.timerManager.resetStrikes();
  ctx.afkStrikes.value = 0;

  ctx.battleState.active = true;
  ctx.battleState.isHost = true;
  ctx.battleState.isRanked = true;
  ctx.battleState.inviteId = `passive-${Temporal.Now.instant().epochMilliseconds}`;
  ctx.battleState.config = {
    format,
    levelRule: 'flat50',
    arena: { gymId: 'celadon' },
    mode: 'ranked',
    isAsynchronous: true
  };
  ctx.battleState.opponentId = params.opponentId;
  ctx.battleState.opponentName = params.opponentName;
  ctx.battleState.opponentElo = params.opponentElo;
  ctx.battleState.myTeam = myTeam;
  ctx.battleState.myHp = ctx.battleState.myTeam.map((p: Pokemon) => p.hp);
  ctx.battleState.myActiveIdx = 0;
  ctx.battleState.enemyTeam = params.enemyTeam;
  ctx.battleState.enemyHp = params.enemyTeam.map((p: Pokemon) => p.hp);
  ctx.battleState.enemyActiveIdx = 0;
  ctx.battleState.phase = 'team_preview';
  ctx.battleState.logs = [`¡Comienza el combate clasificatorio contra la defensa pasiva de ${params.opponentName}!`] satisfies string[];
  ctx.battleState.myPick = null;
  ctx.battleState.enemyPick = null;
  ctx.battleState.ch = null;
  ctx.myTeamConfirmed.value = false;
  ctx.enemyTeamConfirmed.value = true;
}

export interface FallbackRunnerContext {
  userId?: string;
  db: DBRouter;
  isSearching: { value: boolean };
  searchPhase: { value: string };
  searchCountdownTween: { kill: () => void } | null;
  matchmakingPoller: { kill: () => void } | null;
  myElo: number;
  notify: (msg: string, icon?: string) => void;
  onMatched: (params: PassiveFallbackParams) => void;
}

export async function executeFallbackToPassiveBattle(ctx: FallbackRunnerContext): Promise<void> {
  if (!ctx.userId || !ctx.isSearching.value) return;
  ctx.searchPhase.value = 'passive_fallback';
  if (ctx.searchCountdownTween) ctx.searchCountdownTween.kill();
  if (ctx.matchmakingPoller) ctx.matchmakingPoller.kill();

  await ctx.db.from('ranked_queue').delete().eq('user_id', ctx.userId);
  ctx.notify('Buscando equipo de defensa pasiva...', '🛡️');

  try {
    const { executePassiveMatchmakingFallback } = await import('@/logic/pvp/passiveMatchmakingHelper');
    const fallbackResult = await executePassiveMatchmakingFallback({
      db: ctx.db,
      userUid: ctx.userId,
      myElo: ctx.myElo || DEFAULT_INITIAL_ELO,
      notify: (msg, icon) => ctx.notify(msg, icon)
    });

    if (!fallbackResult) {
      ctx.isSearching.value = false;
      ctx.searchPhase.value = 'human';
      return;
    }

    ctx.isSearching.value = false;
    ctx.searchPhase.value = 'matched';

    ctx.onMatched({
      opponentId: fallbackResult.opponentId,
      opponentName: fallbackResult.opponentName,
      opponentElo: fallbackResult.opponentElo,
      enemyTeam: fallbackResult.enemyTeam
    });
  } catch (err) {
    console.error('[_fallbackToPassiveBattle Error]', err);
    ctx.notify('Error al iniciar batalla pasiva.', '⚠️');
    ctx.isSearching.value = false;
    ctx.searchPhase.value = 'human';
  }
}

