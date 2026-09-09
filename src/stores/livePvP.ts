import { defineStore } from 'pinia'
import { ref, reactive, getCurrentScope, onScopeDispose } from 'vue'
import { gsap } from 'gsap'

type DelayedCall = { kill: () => void }

import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { usePvPStore } from '@/stores/pvp.ts'
import { useModalStore } from '@/stores/modals.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import type { PvPAction } from '@/types/battle/pvp'
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay.ts'
import {
  PVP_TURN_TIMEOUT_SEC,
  PVP_RECONNECT_WINDOW_SEC,
  MATCHMAKING_TIMEOUT_SEC,
  type BattleInvite,
  type BattleReplayRecord,
  type PvpChallengeConfig,
  type PvpTurnStreamPayload,
  type PvpReconnectPayload,
  type PvpRoomCode
} from '@/types/battle/pvp'
import {
  createRoomAction,
  cancelRoomAction,
  joinRoomAction
} from '@/logic/pvp/pvpRoomActionsHelper'
import {
  executeForfeit,
  executeEndBattle
} from '@/logic/pvp/livePvPEndBattleHandler.ts'
import type { PvpSpectateSyncPayload } from '@/logic/pvp/pvpSpectatorHelper'
import {
  executeReconnectBattle,
  executeSpectateMatch,
  executeHandleSpectateJoin,
  executeHandleSpectateSync,
  executeHandleOpponentReconnect
} from '@/logic/pvp/livePvPReconnectionHandler'
import {
  executeStartPassiveBattle,
  executeFallbackToPassiveBattle
} from '@/logic/pvp/livePvPPassiveFallbackHandler'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'
import {
  checkUserOnline as checkUserOnlineHelper,
  executePollMatchmaking,
  executeInitInvitePoller,
  executeStartSearch,
  executeCancelSearch,
  executeSendInvite,
  executeAcceptInvite,
  executeDeclineInvite,
  executeStartSearchCountdown
} from '@/logic/pvp/livePvPMatchmakingHandler.ts'
import {
  executeResolveTurn,
  executeHandleTurnStream,
  executeCommitPick,
  executeCheckReadyToResolve,
  executeHandleTurnTimeout,
  executeCheckPostTurn
} from '@/logic/pvp/livePvPTurnExecutionHandler.ts'
import {
  resolvePvpTeam as resolvePvpTeamHelper,
  executeStartBattle,
  executeConfirmTeamPreview,
  executeHandleOpponentTeam,
  executeHandleOpponentTeamOrder,
  executeSetupBattleChannel,
  createInitialLivePvPBattleState,
  type LiveBattleState
} from '@/logic/pvp/livePvPBattleSetupHandler.ts'

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const modalStore = useModalStore()
  const pvpStore = usePvPStore()

  const activeInvite = ref<BattleInvite | null>(null)
  const isSearching = ref(false)
  const searchSecondsRemaining = ref<number>(MATCHMAKING_TIMEOUT_SEC)
  const searchPhase = ref<'human' | 'passive_fallback' | 'matched'>('human')
  let searchCountdownTween: DelayedCall | null = null
  const activeReplay = ref<BattleReplayRecord | null>(null)

  function watchReplay(replay: BattleReplayRecord) {
    activeReplay.value = replay
    modalStore.open('BattleReplay', { replay })
  }

  // Timer Manager reactive state
  const turnSecondsRemaining = ref<number>(PVP_TURN_TIMEOUT_SEC)
  const reconnectSecondsRemaining = ref<number>(PVP_RECONNECT_WINDOW_SEC)
  const afkStrikes = ref<number>(0)
  const isReconnecting = ref<boolean>(false)
  const activeRoomCode = ref<PvpRoomCode | null>(null)
  const isSpectator = ref<boolean>(false)
  const myTeamConfirmed = ref<boolean>(false)
  const enemyTeamConfirmed = ref<boolean>(false)
  let roomHostPoller: DelayedCall | null = null

  const timerManager = new PvPTimerManager({
    onTurnTick: (seconds: number) => {
      turnSecondsRemaining.value = seconds
    },
    onTurnTimeout: (strikes: number, isForfeit: boolean) => {
      afkStrikes.value = strikes
      handleTurnTimeout(isForfeit)
    },
    onReconnectTick: (seconds: number) => {
      reconnectSecondsRemaining.value = seconds
    },
    onReconnectTimeout: () => {
      handleReconnectTimeout()
    }
  })

  const battleState = reactive<LiveBattleState>(createInitialLivePvPBattleState())

  let invitePoller: DelayedCall | null = null
  let matchmakingPoller: DelayedCall | null = null

  async function checkUserOnline(userId: string): Promise<boolean> {
    return checkUserOnlineHelper(gameStore.db, userId)
  }

  function handleTurnTimeout(isForfeit: boolean) {
    executeHandleTurnTimeout(isForfeit, {
      uiStore,
      forfeit: _forfeit,
      battleStore: useBattleStore(),
      battleState,
      commitPick: _commitPick
    })
  }

  function handleReconnectTimeout() {
    timerManager.stopReconnectCountdown()
    isReconnecting.value = false
    endBattle(false, 'Tiempo de reconexión agotado.')
  }

  async function _pollMatchmaking() {
    await executePollMatchmaking({
      db: gameStore.db,
      userId: authStore.user?.id,
      isSearching,
      searchPhase,
      killSearchCountdown: () => { if (searchCountdownTween) searchCountdownTween.kill() },
      onMatched: (invite) => startBattle(invite, true, true)
    })
  }

  function initInvitePoller() {
    if (invitePoller) invitePoller.kill()
    invitePoller = executeInitInvitePoller({
      db: gameStore.db,
      userId: authStore.user?.id,
      isSearching,
      searchPhase,
      activeInvite,
      killSearchCountdown: () => { if (searchCountdownTween) searchCountdownTween.kill() },
      onAcceptRankedInvite: (id) => acceptInvite(id, true),
      scheduleNext: (cb) => gsap.delayedCall(4, cb)
    })
  }

  function _startSearchCountdown() {
    if (searchCountdownTween) searchCountdownTween.kill()
    searchCountdownTween = executeStartSearchCountdown({
      isSearching,
      searchSecondsRemaining,
      fallbackToPassiveBattle: _fallbackToPassiveBattle,
      scheduleNext: (cb) => gsap.delayedCall(1, cb)
    })
  }


  async function startSearch() {
    if (matchmakingPoller) matchmakingPoller.kill()
    matchmakingPoller = await executeStartSearch({
      db: gameStore.db,
      userId: authStore.user?.id,
      myElo: gameStore.state.eloRating || DEFAULT_INITIAL_ELO,
      currentSeasonRules: pvpStore.currentSeasonRules,
      resolvePvpTeam,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      isSearching,
      searchSecondsRemaining,
      searchPhase,
      startSearchCountdown: _startSearchCountdown,
      pollMatchmaking: _pollMatchmaking,
      scheduleMatchmakingPoll: (cb) => gsap.delayedCall(3, cb)
    })
  }

  async function cancelSearch() {
    await executeCancelSearch({
      db: gameStore.db,
      userId: authStore.user?.id,
      isSearching,
      searchPhase,
      searchSecondsRemaining,
      killSearchCountdown: () => { if (searchCountdownTween) searchCountdownTween.kill() },
      killMatchmakingPoller: () => { if (matchmakingPoller) matchmakingPoller.kill() }
    })
  }

  async function _fallbackToPassiveBattle() {
    if (!gameStore.db) return
    const pvpStore = usePvPStore()
    await executeFallbackToPassiveBattle({
      userId: authStore.user?.id,
      db: gameStore.db,
      isSearching,
      searchPhase,
      searchCountdownTween,
      matchmakingPoller,
      myElo: gameStore.state.eloRating || DEFAULT_INITIAL_ELO,
      seasonRules: pvpStore.currentSeasonRules,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      onMatched: (params) => _startPassiveBattle(params)
    })
  }

  function _startPassiveBattle(params: {
    opponentId: string
    opponentName: string
    opponentElo: number
    enemyTeam: Pokemon[]
  }) {
    executeStartPassiveBattle(params, {
      resolvePvpTeam,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      timerManager,
      afkStrikes,
      myTeamConfirmed,
      enemyTeamConfirmed,
      currentSeasonRules: pvpStore.currentSeasonRules,
      battleState
    })
  }

  async function sendInvite(opponentId: string, opponentName: string, config?: PvpChallengeConfig) {
    await executeSendInvite({
      db: gameStore.db,
      userId: authStore.user?.id,
      opponentId,
      opponentName,
      config,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      onStartBattle: (data) => startBattle(data, true, false)
    })
  }

  async function acceptInvite(inviteId: string, isRanked = false) {
    await executeAcceptInvite({
      db: gameStore.db,
      inviteId,
      isRanked,
      activeInvite,
      openOfflineModal: (name) => modalStore.open('PvPOpponentOffline', { opponentName: name }),
      onStartBattle: (inv) => startBattle(inv, false, isRanked)
    })
  }

  async function declineInvite(inviteId: string) {
    await executeDeclineInvite({
      db: gameStore.db,
      inviteId,
      activeInvite
    })
  }

  async function _commitPick(pick: PvPAction) {
    await executeCommitPick(pick, {
      battleState,
      timerManager,
      afkStrikes,
      battleStore: useBattleStore(),
      resolveTurn
    })
  }

  function _checkReadyToResolve() {
    executeCheckReadyToResolve(battleState, useBattleStore(), resolveTurn)
  }

  function _forfeit() {
    executeForfeit({
      battleState,
      timerManager,
      endBattle
    })
  }

  async function endBattle(won: boolean, reason: string) {
    const battleStore = useBattleStore()
    await executeEndBattle(won, reason, {
      battleState,
      timerManager,
      isReconnecting,
      pvpStore,
      gameStore,
      authStore,
      uiStore,
      battleStore
    })
  }

  async function resolveTurn() {
    const battleStore = useBattleStore()
    await executeResolveTurn({
      battleState,
      battleStore,
      timerManager,
      uiStore,
      endBattle,
      resolveTurnRecursion: resolveTurn
    })
  }

  function selectFaintReplacement(switchIndex: number) {
    _commitPick({ type: 'switch', switchIndex, choiceString: `switch ${switchIndex + 1}` })
  }

  function resolvePvpTeam(format?: string): Pokemon[] {
    return resolvePvpTeamHelper(gameStore, format)
  }

  function startBattle(invite: BattleInvite, isHost: boolean, isRanked: boolean) {
    executeStartBattle(invite, isHost, isRanked, {
      resolvePvpTeam,
      uiStore,
      gameStore,
      timerManager,
      afkStrikes,
      myTeamConfirmed,
      enemyTeamConfirmed,
      battleState,
      setupBattleChannel
    })
  }

  function setupBattleChannel(inviteId: string) {
    executeSetupBattleChannel(inviteId, {
      db: gameStore.db,
      battleState,
      trainerName: gameStore.state.trainer,
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
    })
  }

  function handleOpponentTeam({ payload }: { payload: { team: Pokemon[]; trainerName?: string } }) {
    executeHandleOpponentTeam(payload, battleState)
  }

  function confirmTeamPreview(orderedPicks: Pokemon[]) {
    executeConfirmTeamPreview(orderedPicks, {
      battleState,
      myTeamConfirmed,
      enemyTeamConfirmed,
      timerManager,
      battleStore: useBattleStore()
    })
  }

  function handleOpponentTeamOrder({ payload }: { payload: { orderedUids: string[] } }) {
    executeHandleOpponentTeamOrder(payload, {
      battleState,
      myTeamConfirmed,
      enemyTeamConfirmed,
      timerManager,
      battleStore: useBattleStore()
    })
  }

  function handleOpponentPick({ payload }: { payload: PvPAction }) {
    battleState.enemyPick = payload
    if (battleState.isHost) {
      _checkReadyToResolve()
    }
  }

  async function handleTurnStream({ payload }: { payload: PvpTurnStreamPayload & { request?: ShowdownPlayerRequest } }) {
    const battleStore = useBattleStore()
    await executeHandleTurnStream(payload, {
      battleState,
      battleStore,
      timerManager,
      uiStore,
      isSpectator: isSpectator.value,
      endBattle
    })
  }

  async function createRoom(config?: PvpChallengeConfig): Promise<PvpRoomCode | null> {
    return createRoomAction(config, {
      userId: authStore.user?.id,
      db: gameStore.db,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      activeRoomCode,
      getRoomHostPoller: () => roomHostPoller,
      setRoomHostPoller: (p) => { roomHostPoller = p },
      startBattle
    })
  }

  async function cancelRoom() {
    await cancelRoomAction(activeRoomCode, gameStore.db, roomHostPoller, (p) => { roomHostPoller = p })
  }

  async function joinRoom(code: PvpRoomCode): Promise<boolean> {
    return joinRoomAction(code, {
      userId: authStore.user?.id,
      db: gameStore.db,
      notify: (msg, icon) => uiStore.notify(msg, icon),
      startBattle
    })
  }

  async function spectateMatch(matchId: string) {
    executeSpectateMatch(matchId, {
      battleState,
      isSpectator,
      setupBattleChannel,
      userId: authStore.user?.id,
      hasDb: Boolean(gameStore.db)
    })
  }

  function handleSpectateJoin() {
    executeHandleSpectateJoin({ battleState })
  }

  function handleSpectateSync({ payload }: { payload: PvpSpectateSyncPayload }) {
    executeHandleSpectateSync(payload, isSpectator.value)
  }

  function handleOpponentReconnect({ payload }: { payload: PvpReconnectPayload }) {
    executeHandleOpponentReconnect(payload, {
      notify: (msg, icon) => uiStore.notify(msg, icon),
      timerManager,
      isReconnecting
    })
  }

  function handleOpponentForfeit() {
    endBattle(true, 'El oponente se ha rendido.')
  }

  function reconnectBattle(restoredBattle: unknown) {
    executeReconnectBattle(restoredBattle, {
      battleState,
      timerManager,
      isReconnecting,
      setupBattleChannel
    })
  }

  function _checkPostTurn() {
    executeCheckPostTurn({
      battleState,
      uiStore,
      timerManager,
      endBattle
    })
  }


  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (searchCountdownTween) searchCountdownTween.kill()
      if (invitePoller) invitePoller.kill()
      if (matchmakingPoller) matchmakingPoller.kill()
      if (roomHostPoller) roomHostPoller.kill()
      timerManager.destroy()
      if (battleState.ch) battleState.ch.unsubscribe()
    })
  }

  return {
    isSearching,
    searchSecondsRemaining,
    searchPhase,
    battleState,
    activeInvite,
    activeRoomCode,
    isSpectator,
    turnSecondsRemaining,
    reconnectSecondsRemaining,
    afkStrikes,
    isReconnecting,
    activeReplay,
    watchReplay,
    checkUserOnline,
    initInvitePoller,
    sendInvite,
    acceptInvite,
    declineInvite,
    startBattle,
    reconnectBattle,
    startSearch,
    cancelSearch,
    _fallbackToPassiveBattle,
    resolvePvpTeam,
    createRoom,
    cancelRoom,
    joinRoom,
    spectateMatch,
    confirmTeamPreview,
    selectFaintReplacement,
    _commitPick,
    _forfeit,
    handleOpponentPick,
    _checkPostTurn,
    endBattle
  }
})
