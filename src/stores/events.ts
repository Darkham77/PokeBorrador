

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useGameStore } from '@/stores/game.ts'
import { useMapStore } from '@/stores/map.ts'
import { useErrorStore } from '@/stores/errorStore.ts'
import { isEventActiveNow, getGlobalMultipliers, getSpeciesBoosts, isPokemonEligibleForEvent, type Event as GameEvent } from '@/logic/events/eventEngine'
import { getServerTime } from '@/logic/utils/timeUtils'
import type { PendingAward, CompetitionEntry, PastEventHistoryItem, PastCompetitionWinner } from '@/types/system/stores'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { incrementRecordKey } from '@/logic/utils/mapUtils'

const MAX_PAST_EVENTS_COUNT = 20

export const useEventStore = defineStore('events', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const mapStore = useMapStore()

  const allEvents = ref<GameEvent[]>([])
  const activeEvents = ref<GameEvent[]>([])
  const pastEvents = ref<PastEventHistoryItem[]>([])
  const pendingAwards = ref<PendingAward[]>([])
  const userEntries = ref<Record<string, CompetitionEntry>>({})
  const isLoading = ref(false)

  // Watch for game cycle ticks to re-evaluate active events
  watch(() => mapStore.currentEpochHour, (newVal, oldVal) => {
    if (newVal !== oldVal) {
      logger.info('Events', `Game cycle ticked (Epoch hour: ${newVal}). Refreshing active events...`)
      fetchEvents()
    }
  })

  // Computed multipliers derived from active events
  const globalMultipliers = computed(() => getGlobalMultipliers(activeEvents.value))

  /**
   * Fetches the full event configuration and filters based on Engine logic.
   */
  async function fetchEvents() {
    if (isLoading.value) return
    isLoading.value = true
    
    const db = gameStore.db
    if (!db) {
      isLoading.value = false
      return
    }
    try {
      // 1. Fetch from config (DBRouter handles source)
      const res = await db.from('events_config').select('*')
      const events = res.data as GameEvent[] | null // domain-ok
      allEvents.value = events || []
      
      // 2. Filter using Engine logic with synchronized time
      const synchronizedDate = Temporal.Instant.fromEpochMilliseconds(getServerTime())
      activeEvents.value = (events || []).filter((ev: GameEvent) => isEventActiveNow(ev, synchronizedDate))

      // 3. Fetch user competition entries
      await fetchUserEntries()

      // 4. Check for unclaimed prizes
      await checkPendingAwards()

      // 5. Fetch past concluded events history (up to 10)
      await fetchPastEvents()
    } catch (e) {
      logger.error('Events', `Error initializing events: ${(e as Error).message}`)
    } finally {
      isLoading.value = false
    }
  }

  function isEventActive(ev: string) {
    return activeEvents.value.some(e => e.id === ev)
  }

  /**
   * Fetches competition entries belonging to the current user.
   */
  async function fetchUserEntries() {
    if (!authStore.user || !gameStore.db) return
    try {
      const res = await gameStore.db.from('competition_entries')
        .select('*')
        .eq('player_id', authStore.user.id)
      
      const entries = res.data as CompetitionEntry[] | null // domain-ok
      if (!res.error && entries) {
        const entryMap: Record<string, CompetitionEntry> = {}
        for (const e of entries) {
          if (e.event_id) {
            entryMap[e.event_id] = e
          }
        }
        userEntries.value = entryMap
      }
    } catch (e) {
      logger.warn('Events', `Error fetching competition entries: ${(e as Error).message}`)
    }
  }

  /**
   * Submits a Pokemon to a weekly competition.
   */
  async function submitCompetitionEntry(eventId: string, pokemonUid: string) {
    const gameStore = useGameStore()
    const authStore = useAuthStore()
    const uiStore = useUIStore()
    
    if (!authStore.user || !gameStore.db) return

    try {
      const box = (gameStore.state.box || []) as (Pokemon | null)[]
      const team = (gameStore.state.team || []) as (Pokemon | null)[]
      const pokemon = [...team, ...box].find(p => p && p.uid === pokemonUid)
      
      if (!pokemon) {
        uiStore.notify('Pokémon no encontrado.', '⚠️')
        return
      }

      const eventCfg = allEvents.value.find(e => e.id === eventId) || activeEvents.value.find(e => e.id === eventId)
      if (eventCfg) {
        const synchronizedDate = Temporal.Instant.fromEpochMilliseconds(getServerTime())
        const validation = isPokemonEligibleForEvent(eventCfg, pokemon, synchronizedDate)
        if (!validation.eligible) {
          uiStore.notify(validation.reason || 'Este Pokémon no cumple los requisitos del evento.', '⚠️')
          return
        }
      }
      
      const ivs = pokemon?.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)

      const entryData: CompetitionEntry = {
        event_id: eventId,
        player_id: authStore.user.id,
        player_name: authStore.user.user_metadata?.username || authStore.user.user_metadata?.full_name || authStore.user.email?.split('@')[0] || 'Entrenador',
        player_email: authStore.user.email || '',
        pokemon_uid: pokemonUid,
        data: {
          species: pokemon?.id,
          name: pokemon?.name,
          nickname: pokemon?.nickname,
          level: pokemon?.level || 1,
          total_ivs: totalIvs,
          ivs,
          is_shiny: pokemon?.isShiny || false,
          size: pokemon?.size
        },
        submitted_at: Temporal.Now.instant().toString()
      }
      
      const res = await gameStore.db.from('competition_entries').upsert(entryData, {
        onConflict: 'event_id, player_id'
      }).select().single()
      const entry = res.data as { id: string } | null // domain-ok
      const error = res.error as { message?: string } | null // domain-ok
      
      if (error || !entry) {
        const dbError = new Error(error?.message || 'Error al registrar Pokémon en concurso semanal')
        // Force populating stack property by capturing current stack trace
        if (Error.captureStackTrace) {
          Error.captureStackTrace(dbError, submitCompetitionEntry)
        }
        useErrorStore().setError(dbError, {
          type: 'Competition Entry Database Error',
          source: 'submitCompetitionEntry'
        })
      } else {
        userEntries.value[eventId] = { ...entryData, id: entry.id }
        uiStore.notify('¡Pokémon registrado exitosamente!', '✅')
      }
    } catch (e) {
      logger.error('Events', `Error submitting entry: ${(e as Error).message}`)
      useErrorStore().setError(e, {
        type: 'Competition Entry Exception',
        source: 'submitCompetitionEntry'
      })
    }
  }

  /**
   * Syncs pending awards for the user.
   */
  async function checkPendingAwards(notifyOnPending = false) {
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

  /**
   * Fetches the last concluded competition events with rewards (max 10).
   */
  async function fetchPastEvents() {
    if (!gameStore.db) return

    try {
      const { data: results, error } = await gameStore.db
        .from('competition_results')
        .select('*')
        .order('ended_at', { ascending: false })
        .limit(MAX_PAST_EVENTS_COUNT)

      if (error || !results) {
        return
      }

      // Fetch all awards for the user to determine claimed/pending status
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

        historyList.push({
          id: res.id,
          event_id: res.event_id,
          event_name: eventCfg?.name || res.event_id,
          event_icon: eventCfg?.icon || '🏆',
          event_description: eventCfg?.description || '',
          ended_at: res.ended_at,
          winners: parsedWinners,
          myAward: matchingAward || null,
          isWinner,
          hasUnclaimedAward,
          isClaimed
        })
      }

      pastEvents.value = historyList
    } catch (e) {
      logger.warn('Events', `Error fetching past competition results: ${(e as Error).message}`)
    }
  }

  function applyAwardPrize(rawPrize: unknown) {
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

    if (prize.type === 'money' || typeof prize.money === 'number') {
      const amount = Number(prize.amount || prize.money || 0)
      if (amount > 0) {
        gameStore.state.money = (gameStore.state.money || 0) + amount
      }
    }

    if (prize.type === 'bc' || typeof prize.battleCoins === 'number') {
      const amount = Number(prize.amount || prize.battleCoins || 0)
      if (amount > 0) {
        gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + amount
      }
    }

    if (prize.type === 'item' && prize.item) {
      const itemId = String(prize.item)
      const qty = Number(prize.qty || 1)
      if (!gameStore.state.inventory) gameStore.state.inventory = {}
      incrementRecordKey(gameStore.state.inventory, itemId, qty)
    }

    if (prize.items && typeof prize.items === 'object') {
      if (!gameStore.state.inventory) gameStore.state.inventory = {}
      for (const [k, v] of Object.entries(prize.items as Record<string, number>)) { // open-record
        if (v && v > 0) {
          incrementRecordKey(gameStore.state.inventory, k, v)
        }
      }
    }

    gameStore.save(false).catch(err => logger.warn('Events', 'Failed to auto-save after claiming award', err))
  }

  /**
   * Claim a specific award using the backend RPC or direct database update.
   */
  async function claimAward(awardId: string): Promise<string | null> {
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
        applyAwardPrize(claimResult?.prize || targetAward?.prize)
        uiStore.notify('¡Recompensa reclamada!', '🎁')
        return typeof claimResult?.prize === 'string' ? claimResult.prize : 'claimed'
      }

      // Direct fallback if RPC is unconfigured
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
        applyAwardPrize(targetAward?.prize)
        uiStore.notify('¡Recompensa reclamada!', '🎁')
        return 'claimed'
      }
    } catch (e) {
      logger.error('Events', `Error claiming award: ${(e as Error).message}`)
    }
    return null
  }

  /**
   * Helper to get boosts for a specific species.
   */
  function getSpeciesBonuses(speciesId: string) {
    return getSpeciesBoosts(activeEvents.value, speciesId)
  }

  // Listen for time-sync updates from DBRouter (Debug mode)
  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      logger.info('Events', 'Time sync update received, refreshing events...');
      fetchEvents();
    });
  }

  return {
    allEvents,
    activeEvents,
    pastEvents,
    pendingAwards,
    userEntries,
    isLoading,
    globalMultipliers,
    fetchEvents,
    fetchPastEvents,
    // fallow-ignore-next-line unused-store-members
    fetchUserEntries,
    submitCompetitionEntry,
    checkPendingAwards,
    claimAward,
    // fallow-ignore-next-line unused-store-members
    getSpeciesBonuses,
    // fallow-ignore-next-line unused-store-members
    isEventActive
  }
})
