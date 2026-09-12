import { gsap } from 'gsap';
import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import { saveActivePvPSession } from '@/logic/pvp/pvpReconnectHelper';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleInvite, PvPBattleState, PvpChallengeConfig, PvPAction, PvpTurnStreamPayload, PvpReconnectPayload } from '@/types/battle/pvp';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';
import type { PvpSpectateSyncPayload } from '@/logic/pvp/pvpSpectatorHelper';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { DBRouter } from '@/logic/db/dbRouter.ts';
import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay.ts';
import type { PvPTimerManager } from './pvpTimerHelper.ts';
import type { useBattleStore } from '@/stores/battle/battle.ts';
import type { useUIStore } from '@/stores/ui.ts';
import type { useGameStore } from '@/stores/game.ts';
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { GenderId } from '@/types/system/game';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import { getRandomQuoteForTrainer } from '@/data/player/trainerPhrases';

export interface LiveBattleState extends PvPBattleState {
  active: boolean;
  opponentId: string | null;
  opponentName: string;
  opponentElo: number;
  opponentClass?: PlayerClassId;
  opponentGender?: GenderId;
  deadline: number | null;
  ch: Pick<RealtimeChannel, 'send' | 'unsubscribe'> | null;
  inviteId: string | null;
  config?: PvpChallengeConfig;
  myPick: PvPAction | null;
  enemyPick: PvPAction | null;
  logs: string[];
}

export function createInitialLivePvPBattleState(): LiveBattleState {
  return {
    active: false,
    ch: null,
    inviteId: null,
    isHost: false,
    isRanked: false,
    opponentId: null,
    opponentName: 'Rival',
    opponentElo: DEFAULT_INITIAL_ELO,
    phase: 'sync',
    myTeam: [],
    enemyTeam: [],
    myActiveIdx: 0,
    enemyActiveIdx: 0,
    myHp: [],
    enemyHp: [],
    myStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
    enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 },
    myPick: null,
    enemyPick: null,
    logs: [],
    deadline: null
  };
}


function resolvePvPArchetype(playerClass?: PlayerClassId | null): NpcArchetype {
  if (playerClass === 'rocket') return 'rocket';
  if (playerClass === 'criador') return 'criador';
  if (playerClass === 'cazabichos') return 'caza_bichos';
  return 'default';
}

export interface GameStoreForPvpTeam {
  state: {
    pvpTeam?: string[];
    pvpTeam6?: string[];
    team?: (Pokemon | null)[];
    box?: (Pokemon | null)[];
    trainer?: string;
    playerClass?: PlayerClassId | null;
    gender?: GenderId;
  };
  autoFillPvpTeam?: () => void;
  autoFillPvpTeam6?: () => void;
}

export interface OpponentTeamBroadcastPayload {
  team: Pokemon[];
  trainerName?: string;
  playerClass?: PlayerClassId | null;
  gender?: GenderId;
}

export interface OpponentTeamOrderBroadcastPayload {
  orderedUids: string[];
}

export interface CheckBothTeamsConfirmedContext {
  battleState: LiveBattleState;
  myTeamConfirmed: { value: boolean };
  enemyTeamConfirmed: { value: boolean };
  timerManager: PvPTimerManager;
  battleStore: ReturnType<typeof useBattleStore>;
}

export interface ConfirmTeamPreviewContext {
  battleState: LiveBattleState;
  myTeamConfirmed: { value: boolean };
  enemyTeamConfirmed: { value: boolean };
  timerManager: PvPTimerManager;
  battleStore: ReturnType<typeof useBattleStore>;
}

export interface StartBattleContext {
  resolvePvpTeam: (format?: string) => Pokemon[];
  uiStore: ReturnType<typeof useUIStore>;
  gameStore: ReturnType<typeof useGameStore>;
  timerManager: PvPTimerManager;
  afkStrikes: { value: number };
  myTeamConfirmed: { value: boolean };
  enemyTeamConfirmed: { value: boolean };
  battleState: LiveBattleState;
  setupBattleChannel: (inviteId: string) => void;
}

export function resolvePvpTeam(
  gameStore: GameStoreForPvpTeam,
  format?: string
): Pokemon[] {
  const is6v6 = format === '6v6';
  let uids = is6v6 ? gameStore.state.pvpTeam6 : gameStore.state.pvpTeam;
  if (!uids || uids.length === 0) {
    if (is6v6) gameStore.autoFillPvpTeam6?.();
    else gameStore.autoFillPvpTeam?.();
    uids = is6v6 ? gameStore.state.pvpTeam6 : gameStore.state.pvpTeam;
  }
  const pokesByUid = new Map<string, Pokemon>();
  for (const p of (gameStore.state.team || [])) {
    if (p) pokesByUid.set(p.uid, p);
  }
  for (const p of (gameStore.state.box || [])) {
    if (p) pokesByUid.set(p.uid, p);
  }

  const resolved: Pokemon[] = [];
  for (const uid of (uids || [])) {
    const poke = pokesByUid.get(uid);
    if (poke) resolved.push(cloneReactive(poke) as Pokemon);
  }
  return resolved;
}

