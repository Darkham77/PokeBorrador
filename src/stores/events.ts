

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { useAuthStore } from '@/stores/auth.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useGameStore } from '@/stores/game.ts'
import { useMapStore } from '@/stores/map.ts'
import { useErrorStore } from '@/stores/errorStore.ts'
import { isEventActiveNow, getGlobalMultipliers, getSpeciesBoosts, type Event as GameEvent } from '@/logic/events/eventEngine'
import { getServerTime } from '@/logic/utils/timeUtils'
import type { PendingAward, CompetitionEntry } from '@/types/system/stores'
import type { Pokemon } from '@/types/pokemon/pokemon'

export const useEventStore = defineStore('events', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const mapStore = useMapStore()

  const allEvents = ref<GameEvent[]>([])
  const activeEvents = ref<GameEvent[]>([])
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
    const claimResult = data as { ok?: boolean; prize?: string } | null // domain-ok
    
    if (!error && claimResult?.ok) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      uiStore.notify('¡Recompensa reclamada!', '🎁')
      // Return details for local state updates (e.g., adding to inventory)
      return claimResult.prize ?? null
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
    pendingAwards,
    userEntries,
    isLoading,
    globalMultipliers,
    fetchEvents,
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
