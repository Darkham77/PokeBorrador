import type { Ref } from 'vue';
export type DelayedCall = { kill: () => void };
import { parseInstantSafe } from '@/logic/utils/timeUtils.ts';
import {
  DEFAULT_INITIAL_ELO,
  ONLINE_PRESENCE_WINDOW_MS
} from '@/logic/constants/gameplay.ts';
import { isAllowedRankGap } from '@/logic/pvp/rankedEngine.ts';
import {
  PVP_INVITE_EXPIRY_MS,
  MATCHMAKING_TIMEOUT_SEC,
  FAST_MATCHMAKING_TIMEOUT_SEC,
  type BattleInvite,
  type PvpChallengeConfig
} from '@/types/battle/pvp';

export function getMatchmakingTimeoutSec(): number {
  const debugObj = typeof window !== 'undefined'
    ? window.__VITE_DEBUG__
    : (typeof globalThis !== 'undefined' ? globalThis.__VITE_DEBUG__ : undefined);
  if (debugObj?.fastRankedDelay) {
    return FAST_MATCHMAKING_TIMEOUT_SEC;
  }
  return MATCHMAKING_TIMEOUT_SEC;
}
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { DBRouter } from '@/logic/db/dbRouter.ts';

export interface RankedQueueEntry {
  user_id: string;
  elo: number;
  status?: string;
  created_at: string;
}

const RANKED_QUEUE_FETCH_LIMIT = 10 as const;
const RANKED_TIER_GAP_TOLERANCE = 1 as const;

export async function checkUserOnline(db: DBRouter | null, userId: string): Promise<boolean> {
  if (!db) return false;
  try {
    const { data } = await db
      .from('game_saves')
      .select('updated_at')
      .eq('user_id', userId)
      .single() as { data: { updated_at: string } | null };

    if (!data?.updated_at) {
      return userId.startsWith('local_');
    }
    const lastSeen = parseInstantSafe(data.updated_at);
    if (!lastSeen) return false;
    const now = Temporal.Now.instant().epochMilliseconds;
    return (now - lastSeen.epochMilliseconds) < ONLINE_PRESENCE_WINDOW_MS;
  } catch {
    return userId.startsWith('local_');
  }
}

export async function executePollMatchmaking(ctx: {
  db: DBRouter | null;
  userId?: string;
  myElo?: number;
  isSearching: Ref<boolean>;
  searchPhase: Ref<'human' | 'passive_fallback' | 'matched'>;
  killSearchCountdown: () => void;
  onMatched: (invite: BattleInvite) => void;
}): Promise<void> {
  if (!ctx.isSearching.value || !ctx.db || !ctx.userId) return;
  const res = await ctx.db
    .from('ranked_queue')
    .select('*')
    .neq('user_id', ctx.userId)
    .order('created_at', { ascending: true })
    .limit(RANKED_QUEUE_FETCH_LIMIT);

  const data = res.data as RankedQueueEntry[] | null;
  if (data && data.length > 0 && ctx.userId && ctx.db) {
    const match = typeof ctx.myElo === 'number'
      ? data
          .filter((entry) => isAllowedRankGap(ctx.myElo!, entry.elo, RANKED_TIER_GAP_TOLERANCE))
          .sort((a, b) => Math.abs(a.elo - ctx.myElo!) - Math.abs(b.elo - ctx.myElo!))[0]
      : data[0];
    if (!match) return;
    const invRes = await ctx.db.from('battle_invites').insert({
      challenger_id: ctx.userId,
      sender_id: ctx.userId,
      opponent_id: match.user_id,
      status: 'ranked_match',
      config: { format: '6v6', levelRule: 'flat50', arena: { gymId: 'celadon' }, mode: 'ranked' }
    }).select().single();

    const invite = invRes.data as BattleInvite | null;
    const error = invRes.error;
    if (!error && invite) {
      ctx.killSearchCountdown();
      await ctx.db.from('ranked_queue').delete().in('user_id', [ctx.userId, match.user_id]);
      ctx.isSearching.value = false;
      ctx.searchPhase.value = 'matched';
      ctx.onMatched(invite);
    }
  }
}

