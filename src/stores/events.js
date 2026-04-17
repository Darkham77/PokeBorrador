import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'
import { useGameStore } from './game'
import { isEventActiveNow, getGlobalMultipliers, getSpeciesBoosts, isNewEntryBetter } from '@/logic/events/eventEngine'

export const useEventStore = defineStore('events', () => {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()

  const allEvents = ref([])
  const activeEvents = ref([])
  const finishedEvents = ref([])
  const pendingAwards = ref([])
  const isLoading = ref(false)

  // Computed multipliers derived from active events
  const globalMultipliers = computed(() => getGlobalMultipliers(activeEvents.value))

  /**
   * Fetches the full event configuration and filters based on Engine logic.
   */
  async function fetchEvents() {
    if (isLoading.value) return
    isLoading.value = true
    
    try {
      // 1. Fetch from config (DBRouter handles source)
      const { data: events, error } = await gameStore.db.from('events_config').select('*').eq('active', true)
      if (error) throw error

      allEvents.value = events || []
      
      // 2. Filter using Engine logic
      activeEvents.value = (events || []).filter(ev => isEventActiveNow(ev))

      // 3. Load finished competition results (Last 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: results } = await gameStore.db.from('competition_results')
        .select('*')
        .gt('ended_at', twentyFourHoursAgo)
        .order('ended_at', { ascending: false })

      finishedEvents.value = results || []

      // 4. Check for unclaimed prizes
      await checkPendingAwards()
    } catch (e) {
      console.error('[Events] Error fetching events:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Submits a competitive entry to an active event.
   */
  async function submitCompetitionEntry(pokemon, eventId) {
    if (!authStore.user) return

    const event = activeEvents.value.find(e => e.id === eventId)
    if (!event) return

    // Calculate generic total IVs for legacy compatibility
    const totalIvs = Object.values(pokemon.ivs || {}).reduce((a, b) => a + b, 0)

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
        submitted_at: new Date().toISOString()
      }

      // Check if current entry is better before upserting (Utility check)
      // This is often handled by DB constraint but useful for UI feedback
      const { error } = await gameStore.db.from('competition_entries').upsert(entryData, {
        onConflict: 'event_id, player_id'
      })

      if (error) throw error
      uiStore.notify(`¡Registro exitoso en ${event.name}!`, event.icon || '🏆')
    } catch (e) {
      console.error('[Events] Error submitting entry:', e)
      uiStore.notify('Error al inscribir en el concurso.', '❌')
    }
  }

  /**
   * Syncs pending awards for the user.
   */
  async function checkPendingAwards() {
    if (!authStore.user) return

    const { data: awards, error } = await gameStore.db.from('awards')
      .select('*')
      .eq('winner_id', authStore.user.id)
      .is('received_at', null)

    if (!error) {
      pendingAwards.value = awards || []
    }
  }

  /**
   * Claims a specific award using the backend RPC.
   */
  async function claimAward(awardId) {
    const { data, error } = await gameStore.db.rpc('claim_award', { p_award_id: awardId })
    
    if (!error && data?.ok) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      uiStore.notify('¡Recompensa reclamada!', '🎁')
      // Return details for local state updates (e.g., adding to inventory)
      return data.prize 
    }
    return null
  }

  /**
   * Helper to get boosts for a specific species.
   */
  function getSpeciesBonuses(speciesId) {
    return getSpeciesBoosts(activeEvents.value, speciesId)
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
    getSpeciesBonuses
  }
})
