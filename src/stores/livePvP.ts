import { defineStore } from 'pinia'
import { ref, reactive, getCurrentScope, onScopeDispose } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { usePvPStore } from '@/stores/pvp.ts'
import { useModalStore } from '@/stores/modals.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { resolvePvPTurn, applyPvPTurnResult, type PvPBattleState, type PvPTurnResult, type PvPAction } from '@/logic/pvp/pvpEngine'
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper.ts'
import { ShowdownPerspectiveAdapter } from '@/logic/battle/helpers/showdownPerspectiveAdapter.ts'
import { parseInstantSafe } from '@/logic/utils/timeUtils.ts'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Pokemon } from '@/types/pokemon/pokemon'
import {
  DEFAULT_INITIAL_ELO,
  ONLINE_PRESENCE_WINDOW_MS
} from '@/logic/constants/gameplay.ts'
import {
  PVP_TURN_TIMEOUT_SEC,
  PVP_RECONNECT_WINDOW_SEC,
  PVP_INVITE_EXPIRY_MS,
  type BattleInvite,
  type BattleReplayRecord,
  type PvpChallengeConfig,
  type PvpTurnStreamPayload,
  type PvpForfeitPayload,
  type PvpReconnectPayload
} from '@/types/battle/pvp'

interface RankedQueueEntry {
  user_id: string
  elo: number
  looking_since: string
}