export function executeInitInvitePoller(ctx: {
  db: DBRouter | null;
  userId?: string;
  isSearching: Ref<boolean>;
  searchPhase: Ref<'human' | 'passive_fallback' | 'matched'>;
  activeInvite: Ref<BattleInvite | null>;
  killSearchCountdown: () => void;
  onAcceptRankedInvite: (inviteId: string) => void;
  scheduleNext: (cb: () => void) => DelayedCall;
}): DelayedCall | null {
  const poll = async () => {
    if (!ctx.userId || !ctx.db) return;
    const { data } = await ctx.db
      .from('battle_invites')
      .select('*')
      .eq('opponent_id', ctx.userId)
      .in('status', ['pending', 'ranked_match'])
      .order('created_at', { ascending: false })
      .limit(1) as { data: BattleInvite[] | null };

    if (data && data.length > 0 && ctx.db) {
      const inv = data[0];
      if (!inv) return;
      const diffMs = Temporal.Now.instant().epochMilliseconds - Temporal.Instant.from(inv.created_at).epochMilliseconds;
      if (diffMs > PVP_INVITE_EXPIRY_MS) return;

      if (inv.status === 'ranked_match') {
        if (ctx.isSearching.value) {
          ctx.killSearchCountdown();
          ctx.searchPhase.value = 'matched';
          ctx.onAcceptRankedInvite(inv.id);
        } else {
          await ctx.db.from('battle_invites').update({ status: 'declined' }).eq('id', inv.id);
        }
      } else {
        ctx.activeInvite.value = inv;
      }
    }
    poller = ctx.scheduleNext(poll);
  };

  let poller = ctx.scheduleNext(poll);
  return poller;
}

export interface SearchSeasonRules {
  name: string;
  maxPokemon?: number;
  [key: string]: unknown;
}

export async function executeStartSearch(ctx: {
  db: DBRouter | null;
  userId?: string;
  myElo: number;
  currentSeasonRules?: SearchSeasonRules | null;
  resolvePvpTeam: (format?: string) => Pokemon[];
  notify: (msg: string, icon?: string) => void;
  isSearching: Ref<boolean>;
  searchSecondsRemaining: Ref<number>;
  searchPhase: Ref<'human' | 'passive_fallback' | 'matched'>;
  startSearchCountdown: () => void;
  pollMatchmaking: () => Promise<void>;
  scheduleMatchmakingPoll: (cb: () => void) => DelayedCall;
}): Promise<DelayedCall | null> {
  if (!ctx.userId || !ctx.db) return null;

  if (ctx.currentSeasonRules) {
    const { validateTeamForRanked, normalizeRankedRules } = await import('@/logic/pvp/rankedEngine');
    const rules = normalizeRankedRules(ctx.currentSeasonRules, ctx.currentSeasonRules.name);
    const format = rules.maxPokemon <= 3 ? '3v3' : '6v6';
    const team = ctx.resolvePvpTeam(format);
    const validation = validateTeamForRanked(team, rules);
    if (!validation.ok) {
      ctx.notify(validation.reason || 'Tu equipo no cumple las reglas de la temporada.', '⚠️');
      return null;
    }
  }

  ctx.isSearching.value = true;
  ctx.searchSecondsRemaining.value = getMatchmakingTimeoutSec();
  ctx.searchPhase.value = 'human';

  await ctx.db.from('ranked_queue').upsert({
    user_id: ctx.userId,
    elo: ctx.myElo || DEFAULT_INITIAL_ELO,
    status: 'searching',
    created_at: Temporal.Now.instant().toString()
  });
  ctx.notify('Buscando oponente humano...', '🔍');

  ctx.startSearchCountdown();

  let poller: DelayedCall | null = null;
  const poll = async () => {
    await ctx.pollMatchmaking();
    if (ctx.isSearching.value && ctx.searchPhase.value === 'human') {
      poller = ctx.scheduleMatchmakingPoll(poll);
    }
  };

  await poll();
  return poller;
}

