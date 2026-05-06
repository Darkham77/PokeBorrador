import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { RANKED_REWARD_MILESTONES } from '@/data/rankedData'
export { RANKED_REWARD_MILESTONES }
import { getEloTier } from '@/logic/pvp/rankedEngine'

export const RANKED_REWARD_TIER_MARKS = [
  { name: 'Plata', elo: 1200, color: '#9E9E9E' },
  { name: 'Oro', elo: 1600, color: '#FFB800' },
  { name: 'Platino', elo: 2100, color: '#E5C100' },
  { name: 'Diamante', elo: 2700, color: '#89CFF0' },
  { name: 'Maestro', elo: 3400, color: '#FFD700' }
]

/**
 * usePvPStore - Gestor de Arena Clasificatoria y Defensa Pasiva.
 * Centraliza el ELO, las temporadas y el registro de equipos competitivos.
 */
export const usePvPStore = defineStore('pvp', () => {
  const authStore = useAuthStore() as any
  const gameStore = useGameStore() as any
  const uiStore = useUIStore() as any

  const elo = ref(1000)
  const stats = ref({ wins: 0, losses: 0, draws: 0 })
  const maxElo = ref(1000)
  const rewardsClaimed = ref([])
  const passiveTeamActive = ref(false)
  const currentSeasonRules = ref(null)
  const leaderboard = ref([])
  const lastSyncAt = ref(0)
  const isLoading = ref(false)
  const error = ref('')

  const eloTier = computed(() => getEloTier(elo.value))

  async function loadPvPData() {
    if (!authStore.user) return

    const { data: profile } = await (gameStore.db as any).from('profiles')
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

    const { data: passive } = await (gameStore.db as any).from('passive_teams')
      .select('is_active')
      .eq('user_id', authStore.user.id)
      .maybeSingle()
    
    passiveTeamActive.value = passive?.is_active || false

    await fetchSeasonRules()
  }

  async function fetchSeasonRules() {
    const { data } = await (gameStore.db as any).from('ranked_rules_config').eq('id', 'current').maybeSingle()
    if (data) {
      currentSeasonRules.value = {
        name: data.season_name,
        ...JSON.parse(data.config || '{}')
      }
    }
  }

  async function fetchLeaderboard(force = false) {
    if (!force && lastSyncAt.value && (Date.now() - lastSyncAt.value < 1800000)) {
      return // 30 min cache
    }

    isLoading.value = true
    error.value = ''

    try {
      const { data, error: err } = await gameStore.db
        .from('profiles')
        .select('id, username, elo_rating, trainer_level, player_class, nick_style, avatar_style')
        .not('username', 'is', null)
        .order('elo_rating', { ascending: false })
        .limit(100)

      if (err) throw err
      leaderboard.value = data || []
      lastSyncAt.value = Date.now()
    } catch (e) {
      error.value = 'No se pudo cargar el ranking global.'
      console.error('[PvPStore] Leaderboard error:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function togglePassiveTeam() {
    const newState = !passiveTeamActive.value
    
    if (newState) {
      // Create Snapshot
      const snapshot = gameStore.state.team.map(p => ({
        id: (p as any).id,
        name: (p as any).name,
        level: (p as any).level,
        type: (p as any).type,
        stats: (p as any).stats, 
        moves: (p as any).moves.map(m => ({ name: m.name, pp: m.maxPP || 20 })),
        heldItem: (p as any).heldItem,
        isShiny: (p as any).isShiny
      }))

      const { error } = await (gameStore.db as any).from('passive_teams').upsert({
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
      await (gameStore.db as any).from('passive_teams').update({ is_active: false }).eq('user_id', authStore.user.id)
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
      daysLeft: Math.max(0, Math.ceil(((end as any) - (new Date() as any)) / (1000 * 60 * 60 * 24)))
    }
  })

  async function updateElo(won) {
    if (!authStore.user) return 0
    
    const delta = won ? 15 + Math.floor(Math.random() * 5) : -(10 + Math.floor(Math.random() * 5))
    elo.value = Math.max(0, elo.value + delta)
    
    if (won) {
      stats.value.wins++
      if (elo.value > maxElo.value) {
        maxElo.value = elo.value
        gameStore.state.rankedMaxElo = maxElo.value
      }
    } else {
      stats.value.losses++
    }
    
    // Save to DB
    await (gameStore.db as any).from('profiles').update({
      elo_rating: elo.value,
      pvp_wins: stats.value.wins,
      pvp_losses: stats.value.losses
    }).eq('id', authStore.user.id)
    
    gameStore.save(false)
    return delta
  }

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
    claimReward,
    updateElo,
    fetchLeaderboard,
    leaderboard,
    isLoading,
    error,
    rules: currentSeasonRules,
    currentTier: getEloTier
  }
})