export function executeCheckBothTeamsConfirmed(ctx: CheckBothTeamsConfirmedContext): void {
  if (ctx.myTeamConfirmed.value && ctx.enemyTeamConfirmed.value) {
    ctx.battleState.phase = 'choosing';

    const enemyLeader = ctx.battleState.enemyTeam[0];
    if (enemyLeader) {
      void ctx.battleStore.startBattle(enemyLeader, {
        isPvP: true,
        pvpMatchId: ctx.battleState.inviteId || undefined,
        pvpIsHost: ctx.battleState.isHost,
        pvpOpponentId: ctx.battleState.opponentId || undefined,
        pvpOpponentName: ctx.battleState.opponentName,
        enemyTeam: ctx.battleState.enemyTeam,
        playerTeam: ctx.battleState.myTeam,
        isTrainer: true,
        trainerName: ctx.battleState.opponentName,
        trainerSprite: ctx.battleState.opponentClass || 'entrenador',
        trainerGender: ctx.battleState.opponentGender || 'h',
        trainerArchetype: resolvePvPArchetype(ctx.battleState.opponentClass),
        trainerQuote: getRandomQuoteForTrainer('rival'),
        locationId: 'gym'
      }).then(() => {
        if (ctx.battleState.active) {
          ctx.timerManager.startTurnTimer();
        }
      });
    }
  }
}

export function executeConfirmTeamPreview(
  orderedPicks: Pokemon[],
  ctx: ConfirmTeamPreviewContext
): void {
  ctx.battleState.myTeam = orderedPicks;
  ctx.myTeamConfirmed.value = true;
  if (ctx.battleState.ch) {
    ctx.battleState.ch.send({
      type: 'broadcast',
      event: 'pvp_team_order',
      payload: {
        orderedUids: orderedPicks.map(p => p.uid)
      }
    });
  }
  executeCheckBothTeamsConfirmed(ctx);
}

export function executeHandleOpponentTeam(
  payload: OpponentTeamBroadcastPayload,
  battleState: LiveBattleState,
  ctx?: {
    timerManager: PvPTimerManager;
    battleStore: ReturnType<typeof useBattleStore>;
  }
): void {
  if (battleState.enemyTeam.length > 0) return;
  if (payload.trainerName) {
    battleState.opponentName = payload.trainerName;
  }
  if (payload.playerClass) {
    battleState.opponentClass = payload.playerClass;
  }
  if (payload.gender) {
    battleState.opponentGender = payload.gender;
  }
  battleState.enemyTeam = payload.team;
  battleState.enemyHp = payload.team.map((p: Pokemon) => p.hp);
  battleState.enemyActiveIdx = 0;
  battleState.logs.push('¡El rival ha entrado al combate!');

  if (battleState.myTeam.length > 0 && ctx) {
    battleState.phase = 'choosing';

    const enemyLeader = battleState.enemyTeam[0];
    if (enemyLeader) {
      void ctx.battleStore.startBattle(enemyLeader, {
        isPvP: true,
        isRanked: battleState.isRanked,
        pvpMatchId: battleState.inviteId || undefined,
        pvpIsHost: battleState.isHost,
        pvpOpponentId: battleState.opponentId || undefined,
        pvpOpponentName: battleState.opponentName,
        enemyTeam: battleState.enemyTeam,
        playerTeam: battleState.myTeam,
        isTrainer: true,
        trainerName: battleState.opponentName,
        trainerSprite: battleState.opponentClass || 'entrenador',
        trainerGender: battleState.opponentGender || 'h',
        trainerArchetype: resolvePvPArchetype(battleState.opponentClass),
        trainerQuote: getRandomQuoteForTrainer('rival'),
        locationId: 'gym'
      }).then(() => {
        if (battleState.active) {
          ctx.timerManager.startTurnTimer();
        }
      });
    }
  }
}

export function executeHandleOpponentTeamOrder(
  payload: OpponentTeamOrderBroadcastPayload,
  ctx: CheckBothTeamsConfirmedContext
): void {
  if (payload?.orderedUids && ctx.battleState.enemyTeam.length > 0) {
    const map = new Map<string, Pokemon>();
    ctx.battleState.enemyTeam.forEach(p => map.set(p.uid, p));
    const reordered: Pokemon[] = [];
    payload.orderedUids.forEach(uid => {
      const mon = map.get(uid);
      if (mon) reordered.push(mon);
    });
    if (reordered.length > 0) {
      ctx.battleState.enemyTeam = reordered;
    }
  }
  ctx.enemyTeamConfirmed.value = true;
  executeCheckBothTeamsConfirmed(ctx);
}

