import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from '@/stores/game.ts'
import { logger } from '@/logic/utils/logger'
import { parseInstantSafe } from '@/logic/utils/timeUtils'
import type { LeaderboardEntry } from '@/stores/social/social.ts'
import type { ProfileRow, GameSaveRow } from '@/types/system/database'
import { LEADERBOARD_LIMIT, ONLINE_PRESENCE_WINDOW_MS, DEFAULT_INITIAL_ELO } from '@/logic/constants/gameplay.ts'



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
        .limit(LEADERBOARD_LIMIT) as { data: ProfileRow[] | null; error: unknown }

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
          const isOnline = lastSeen && (Temporal.Now.instant().epochMilliseconds - lastSeen.epochMilliseconds) < ONLINE_PRESENCE_WINDOW_MS

          return {
            id: p.id,
            username: p.username,
            elo: p.elo_rating || DEFAULT_INITIAL_ELO,
            level: p.trainer_level || 1,
            badges: p.badges || 0,
            playerClass: p.player_class || undefined,
            faction: p.faction || undefined,
            nick_style: p.nick_style || undefined,
            avatar_style: p.avatar_style || undefined,
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
