
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'
import { useGameStore } from './game'
import { isEventActiveNow, getGlobalMultipliers, getSpeciesBoosts, type Event as GameEvent } from '@/logic/events/eventEngine'
import { getServerTime } from '@/logic/timeUtils'
import type { Pokemon } from '@/types/pokemon'
import type { PendingAward, CompetitionResult } from '@/types/stores'

export const useEventStore = defineStore('events', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()

  const allEvents = ref<GameEvent[]>([])
  const activeEvents = ref<GameEvent[]>([])
  const finishedEvents = ref<CompetitionResult[]>([])
  const pendingAwards = ref<PendingAward[]>([])
  const isLoading = ref(false)

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
      const { data: events, error } = await db.from('events_config').select('*').eq('active', true)
      if (error) throw error

      allEvents.value = events || []
      
      // 2. Filter using Engine logic with synchronized time
      const synchronizedDate = new Date(getServerTime())
      activeEvents.value = (events || []).filter((ev: GameEvent) => isEventActiveNow(ev, synchronizedDate))

      // 3. Load finished competition results (Last 24h)
      const twentyFourHoursAgo = Temporal.Now.instant().subtract({ hours: 24 }).toString()
      const { data: results } = await db.from('competition_results')
        .select('*')
        .gt('ended_at', twentyFourHoursAgo)
        .order('ended_at', { ascending: false })

      finishedEvents.value = (results || []) as CompetitionResult[]

      // 4. Check for unclaimed prizes
      await checkPendingAwards()
    } catch (e) {
      logger.error('Events', `Error fetching events: ${(e as Error).message}`)
    } finally {
      isLoading.value = false
    }
  }

  function isEventActive(ev: string) {
    return activeEvents.value.some(e => e.id === ev)
  }

  function getEventMultiplier(_pokemon: Pokemon, eventId: string) {
    if (!isEventActive(eventId)) return 1
    const ev = activeEvents.value.find(e => e.id === eventId)
    return (ev as any)?.multiplier || 1
  }

  /**
   * Submits a competitive entry to an active event.
   */
  async function submitCompetitionEntry(pokemon: Pokemon, eventId: string) {
    if (!authStore.user) return

    const event = activeEvents.value.find(e => e.id === eventId)
    if (!event) return

    // Calculate generic total IVs for legacy compatibility
    const totalIvs = Object.values(pokemon.ivs || {}).reduce((a: number, b: number) => a + b, 0)

    try {
      const entryData = {
        event_id: eventId,
        player_id: authStore.user.id,
        player_name: gameStore.state.trainer || 'Trainer',
        player_email: authStore.user.email,
        data: {
          pokemon_name: pokemon.name,
          ivs: pokemon.ivs,
          total_ivs: totalIvs,
          level: pokemon.level,
          isShiny: pokemon.isShiny || false
        },
        submitted_at: Temporal.Now.instant().toString()
      }

      const db = gameStore.db
      if (!db) return

      // Check if current entry is better before upserting (Utility check)
      // This is often handled by DB constraint but useful for UI feedback
      const { error } = await db.from('competition_entries').upsert(entryData, {
        onConflict: 'event_id, player_id'
      })

      if (error) throw error
      uiStore.notify(`¡Registro exitoso en ${event.name}!`, event.icon || '🏆')
    } catch (e) {
      logger.error('Events', `Error submitting entry: ${(e as Error).message}`)
      uiStore.notify('Error al inscribir en el concurso.', '❌')
    }
  }

  /**
   * Syncs pending awards for the user.
   */
  async function checkPendingAwards() {
    if (!authStore.user || !gameStore.db) return

    const { data: awards, error } = await gameStore.db.from('awards')
      .select('*')
      .eq('winner_id', authStore.user.id)
      .is('received_at', null)

    if (!error) {
      pendingAwards.value = (awards || []) as PendingAward[]
    }
  }

  /**
   * Claim a specific award using the backend RPC.
   */
  async function claimAward(awardId: string): Promise<string | null> {
    if (!gameStore.db) return null
    const { data, error } = await gameStore.db.rpc('claim_award', { p_award_id: awardId })
    
    if (!error && data?.ok) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      uiStore.notify('¡Recompensa reclamada!', '🎁')
      // Return details for local state updates (e.g., adding to inventory)
      return data.prize as string
    }
    return null
  }

  /**
   * Helper to get boosts for a specific species.
   */
  function getSpeciesBonuses(speciesId: string) {
    return getSpeciesBoosts(activeEvents.value, speciesId)
  }

  function getCaptureEvent(speciesId: string) {
    return activeEvents.value.find(e => (e as any).type === 'capture' && (e as any).targetId === speciesId)
  }

  // Listen for time-sync updates from DBRouter (Debug mode)
  if (typeof window !== 'undefined') {
    window.addEventListener('time-sync-update', () => {
      logger.info('Events', 'Time sync update received, refreshing events...');
      fetchEvents();
    });
  }

  return {
    activeEvents,
    finishedEvents,
    pendingAwards,
    isLoading,
    globalMultipliers,
    fetchEvents,
    submitCompetitionEntry,
    checkPendingAwards,
    claimAward,
    getSpeciesBonuses,
    getCaptureEvent,
    getEventMultiplier
  }
})
