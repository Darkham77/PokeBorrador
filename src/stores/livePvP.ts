import { gsap } from 'gsap';
import { defineStore } from 'pinia';
import { ref, reactive, getCurrentScope, onScopeDispose } from 'vue';

import { logger } from '@/logic/utils/logger.ts';

type DelayedCall = { kill: () => void };

import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import {
  getMatchmakingTimeoutSec,
  executePollMatchmaking,
  executeInitInvitePoller,
  executeStartSearch,
  executeCancelSearch,
  executeSendInvite,
  executeAcceptInvite,
  executeDeclineInvite,
  executeStartSearchCountdown
} from '@/logic/pvp/livePvPMatchmakingHandler.ts';
import {
  createRoomAction,
  cancelRoomAction,
  joinRoomAction
} from '@/logic/pvp/pvpRoomActionsHelper';
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { useGameStore } from '@/stores/game.ts';
import { useModalStore } from '@/stores/modals.ts';
import { usePvPStore } from '@/stores/pvp.ts';
import { useUIStore } from '@/stores/ui.ts';
import {
  type PvPAction,
  PVP_TURN_TIMEOUT_SEC,
  PVP_RECONNECT_WINDOW_SEC,
  type BattleInvite,
  type BattleReplayRecord,
  type PvpChallengeConfig,
  type PvPMatchType,
  type PvpTurnStreamPayload,
  type PvpReconnectPayload,
  type PvpRoomCode
} from '@/types/battle/pvp';
import type { Pokemon } from '@/types/pokemon/pokemon';

const INVITE_POLL_INTERVAL_SEC = 4;
const SEARCH_COUNTDOWN_TICK_SEC = 1;
const MATCHMAKING_POLL_INTERVAL_SEC = 3;

