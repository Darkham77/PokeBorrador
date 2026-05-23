import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameStore } from './game.ts'
import { logger } from '@/logic/utils/logger'
import type { LeaderboardEntry } from './social.ts'

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
}

interface GameSaveRow {
  user_id: string
  save_data: Record<string, unknown>
  updated_at: string
}

function parseInstantSafe(val: unknown): Temporal.Instant | null {
  if (!val) return null
  try {
    if (typeof val === 'number') {
      return Temporal.Instant.fromEpochMilliseconds(val)
    }
    if (typeof val === 'string') {
      const trimmed = val.trim()
      const num = Number(trimmed)
      if (!isNaN(num) && trimmed.length > 8) {
        return Temporal.Instant.fromEpochMilliseconds(num)
      }
      let isoStr = trimmed
      if (isoStr.includes(' ') && !isoStr.includes('T')) {
        isoStr = isoStr.replace(' ', 'T')
      }
      if (!isoStr.endsWith('Z') && !isoStr.includes('+') && !isoStr.includes('-')) {
        isoStr += 'Z'
      }
      return Temporal.Instant.from(isoStr)
    }
    return null
  } catch (_e) {
    return null
  }
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
            isOnline: !!isOnline
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
