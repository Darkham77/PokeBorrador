import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useGameStore } from '@/stores/game.ts'
import { useMapStore } from '@/stores/map.ts'
import { 
  isEventActiveNow, 
  getGlobalMultipliers, 
  getSpeciesBoosts, 
  getMinigameBuffs,
  type Event as GameEvent 
} from '@/logic/events/eventEngine'
import { getServerTime } from '@/logic/utils/timeUtils'
import { healStuckEventPokemon } from '@/logic/player/eventRecovery'
import type { PendingAward, CompetitionEntry, PastEventHistoryItem } from '@/types/system/stores'
import {
  fetchPastEvents as fetchPastEventsAction,
  checkPendingAwards as checkPendingAwardsAction,
  claimAward as claimAwardAction,
  discardAward as discardAwardAction,
  type EventAwardsContext
} from './events/eventAwardsActions.ts'
import {
  fetchUserEntries as fetchUserEntriesAction,
  submitCompetitionEntry as submitCompetitionEntryAction,
  removeCompetitionEntry as removeCompetitionEntryAction,
  type EventEnrollmentContext
} from './events/eventEnrollmentActions.ts'

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

  const awardsContext = computed<EventAwardsContext>(() => ({
    gameStore,
    authStore,
    uiStore,
    allEvents,
    pastEvents,
    pendingAwards,
    userEntries
  }))

  const enrollmentContext = computed<EventEnrollmentContext>(() => ({
    gameStore,
    authStore,
    uiStore,
    allEvents,
    userEntries
  }))

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

      // 3. Check for concluded competition events with pending entries and award them automatically
      try {
        const { data: rawEntries } = await db.from('competition_entries').select('event_id')
        if (rawEntries && Array.isArray(rawEntries) && rawEntries.length > 0) {
          const unAwardedEventIds = new Set<string>()
          for (const entry of rawEntries as { event_id?: string }[]) {
            if (entry.event_id) {
              const evCfg = (events || []).find((e: GameEvent) => e.id === entry.event_id)
              if (evCfg && !isEventActiveNow(evCfg, synchronizedDate)) {
                unAwardedEventIds.add(entry.event_id)
              }
            }
          }

          for (const endedEventId of unAwardedEventIds) {
            logger.info('Events', `Auto-awarding concluded event '${endedEventId}'...`)
            await db.rpc('fn_award_event_automated', { target_event_id: endedEventId })
          }
        }
      } catch (awardErr) {
        logger.warn('Events', 'Failed to check or auto-award concluded events', awardErr)
      }

      // 4. Fetch user competition entries, pending awards, and past event history
      await fetchUserEntries()
      await checkPendingAwards(false)
      await fetchPastEvents()

      // 5. Automatically liberate any Pokémon stuck in concluded/legacy events
      const healed = healStuckEventPokemon(gameStore.state.team, gameStore.state.box, activeEvents.value, userEntries.value)
      if (healed) {
        logger.info('Events', 'Rehabilitated Pokémon stuck in concluded event(s).')
        gameStore.scheduleSave()
      }
    } catch (e) {
      logger.error('Events', `Error fetching events: ${(e as Error).message}`)
    } finally {
      isLoading.value = false
    }
  }

  const activeEventIdsSet = computed<ReadonlySet<string>>(() => {
    return new Set(activeEvents.value.map(e => e.id))
  })

  function isEventActive(eventId: string): boolean {
    return activeEventIdsSet.value.has(eventId)
  }

  async function fetchUserEntries() {
    return fetchUserEntriesAction(enrollmentContext.value)
  }

  async function submitCompetitionEntry(eventId: string, categoryIdOrUid: string, maybeUid?: string) {
    return submitCompetitionEntryAction(enrollmentContext.value, eventId, categoryIdOrUid, maybeUid)
  }

  async function removeCompetitionEntry(eventId: string, categoryId?: string): Promise<boolean> {
    return removeCompetitionEntryAction(enrollmentContext.value, eventId, categoryId)
  }

  async function checkPendingAwards(notifyOnPending = false) {
    return checkPendingAwardsAction(awardsContext.value, notifyOnPending)
  }

  async function fetchPastEvents() {
    return fetchPastEventsAction(awardsContext.value)
  }

  async function claimAward(awardId: string): Promise<string | null> {
    return claimAwardAction(awardsContext.value, awardId)
  }

  async function discardAward(awardId: string): Promise<boolean> {
    return discardAwardAction(awardsContext.value, awardId)
  }

  function getSpeciesBonuses(speciesId: string) {
    return getSpeciesBoosts(activeEvents.value, speciesId)
  }

  function getMinigameBonuses(minigameId: string) {
    return getMinigameBuffs(activeEvents.value, minigameId)
  }

  // Listen for time-sync updates from DBRouter (Debug mode)
  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      logger.info('Events', 'Time sync update received, refreshing events...')
      fetchEvents()
    })
  }

  return {
    allEvents,
    activeEvents,
    activeEventIdsSet,
    pastEvents,
    pendingAwards,
    userEntries,
    isLoading,
    globalMultipliers,
    fetchEvents,
    fetchPastEvents,
    fetchUserEntries,
    submitCompetitionEntry,
    removeCompetitionEntry,
    checkPendingAwards,
    claimAward,
    discardAward,
    getSpeciesBonuses,
    getMinigameBonuses,
    isEventActive
  }
})