export function executeStartBattle(
  invite: BattleInvite,
  isHost: boolean,
  isRanked: boolean,
  ctx: StartBattleContext
): void {
  const myTeam = ctx.resolvePvpTeam(invite.config?.format);
  const hasIllegal = myTeam.some((p: Pokemon) => p && p.isIllegal);
  if (hasIllegal) {
    ctx.uiStore.notify('No puedes participar en PvP con Pokémon ilegales en tu equipo.', '⚠️');
    return;
  }

  ctx.timerManager.resetStrikes();
  ctx.afkStrikes.value = 0;

  ctx.battleState.active = true;
  ctx.battleState.isHost = isHost;
  ctx.battleState.isRanked = isRanked;
  ctx.battleState.inviteId = invite.id;
  ctx.battleState.config = invite.config;
  ctx.battleState.opponentId = isHost ? invite.opponent_id : (invite.sender_id || invite.challenger_id || null);
  ctx.battleState.myTeam = myTeam;
  ctx.battleState.myHp = ctx.battleState.myTeam.map((p: Pokemon) => p.hp);
  ctx.battleState.myActiveIdx = 0;
  ctx.battleState.phase = 'sync';
  ctx.battleState.logs = ['¡Comienza la batalla!'];
  ctx.battleState.myPick = null;
  ctx.battleState.enemyPick = null;
  ctx.myTeamConfirmed.value = true;
  ctx.enemyTeamConfirmed.value = false;

  saveActivePvPSession({
    matchId: invite.id,
    isHost,
    opponentId: ctx.battleState.opponentId,
    opponentName: ctx.battleState.opponentName,
    isRanked,
    turnCount: 1
  });

  ctx.setupBattleChannel(invite.id);

  const broadcastTeam = () => {
    if (ctx.battleState.ch) {
      ctx.battleState.ch.send({
        type: 'broadcast',
        event: 'pvp_team',
        payload: {
          team: cloneReactive(ctx.battleState.myTeam),
          format: invite.config?.format,
          trainerName: ctx.gameStore.state.trainer || 'Entrenador',
          playerClass: ctx.gameStore.state.playerClass,
          gender: ctx.gameStore.state.gender
        }
      });
    }
  };
  gsap.delayedCall(0.5, broadcastTeam);
  gsap.delayedCall(2.0, broadcastTeam);
}

export interface SetupBattleChannelContext {
  db: DBRouter | null;
  battleState: LiveBattleState;
  trainerName?: string;
  playerClass?: PlayerClassId | null;
  gender?: GenderId;
  handlers: {
    onOpponentTeam: (event: { payload: OpponentTeamBroadcastPayload }) => void;
    onOpponentTeamOrder: (event: { payload: OpponentTeamOrderBroadcastPayload }) => void;
    onOpponentPick: (event: { payload: PvPAction }) => void;
    onTurnStream: (event: { payload: PvpTurnStreamPayload & { request?: ShowdownPlayerRequest } }) => void;
    onOpponentReconnect: (event: { payload: PvpReconnectPayload }) => void;
    onOpponentForfeit: () => void;
    onSpectateJoin: () => void;
    onSpectateSync: (event: { payload: PvpSpectateSyncPayload }) => void;
  };
}

export function executeSetupBattleChannel(
  inviteId: string,
  ctx: SetupBattleChannelContext
): void {
  if (!ctx.db) return;
  const ch = ctx.db.channel(`pvp-${inviteId}`);
  ctx.battleState.ch = ch;
  ch.on('broadcast' as const, { event: 'pvp_team' }, ctx.handlers.onOpponentTeam)
    .on('broadcast' as const, { event: 'pvp_team_order' }, ctx.handlers.onOpponentTeamOrder)
    .on('broadcast' as const, { event: 'pvp_pick' }, ctx.handlers.onOpponentPick)
    .on('broadcast' as const, { event: 'pvp_turn_stream' }, ctx.handlers.onTurnStream)
    .on('broadcast' as const, { event: 'pvp_reconnect' }, ctx.handlers.onOpponentReconnect)
    .on('broadcast' as const, { event: 'pvp_forfeit' }, ctx.handlers.onOpponentForfeit)
    .on('broadcast' as const, { event: 'pvp_spectate_join' }, ctx.handlers.onSpectateJoin)
    .on('broadcast' as const, { event: 'pvp_spectate_sync' }, ctx.handlers.onSpectateSync)
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        ch.send({
          type: 'broadcast',
          event: 'pvp_team',
          payload: {
            team: cloneReactive(ctx.battleState.myTeam),
            trainerName: ctx.trainerName || 'Entrenador',
            playerClass: ctx.playerClass,
            gender: ctx.gender
          }
        });
      }
    });
}