import {
  resolvePvpTeam as resolvePvpTeamHelper,
  executeStartBattle,
  type PvpBattleSeatFlags,
  executeHandleOpponentTeam,
  executeHandleOpponentTeamOrder,
  executeSetupBattleChannel,
  createInitialLivePvPBattleState,
  type LiveBattleState,
  type OpponentTeamBroadcastPayload
} from '@/logic/pvp/livePvPBattleSetupHandler.ts';
import { executeForfeit, executeEndBattle } from '@/logic/pvp/livePvPEndBattleHandler.ts';
import {
  executeStartPassiveBattle,
  executeFallbackToPassiveBattle
} from '@/logic/pvp/livePvPPassiveFallbackHandler';
import {
  executeReconnectBattle,
  executeSpectateMatch,
  executeHandleSpectateJoin,
  executeHandleSpectateSync,
  executeHandleOpponentReconnect
} from '@/logic/pvp/livePvPReconnectionHandler';
import {
  executeResolveTurn,
  executeHandleTurnStream,
  executeCommitPick,
  executeCheckReadyToResolve,
  executeHandleTurnTimeout,
  executeCheckPostTurn
} from '@/logic/pvp/livePvPTurnExecutionHandler.ts';
import type { PvpSpectateSyncPayload } from '@/logic/pvp/pvpSpectatorHelper';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore();
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const modalStore = useModalStore();
  const pvpStore = usePvPStore();

  const activeInvite = ref<BattleInvite | null>(null);
  const isSearching = ref(false);
  const searchSecondsRemaining = ref<number>(getMatchmakingTimeoutSec());
  const searchPhase = ref<PvPMatchType>('human');
  let searchCountdownTween: DelayedCall | null = null;
  const activeReplay = ref<BattleReplayRecord | null>(null);

  function watchReplay(replay: BattleReplayRecord): void {
    activeReplay.value = replay;
    modalStore.open('BattleReplay', { replay });
  }

  // Timer Manager reactive state
  const turnSecondsRemaining = ref<number>(PVP_TURN_TIMEOUT_SEC);
  const reconnectSecondsRemaining = ref<number>(PVP_RECONNECT_WINDOW_SEC);
  const afkStrikes = ref<number>(0);
  const isReconnecting = ref<boolean>(false);
  const activeRoomCode = ref<PvpRoomCode | null>(null);
  const isSpectator = ref<boolean>(false);
  const myTeamConfirmed = ref<boolean>(false);
  const enemyTeamConfirmed = ref<boolean>(false);
  let roomHostPoller: DelayedCall | null = null;

  const timerManager = new PvPTimerManager({
    onTurnTick: (seconds: number) => {
      turnSecondsRemaining.value = seconds;
    },
    onTurnTimeout: (strikes: number, isForfeit: boolean) => {
      afkStrikes.value = strikes;
      handleTurnTimeout(isForfeit);
    },
    onReconnectTick: (seconds: number) => {
      reconnectSecondsRemaining.value = seconds;
    },
    onReconnectTimeout: () => {
      handleReconnectTimeout();
    }
  });

  const battleState = reactive<LiveBattleState>(createInitialLivePvPBattleState());

  let invitePoller: DelayedCall | null = null;
  let matchmakingPoller: DelayedCall | null = null;

  function handleTurnTimeout(isForfeit: boolean): void {
    executeHandleTurnTimeout(isForfeit, {
      uiStore,
      forfeit: _forfeit,
      battleStore: useBattleStore(),
      battleState,
      commitPick: _commitPick
    });
  }

  function handleReconnectTimeout(): void {
    timerManager.stopReconnectCountdown();
    isReconnecting.value = false;
    endBattle(false, 'Tiempo de reconexión agotado.').catch((err) => {
      logger.warn('Handled promise rejection:', { cause: err });
    });
  }

  async function _pollMatchmaking(): Promise<void> {
    await executePollMatchmaking({
      db: gameStore.db,
      userId: authStore.currentUserId,
      myElo: gameStore.state.eloRating || DEFAULT_INITIAL_ELO,
      isSearching,
      searchPhase,
      killSearchCountdown: () => {
        if (searchCountdownTween) searchCountdownTween.kill();
      },
      onMatched: (invite) => startBattle(invite, { isHost: true, isRanked: true })
    });
  }

  function initInvitePoller(): void {
    if (invitePoller) invitePoller.kill();
    invitePoller = executeInitInvitePoller({
      db: gameStore.db,
      userId: authStore.currentUserId,
      isSearching,
      searchPhase,
      activeInvite,
      killSearchCountdown: () => {
        if (searchCountdownTween) searchCountdownTween.kill();
      },
      onAcceptRankedInvite: (id) => acceptInvite(id, true),
      scheduleNext: (cb) => gsap.delayedCall(INVITE_POLL_INTERVAL_SEC, cb)
    });
  }

  function _startSearchCountdown(): void {
    if (searchCountdownTween) searchCountdownTween.kill();
    searchCountdownTween = executeStartSearchCountdown({
      isSearching,
      searchSecondsRemaining,
      fallbackToPassiveBattle: _fallbackToPassiveBattle,
      scheduleNext: (cb) => gsap.delayedCall(SEARCH_COUNTDOWN_TICK_SEC, cb)
    });
  }

  async function startSearch(): Promise<void> {
    if (matchmakingPoller) matchmakingPoller.kill();
    matchmakingPoller = await executeStartSearch({
      db: gameStore.db,
      userId: authStore.currentUserId,
      myElo: gameStore.state.eloRating || DEFAULT_INITIAL_ELO,
      currentSeasonRules: pvpStore.currentSeasonRules,
      resolvePvpTeam,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      isSearching,
      searchSecondsRemaining,
      searchPhase,
      startSearchCountdown: _startSearchCountdown,
      pollMatchmaking: _pollMatchmaking,
      scheduleMatchmakingPoll: (cb) => gsap.delayedCall(MATCHMAKING_POLL_INTERVAL_SEC, cb)
    });
  }

  async function cancelSearch(): Promise<void> {
    await executeCancelSearch({
      db: gameStore.db,
      userId: authStore.currentUserId,
      isSearching,
      searchPhase,
      searchSecondsRemaining,
      killSearchCountdown: () => {
        if (searchCountdownTween) searchCountdownTween.kill();
      },
      killMatchmakingPoller: () => {
        if (matchmakingPoller) matchmakingPoller.kill();
      }
    });
  }

  async function _fallbackToPassiveBattle(): Promise<void> {
    if (!gameStore.db) return;
    const pvpStore = usePvPStore();
    await executeFallbackToPassiveBattle({
      userId: authStore.currentUserId,
      db: gameStore.db,
      isSearching,
      searchPhase,
      searchCountdownTween,
      matchmakingPoller,
      myElo: gameStore.state.eloRating || DEFAULT_INITIAL_ELO,
      seasonRules: pvpStore.currentSeasonRules,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      onMatched: (params) => _startPassiveBattle(params)
    });
  }

  function _startPassiveBattle(params: {
    opponentId: string;
    opponentName: string;
    opponentElo: number;
    enemyTeam: Pokemon[];
  }): void {
    executeStartPassiveBattle(params, {
      resolvePvpTeam,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      timerManager,
      afkStrikes,
      battleStore: useBattleStore(),
      currentSeasonRules: pvpStore.currentSeasonRules,
      battleState
    });
  }

  async function sendInvite(
    opponentId: string,
    opponentName: string,
    config?: PvpChallengeConfig
  ): Promise<void> {
    await executeSendInvite({
      db: gameStore.db,
      userId: authStore.currentUserId,
      opponentId,
      opponentName,
      config,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      onStartBattle: (data) => startBattle(data, { isHost: true, isRanked: false })
    });
  }

  async function acceptInvite(inviteId: string, isRanked = false): Promise<void> {
    await executeAcceptInvite({
      db: gameStore.db,
      inviteId,
      isRanked,
      activeInvite,
      openOfflineModal: (name) => modalStore.open('PvPOpponentOffline', { opponentName: name }),
      onStartBattle: (inv) => startBattle(inv, { isHost: false, isRanked })
    });
  }

  async function declineInvite(inviteId: string): Promise<void> {
    await executeDeclineInvite({
      db: gameStore.db,
      inviteId,
      activeInvite
    });
  }

  async function _commitPick(pick: PvPAction, isManual = true): Promise<void> {
    await executeCommitPick(
      pick,
      {
        battleState,
        timerManager,
        afkStrikes,
        battleStore: useBattleStore(),
        resolveTurn
      },
      isManual
    );
  }

  const handlePvpCommitPickEvent = async (e: Event): Promise<void> => {
    const pick = (e as CustomEvent<PvPAction>).detail;
    if (pick) {
      await _commitPick(pick);
    }
  };
  gameBus.on('PVP_COMMIT_PICK', handlePvpCommitPickEvent);

  const handlePvpReconnectBattleEvent = (e: Event): void => {
    const detail = (e as CustomEvent<unknown>).detail;
    if (detail) {
      reconnectBattle(detail);
    }
  };
  gameBus.on('PVP_RECONNECT_BATTLE', handlePvpReconnectBattleEvent);

  if (getCurrentScope()) {
    onScopeDispose(() => {
      gameBus.off('PVP_COMMIT_PICK', handlePvpCommitPickEvent);
      gameBus.off('PVP_RECONNECT_BATTLE', handlePvpReconnectBattleEvent);
    });
  }

  function _checkReadyToResolve(): void {
    executeCheckReadyToResolve(battleState, useBattleStore(), resolveTurn);
  }

  function _forfeit(): void {
    executeForfeit({
      battleState,
      timerManager,
      endBattle
    });
  }

  async function endBattle(won: boolean, reason: string): Promise<void> {
    const battleStore = useBattleStore();
    await executeEndBattle(won, reason, {
      battleState,
      timerManager,
      isReconnecting,
      pvpStore,
      gameStore,
      authStore,
      uiStore,
      battleStore
    });
  }

  async function resolveTurn(): Promise<void> {
    const battleStore = useBattleStore();
    await executeResolveTurn({
      battleState,
      battleStore,
      timerManager,
      uiStore,
      endBattle,
      resolveTurnRecursion: resolveTurn
    });
  }

  function resolvePvpTeam(format?: string): Pokemon[] {
    return resolvePvpTeamHelper(gameStore, format);
  }

  function startBattle(invite: BattleInvite, flags: PvpBattleSeatFlags): void {
    executeStartBattle(invite, flags, {
      resolvePvpTeam,
      uiStore,
      gameStore,
      timerManager,
      afkStrikes,
      myTeamConfirmed,
      enemyTeamConfirmed,
      battleState,
      setupBattleChannel
    });
  }

  function setupBattleChannel(inviteId: string): void {
    executeSetupBattleChannel(inviteId, {
      db: gameStore.db,
      battleState,
      trainerName: gameStore.state.trainer,
      playerClass: gameStore.state.playerClass,
      gender: gameStore.state.gender,
      handlers: {
        onOpponentTeam: handleOpponentTeam,
        onOpponentTeamOrder: handleOpponentTeamOrder,
        onOpponentPick: handleOpponentPick,
        onTurnStream: handleTurnStream,
        onOpponentReconnect: handleOpponentReconnect,
        onOpponentForfeit: handleOpponentForfeit,
        onSpectateJoin: handleSpectateJoin,
        onSpectateSync: handleSpectateSync
      }
    });
  }

  function handleOpponentTeam({ payload }: { payload: OpponentTeamBroadcastPayload }): void {
    executeHandleOpponentTeam(payload, battleState, {
      timerManager,
      battleStore: useBattleStore()
    });
  }

  function handleOpponentTeamOrder({ payload }: { payload: { orderedUids: string[] } }): void {
    executeHandleOpponentTeamOrder(payload, {
      battleState,
      myTeamConfirmed,
      enemyTeamConfirmed,
      timerManager,
      battleStore: useBattleStore()
    });
  }

  function handleOpponentPick({ payload }: { payload: PvPAction }): void {
    battleState.enemyPick = payload;
    if (battleState.isHost) {
      _checkReadyToResolve();
    }
  }

  async function handleTurnStream({
    payload
  }: {
    payload: PvpTurnStreamPayload & { request?: ShowdownPlayerRequest };
  }): Promise<void> {
    const battleStore = useBattleStore();
    await executeHandleTurnStream(payload, {
      battleState,
      battleStore,
      timerManager,
      uiStore,
      isSpectator: isSpectator.value,
      endBattle
    });
  }

  async function createRoom(config?: PvpChallengeConfig): Promise<PvpRoomCode | null> {
    return createRoomAction(config, {
      userId: authStore.currentUserId,
      db: gameStore.db,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      activeRoomCode,
      getRoomHostPoller: () => roomHostPoller,
      setRoomHostPoller: (p) => {
        roomHostPoller = p;
      },
      startBattle
    });
  }

  async function cancelRoom(): Promise<void> {
    await cancelRoomAction(activeRoomCode, gameStore.db, roomHostPoller, (p) => {
      roomHostPoller = p;
    });
  }

  async function joinRoom(code: PvpRoomCode): Promise<boolean> {
    return joinRoomAction(code, {
      userId: authStore.currentUserId,
      db: gameStore.db,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      startBattle
    });
  }

  async function spectateMatch(matchId: string): Promise<void> {
    executeSpectateMatch(matchId, {
      battleState,
      isSpectator,
      setupBattleChannel,
      userId: authStore.currentUserId,
      hasDb: Boolean(gameStore.db)
    });
  }

  function handleSpectateJoin(): void {
    executeHandleSpectateJoin({ battleState, battleStore: useBattleStore() });
  }

  function handleSpectateSync({ payload }: { payload: PvpSpectateSyncPayload }): void {
    executeHandleSpectateSync(payload, isSpectator.value, useBattleStore());
  }

  function handleOpponentReconnect({ payload }: { payload: PvpReconnectPayload }): void {
    executeHandleOpponentReconnect(payload, {
      notify: (msg, icon) => uiStore.notify(msg, icon),
      timerManager,
      isReconnecting
    });
  }

  function handleOpponentForfeit(): void {
    endBattle(true, 'El oponente se ha rendido.').catch((err) => {
      logger.warn('Handled promise rejection:', { cause: err });
    });
  }

  function reconnectBattle(restoredBattle: unknown): void {
    executeReconnectBattle(restoredBattle, {
      battleState,
      timerManager,
      isReconnecting,
      setupBattleChannel
    });
  }

  function _checkPostTurn(): void {
    executeCheckPostTurn({
      battleState,
      uiStore,
      timerManager,
      endBattle
    });
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (searchCountdownTween) searchCountdownTween.kill();
      if (invitePoller) invitePoller.kill();
      if (matchmakingPoller) matchmakingPoller.kill();
      if (roomHostPoller) roomHostPoller.kill();
      timerManager.destroy();
      if (battleState.ch) {
        battleState.ch.unsubscribe().catch((err) => {
          logger.warn('Handled promise rejection:', { cause: err });
        });
      }
    });
  }

  return {
    isSearching,
    searchSecondsRemaining,
    searchPhase,
    battleState,
    activeInvite,
    activeRoomCode,
    turnSecondsRemaining,
    reconnectSecondsRemaining,
    afkStrikes,
    isReconnecting,
    activeReplay,
    watchReplay,
    initInvitePoller,
    sendInvite,
    acceptInvite,
    declineInvite,
    startBattle,
    reconnectBattle,
    startSearch,
    cancelSearch,
    resolvePvpTeam,
    createRoom,
    cancelRoom,
    joinRoom,
    spectateMatch,
    _commitPick,
    handleOpponentPick,
    _checkPostTurn,
    _forfeit,
    endBattle
  };
});