export const useLivePvPStore = defineStore('livePvP', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const modalStore = useModalStore()
  const pvpStore = usePvPStore()

  const activeInvite = ref<BattleInvite | null>(null)
  const isSearching = ref(false)
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

  interface LiveBattleState extends PvPBattleState {
    active: boolean
    opponentId: string | null
    opponentName: string
    opponentElo: number
    deadline: number | null
    ch: RealtimeChannel | null
    inviteId: string | null
    config?: PvpChallengeConfig
  }

  const battleState = reactive<LiveBattleState>({
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
    deadline: null,
  })

  let invitePoller: gsap.core.Tween | null = null
  let matchmakingPoller: gsap.core.Tween | null = null

  async function checkUserOnline(userId: string): Promise<boolean> {
    if (!gameStore.db) return false
    try {
      const { data } = await gameStore.db
        .from('game_saves')
        .select('updated_at')
        .eq('user_id', userId)
        .single() as { data: { updated_at: string } | null }

      if (!data?.updated_at) return false
      const lastSeen = parseInstantSafe(data.updated_at)
      if (!lastSeen) return false
      const now = Temporal.Now.instant().epochMilliseconds
      return (now - lastSeen.epochMilliseconds) < ONLINE_PRESENCE_WINDOW_MS
    } catch {
      return false
    }
  }

  function handleTurnTimeout(isForfeit: boolean) {
    if (isForfeit) {
      uiStore.notify('Has perdido por inactividad (2 strikes AFK).', '⚠️')
      _forfeit()
    } else {
      uiStore.notify('Tiempo de turno agotado (Strike 1/2). Ejecutando acción automática.', '⏱️')
      // Auto-pick: select first valid attack move to prevent game freeze
      _commitPick({ type: 'move', moveIndex: 0 })
    }
  }

  function handleReconnectTimeout() {
    timerManager.stopReconnectCountdown()
    isReconnecting.value = false
    endBattle(false, 'Tiempo de reconexión agotado.')
  }

  async function _pollMatchmaking() {
    if (!isSearching.value || !gameStore.db || !authStore.user) return
    const res = await gameStore.db.from('ranked_queue').select('*').neq('user_id', authStore.user.id).order('looking_since', { ascending: true }).limit(1)
    const data = res.data as RankedQueueEntry[] | null
    if (data && data.length > 0 && authStore.user && gameStore.db) {
      const match = data[0]
      if (!match) return
      const invRes = await gameStore.db.from('battle_invites').insert({
        challenger_id: authStore.user.id,
        sender_id: authStore.user.id,
        opponent_id: match.user_id,
        status: 'ranked_match',
        config: { format: '6v6', levelRule: 'flat50', arena: { gymId: 'celadon' }, mode: 'ranked' }
      }).select().single()
      const invite = invRes.data as BattleInvite | null
      const error = invRes.error
      if (!error && invite) {
        await gameStore.db.from('ranked_queue').delete().in('user_id', [authStore.user.id, match.user_id])
        isSearching.value = false
        startBattle(invite, true, true)
      }
    }
  }

  function initInvitePoller() {
    if (invitePoller) invitePoller.kill()
    if (authStore.sessionMode === 'offline') return

    const poll = async () => {
      if (!authStore.user || !gameStore.db) return
      const { data } = await gameStore.db
        .from('battle_invites')
        .select('*')
        .eq('opponent_id', authStore.user.id)
        .in('status', ['pending', 'ranked_match'])
        .order('created_at', { ascending: false })
        .limit(1) as { data: BattleInvite[] | null }

      if (data && data.length > 0 && gameStore.db) {
        const inv = data[0]
        if (!inv) return
        const diffMs = Temporal.Now.instant().epochMilliseconds - Temporal.Instant.from(inv.created_at).epochMilliseconds
        if (diffMs > PVP_INVITE_EXPIRY_MS) return

        if (inv.status === 'ranked_match') {
          if (isSearching.value) acceptInvite(inv.id, true)
          else await gameStore.db.from('battle_invites').update({ status: 'declined' }).eq('id', inv.id)
        } else {
          activeInvite.value = inv
        }
      }
      invitePoller = gsap.delayedCall(4, poll)
    }

    invitePoller = gsap.delayedCall(4, poll)
  }

  async function startSearch() {
    if (!authStore.user || !gameStore.db) return
    isSearching.value = true
    await gameStore.db.from('ranked_queue').upsert({
      user_id: authStore.user.id,
      elo: gameStore.state.eloRating || DEFAULT_INITIAL_ELO,
      looking_since: Temporal.Now.instant().toString()
    })
    uiStore.notify('Buscando oponente...', '🔍')
    if (matchmakingPoller) matchmakingPoller.kill()

    const poll = async () => {
      await _pollMatchmaking()
      if (isSearching.value) {
        matchmakingPoller = gsap.delayedCall(3, poll)
      }
    }

    await poll()
  }

  async function cancelSearch() {
    if (!authStore.user || !gameStore.db) return
    isSearching.value = false
    if (matchmakingPoller) matchmakingPoller.kill()
    await gameStore.db.from('ranked_queue').delete().eq('user_id', authStore.user.id)
  }

  async function sendInvite(opponentId: string, opponentName: string, config?: PvpChallengeConfig) {
    if (!authStore.user || !gameStore.db) return
    const challengeConfig: PvpChallengeConfig = config || {
      format: '3v3',
      levelRule: 'real',
      arena: { gymId: 'celadon' }
    }

    const invRes = await gameStore.db.from('battle_invites').insert({
      challenger_id: authStore.user.id,
      sender_id: authStore.user.id,
      opponent_id: opponentId,
      status: 'pending',
      config: challengeConfig
    }).select().single()

    const data = invRes.data as BattleInvite | null
    const error = invRes.error
    if (error || !data) {
      uiStore.notify('Error al enviar invitación', '❌')
      return
    }

    uiStore.notify(`Invitación enviada a ${opponentName}`, '✉️')
    startBattle(data, true, false)
  }

  async function acceptInvite(inviteId: string, isRanked = false) {
    if (!gameStore.db) return
    const { data: invite } = await gameStore.db
      .from('battle_invites')
      .select('*')
      .eq('id', inviteId)
      .single() as { data: BattleInvite | null }

    if (!invite) return

    const senderId = invite.sender_id || invite.challenger_id || ''
    const isOnline = await checkUserOnline(senderId)
    if (!isOnline) {
      await gameStore.db.from('battle_invites').update({ status: 'cancelled_offline' }).eq('id', inviteId)
      activeInvite.value = null
      modalStore.open('PvPOpponentOffline', { opponentName: 'El oponente' })
      return
    }

    const status = isRanked ? 'ranked_accepted' : 'accepted'
    await gameStore.db.from('battle_invites').update({ status }).eq('id', inviteId)
    activeInvite.value = null
    startBattle(invite, false, isRanked)
  }

  async function declineInvite(inviteId: string) {
    if (gameStore.db) {
      await gameStore.db.from('battle_invites').update({ status: 'declined' }).eq('id', inviteId)
    }
    activeInvite.value = null
  }

  function _commitPick(pick: PvPAction) {
    if (battleState.phase !== 'choosing') return
    timerManager.stopTurnTimer()
    timerManager.resetStrikes()
    afkStrikes.value = 0

    battleState.myPick = pick
    battleState.phase = 'waiting'
    if (battleState.isHost) {
      if (battleState.enemyPick) resolveTurn()
    } else {
      if (battleState.ch) {
        battleState.ch.send({ type: 'broadcast', event: 'pvp_pick', payload: pick })
      }
    }
  }

  function _forfeit() {
    timerManager.stopTurnTimer()
    timerManager.stopReconnectCountdown()
    if (battleState.ch) {
      const forfeitPayload: PvpForfeitPayload = {
        actorSide: battleState.isHost ? 'p1' : 'p2',
        reason: 'forfeit'
      }
      battleState.ch.send({ type: 'broadcast', event: 'pvp_forfeit', payload: forfeitPayload })
    }
    endBattle(false, 'Te has rendido.')
  }

  async function endBattle(won: boolean, reason: string) {
    timerManager.stopTurnTimer()
    timerManager.stopReconnectCountdown()
    isReconnecting.value = false
    battleState.active = false
    battleState.phase = 'over'
    if (battleState.ch) battleState.ch.unsubscribe()

    let eloDelta = 0
    if (battleState.isRanked) {
      eloDelta = await pvpStore.updateElo(won, battleState.opponentElo)
      if (battleState.opponentId && battleState.config?.isAsynchronous && gameStore.db) {
        const defenderDelta = -eloDelta
        await gameStore.db.rpc('record_passive_battle_result', {
          p_defender_id: battleState.opponentId,
          p_result: won ? 'defeat' : 'victory',
          p_delta_elo: defenderDelta,
          p_report_data: {
            opponent: authStore.user?.user_metadata?.username || gameStore.state.trainer || 'Rival',
            turns: battleState.logs.length,
            endedAt: Temporal.Now.instant().toString()
          }
        })
      }
    }

    uiStore.notify(
      `${reason || (won ? '¡Has ganado!' : 'Has perdido.')}${eloDelta !== 0 ? ` (${eloDelta > 0 ? '+' : ''}${eloDelta} ELO)` : ''}`,
      won ? '🏆' : '💀'
    )
    if (gameStore.state) {
      gameStore.state.activeBattle = null
      gameStore.save(false)
    }
  }

  function resolveTurn() {
    const res = resolvePvPTurn(battleState)
    if (res) applyTurnResult(res)
  }

  async function applyTurnResult(result: PvPTurnResult) {
    await applyPvPTurnResult(battleState, result, endBattle)
    if (battleState.active && battleState.phase === 'choosing') {
      timerManager.startTurnTimer()
    }
  }

  function resolvePvpTeam(format?: string): Pokemon[] {
    const is6v6 = format === '6v6'
    let uids = is6v6 ? gameStore.state.pvpTeam6 : gameStore.state.pvpTeam
    if (!uids || uids.length === 0) {
      if (is6v6) gameStore.autoFillPvpTeam6()
      else gameStore.autoFillPvpTeam()
      uids = is6v6 ? gameStore.state.pvpTeam6 : gameStore.state.pvpTeam
    }
    const allPokes = [
      ...((gameStore.state.team || []) as (Pokemon | null)[]),
      ...((gameStore.state.box || []) as (Pokemon | null)[])
    ].filter((p): p is Pokemon => p !== null)

    const resolved: Pokemon[] = []
    for (const uid of (uids || [])) {
      const poke = allPokes.find(p => p.uid === uid)
      if (poke) resolved.push(JSON.parse(JSON.stringify(poke)) as Pokemon)
    }
    return resolved
  }

  function startBattle(invite: BattleInvite, isHost: boolean, isRanked: boolean) {
    const myTeam = resolvePvpTeam(invite.config?.format)
    const hasIllegal = myTeam.some((p: Pokemon) => p && p.isIllegal)
    if (hasIllegal) {
      uiStore.notify('No puedes participar en PvP con Pokémon ilegales en tu equipo.', '⚠️')
      return
    }

    timerManager.resetStrikes()
    afkStrikes.value = 0

    battleState.active = true
    battleState.isHost = isHost
    battleState.isRanked = isRanked
    battleState.inviteId = invite.id
    battleState.config = invite.config
    battleState.opponentId = isHost ? invite.opponent_id : (invite.sender_id || invite.challenger_id || null)
    battleState.myTeam = myTeam
    battleState.myHp = battleState.myTeam.map((p: Pokemon) => p.hp)
    battleState.myActiveIdx = 0
    battleState.phase = 'sync'
    battleState.logs = ['¡Comienza la batalla!']
    battleState.myPick = null
    battleState.enemyPick = null

    setupBattleChannel(invite.id)

    const broadcastTeam = () => {
      if (battleState.ch) {
        battleState.ch.send({
          type: 'broadcast',
          event: 'pvp_team',
          payload: { team: battleState.myTeam, format: invite.config?.format }
        })
      }
    }
    gsap.delayedCall(0.5, broadcastTeam)
    gsap.delayedCall(2.0, broadcastTeam)
  }

  function setupBattleChannel(inviteId: string) {
    if (!gameStore.db) return
    const ch = gameStore.db.channel(`pvp-${inviteId}`)
    battleState.ch = ch
    ch.on('broadcast' as const, { event: 'pvp_team' }, handleOpponentTeam)
      .on('broadcast' as const, { event: 'pvp_pick' }, handleOpponentPick)
      .on('broadcast' as const, { event: 'pvp_turn_stream' }, handleTurnStream)
      .on('broadcast' as const, { event: 'pvp_turn_result' }, handleTurnResult)
      .on('broadcast' as const, { event: 'pvp_reconnect' }, handleOpponentReconnect)
      .on('broadcast' as const, { event: 'pvp_forfeit' }, handleOpponentForfeit)
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          ch.send({
            type: 'broadcast',
            event: 'pvp_team',
            payload: { team: battleState.myTeam }
          })
        }
      })
  }

  function handleOpponentTeam({ payload }: { payload: { team: Pokemon[] } }) {
    if (battleState.enemyTeam.length > 0) return
    battleState.enemyTeam = payload.team
    battleState.enemyHp = payload.team.map((p: Pokemon) => p.hp)
    battleState.enemyActiveIdx = 0
    if (battleState.phase === 'sync') {
      battleState.phase = 'choosing'
      battleState.logs.push('¡El rival está listo!')
      timerManager.startTurnTimer()

      // Also ensure battleStore is started for arena UI integration
      const battleStore = useBattleStore()
      if (!battleStore.isPvP && battleState.enemyTeam.length > 0) {
        const enemyLeader = battleState.enemyTeam[0]
        if (enemyLeader) {
          battleStore.startBattle(enemyLeader, {
            isPvP: true,
            pvpMatchId: battleState.inviteId || undefined,
            pvpIsHost: battleState.isHost,
            pvpOpponentId: battleState.opponentId || undefined,
            pvpOpponentName: battleState.opponentName,
            enemyTeam: battleState.enemyTeam,
            playerTeam: battleState.myTeam,
            isTrainer: true,
            trainerName: battleState.opponentName,
            trainerSprite: 'blue',
            locationId: 'gym'
          })
        }
      }
    }
  }

  function handleOpponentPick({ payload }: { payload: PvPAction }) {
    battleState.enemyPick = payload
    if (battleState.isHost && battleState.myPick) resolveTurn()
  }

  function handleTurnResult({ payload }: { payload: PvPTurnResult }) {
    if (!battleState.isHost) applyTurnResult(payload)
  }

  function handleTurnStream({ payload }: { payload: PvpTurnStreamPayload }) {
    if (battleState.isHost) return
    // Invert Showdown stream perspective for Guest (p1 <-> p2)
    const invertedLines = ShowdownPerspectiveAdapter.invertStream(payload.streamLines)
    battleState.logs.push(...invertedLines)
    if (payload.over) {
      const won = payload.winnerSide === 'p2' // guest perspective
      endBattle(won, won ? '¡Victoria en PvP!' : 'Derrota en PvP.')
    } else {
      battleState.phase = 'choosing'
      timerManager.startTurnTimer()
    }
  }

  function handleOpponentReconnect({ payload }: { payload: PvpReconnectPayload }) {
    uiStore.notify(`El rival se ha reconectado (Turno ${payload.lastTurnNumber}).`, '🔄')
    timerManager.stopReconnectCountdown()
    isReconnecting.value = false
  }

  function handleOpponentForfeit() {
    endBattle(true, 'El oponente se ha rendido.')
  }

  function reconnectBattle(restoredBattle: unknown) {
    const b = restoredBattle as {
      pvpMatchId?: string; // uuid-ok: Supabase battle match uuid
      isPvP?: boolean;
      pvpIsHost?: boolean;
      pvpOpponentId?: string; // uuid-ok: Supabase opponent user uuid
      turnCount?: number;
    }
    if (!b?.isPvP || !b.pvpMatchId) return

    battleState.active = true
    battleState.inviteId = b.pvpMatchId
    battleState.isHost = Boolean(b.pvpIsHost)
    battleState.opponentId = b.pvpOpponentId || null

    setupBattleChannel(b.pvpMatchId)

    // Notify opponent of reconnection and start reconnect timer window
    timerManager.startReconnectCountdown()
    isReconnecting.value = true

    const payload: PvpReconnectPayload = {
      matchId: b.pvpMatchId,
      side: battleState.isHost ? 'p1' : 'p2',
      lastTurnNumber: b.turnCount || 1
    }
    gsap.delayedCall(0.8, () => {
      if (battleState.ch) {
        battleState.ch.send({ type: 'broadcast', event: 'pvp_reconnect', payload })
      }
    })
  }

  function _checkPostTurn() {
    const myHp = battleState.myHp[battleState.myActiveIdx] || 0
    const enHp = battleState.enemyHp[battleState.enemyActiveIdx] || 0
    if (myHp <= 0) {
      if (!battleState.myHp.some(h => h > 0)) endBattle(false, '¡Has sido derrotado!')
      else battleState.phase = 'faint_switch'
    } else if (enHp <= 0) {
      if (!battleState.enemyHp.some(h => h > 0)) endBattle(true, '¡Has ganado la batalla!')
      else battleState.phase = 'waiting'
    } else {
      battleState.phase = 'choosing'
      battleState.myPick = null
      battleState.enemyPick = null
      timerManager.startTurnTimer()
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (invitePoller) invitePoller.kill()
      if (matchmakingPoller) matchmakingPoller.kill()
      timerManager.destroy()
      if (battleState.ch) battleState.ch.unsubscribe()
    })
  }

  return {
    isSearching,
    battleState,
    activeInvite,
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
    _commitPick,
    _forfeit,
    handleOpponentPick,
    _checkPostTurn,
    endBattle
  }
})
