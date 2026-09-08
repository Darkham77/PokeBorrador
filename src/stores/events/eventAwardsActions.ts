import type { Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import type { PendingAward, PastEventHistoryItem, PastCompetitionWinner, CompetitionRankKey, CompetitionEntry } from '@/types/system/stores'
import { getEventDisplayName, type Event as GameEvent } from '@/logic/events/eventEngine'
import { GAME_TIMEZONE, getGMT3Date } from '@/logic/utils/timeUtils'
import type { PokemonCompetitionTrophy } from '@/types/pokemon/pokemon'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import { healStuckEventPokemon } from '@/logic/player/eventRecovery'
import {
  grantMoneyAward,
  grantBattleCoinsAward,
  grantItemsAward,
  grantPokemonAward,
  validateStorageCapacityForAwards
} from './eventPrizeGrantor.ts'
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
  const { gameStore } = ctx
  const targetPoke = pokemonUid ? (gameStore.getPokemonByUid(pokemonUid) ?? undefined) : undefined

  if (targetPoke) {
    if (!targetPoke.trophies) {
      targetPoke.trophies = []
    }
    const existingIndex = targetPoke.trophies.findIndex(
      (t: PokemonCompetitionTrophy) => t.eventId === trophy.eventId && t.categoryId === trophy.categoryId && t.awardedAt === trophy.awardedAt
    )
    if (existingIndex >= 0) {
      targetPoke.trophies[existingIndex] = trophy
    } else {
      targetPoke.trophies.push(trophy)
      if (!gameStore.state.stats) {
        gameStore.state.stats = {}
      }
      if (trophy.rank === 'first') {
        gameStore.state.stats.eventMedalsFirst = (Number(gameStore.state.stats.eventMedalsFirst) || 0) + 1
      } else if (trophy.rank === 'second') {
        gameStore.state.stats.eventMedalsSecond = (Number(gameStore.state.stats.eventMedalsSecond) || 0) + 1
      } else if (trophy.rank === 'third') {
        gameStore.state.stats.eventMedalsThird = (Number(gameStore.state.stats.eventMedalsThird) || 0) + 1
      }
      gameStore.state.stats.eventMedalsTotal = (Number(gameStore.state.stats.eventMedalsTotal) || 0) + 1
      logger.info('Events', `Trophy granted to Pokémon ${targetPoke.name} (${targetPoke.uid}): ${trophy.eventName} - ${trophy.categoryName} (${trophy.rank})`)
      gameStore.save(false).catch(err => logger.warn('Events', 'Failed to auto-save after granting trophy', err))
    }
  }
}

function applyAwardPrize(ctx: EventAwardsContext, rawPrize: unknown, options: { autoSave?: boolean; silent?: boolean } = {}) {
  const { gameStore, uiStore } = ctx
  const autoSave = options.autoSave ?? true
  const silent = options.silent ?? false
  if (!rawPrize) return
  let prize: Record<string, unknown> | null = null // open-record: Generic key-value data dictionary container
  if (typeof rawPrize === 'string') {
    try {
      prize = JSON.parse(rawPrize) as Record<string, unknown> // open-record: Generic key-value data dictionary container
    } catch {
      prize = null
    }
  } else if (rawPrize && typeof rawPrize === 'object') {
    prize = rawPrize as Record<string, unknown> // open-record: Generic key-value data dictionary container
  }

  if (!prize) return

  let totalNotified = 0
  totalNotified += grantMoneyAward(gameStore, uiStore, prize, silent)
  totalNotified += grantBattleCoinsAward(gameStore, uiStore, prize, silent)
  totalNotified += grantItemsAward(gameStore, uiStore, prize, silent)
  totalNotified += grantPokemonAward(gameStore, uiStore, prize, silent)

  if (!silent && totalNotified === 0) {
    uiStore.notify('¡Recompensa reclamada!', '🎁')
  }

  if (autoSave) {
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
    for (const res of results as { id: string; event_id: string; winners: unknown; ended_at: string }[]) {
      const eventCfg = allEvents.value.find(e => e.id === res.event_id)
      const isCustomOrUnknown = !eventCfg || res.event_id.startsWith('custom_') || (eventCfg.name && eventCfg.name.startsWith('custom_'))
      let eventName = !isCustomOrUnknown && eventCfg?.name ? eventCfg.name : 'Evento desconocido'
      let parsedWinners: PastCompetitionWinner[] = []
      if (typeof res.winners === 'string') {
        try {
          parsedWinners = JSON.parse(res.winners) as PastCompetitionWinner[]
        } catch {
          parsedWinners = []
        }
      } else if (Array.isArray(res.winners)) {
        parsedWinners = res.winners as PastCompetitionWinner[]
      }

      let eventDate: Temporal.ZonedDateTime = getGMT3Date()
      if (res.ended_at) {
        try {
          eventDate = Temporal.Instant.from(res.ended_at).toZonedDateTimeISO(GAME_TIMEZONE)
        } catch {
          eventDate = getGMT3Date()
        }
      }

      if (eventCfg) {
        eventName = getEventDisplayName(eventCfg, eventDate)
      }

      const matchingAwards = userAwards.filter(a => a.event_id === res.event_id)
      const unClaimedAward = matchingAwards.find(a => a.received_at === null)
      const matchingAward = unClaimedAward || matchingAwards[0] || null

      const isWinner = authStore.user ? parsedWinners.some(w => w.player_id === authStore.user?.id) : false
      const hasUnclaimedAward = matchingAwards.length > 0
        ? matchingAwards.some(a => a.received_at === null)
        : isWinner
      const isClaimed = matchingAwards.length > 0 && matchingAwards.every(a => a.received_at !== null)

      if (authStore.user) {
        for (const winner of parsedWinners) {
          if (winner.player_id === authStore.user.id) {
            const catId = winner.category_id || 'ivs'
            const matchingEntry = userEntries.value[`${res.event_id}:${catId}`] || userEntries.value[res.event_id]
            const pokeUid = matchingEntry?.pokemon_uid
            if (pokeUid) {
              const targetPoke = gameStore.getPokemonByUid(pokeUid)
              const resolvedEventName = eventCfg
                ? getEventDisplayName(eventCfg, targetPoke ? targetPoke.name : eventDate)
                : eventName
              grantTrophyToPokemon(ctx, {
                eventId: res.event_id,
                eventName: resolvedEventName,
                categoryId: catId,
                categoryName: winner.category_name || (catId.startsWith('weight') ? 'Masa y Peso' : catId.startsWith('height') ? 'Envergadura y Altura' : 'Genética Superior (IVs)'),
                rank: (winner.rank as CompetitionRankKey) || 'first',
                score: winner.score || 0,
                awardedAt: Temporal.Instant.from(res.ended_at).epochMilliseconds
              }, pokeUid)
            }
          }
        }
      }

      historyList.push({
        id: res.id,
        event_id: res.event_id,
        event_name: eventName,
        event_icon: (!isCustomOrUnknown && eventCfg?.icon) ? eventCfg.icon : '🏆',
        event_description: (!isCustomOrUnknown && eventCfg?.description) ? eventCfg.description : '',
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
      })
    }

    pastEvents.value = historyList
    healStuckEventPokemon(gameStore.state.team, gameStore.state.box, allEvents.value, userEntries.value)
  } catch (e) {
    logger.warn('Events', `Error fetching past competition results: ${(e as Error).message}`)
  }
}

