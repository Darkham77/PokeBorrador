
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { incrementRecordKey } from '@/logic/utils/mapUtils'

import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { RANKED_REWARD_MILESTONES } from '@/data/system/rankedData'
export { RANKED_REWARD_MILESTONES }
import { getEloTier } from '@/logic/pvp/rankedEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { GAME_TIMEZONE, parseZonedTime } from '@/logic/utils/timeUtils'


export const RANKED_REWARD_TIER_MARKS = [
  { name: 'Plata', elo: 1200, color: '#9E9E9E' },
  { name: 'Oro', elo: 1600, color: '#FFB800' },
  { name: 'Platino', elo: 2100, color: '#E5C100' },
  { name: 'Diamante', elo: 2700, color: '#89CFF0' },
  { name: 'Maestro', elo: 3400, color: '#FFD700' }
]

interface PvPStats {
  wins: number
  losses: number
  draws: number
}

interface SeasonRules {
  name: string
  startDate?: string
  endDate?: string
  seasonStartDate?: string
  seasonEndDate?: string
  bannedPokemonIds?: string[]
  levelCap: number
  allowedTypes?: string[]
  maxPokemon: number
  [key: string]: unknown
}

/**
 * usePvPStore - Gestor de Arena Clasificatoria y Defensa Pasiva.
 * Centraliza el ELO, las temporadas y el registro de equipos competitivos.
 */
export const usePvPStore = defineStore('pvp', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  const elo = ref(1000)
  const stats = ref<PvPStats>({ wins: 0, losses: 0, draws: 0 })
  const maxElo = ref(1000)
  const rewardsClaimed = ref<string[]>([])
  const passiveTeamActive = ref(false)
  const currentSeasonRules = ref<SeasonRules | null>(null)

  // Sync ELO with game state
  watch(() => gameStore.state.eloRating, (newElo) => {
    if (newElo !== undefined) elo.value = newElo
  }, { immediate: true })

  const eloTier = computed(() => getEloTier(elo.value))

  async function loadPvPData() {
    if (!authStore.user || !gameStore.db) return

    interface ProfileRow {
      elo_rating: number;
      pvp_wins: number;
      pvp_losses: number;
      pvp_draws: number;
      role: string;
    }
    const { data: profile } = await gameStore.db.from('profiles')
      .select('elo_rating, pvp_wins, pvp_losses, pvp_draws, role')
      .eq('id', authStore.user.id)
      .single() as { data: ProfileRow | null }

    if (profile) {
      elo.value = profile.elo_rating || 1000
      stats.value = { 
        wins: profile.pvp_wins || 0, 
        losses: profile.pvp_losses || 0, 
        draws: profile.pvp_draws || 0 
      }
      
      // Admin Check (requested by user)
      if (profile.role === 'admin' && authStore.user) {
        authStore.user.role = 'admin'
      }
    }

    // Sync maxElo from game state for rewards
    maxElo.value = (gameStore.state.rankedMaxElo as number) || elo.value
    rewardsClaimed.value = gameStore.state.rankedRewardsClaimed ?? []

    const { data: passive } = await gameStore.db.from('passive_teams')
      .select('is_active')
      .eq('user_id', authStore.user.id)
      .maybeSingle() as { data: { is_active: boolean } | null }
    
    passiveTeamActive.value = passive?.is_active || false

    await fetchSeasonRules()
  }

  async function fetchSeasonRules() {
    if (!gameStore.db) return
    const { data } = await gameStore.db.from('ranked_rules_config').select('*').eq('id', 'current').maybeSingle() as { data: { season_name: string, config: string | Record<string, unknown> } | null }
    if (data) {
      const configObj = (typeof data.config === 'string' ? JSON.parse(data.config || '{}') : (data.config || {})) as Omit<SeasonRules, 'name'>;
      const rules: SeasonRules = {
        name: data.season_name,
        levelCap: (configObj as { levelCap?: number }).levelCap ?? 100,
        maxPokemon: (configObj as { maxPokemon?: number }).maxPokemon ?? 6,
        ...configObj
      }
      currentSeasonRules.value = rules;
    }
  }

  async function togglePassiveTeam() {
    const newState = !passiveTeamActive.value
    
    if (newState) {
      if (!gameStore.db || !authStore.user) return
      // Create Snapshot
      const snapshot = (gameStore.state.team as Pokemon[]).map((p) => ({
        id: p.id,
        name: p.name,
        level: p.level,
        type: p.type,
        hp: p.hp,
        maxHp: p.maxHp,
        atk: p.atk,
        def: p.def,
        spa: p.spa,
        spd: p.spd,
        spe: p.spe,
        moves: p.moves.filter(m => !!m).map((m) => ({ name: m!.name, pp: m!.maxPP || 20 })),
        heldItem: p.heldItem,
        isShiny: p.isShiny
      }))

      const { error } = await gameStore.db.from('passive_teams').upsert({
        user_id: authStore.user.id,
        team_data: JSON.stringify(snapshot),
        is_active: true,
        updated_at: Temporal.Now.instant().toString()
      })

      if (!error) {
        passiveTeamActive.value = true
        uiStore.notify('Equipo de Defensa Pasiva activado.', '🛡️')
      }
    } else {
      if (!gameStore.db || !authStore.user) return
      await gameStore.db.from('passive_teams').update({ is_active: false }).eq('user_id', authStore.user.id)
      passiveTeamActive.value = false
      uiStore.notify('Defensa Pasiva desactivada.', '⏸️')
    }
  }

  async function claimReward(milestoneId: string) {
    if (rewardsClaimed.value.includes(milestoneId)) return
    
    const milestone = RANKED_REWARD_MILESTONES.find(m => m.id === milestoneId)
    if (!milestone) return

    if (maxElo.value < milestone.elo) {
      uiStore.notify('Hito no alcanzado', '⚠️')
      return
    }

    // Add items to inventory
    Object.entries(milestone.rewards).forEach(([itemId, qty]) => {
      incrementRecordKey(gameStore.state.inventory, itemId, qty as number)
    })

    rewardsClaimed.value.push(milestoneId)
    gameStore.state.rankedRewardsClaimed = [...rewardsClaimed.value]
    uiStore.notify('¡Recompensa reclamada!', '🎁')
    await gameStore.saveGame(true)
  }

  const seasonRange = computed(() => {
    const defaultRules: SeasonRules = { name: 'Default', levelCap: 100, maxPokemon: 6 }
    const rules = currentSeasonRules.value || defaultRules
    
    const start = parseZonedTime(rules.startDate || rules.seasonStartDate, '2026-04-01T00:00:00')
    
    const defaultEndStr = start.add({ months: 3 }).toString()
    const end = parseZonedTime(rules.endDate || rules.seasonEndDate, defaultEndStr)
    
    const now = Temporal.Now.zonedDateTimeISO(GAME_TIMEZONE)
    const diff = end.since(now, { largestUnit: 'day' })
    const daysLeft = Math.max(0, Math.ceil(diff.days))
    
    return {
      start: start.toInstant(),
      end: end.toInstant(),
      daysLeft
    }
  })

  async function updateElo(won: boolean) {
    if (!authStore.user || !gameStore.db) return 0
    
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
    await gameStore.db.from('profiles').update({
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
    rules: currentSeasonRules,
    currentTier: getEloTier
  }
})
