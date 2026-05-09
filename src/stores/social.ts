import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { Temporal } from '@js-temporal/polyfill'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'
import { logger } from '@/logic/utils/logger'
import { GameState } from '@/types/game'

export interface Friend {
  id: string;
  username: string;
  level: number;
  badges: number;
  playerClass?: string;
  nick_style?: string;
  isOnline: boolean;
  lastSeen: Temporal.Instant | null;
}

export interface PendingRequest {
  id: string;
  requester_id: string;
  status: string;
  profiles?: { 
    username: string;
    level?: number;
    trainer_level?: number;
    playerClass?: string;
    player_class?: string;
    full_name?: string;
    save_data?: GameState;
  };
}

export interface SearchResult {
  id: string;
  username: string;
  level: number;
  playerClass?: string;
  nick_style?: string;
  status: string;
  relId: string | null;
  isRequester: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  level: number;
  badges: number;
  elo: number;
  playerClass?: string;
  faction?: string;
  nick_style?: string;
  isOnline?: boolean;
}

interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: string
}

interface ProfileRow {
  id: string
  username: string
  elo_rating?: number
  trainer_level?: number
  badges?: number
  player_class?: string
  faction?: string
  nick_style?: string
}

interface GameSaveRow {
  user_id: string
  save_data: Record<string, unknown>
  updated_at: string
}