function updatePastEventsAwardClaimed(pastEvents: Ref<PastEventHistoryItem[]>, awardId: string, claimedTimestamp: string) {
  pastEvents.value = pastEvents.value.map(pe => {
    const hasThisAward = pe.myAward?.id === awardId || (pe.myAwards && pe.myAwards.some(a => a.id === awardId))
    if (!hasThisAward) return pe

    const currentAwards = pe.myAwards || (pe.myAward ? [pe.myAward] : [])
    const updatedAwards = currentAwards.map(a => {
      if (a.id === awardId) {
        return { ...a, received_at: claimedTimestamp }
      }
      return a
    })

    const hasUnclaimedAward = updatedAwards.some(a => a.received_at === null)
    const isClaimed = updatedAwards.length > 0 && updatedAwards.every(a => a.received_at !== null)
    const nextUnclaimed = updatedAwards.find(a => a.received_at === null) || updatedAwards[0] || null

    return {
      ...pe,
      myAward: nextUnclaimed,
      myAwards: updatedAwards,
      hasUnclaimedAward,
      isClaimed
    }
  })
}

function updatePastEventsAwardDiscarded(pastEvents: Ref<PastEventHistoryItem[]>, awardId: string) {
  pastEvents.value = pastEvents.value.map(pe => {
    const hasThisAward = pe.myAward?.id === awardId || (pe.myAwards && pe.myAwards.some(a => a.id === awardId))
    if (!hasThisAward) return pe

    const currentAwards = pe.myAwards || (pe.myAward ? [pe.myAward] : [])
    const updatedAwards = currentAwards.filter(a => a.id !== awardId)
    const hasUnclaimedAward = updatedAwards.some(a => a.received_at === null)
    const isClaimed = updatedAwards.length > 0 && updatedAwards.every(a => a.received_at !== null)
    const nextUnclaimed = updatedAwards.find(a => a.received_at === null) || updatedAwards[0] || null

    return {
      ...pe,
      myAward: nextUnclaimed,
      myAwards: updatedAwards,
      hasUnclaimedAward,
      isClaimed
    }
  })
}

export async function claimAward(ctx: EventAwardsContext, awardId: string, options: { autoSave?: boolean; silent?: boolean } = {}): Promise<string | null> {
  const { gameStore, pendingAwards, pastEvents, allEvents, userEntries, uiStore } = ctx
  if (!gameStore.db) return null
  const targetAward = pendingAwards.value.find(a => a.id === awardId)
    || pastEvents.value.find(pe => pe.myAwards?.some(a => a.id === awardId))?.myAwards?.find(a => a.id === awardId)
    || pastEvents.value.find(pe => pe.myAward?.id === awardId)?.myAward

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

  try {
    const nowIso = Temporal.Now.instant().toString()
    const { data, error } = await gameStore.db.rpc('claim_award', { p_award_id: awardId })
    const claimResult = data as { ok?: boolean; success?: boolean; prize?: unknown } | null // domain-ok: Open dynamic text or non-domain string payload
    
    if (!error && (claimResult?.ok || claimResult?.success)) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      updatePastEventsAwardClaimed(pastEvents, awardId, nowIso)
      applyAwardPrize(ctx, claimResult?.prize || targetAward?.prize, options)
      healStuckEventPokemon(gameStore.state?.team, gameStore.state?.box, allEvents.value, userEntries.value)
      return typeof claimResult?.prize === 'string' ? claimResult.prize : 'claimed'
    }

    const { error: updateErr } = await gameStore.db.from('awards')
      .update({ received_at: nowIso, claimed: true })
      .eq('id', awardId)

    if (!updateErr) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      updatePastEventsAwardClaimed(pastEvents, awardId, nowIso)
      applyAwardPrize(ctx, targetAward?.prize, options)
      healStuckEventPokemon(gameStore.state?.team, gameStore.state?.box, allEvents.value, userEntries.value)
      return 'claimed'
    }
  } catch (e) {
    logger.error('Events', `Error claiming award: ${(e as Error).message}`)
  }
  return null
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
