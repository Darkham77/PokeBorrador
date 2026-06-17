import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { logger } from '@/logic/utils/logger'
import { parseInstantSafe } from '@/logic/utils/timeUtils'
import type { LeaderboardEntry } from '@/stores/social/social.ts'

interface ProfileRow {
  id: string
  username: string
  elo_rating?: number
  trainer_level?: number
  badges?: number
  player_class?: string
  faction?: string
  nick_style?: string
  avatar_style?: string
  gender?: string
}

interface GameSaveRow {
  user_id: string
  save_data: Record<string, unknown>
  updated_at: string
}


export const useLeaderboardStore = defineStore('leaderboard', () => {
  const gameStore = useGameStore()
  
  const leaderboard = ref<LeaderboardEntry[]>([])
  const leaderboardLoading = ref(false)

  async function fetchLeaderboard(sortBy = 'elo_rating') {
    if (!gameStore.db) {
      leaderboard.value = []
      return
    }

    leaderboardLoading.value = true
    const db = gameStore.db

    try {
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .order(sortBy, { ascending: false })
        .limit(100) as { data: ProfileRow[] | null; error: unknown }

      if (error) throw error

      if (data && data.length > 0) {
        const ids = data.map((p: ProfileRow) => p.id)
        const { data: saves } = await db
          .from('game_saves')
          .select('user_id, updated_at')
          .in('user_id', ids) as { data: GameSaveRow[] | null; error: unknown }

        leaderboard.value = (data as ProfileRow[]).map((p: ProfileRow) => {
          const saveRow = (saves as GameSaveRow[])?.find(s => s.user_id === p.id)
          const lastSeen = parseInstantSafe(saveRow?.updated_at)
          const isOnline = lastSeen && (Temporal.Now.instant().epochMilliseconds - lastSeen.epochMilliseconds) < 5 * 60 * 1000

          return {
            id: p.id,
            username: p.username,
            elo: p.elo_rating || 1000,
            level: p.trainer_level || 1,
            badges: p.badges || 0,
            playerClass: p.player_class,
            faction: p.faction,
            nick_style: p.nick_style,
            avatar_style: p.avatar_style,
            isOnline: !!isOnline,
            gender: p.gender || 'h'
          }
        })
      }
    } catch (err) {
      logger.error('Social', `Leaderboard error: ${(err as Error).message}`)
    } finally {
      leaderboardLoading.value = false
    }
  }

  return {
    leaderboard,
    leaderboardLoading,
    fetchLeaderboard
  }
})
