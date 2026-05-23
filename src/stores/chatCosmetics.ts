import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'
import { useChatStore } from './chat.ts'
import { logger } from '@/logic/utils/logger'

export interface ProfileCacheItem {
  username?: string;
  player_class?: string;
  trainer_level?: number;
  avatar_style?: string;
  nick_style?: string;
}

export const useChatCosmeticsStore = defineStore('chatCosmetics', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()

  const profileCosmetics = ref<Record<string, ProfileCacheItem>>({})

  // Sychronize trainer's own cosmetics reactively
  watch(
    () => [
      gameStore.state.trainer,
      gameStore.state.playerClass,
      gameStore.state.trainerLevel,
      gameStore.state.avatar_style,
      gameStore.state.nick_style,
      authStore.user?.id
    ],
    () => {
      if (authStore.user?.id) {
        profileCosmetics.value[authStore.user.id] = {
          username: gameStore.state.trainer || authStore.user.user_metadata?.username || 'Entrenador',
          player_class: gameStore.state.playerClass || 'entrenador',
          trainer_level: gameStore.state.trainerLevel || 1,
          avatar_style: gameStore.state.avatar_style || '',
          nick_style: gameStore.state.nick_style || ''
        }
      }
    },
    { immediate: true, deep: true }
  )

  async function fetchMissingCosmetics(forceIds: string[] = []) {
    const db = gameStore.db
    if (!db) return

    // Populate own cosmetics
    if (authStore.user?.id) {
      profileCosmetics.value[authStore.user.id] = {
        username: gameStore.state.trainer || authStore.user.user_metadata?.username || 'Entrenador',
        player_class: gameStore.state.playerClass || 'entrenador',
        trainer_level: gameStore.state.trainerLevel || 1,
        avatar_style: gameStore.state.avatar_style || '',
        nick_style: gameStore.state.nick_style || ''
      }
    }

    const chatStore = useChatStore()

    // Collect all user IDs: global chat + private chat participants
    const uniqueUserIds = new Set<string>()
    chatStore.globalMessages.forEach(m => { if (m.user_id) uniqueUserIds.add(m.user_id) })
    Object.keys(chatStore.privateChats).forEach(friendId => {
      uniqueUserIds.add(friendId)
      chatStore.privateChats[friendId]?.messages.forEach(m => { if (m.senderId) uniqueUserIds.add(m.senderId) })
    })
    forceIds.forEach(id => { if (id) uniqueUserIds.add(id) })

    const missingIds = [...uniqueUserIds].filter(id => id && !profileCosmetics.value[id])
    if (missingIds.length === 0) return

    try {
      const [profRes, saveRes] = await Promise.all([
        db.from('profiles').select('id, username, player_class, trainer_level, avatar_style, nick_style').in('id', missingIds),
        db.from('game_saves').select('user_id, save_data').in('user_id', missingIds)
      ]) as [
        { data: { id: string; username?: string | null; player_class?: string | null; trainer_level?: number | null; avatar_style?: string | null; nick_style?: string | null }[] | null, error: unknown },
        { data: { user_id: string; save_data?: unknown }[] | null, error: unknown }
      ]

      if (!profRes.error) {
        const profilesList = profRes.data || []
        const savesList = saveRes.data || []

        missingIds.forEach(id => {
          const p = profilesList.find(prof => prof.id === id)
          const saveRow = savesList.find(s => s.user_id === id)
          const save = saveRow?.save_data ? (typeof saveRow.save_data === 'string' ? JSON.parse(saveRow.save_data) : saveRow.save_data) as Record<string, unknown> : {}

          const fallbackName = id.startsWith('local_') ? id.replace('local_', '') : 'Entrenador'
          const capitalizedFallback = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)
          const username = (save.trainer as string) || p?.username || capitalizedFallback

          profileCosmetics.value[id] = {
            username,
            player_class: (save.playerClass as string) || p?.player_class || 'entrenador',
            trainer_level: (save.trainerLevel as number) || p?.trainer_level || 1,
            avatar_style: (save.avatar_style as string) || p?.avatar_style || '',
            nick_style: (save.nick_style as string) || p?.nick_style || ''
          }
        })
      }
    } catch (err) {
      logger.error('Chat', `Error fetching profile cosmetics: ${(err as Error).message}`)
    }
  }

  return {
    profileCosmetics,
    fetchMissingCosmetics
  }
})
