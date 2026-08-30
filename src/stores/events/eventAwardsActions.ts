import type { Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import type { PendingAward, PastEventHistoryItem, PastCompetitionWinner, CompetitionRankKey, CompetitionEntry } from '@/types/system/stores'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { PokemonCompetitionTrophy } from '@/types/pokemon/pokemon'
import { incrementRecordKey } from '@/logic/utils/mapUtils'
import { getItemName } from '@/data/inventory/items'
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
    const alreadyExists = targetPoke.trophies.some(
      (t: PokemonCompetitionTrophy) => t.eventId === trophy.eventId && t.categoryId === trophy.categoryId && t.awardedAt === trophy.awardedAt
    )
    if (!alreadyExists) {
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

function applyAwardPrize(ctx: EventAwardsContext, rawPrize: unknown) {
  const { gameStore, uiStore } = ctx
  if (!rawPrize) return
  let prize: Record<string, unknown> | null = null // open-record
  if (typeof rawPrize === 'string') {
    try {
      prize = JSON.parse(rawPrize) as Record<string, unknown> // open-record
    } catch {
      prize = null
    }
  } else if (rawPrize && typeof rawPrize === 'object') {
    prize = rawPrize as Record<string, unknown> // open-record
  }

  if (!prize) return
  let totalNotified = 0

  if (prize.type === 'money' || typeof prize.money === 'number') {
    const amount = Number(prize.amount || prize.money || 0)
    if (amount > 0) {
      gameStore.state.money = (gameStore.state.money || 0) + amount
      uiStore.notify(`¡Ganaste ₽${amount.toLocaleString()}!`, '💰')
      totalNotified++
    }
  }

  if (prize.type === 'bc' || typeof prize.battleCoins === 'number') {
    const amount = Number(prize.amount || prize.battleCoins || 0)
    if (amount > 0) {
      gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + amount
      uiStore.notify(`¡Ganaste ${amount.toLocaleString()} Battle Coins!`, '🪙')
      totalNotified++
    }
  }

  if ((prize.type === 'item' && prize.item) || (typeof prize.item === 'string' && prize.item)) {
    const itemId = String(prize.item)
    const qty = Number(prize.qty || 1)
    if (!gameStore.state.inventory) gameStore.state.inventory = {}
    incrementRecordKey(gameStore.state.inventory, itemId, qty)
    const itemName = getItemName(itemId) || itemId
    uiStore.notify(`¡Obtuviste ${itemName}${qty > 1 ? ` x${qty}` : ''}!`, '🎒')
    totalNotified++
  }

  if (prize.items && typeof prize.items === 'object') {
    if (!gameStore.state.inventory) gameStore.state.inventory = {}
    for (const [k, v] of Object.entries(prize.items as Record<string, number>)) { // open-record
      if (v && v > 0) {
        incrementRecordKey(gameStore.state.inventory, k, v)
        const itemName = getItemName(k) || k
        uiStore.notify(`¡Obtuviste ${itemName}${v > 1 ? ` x${v}` : ''}!`, '🎒')
        totalNotified++
      }
    }
  }

  if (totalNotified === 0) {
    uiStore.notify('¡Recompensa reclamada!', '🎁')
  }

  gameStore.save(false).catch(err => logger.warn('Events', 'Failed to auto-save after claiming award', err))
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
      const eventName = !isCustomOrUnknown && eventCfg?.name ? eventCfg.name : 'Evento desconocido'
      
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

      const matchingAward = userAwards.find(a => a.event_id === res.event_id)
      const isWinner = authStore.user ? parsedWinners.some(w => w.player_id === authStore.user?.id) : false
      const isClaimed = matchingAward ? matchingAward.received_at !== null : false
      const hasUnclaimedAward = matchingAward ? matchingAward.received_at === null : isWinner

      if (authStore.user) {
        for (const winner of parsedWinners) {
          if (winner.player_id === authStore.user.id) {
            const catId = winner.category_id || 'ivs'
            const matchingEntry = userEntries.value[`${res.event_id}:${catId}`] || userEntries.value[res.event_id]
            const pokeUid = matchingEntry?.pokemon_uid
            if (pokeUid) {
              grantTrophyToPokemon(ctx, {
                eventId: res.event_id,
                eventName,
                categoryId: catId,
                categoryName: winner.category_name || (catId === 'weight' ? 'Masa y Peso' : catId === 'height' ? 'Envergadura y Altura' : 'Genética Superior (IVs)'),
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
        myAward: matchingAward || null,
        isWinner,
        hasUnclaimedAward,
        isClaimed,
        raw_event: eventCfg || null
      })
    }

    pastEvents.value = historyList
  } catch (e) {
    logger.warn('Events', `Error fetching past competition results: ${(e as Error).message}`)
  }
}

export async function claimAward(ctx: EventAwardsContext, awardId: string): Promise<string | null> {
  const { gameStore, pendingAwards, pastEvents } = ctx
  if (!gameStore.db) return null
  const targetAward = pendingAwards.value.find(a => a.id === awardId) || pastEvents.value.find(pe => pe.myAward?.id === awardId)?.myAward

  try {
    const { data, error } = await gameStore.db.rpc('claim_award', { p_award_id: awardId })
    const claimResult = data as { ok?: boolean; success?: boolean; prize?: unknown } | null // domain-ok
    
    if (!error && (claimResult?.ok || claimResult?.success)) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      pastEvents.value = pastEvents.value.map(pe => {
        if (pe.myAward?.id === awardId) {
          return {
            ...pe,
            hasUnclaimedAward: false,
            isClaimed: true,
            myAward: pe.myAward ? { ...pe.myAward, received_at: Temporal.Now.instant().toString() } : null
          }
        }
        return pe
      })
      applyAwardPrize(ctx, claimResult?.prize || targetAward?.prize)
      return typeof claimResult?.prize === 'string' ? claimResult.prize : 'claimed'
    }

    const { error: updateErr } = await gameStore.db.from('awards')
      .update({ received_at: Temporal.Now.instant().toString(), claimed: true })
      .eq('id', awardId)

    if (!updateErr) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      pastEvents.value = pastEvents.value.map(pe => {
        if (pe.myAward?.id === awardId) {
          return {
            ...pe,
            hasUnclaimedAward: false,
            isClaimed: true,
            myAward: pe.myAward ? { ...pe.myAward, received_at: Temporal.Now.instant().toString() } : null
          }
        }
        return pe
      })
      applyAwardPrize(ctx, targetAward?.prize)
      return 'claimed'
    }
  } catch (e) {
    logger.error('Events', `Error claiming award: ${(e as Error).message}`)
  }
  return null
}