export async function executeCancelSearch(ctx: {
  db: DBRouter | null;
  userId?: string;
  isSearching: Ref<boolean>;
  searchPhase: Ref<'human' | 'passive_fallback' | 'matched'>;
  searchSecondsRemaining: Ref<number>;
  killSearchCountdown: () => void;
  killMatchmakingPoller: () => void;
}): Promise<void> {
  if (!ctx.userId || !ctx.db) return;
  ctx.isSearching.value = false;
  ctx.searchPhase.value = 'human';
  ctx.searchSecondsRemaining.value = getMatchmakingTimeoutSec();
  ctx.killSearchCountdown();
  ctx.killMatchmakingPoller();
  await ctx.db.from('ranked_queue').delete().eq('user_id', ctx.userId);
}

export async function executeSendInvite(ctx: {
  db: DBRouter | null;
  userId?: string;
  opponentId: string;
  opponentName: string;
  config?: PvpChallengeConfig;
  notify: (msg: string, icon?: string) => void;
  onStartBattle: (data: BattleInvite) => void;
}): Promise<void> {
  if (!ctx.userId || !ctx.db) return;
  const challengeConfig: PvpChallengeConfig = ctx.config || {
    format: '3v3',
    levelRule: 'real',
    arena: { gymId: 'celadon' }
  };

  const invRes = await ctx.db.from('battle_invites').insert({
    challenger_id: ctx.userId,
    sender_id: ctx.userId,
    opponent_id: ctx.opponentId,
    status: 'pending',
    config: challengeConfig
  }).select().single();

  const data = invRes.data as BattleInvite | null;
  const error = invRes.error;
  if (error || !data) {
    ctx.notify('Error al enviar invitación', '❌');
    return;
  }

  ctx.notify(`Invitación enviada a ${ctx.opponentName}`, '✉️');
  ctx.onStartBattle(data);
}

export async function executeAcceptInvite(ctx: {
  db: DBRouter | null;
  inviteId: string;
  isRanked: boolean;
  activeInvite: Ref<BattleInvite | null>;
  openOfflineModal: (name: string) => void;
  onStartBattle: (invite: BattleInvite) => void;
}): Promise<void> {
  if (!ctx.db) return;
  const { data: invite } = await ctx.db
    .from('battle_invites')
    .select('*')
    .eq('id', ctx.inviteId)
    .single() as { data: BattleInvite | null };

  if (!invite) return;

  const senderId = invite.sender_id || invite.challenger_id || '';
  const isOnline = await checkUserOnline(ctx.db, senderId);
  if (!isOnline) {
    await ctx.db.from('battle_invites').update({ status: 'cancelled_offline' }).eq('id', ctx.inviteId);
    ctx.activeInvite.value = null;
    ctx.openOfflineModal('El oponente');
    return;
  }

  const status = ctx.isRanked ? 'ranked_accepted' : 'accepted';
  await ctx.db.from('battle_invites').update({ status }).eq('id', ctx.inviteId);
  ctx.activeInvite.value = null;
  ctx.onStartBattle(invite);
}

export async function executeDeclineInvite(ctx: {
  db: DBRouter | null;
  inviteId: string;
  activeInvite: Ref<BattleInvite | null>;
}): Promise<void> {
  if (ctx.db) {
    await ctx.db.from('battle_invites').update({ status: 'declined' }).eq('id', ctx.inviteId);
  }
  ctx.activeInvite.value = null;
}

export function executeStartSearchCountdown(ctx: {
  isSearching: Ref<boolean>;
  searchSecondsRemaining: Ref<number>;
  fallbackToPassiveBattle: () => Promise<void>;
  scheduleNext: (cb: () => void) => DelayedCall;
}): DelayedCall {
  let timer: DelayedCall;
  const tick = () => {
    if (!ctx.isSearching.value) return;
    ctx.searchSecondsRemaining.value--;
    if (ctx.searchSecondsRemaining.value <= 0) {
      void ctx.fallbackToPassiveBattle();
    } else {
      timer = ctx.scheduleNext(tick);
    }
  };
  timer = ctx.scheduleNext(tick);
  return timer;
}

