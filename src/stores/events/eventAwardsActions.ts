import type { Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import type { PendingAward, PastEventHistoryItem, PastCompetitionWinner, CompetitionEntry } from '@/types/system/stores'
import { getEventDisplayName, type Event as GameEvent } from '@/logic/events/eventEngine'
import { GAME_TIMEZONE, getGMT3Date } from '@/logic/utils/timeUtils'
import type { PokemonCompetitionTrophy, PokemonCompetitionRank } from '@/types/pokemon/pokemon'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import { healStuckEventPokemon } from '@/logic/player/eventRecovery'
import {
  grantMoneyAward,
  grantBattleCoinsAward,
  grantItemsAward,
  grantPokemonAward,
  validateStorageCapacityForAwards
} from './eventPrizeGrantor.ts'
import {
  parseAwardPrizePayload,
  updateTrophyStats,
  insertOrUpdatePokemonTrophy,
  resolvePastEventVisuals,
  findTargetAward,
  mutatePastEventsAwards
} from './eventAwardsHelper.ts'
import type { useGameStore } from '@/stores/game.ts'
import type { useAuthStore } from '@/stores/auth.ts'
import type { useUIStore } from '@/stores/ui.ts'

const MAX_PAST_EVENTS_COUNT = 20

export interface EventAwardsContext {
  gameStore: ReturnType<typeof useGameStore>
  authStore: ReturnType<typeof useAuthStore>
  uiStore: ReturnType<typeof useUIStore>
  allEvents: Ref<GameEvent[]>
  pastEvents: Ref<PastEventHistoryItem[]>
  pendingAwards: Ref<PendingAward[]>
  userEntries: Ref<Record<string, CompetitionEntry>>
}

function grantTrophyToPokemon(
  ctx: EventAwardsContext,
  trophy: PokemonCompetitionTrophy,
  pokemonUid?: string
) {
  if (!pokemonUid) return
  const { gameStore } = ctx
  const targetPoke = gameStore.getPokemonByUid(pokemonUid)
  if (!targetPoke) return

  if (!targetPoke.trophies) {
    targetPoke.trophies = []
  }
  const isNew = insertOrUpdatePokemonTrophy(targetPoke.trophies, trophy)
  if (!isNew) return

  if (!gameStore.state.stats) {
    gameStore.state.stats = {}
  }
  updateTrophyStats(gameStore.state.stats, trophy.rank)
  logger.info('Events', `Trophy granted to Pokémon ${targetPoke.name} (${targetPoke.uid}): ${trophy.eventName} - ${trophy.categoryName} (${trophy.rank})`)
  gameStore.save(false).catch(err => logger.warn('Events', 'Failed to auto-save after granting trophy', err))
}

function applyAwardPrize(ctx: EventAwardsContext, rawPrize: unknown, options: { autoSave?: boolean; silent?: boolean } = {}) {
  const prize = parseAwardPrizePayload(rawPrize)
  if (!prize) return

  const { gameStore, uiStore } = ctx
  const silent = options.silent ?? false

  let totalNotified = 0
  totalNotified += grantMoneyAward(gameStore, uiStore, prize, silent)
  totalNotified += grantBattleCoinsAward(gameStore, uiStore, prize, silent)
  totalNotified += grantItemsAward(gameStore, uiStore, prize, silent)
  totalNotified += grantPokemonAward(gameStore, uiStore, prize, silent)

  if (!silent && totalNotified === 0) {
    uiStore.notify('¡Recompensa reclamada!', '🎁')
  }

  if (options.autoSave ?? true) {
    gameStore.save(false).catch(err => logger.warn('Events', 'Failed to auto-save after claiming award', err))
  }
}

export async function checkPendingAwards(ctx: EventAwardsContext, notifyOnPending = false) {
  const { authStore, gameStore, pendingAwards, uiStore } = ctx
  if (!authStore.user || !gameStore.db) return

  const { data: awards, error } = await gameStore.db.from('awards')
    .select('*')
    .eq('winner_id', authStore.user.id)
    .is('received_at', null)

  if (!error) {
    const list = (awards || []) as PendingAward[]
    pendingAwards.value = list
    if (notifyOnPending && list.length > 0) {
      const count = list.length
      uiStore.notify(
        count === 1
          ? '¡Tienes 1 recompensa de evento pendiente por reclamar!'
          : `¡Tienes ${count} recompensas de eventos pendientes por reclamar!`,
        '🎁'
      )
    }
  }
}

interface RawCompetitionResultRow {
  id: string
  event_id: string
  winners: unknown
  ended_at: string
}

function parseCompetitionWinners(rawWinners: unknown): PastCompetitionWinner[] {
  if (typeof rawWinners === 'string') {
    try {
      return JSON.parse(rawWinners) as PastCompetitionWinner[]
    } catch {
      return []
    }
  }
  if (Array.isArray(rawWinners)) {
    return rawWinners as PastCompetitionWinner[]
  }
  return []
}

function parseEndedAtDate(endedAt?: string | null): Temporal.ZonedDateTime {
  if (!endedAt) return getGMT3Date()
  try {
    return Temporal.Instant.from(endedAt).toZonedDateTimeISO(GAME_TIMEZONE)
  } catch {
    return getGMT3Date()
  }
}

function resolveEventDisplayName(
  eventCfg: GameEvent | undefined,
  eventId: string,
  eventDate: Temporal.ZonedDateTime
): string {
  const isCustomOrUnknown = !eventCfg || eventId.startsWith('custom_') || (eventCfg.name && eventCfg.name.startsWith('custom_'))
  if (isCustomOrUnknown || !eventCfg) {
    return 'Evento desconocido'
  }
  return getEventDisplayName(eventCfg, eventDate)
}

function evaluateUserAwardStatus(matchingAwards: PendingAward[], isWinner: boolean) {
  const unClaimedAward = matchingAwards.find(a => a.received_at === null)
  const matchingAward = unClaimedAward || matchingAwards[0] || null
  const hasUnclaimedAward = matchingAwards.length > 0
    ? matchingAwards.some(a => a.received_at === null)
    : isWinner
  const isClaimed = matchingAwards.length > 0 && matchingAwards.every(a => a.received_at !== null)

  return { matchingAward, hasUnclaimedAward, isClaimed }
}

function resolveWinnerCategoryName(catId: string, customCategoryName?: string): string {
  if (customCategoryName) return customCategoryName
  if (catId.startsWith('weight')) return 'Masa y Peso'
  if (catId.startsWith('height')) return 'Envergadura y Altura'
  return 'Genética Superior (IVs)'
}

function resolveTrophyEventName(
  eventCfg: GameEvent | undefined,
  targetPokeName: string | undefined,
  eventDate: Temporal.ZonedDateTime,
  fallbackEventName: string
): string {
  if (!eventCfg) return fallbackEventName
  return getEventDisplayName(eventCfg, targetPokeName || eventDate)
}

function findUserEntryPokemonUid(
  userEntries: Record<string, CompetitionEntry>,
  eventId: string,
  catId: string
): string | undefined {
  const specificKey = `${eventId}:${catId}`
  const entry = userEntries[specificKey] || userEntries[eventId]
  return entry?.pokemon_uid
}

function processUserWinnerTrophy(
  ctx: EventAwardsContext,
  winner: PastCompetitionWinner,
  eventId: string,
  eventEndedAt: string,
  eventCfg: GameEvent | undefined,
  eventDate: Temporal.ZonedDateTime,
  fallbackEventName: string
) {
  const { authStore, userEntries, gameStore } = ctx
  if (!authStore.user || winner.player_id !== authStore.user.id) return

  const catId = winner.category_id || 'ivs'
  const pokeUid = findUserEntryPokemonUid(userEntries.value, eventId, catId)
  if (!pokeUid) return

  const targetPoke = gameStore.getPokemonByUid(pokeUid)
  const resolvedEventName = resolveTrophyEventName(eventCfg, targetPoke?.name, eventDate, fallbackEventName)

  grantTrophyToPokemon(ctx, {
    eventId,
    eventName: resolvedEventName,
    categoryId: catId,
    categoryName: resolveWinnerCategoryName(catId, winner.category_name),
    rank: (winner.rank as PokemonCompetitionRank) || 'first',
    score: winner.score || 0,
    awardedAt: Temporal.Instant.from(eventEndedAt).epochMilliseconds
  }, pokeUid)
}

function processWinnerTrophies(
  ctx: EventAwardsContext,
  winners: PastCompetitionWinner[],
  eventId: string,
  eventEndedAt: string,
  eventCfg: GameEvent | undefined,
  eventDate: Temporal.ZonedDateTime,
  fallbackEventName: string
) {
  if (!ctx.authStore.user) return
  for (const winner of winners) {
    processUserWinnerTrophy(ctx, winner, eventId, eventEndedAt, eventCfg, eventDate, fallbackEventName)
  }
}

function buildPastEventHistoryItem(
  res: RawCompetitionResultRow,
  parsedWinners: PastCompetitionWinner[],
  eventDate: Temporal.ZonedDateTime,
  eventCfg: GameEvent | undefined,
  userAwards: PendingAward[],
  userId: string | undefined
): PastEventHistoryItem {
  const isCustomOrUnknown = !eventCfg || res.event_id.startsWith('custom_') || Boolean(eventCfg.name?.startsWith('custom_'))
  const eventName = resolveEventDisplayName(eventCfg, res.event_id, eventDate)
  const visuals = resolvePastEventVisuals(eventCfg, isCustomOrUnknown)

  const matchingAwards = userAwards.filter(a => a.event_id === res.event_id)
  const isWinner = Boolean(userId && parsedWinners.some(w => w.player_id === userId))
  const { matchingAward, hasUnclaimedAward, isClaimed } = evaluateUserAwardStatus(matchingAwards, isWinner)

  return {
    id: res.id,
    event_id: res.event_id,
    event_name: eventName,
    event_icon: visuals.icon,
    event_description: visuals.description,
    event_schedule: eventCfg?.schedule,
    start_at: eventCfg?.start_at,
    end_at: eventCfg?.end_at,
    ended_at: res.ended_at,
    winners: parsedWinners,
    myAward: matchingAward,
    myAwards: matchingAwards,
    isWinner,
    hasUnclaimedAward,
    isClaimed,
    raw_event: eventCfg || null
  }
}

export async function fetchPastEvents(ctx: EventAwardsContext) {
  const { gameStore, authStore, allEvents, userEntries, pastEvents } = ctx
  if (!gameStore.db) return

  try {
    const { data: results, error } = await gameStore.db
      .from('competition_results')
      .select('*')
      .order('ended_at', { ascending: false })
      .limit(MAX_PAST_EVENTS_COUNT)

    if (error || !results) return

    let userAwards: PendingAward[] = []
    if (authStore.user) {
      const { data: allAwards } = await gameStore.db.from('awards')
        .select('*')
        .eq('winner_id', authStore.user.id)
      userAwards = (allAwards || []) as PendingAward[]
    }

    const historyList: PastEventHistoryItem[] = []
    for (const res of results as RawCompetitionResultRow[]) {
      const eventCfg = allEvents.value.find(e => e.id === res.event_id)
      const parsedWinners = parseCompetitionWinners(res.winners)
      const eventDate = parseEndedAtDate(res.ended_at)
      const historyItem = buildPastEventHistoryItem(res, parsedWinners, eventDate, eventCfg, userAwards, authStore.user?.id)

      processWinnerTrophies(ctx, parsedWinners, res.event_id, res.ended_at, eventCfg, eventDate, historyItem.event_name)
      historyList.push(historyItem)
    }

    pastEvents.value = historyList
    healStuckEventPokemon(gameStore.state?.team, gameStore.state?.box, allEvents.value, userEntries.value)
  } catch (e) {
    logger.warn('Events', `Error fetching past competition results: ${(e as Error).message}`)
  }
}

function updatePastEventsAwardClaimed(pastEvents: Ref<PastEventHistoryItem[]>, awardId: string, claimedTimestamp: string) {
  mutatePastEventsAwards(pastEvents, awardId, currentAwards =>
    currentAwards.map(a => a.id === awardId ? { ...a, received_at: claimedTimestamp } : a)
  )
}

function updatePastEventsAwardDiscarded(pastEvents: Ref<PastEventHistoryItem[]>, awardId: string) {
  mutatePastEventsAwards(pastEvents, awardId, currentAwards =>
    currentAwards.filter(a => a.id !== awardId)
  )
}

function finalizeClaimAward(
  ctx: EventAwardsContext,
  awardId: string,
  targetAward: PendingAward | null,
  prize: unknown,
  nowIso: string,
  options: { autoSave?: boolean; silent?: boolean }
) {
  const { pendingAwards, pastEvents, gameStore, allEvents, userEntries } = ctx
  pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
  updatePastEventsAwardClaimed(pastEvents, awardId, nowIso)
  applyAwardPrize(ctx, prize || targetAward?.prize, options)
  healStuckEventPokemon(gameStore.state?.team, gameStore.state?.box, allEvents.value, userEntries.value)
}

async function claimAwardFallbackUpdate(
  gameStore: ReturnType<typeof useGameStore>,
  awardId: string,
  nowIso: string
): Promise<boolean> {
  if (!gameStore.db) return false
  const { error } = await gameStore.db.from('awards')
    .update({ received_at: nowIso, claimed: true })
    .eq('id', awardId)
  return !error
}

function isClaimRpcSuccess(
  error: unknown,
  claimResult: { ok?: boolean; success?: boolean } | null
): boolean {
  if (error || !claimResult) return false
  return Boolean(claimResult.ok || claimResult.success)
}

function resolveClaimReturnToken(prize: unknown): string {
  return typeof prize === 'string' ? prize : 'claimed'
}

async function executeClaimAwardDbOperation(
  ctx: EventAwardsContext,
  awardId: string,
  targetAward: PendingAward,
  options: { autoSave?: boolean; silent?: boolean }
): Promise<string | null> {
  const { gameStore } = ctx
  if (!gameStore.db) return null

  try {
    const nowIso = Temporal.Now.instant().toString()
    const { data, error } = await gameStore.db.rpc('claim_award', { p_award_id: awardId })
    const claimResult = data as { ok?: boolean; success?: boolean; prize?: unknown } | null

    if (isClaimRpcSuccess(error, claimResult)) {
      finalizeClaimAward(ctx, awardId, targetAward, claimResult?.prize, nowIso, options)
      return resolveClaimReturnToken(claimResult?.prize)
    }

    const updated = await claimAwardFallbackUpdate(gameStore, awardId, nowIso)
    if (updated) {
      finalizeClaimAward(ctx, awardId, targetAward, targetAward.prize, nowIso, options)
      return 'claimed'
    }
  } catch (e) {
    logger.error('Events', `Error claiming award: ${(e as Error).message}`)
  }
  return null
}

export async function claimAward(ctx: EventAwardsContext, awardId: string, options: { autoSave?: boolean; silent?: boolean } = {}): Promise<string | null> {
  const { gameStore, pendingAwards, pastEvents, allEvents, uiStore } = ctx
  if (!gameStore.db) return null

  const targetAward = findTargetAward(awardId, pendingAwards.value, pastEvents.value)
  if (!targetAward || !isAwardClaimable(targetAward, allEvents.value)) {
    if (!options.silent) {
      uiStore.notify('Esta recompensa pertenece a un evento archivado o no es válida. Puedes descartarla.', '⚠️')
    }
    return null
  }

  const capacityCheck = validateStorageCapacityForAwards(gameStore, [targetAward])
  if (!capacityCheck.ok) {
    if (!options.silent) {
      uiStore.notify(capacityCheck.errorMsg || 'No tienes suficiente espacio en tu equipo o cajas para recibir al Pokémon de recompensa.', '⚠️')
    }
    return null
  }

  return executeClaimAwardDbOperation(ctx, awardId, targetAward, options)
}

export async function claimAllEventAwards(
  ctx: EventAwardsContext,
  eventId: string
): Promise<{ success: boolean; claimedCount: number }> {
  const { gameStore, pendingAwards, pastEvents, allEvents, uiStore } = ctx
  if (!gameStore.db) return { success: false, claimedCount: 0 }

  const pastEvent = pastEvents.value.find(pe => pe.event_id === eventId)
  const eventAwards = (pastEvent?.myAwards && pastEvent.myAwards.length > 0)
    ? pastEvent.myAwards
    : pendingAwards.value.filter(a => a.event_id === eventId)

  const pendingList = eventAwards.filter(a => a.received_at === null && isAwardClaimable(a, allEvents.value))
  if (pendingList.length === 0) {
    uiStore.notify('No hay recompensas pendientes para reclamar en este evento.', 'ℹ️')
    return { success: true, claimedCount: 0 }
  }

  const capacityCheck = validateStorageCapacityForAwards(gameStore, pendingList)
  if (!capacityCheck.ok) {
    uiStore.notify(capacityCheck.errorMsg || 'Espacio insuficiente en tus cajas para recibir los Pokémon de recompensa.', '⚠️')
    return { success: false, claimedCount: 0 }
  }

  let claimedCount = 0
  for (const award of pendingList) {
    const res = await claimAward(ctx, award.id, { autoSave: false, silent: true })
    if (res) {
      claimedCount++
    }
  }

  if (claimedCount > 0) {
    await gameStore.save(false)
    uiStore.notify(`¡${claimedCount} ${claimedCount === 1 ? 'recompensa reclamada' : 'recompensas reclamadas'} con éxito!`, '🎁')
  }

  return { success: claimedCount > 0, claimedCount }
}

export async function discardAward(ctx: EventAwardsContext, awardId: string): Promise<boolean> {
  const { gameStore, pendingAwards, pastEvents, allEvents, userEntries, uiStore } = ctx
  if (!gameStore.db) return false

  try {
    const { error } = await gameStore.db.from('awards')
      .delete()
      .eq('id', awardId)

    if (!error) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      updatePastEventsAwardDiscarded(pastEvents, awardId)
      healStuckEventPokemon(gameStore.state?.team, gameStore.state?.box, allEvents.value, userEntries.value)
      if (typeof gameStore.scheduleSave === 'function') {
        gameStore.scheduleSave()
      }
      uiStore.notify('Recompensa descartada correctamente.', '🗑️')
      return true
    } else {
      logger.error('Events', `Failed to discard award: ${error}`)
    }
  } catch (e) {
    logger.error('Events', `Error discarding award: ${(e as Error).message}`)
  }
  return false
}