export const useSocialStore = defineStore('social', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()

  const friends = ref<Friend[]>([])
  const pendingRequests = ref<PendingRequest[]>([])
  const searchResults = ref<SearchResult[]>([])
  const searchLoading = ref(false)
  const loading = ref(false)
  
  const notifications = reactive({
    friends: 0,
    trades: 0,
    battles: 0,
    total: 0
  })

  let presenceInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Carga datos sociales (amigos y solicitudes) usando DBRouter.
   */
  async function loadSocialData() {
    if (!authStore.user || authStore.sessionMode === 'offline') {
      friends.value = []
      pendingRequests.value = []
      return
    }

    loading.value = true
    const db = gameStore.db
    if (!db) { loading.value = false; return }
    
    try {
      // 1. Obtener amistades confirmadas
      const { data: friendships, error: fErr } = await db
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${authStore.user.id},addressee_id.eq.${authStore.user.id}`)
        .eq('status', 'accepted') as { data: FriendshipRow[] | null; error: unknown }

      if (fErr) throw fErr
      
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map((f: FriendshipRow) => 
          f.requester_id === authStore.user?.id ? f.addressee_id : f.requester_id
        )

        const [profRes, saveRes] = await Promise.all([
          db.from('profiles').select('*').in('id', friendIds),
          db.from('game_saves').select('user_id,save_data,updated_at').in('user_id', friendIds)
        ]) as [
          { data: ProfileRow[] | null; error: unknown },
          { data: GameSaveRow[] | null; error: unknown }
        ]

        friends.value = (profRes.data as ProfileRow[] || []).map((p: ProfileRow) => {
          const saveRow = (saveRes.data as GameSaveRow[])?.find((s: GameSaveRow) => s.user_id === p.id)
          const save = (saveRow?.save_data as unknown as GameState) || {}
          const lastSeen = saveRow?.updated_at ? Temporal.Instant.from(saveRow.updated_at) : null
          const isOnline = !!(lastSeen && (Temporal.Now.instant().epochMilliseconds - lastSeen.epochMilliseconds) < 5 * 60 * 1000)

          return {
            id: p.id,
            username: p.username,
            level: (save.trainerLevel as number) || 1,
            badges: typeof save.badges === 'object' ? Object.keys(save.badges).length : ((save.badges as number) || 0),
            playerClass: save.playerClass as string,
            nick_style: save.nick_style as string,
            isOnline,
            lastSeen
          }
        })
      } else {
        friends.value = []
      }

      // 2. Solicitudes pendientes
      const { data: pending } = await db
        .from('friendships')
        .select('*, profiles:requester_id(username)')
        .eq('addressee_id', authStore.user?.id)
        .eq('status', 'pending') as { data: PendingRequest[] | null; error: unknown }

      pendingRequests.value = (pending || []) as PendingRequest[]
      
      await refreshNotificationCount()
    } catch (err) {
      logger.error('Social', `Error loading data: ${(err as Error).message}`)
    } finally {
      loading.value = false
    }
  }

  async function searchPlayers(query: string) {
    if (!query || query.length < 2 || authStore.sessionMode === 'offline') {
      searchResults.value = []
      return
    }

    searchLoading.value = true
    const db = gameStore.db
    if (!db) { searchLoading.value = false; return }
    
    try {
      const { data: profiles } = await db
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .neq('id', authStore.user?.id)
        .limit(10) as { data: ProfileRow[] | null }

      if (profiles && profiles.length > 0) {
        const ids = profiles.map((p: ProfileRow) => p.id)
        const [saveRes, relRes] = await Promise.all([
          db.from('game_saves').select('user_id,save_data').in('user_id', ids),
          db.from('friendships')
            .select('*')
            .or(`requester_id.eq.${authStore.user?.id},addressee_id.eq.${authStore.user?.id}`)
        ]) as [
          { data: GameSaveRow[] | null; error: unknown },
          { data: FriendshipRow[] | null; error: unknown }
        ]

        searchResults.value = (profiles as ProfileRow[]).map((p: ProfileRow) => {
          const save = (saveRes.data?.find((s: GameSaveRow) => s.user_id === p.id)?.save_data as unknown as GameState) || {}
          const rel = relRes.data?.find((f: FriendshipRow) => 
            (f.requester_id === authStore.user?.id && f.addressee_id === p.id) ||
            (f.requester_id === p.id && f.addressee_id === authStore.user?.id)
          )
          
          return {
            id: p.id,
            username: p.username,
            level: (save.trainerLevel as number) || 1,
            playerClass: save.playerClass as string,
            nick_style: save.nick_style as string,
            status: rel ? (rel.status as string) : 'none',
            relId: rel ? (rel.id as string) : null,
            isRequester: rel ? rel.requester_id === authStore.user?.id : false
          }
        })
      } else {
        searchResults.value = []
      }
    } finally {
      searchLoading.value = false
    }
  }

  async function sendFriendRequest(targetId: string) {
    if (authStore.sessionMode === 'offline' || !gameStore.db || !authStore.user) return

    const { error } = await gameStore.db.from('friendships').insert({
      requester_id: authStore.user?.id,
      addressee_id: targetId,
      status: 'pending'
    })

    if (error) {
      uiStore.notify('Error al enviar solicitud', '❌')
    } else {
      uiStore.notify('Solicitud enviada correctamente', '👥')
      audioStore.sentMsg() // Sonido al enviar solicitud
      const res = searchResults.value.find((p: SearchResult) => p.id === targetId)
      if (res) { 
        res.status = 'pending';
        res.isRequester = true 
      }
    }
  }

  async function respondRequest(fId: string, status: string) {
    if (!gameStore.db) return
    const { error } = await gameStore.db.from('friendships').update({ status }).eq('id', fId)
    if (!error) {
      uiStore.notify(status === 'accepted' ? '¡Amistad aceptada!' : 'Solicitud rechazada', '✅')
      await loadSocialData()
    }
  }

  async function removeFriend(targetId: string) {
    if (!authStore.user || !gameStore.db) return
    const { error } = await gameStore.db.from('friendships')
      .delete()
      .or(`and(requester_id.eq.${authStore.user?.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${authStore.user?.id})`)

    if (!error) {
      uiStore.notify('Amigo eliminado', '👋')
      await loadSocialData()
    }
  }

  async function refreshNotificationCount() {
    if (!authStore.user || authStore.sessionMode === 'offline') return

    const db = gameStore.db
    if (!db) return
    const [
      res1,
      res2,
      res3,
      res4
    ] = await Promise.all([
      db.from('friendships').select('id', { count: 'exact', head: true }).eq('addressee_id', authStore.user?.id).eq('status', 'pending'),
      db.from('trade_offers').select('id', { count: 'exact', head: true }).eq('receiver_id', authStore.user?.id).eq('status', 'pending'),
      db.from('trade_offers').select('id', { count: 'exact', head: true }).eq('sender_id', authStore.user?.id).eq('status', 'accepted'),
      db.from('battle_invites').select('id', { count: 'exact', head: true }).eq('opponent_id', authStore.user?.id).eq('status', 'pending').gte('created_at', Temporal.Now.instant().subtract({ seconds: 60 }).toString())
    ])

    notifications.friends = res1.count || 0
    notifications.trades = (res2.count || 0) + (res3.count || 0)
    notifications.battles = res4.count || 0
    notifications.total = notifications.friends + notifications.trades + notifications.battles
  }

  function startPresence() {
    if (presenceInterval) clearInterval(presenceInterval)
    if (authStore.sessionMode === 'offline') return
    
    const ping = async () => {
      if (!authStore.user || !gameStore.db) return
      await gameStore.db.from('game_saves').update({ 
        updated_at: Temporal.Now.instant().toString() 
      }).eq('user_id', authStore.user?.id)
    }
    
    ping()
    presenceInterval = setInterval(ping, 120000)
  }

  function stopPresence() {
    if (presenceInterval) clearInterval(presenceInterval)
    presenceInterval = null
  }

  const leaderboard = ref<LeaderboardEntry[]>([])
  const leaderboardLoading = ref(false)

  /**
   * Obtiene el Top 100 mundial basado en el criterio especificado.
   * @param {string} sortBy - 'elo_rating' | 'trainer_level' | 'badges'
   */
  async function fetchLeaderboard(sortBy = 'elo_rating') {
    if (authStore.sessionMode === 'offline' || !gameStore.db) {
      leaderboard.value = []
      return
    }

    leaderboardLoading.value = true
    const db = gameStore.db
    if (!db) {
      leaderboardLoading.value = false
      return
    }

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
          const lastSeen = saveRow?.updated_at ? Temporal.Instant.from(saveRow.updated_at) : null
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
    friends,
    pendingRequests,
    searchResults,
    searchLoading,
    loading,
    notifications,
    leaderboard,
    leaderboardLoading,
    loadSocialData,
    searchPlayers,
    sendFriendRequest,
    respondRequest,
    removeFriend,
    startPresence,
    stopPresence,
    refreshNotificationCount,
    fetchLeaderboard
  }
})
