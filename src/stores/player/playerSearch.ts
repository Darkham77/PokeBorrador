import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import type { SearchResult } from '@/stores/social/social.ts'
import { GameState } from '@/types/system/game'
import type { ProfileRow, GameSaveRow } from '@/types/system/database'

interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: string
}


export const usePlayerSearchStore = defineStore('playerSearch', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()

  const searchResults = ref<SearchResult[]>([])
  const searchLoading = ref(false)
  const lastSearchQuery = ref('')

  async function searchPlayers(query: string, filters?: { playerClass?: string; faction?: string }) {
    if (!query || query.length < 2) {
      searchResults.value = []
      return
    }

    if (!authStore.user?.id) {
      searchResults.value = []
      return
    }

    lastSearchQuery.value = query
    searchLoading.value = true
    const db = gameStore.db
    if (!db) { searchLoading.value = false; return }
    
    try {
      let profiles: ProfileRow[] | null = null
      let saveRes: { data: GameSaveRow[] | null } = { data: null }
      let relRes: { data: FriendshipRow[] | null } = { data: null }

      if (db.mode === 'offline') {
        const [profRes, allSavesRes, allRelsRes] = await Promise.all([
          db.from('profiles').select('*'),
          db.from('game_saves').select('*'),
          db.from('friendships')
            .select('*')
            .or(`requester_id.eq.${authStore.user.id},addressee_id.eq.${authStore.user.id}`)
        ]) as [
          { data: ProfileRow[] | null },
          { data: GameSaveRow[] | null },
          { data: FriendshipRow[] | null }
        ]

        saveRes = { data: allSavesRes.data }
        relRes = { data: allRelsRes.data }

        const queryLower = query.toLowerCase() // text-ok
        profiles = (profRes.data || []).filter((p: ProfileRow) => {
          if (p.id === authStore.user!.id) return false
          
          const save = (allSavesRes.data?.find((s: GameSaveRow) => s.user_id === p.id)?.save_data as unknown as GameState) || {}
          const trainerName = (save.trainer as string) || p.username || ''
          const originalUsername = p.username || ''
          
          const matchesQuery = 
            trainerName.toLowerCase().includes(queryLower) || // text-ok
            originalUsername.toLowerCase().includes(queryLower) // text-ok
            
          if (!matchesQuery) return false
          
          if (filters?.playerClass) {
            const currentClass = (save.playerClass as string) || p.player_class || 'entrenador'
            if (currentClass !== filters.playerClass) return false
          }
          
          if (filters?.faction) {
            const currentFaction = (save.faction as string) || p.faction || ''
            if (currentFaction !== filters.faction) return false
          }
          
          return true
        }).slice(0, 10)
      } else {
        let builder = db
          .from('profiles')
          .select('*')
          .ilike('username', `%${query}%`)
          .neq('id', authStore.user.id)

        if (filters?.playerClass) {
          builder = builder.eq('player_class', filters.playerClass)
        }
        if (filters?.faction) {
          builder = builder.eq('faction', filters.faction)
        }

        const { data } = await builder.limit(10) as { data: ProfileRow[] | null }
        profiles = data

        if (lastSearchQuery.value !== query) return

        if (profiles && profiles.length > 0) {
          const ids = profiles.map((p: ProfileRow) => p.id)
          const [savesData, relsData] = await Promise.all([
            db.from('game_saves').select('user_id,save_data').in('user_id', ids),
            db.from('friendships')
              .select('*')
              .or(`requester_id.eq.${authStore.user.id},addressee_id.eq.${authStore.user.id}`)
          ]) as [
            { data: GameSaveRow[] | null },
            { data: FriendshipRow[] | null }
          ]

          saveRes = savesData
          relRes = relsData
        }
      }

      if (lastSearchQuery.value !== query) return

      if (profiles && profiles.length > 0) {
        searchResults.value = (profiles as ProfileRow[]).map((p: ProfileRow) => {
          const save = (saveRes.data?.find((s: GameSaveRow) => s.user_id === p.id)?.save_data as unknown as GameState) || {}
          const rel = relRes.data?.find((f: FriendshipRow) => 
            (f.requester_id === authStore.user!.id && f.addressee_id === p.id) ||
            (f.requester_id === p.id && f.addressee_id === authStore.user!.id)
          )
          
          return {
            id: p.id,
            username: (save.trainer as string) || p.username,
            level: (save.trainerLevel as number) || p.trainer_level || 1,
            playerClass: (save.playerClass as string) || p.player_class || 'entrenador',
            faction: (save.faction as string) || p.faction || undefined,
            nick_style: (save.nick_style as string) || p.nick_style || '',
            avatar_style: (save.avatar_style as string) || p.avatar_style || '',
            gender: (save.gender as string) || p.gender || 'h',
            status: rel ? (rel.status as string) : 'none',
            relId: rel ? (rel.id as string) : null,
            isRequester: rel ? rel.requester_id === authStore.user!.id : false
          }
        })
      } else {
        searchResults.value = []
      }
    } finally {
      if (lastSearchQuery.value === query) {
        searchLoading.value = false
      }
    }
  }

  return {
    searchResults,
    searchLoading,
    lastSearchQuery,
    searchPlayers
  }
})
