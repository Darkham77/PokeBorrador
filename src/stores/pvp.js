import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { RANKED_REWARD_MILESTONES, RANKED_TIER_ORDER, RANKED_TYPES } from '@/data/rankedData'

/**
 * usePvPStore - Gestor de Arena Clasificatoria y Defensa Pasiva.
 * Centraliza el ELO, las temporadas y el registro de equipos competitivos.
 */
export const usePvPStore = defineStore('pvp', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  const elo = ref(1000)
  const stats = ref({ wins: 0, losses: 0, draws: 0 })
  const maxElo = ref(1000)
  const rewardsClaimed = ref([])
  const passiveTeamActive = ref(false)
  const currentSeasonRules = ref(null)

  const eloTier = computed(() => {
    const val = elo.value
    if (val >= 3400) return { id: 'master', name: 'Maestro', icon: '👑', color: '#FFD700' }
    if (val >= 2700) return { id: 'diamond', name: 'Diamante', icon: '💎', color: '#89CFF0' }
    if (val >= 2100) return { id: 'platinum', name: 'Platino', icon: '🔶', color: '#E5C100' }
    if (val >= 1600) return { id: 'gold', name: 'Oro', icon: '🥇', color: '#FFB800' }
    if (val >= 1200) return { id: 'silver', name: 'Plata', icon: '🥈', color: '#9E9E9E' }
    return { id: 'bronze', name: 'Bronce', icon: '🥉', color: '#c8a060' }
  })

  async function loadPvPData() {
    if (!authStore.user) return

    const { data: profile } = await gameStore.db.from('profiles')
      .select('elo_rating, pvp_wins, pvp_losses, pvp_draws, role')
      .eq('id', authStore.user.id)
      .single()

    if (profile) {
      elo.value = profile.elo_rating || 1000
      stats.value = { 
        wins: profile.pvp_wins || 0, 
        losses: profile.pvp_losses || 0, 
        draws: profile.pvp_draws || 0 
      }
      
      // Admin Check (requested by user)
      if (profile.role === 'admin') {
        authStore.user.role = 'admin'
      }
    }

    // Sync maxElo from game state for rewards
    maxElo.value = gameStore.state.rankedMaxElo || elo.value
    rewardsClaimed.value = gameStore.state.rankedRewardsClaimed || []

    const { data: passive } = await gameStore.db.from('passive_teams')
      .select('is_active')
      .eq('user_id', authStore.user.id)
      .maybeSingle()
    
    passiveTeamActive.value = passive?.is_active || false

    await fetchSeasonRules()
  }

  async function fetchSeasonRules() {
    const { data } = await gameStore.db.from('ranked_rules_config').eq('id', 'current').maybeSingle()
    if (data) {
      currentSeasonRules.value = {
        name: data.season_name,
        ...JSON.parse(data.config || '{}')
      }
    }
  }

  async function togglePassiveTeam() {
    const newState = !passiveTeamActive.value
    
    if (newState) {
      // Create Snapshot
      const snapshot = gameStore.state.team.map(p => ({
        id: p.id,
        name: p.name,
        level: p.level,
        type: p.type,
        stats: p.stats, 
        moves: p.moves.map(m => ({ name: m.name, pp: m.maxPP || 20 })),
        heldItem: p.heldItem,
        isShiny: p.isShiny
      }))

      const { error } = await gameStore.db.from('passive_teams').upsert({
        user_id: authStore.user.id,
        team_data: JSON.stringify(snapshot),
        is_active: true,
        updated_at: new Date().toISOString()
      })

      if (!error) {
        passiveTeamActive.value = true
        uiStore.notify('Equipo de Defensa Pasiva activado.', '🛡️')
      }
    } else {
      await gameStore.db.from('passive_teams').update({ is_active: false }).eq('user_id', authStore.user.id)
      passiveTeamActive.value = false
      uiStore.notify('Defensa Pasiva desactivada.', '⏸️')
    }
  }

  async function claimReward(milestoneId) {
    if (rewardsClaimed.value.includes(milestoneId)) return
    
    const milestone = RANKED_REWARD_MILESTONES.find(m => m.id === milestoneId)
    if (!milestone) return

    if (maxElo.value < milestone.elo) {
      uiStore.notify('Hito no alcanzado', '⚠️')
      return
    }

    // Add items to inventory
    Object.entries(milestone.rewards).forEach(([itemName, qty]) => {
      gameStore.state.inventory[itemName] = (gameStore.state.inventory[itemName] || 0) + qty
    })

    rewardsClaimed.value.push(milestoneId)
    gameStore.state.rankedRewardsClaimed = [...rewardsClaimed.value]
    uiStore.notify('¡Recompensa reclamada!', '🎁')
    await gameStore.saveGame(true)
  }

  const seasonRange = computed(() => {
    const rules = currentSeasonRules.value || {}
    const start = rules.startDate ? new Date(rules.startDate) : new Date('2026-04-01T00:00:00-03:00')
    const end = rules.endDate ? new Date(rules.endDate) : new Date(start)
    if (!rules.endDate) end.setMonth(end.getMonth() + 3)
    
    return {
      start,
      end,
      daysLeft: Math.max(0, Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24)))
    }
  })

  return {
    elo,
    stats,
    maxElo,
    eloTier,
    rewardsClaimed,
    passiveTeamActive,
    currentSeasonRules,
    seasonRange,
    loadPvPData,
    togglePassiveTeam,
    claimReward
  }
})
