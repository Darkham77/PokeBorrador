import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/logic/supabase'
import { useAuthStore } from './auth'
import { useUIStore } from './ui'

export const useEventStore = defineStore('events', () => {
  const activeEvents = ref([])
  const pendingAwards = ref([])
  const isLoading = ref(false)

  async function fetchEvents() {
    isLoading.value = true
    const now = new Date().toISOString()
    
    // Fetch currently running events
    const { data, error } = await supabase.from('events_config')
      .select('*')
      .eq('active', true)
    
    if (!error) {
      activeEvents.value = data || []
    }
    isLoading.value = false
  }

  async function checkPendingAwards() {
    const authStore = useAuthStore()
    if (!authStore.user) return

    const { data: awards, error } = await supabase.from('awards')
      .select('*')
      .eq('winner_id', authStore.user.id)
      .is('received_at', null)

    if (!error) {
      pendingAwards.value = awards || []
    }
  }

  async function claimAward(awardId) {
    const { data, error } = await supabase.rpc('claim_award', { p_award_id: awardId })
    if (!error && data.ok) {
      pendingAwards.value = pendingAwards.value.filter(a => a.id !== awardId)
      const uiStore = useUIStore()
      uiStore.notify('¡Recompensa reclamada!', '🎁')
      return data.prize
    }
    return null
  }

  return {
    activeEvents,
    pendingAwards,
    isLoading,
    fetchEvents,
    checkPendingAwards,
    claimAward
  }
})
