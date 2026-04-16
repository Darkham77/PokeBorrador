import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { supabase } from '@/logic/supabase'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'

export const useWarStore = defineStore('war', () => {
  const faction = ref(null)
  const warCoins = ref(0)
  const weeklyPoints = ref(0)
  const mapDominance = ref({}) // { mapId: { union, poder, total, leading, winner } }
  const isDisputePhase = ref(true)
  
  // Weekly tracking
  const currentWeekId = computed(() => {
    const now = new Date();
    const d = new Date(now);
    d.setHours(0,0,0,0);
    const day = d.getDay(); 
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const jan4 = new Date(monday.getFullYear(), 0, 4);
    const days = Math.floor((monday - jan4) / 86400000);
    const week = Math.ceil((days + jan4.getDay() + 1) / 7);
    return `${monday.getFullYear()}-W${String(week).padStart(2, '0')}`;
  })

  async function loadWarData() {
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    
    // 1. Load Faction
    if (authStore.user) {
      const { data: fact } = await supabase.from('war_factions').select('faction').eq('user_id', authStore.user.id).maybeSingle()
      if (fact) faction.value = fact.faction
    }

    // 2. Load Coins from game state
    warCoins.value = gameStore.state.warCoins || 0

    // 3. Load Phase
    const day = new Date().getDay()
    isDisputePhase.value = (day >= 1 && day <= 5)

    // 4. Load Weekly Points (Individual)
    if (authStore.user) {
      const { data: pts } = await supabase.from('war_user_points')
        .select('points')
        .eq('user_id', authStore.user.id)
        .eq('week_id', currentWeekId.value)
      
      weeklyPoints.value = pts?.reduce((acc, r) => acc + (r.points || 0), 0) || 0
    }

    // 5. Load Global Dominance
    await fetchMapDominance()
  }

  async function fetchMapDominance() {
    // Phase 1: Points in Dispute
    const { data: points } = await supabase
      .from('war_points')
      .select('map_id, faction, points')
      .eq('week_id', currentWeekId.value)

    const newDom = {}
    points?.forEach(row => {
      if (!newDom[row.map_id]) newDom[row.map_id] = { union: 0, poder: 0, winner: null }
      newDom[row.map_id][row.faction] = row.points
    })

    // Phase 2: Official Winners (if on Dominance Phase)
    if (!isDisputePhase.value) {
      const { data: dom } = await supabase
        .from('war_dominance')
        .select('map_id, winner_faction')
        .eq('week_id', currentWeekId.value)
      
      dom?.forEach(row => {
        if (!newDom[row.map_id]) newDom[row.map_id] = { union: 0, poder: 0, winner: null }
        newDom[row.map_id].winner = row.winner_faction
      })
    }

    mapDominance.value = newDom
  }

  async function chooseFaction(f) {
    const authStore = useAuthStore()
    const gameStore = useGameStore()
    if (!authStore.user) return

    const { error } = await supabase.from('war_factions').upsert({ user_id: authStore.user.id, faction: f })
    if (!error) {
      faction.value = f
      gameStore.state.faction = f
      const uiStore = useUIStore()
      uiStore.notify(`¡Te has unido al Team ${f === 'union' ? 'Unión' : 'Poder'}!`, '⚔️')
      await gameStore.saveGame(true)
    }
  }

  async function addPoints(mapId, pts) {
    if (!faction.value) return
    const authStore = useAuthStore()
    
    const { error } = await supabase.rpc('add_war_points', {
      p_week_id: currentWeekId.value,
      p_map_id: mapId,
      p_faction: faction.value,
      p_points: pts
    })

    if (!error) {
       weeklyPoints.value += pts
       await fetchMapDominance()
    }
  }

  return {
    faction,
    warCoins,
    weeklyPoints,
    mapDominance,
    isDisputePhase,
    currentWeekId,
    loadWarData,
    fetchMapDominance,
    chooseFaction,
    addPoints
  }
})
