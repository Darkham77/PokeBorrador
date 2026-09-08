/**
 * src/logic/pvp/pvpRoomActionsHelper.ts
 *
 * Helper logic for custom PvP Rooms and Spectator operations.
 * Separates Room lifecycle and spectator synchronization from the main LivePvP store
 * to ensure strict maintainability and single responsibility modularity.
 */

import { gsap } from 'gsap'
import type { BattleInvite, PvpChallengeConfig, PvpRoomCode } from '@/types/battle/pvp'
import { generateRoomCode, isValidRoomCode, formatRoomCode } from '@/logic/pvp/pvpRoomCodeHelper'
import { buildSpectateSyncPayload, type PvpSpectateSyncPayload } from '@/logic/pvp/pvpSpectatorHelper'
import type { BattleContext } from '@/types/battle/battleContext'
import type { DBRouter } from '@/logic/db/dbRouter'

export interface RoomActionsContext {
  db: DBRouter
  userId: string
  notify: (msg: string, icon?: string) => void
  onBattleStart: (invite: BattleInvite, isHost: boolean, isRanked: boolean) => void
}

export async function executeCreateRoom(
  config: PvpChallengeConfig | undefined,
  ctx: RoomActionsContext,
  onPollerCreated: (poller: gsap.core.Tween) => void
): Promise<{ code: PvpRoomCode; inviteId: string } | null> {
  const code = generateRoomCode()
  const challengeConfig: PvpChallengeConfig = config || {
    format: '3v3',
    levelRule: 'flat50',
    arena: { gymId: 'celadon' },
    mode: 'casual'
  }

  const { data, error } = await ctx.db.from('battle_invites').insert({
    challenger_id: ctx.userId,
    sender_id: ctx.userId,
    opponent_id: '',
    status: 'pending',
    config: challengeConfig,
    room_code: code
  }).select().single() as { data: BattleInvite | null; error: unknown }

  if (error || !data) {
    ctx.notify('Error al crear sala.', '❌')
    return null
  }

  const poller = startRoomHostPoller(data.id, ctx)
  onPollerCreated(poller)
  return { code, inviteId: data.id }
}

export function startRoomHostPoller(
  inviteId: string,
  ctx: RoomActionsContext
): gsap.core.Tween {
  let poller: gsap.core.Tween

  const poll = async () => {
    if (!ctx.db) return
    const { data } = await ctx.db
      .from('battle_invites')
      .select('*')
      .eq('id', inviteId)
      .single() as { data: BattleInvite | null }

    if (data && data.status === 'accepted' && data.opponent_id) {
      ctx.onBattleStart(data, true, false)
      return
    }

    poller = gsap.delayedCall(2, poll)
  }

  poller = gsap.delayedCall(2, poll)
  return poller
}

export async function executeCancelRoom(
  roomCode: PvpRoomCode | null,
  db: DBRouter | null,
  poller: { kill: () => void } | null
): Promise<void> {
  if (poller) poller.kill()
  if (roomCode && db) {
    await db.from('battle_invites').delete().eq('room_code', roomCode)
  }
}

export async function executeJoinRoom(
  code: PvpRoomCode,
  ctx: RoomActionsContext
): Promise<boolean> {
  const formatted = formatRoomCode(code)
  if (!isValidRoomCode(formatted)) {
    ctx.notify('Código de sala inválido.', '⚠️')
    return false
  }

  const { data: invite, error } = await ctx.db.from('battle_invites')
    .select('*')
    .eq('room_code', formatted)
    .eq('status', 'pending')
    .maybeSingle() as { data: BattleInvite | null; error: unknown }

  if (error || !invite) {
    ctx.notify('Sala no encontrada o ya ocupada.', '🚫')
    return false
  }

  if (invite.sender_id === ctx.userId) {
    ctx.notify('No puedes unirte a tu propia sala.', '⚠️')
    return false
  }

  await ctx.db.from('battle_invites')
    .update({ opponent_id: ctx.userId, status: 'accepted' })
    .eq('id', invite.id)

  ctx.onBattleStart(invite, false, false)
  return true
}

export function buildHostSpectateBroadcast(
  inviteId: string,
  battleCtx: BattleContext,
  opponentName: string
): PvpSpectateSyncPayload | null {
  return buildSpectateSyncPayload(inviteId, battleCtx, opponentName)
}

export interface CreateRoomActionContext {
  userId?: string
  db: DBRouter | null
  notify: (msg: string, icon?: string) => void
  activeRoomCode: { value: PvpRoomCode | null }
  getRoomHostPoller: () => { kill: () => void } | null
  setRoomHostPoller: (poller: { kill: () => void } | null) => void
  startBattle: (invite: BattleInvite, isHost: boolean, isRanked: boolean) => void
}

export async function createRoomAction(
  config: PvpChallengeConfig | undefined,
  ctx: CreateRoomActionContext
): Promise<PvpRoomCode | null> {
  if (!ctx.userId || !ctx.db) return null
  const result = await executeCreateRoom(
    config,
    {
      db: ctx.db,
      userId: ctx.userId,
      notify: ctx.notify,
      onBattleStart: (invite, isHost, isRanked) => {
        ctx.activeRoomCode.value = null
        ctx.startBattle(invite, isHost, isRanked)
      }
    },
    (poller) => {
      const existing = ctx.getRoomHostPoller()
      if (existing) existing.kill()
      ctx.setRoomHostPoller(poller)
    }
  )
  if (!result) {
    ctx.activeRoomCode.value = null
    return null
  }
  ctx.activeRoomCode.value = result.code
  return result.code
}

export async function cancelRoomAction(
  activeRoomCode: { value: PvpRoomCode | null },
  db: DBRouter | null,
  roomHostPoller: { kill: () => void } | null,
  setRoomHostPoller: (poller: null) => void
): Promise<void> {
  await executeCancelRoom(activeRoomCode.value, db, roomHostPoller)
  setRoomHostPoller(null)
  activeRoomCode.value = null
}

export async function joinRoomAction(
  code: PvpRoomCode,
  ctx: {
    userId?: string
    db: DBRouter | null
    notify: (msg: string, icon?: string) => void
    startBattle: (invite: BattleInvite, isHost: boolean, isRanked: boolean) => void
  }
): Promise<boolean> {
  if (!ctx.userId || !ctx.db) return false
  return executeJoinRoom(code, {
    db: ctx.db,
    userId: ctx.userId,
    notify: ctx.notify,
    onBattleStart: ctx.startBattle
  })
}

