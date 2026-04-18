import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'

export const useSocialStore = defineStore('social', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  const friends = ref([])
  const pendingRequests = ref([])
  const searchResults = ref([])
  const searchLoading = ref(false)
  const loading = ref(false)
  
  const notifications = reactive({
    friends: 0,
    trades: 0,
    battles: 0,
    total: 0
  })

  let presenceInterval = null

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
    
    try {
      // 1. Obtener amistades confirmadas
      const { data: friendships, error: fErr } = await db
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${authStore.user.id},addressee_id.eq.${authStore.user.id}`)
        .eq('status', 'accepted')

      if (fErr) throw fErr
      
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => 
          f.requester_id === authStore.user.id ? f.addressee_id : f.requester_id
        )

        const [profRes, saveRes] = await Promise.all([
          db.from('profiles').select('*').in('id', friendIds),
          db.from('game_saves').select('user_id,save_data,updated_at').in('user_id', friendIds)
        ])

        friends.value = (profRes.data || []).map(p => {
          const saveRow = saveRes.data?.find(s => s.user_id === p.id)
          const save = saveRow?.save_data || {}
          const lastSeen = saveRow?.updated_at ? new Date(saveRow.updated_at) : null
          const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000

          return {
            id: p.id,
            username: p.username,
            level: save.trainerLevel || 1,
            badges: typeof save.badges === 'object' ? Object.keys(save.badges).length : (save.badges || 0),
            playerClass: save.playerClass,
            nick_style: save.nick_style,
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
        .eq('addressee_id', authStore.user.id)
        .eq('status', 'pending')

      pendingRequests.value = pending || []
      
      await refreshNotificationCount()
    } catch (err) {
      console.error('[SocialStore] Error loading data:', err)
    } finally {
      loading.value = false
    }
  }

  async function searchPlayers(query) {
    if (!query || query.length < 2 || authStore.sessionMode === 'offline') {
      searchResults.value = []
      return
    }

    searchLoading.value = true
    const db = gameStore.db
    
    try {
      const { data: profiles } = await db
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .neq('id', authStore.user.id)
        .limit(10)

      if (profiles?.length > 0) {
        const ids = profiles.map(p => p.id)
        const [saveRes, relRes] = await Promise.all([
          db.from('game_saves').select('user_id,save_data').in('user_id', ids),
          db.from('friendships')
            .select('*')
            .or(`requester_id.eq.${authStore.user.id},addressee_id.eq.${authStore.user.id}`)
        ])

        searchResults.value = profiles.map(p => {
          const save = saveRes.data?.find(s => s.user_id === p.id)?.save_data || {}
          const rel = relRes.data?.find(f => 
            (f.requester_id === authStore.user.id && f.addressee_id === p.id) || 
            (f.requester_id === p.id && f.addressee_id === authStore.user.id)
          )
          
          return {
            id: p.id,
            username: p.username,
            level: save.trainerLevel || 1,
            playerClass: save.playerClass,
            status: rel ? rel.status : 'none',
            relId: rel ? rel.id : null,
            isRequester: rel ? rel.requester_id === authStore.user.id : false
          }
        })
      } else {
        searchResults.value = []
      }
    } finally {
      searchLoading.value = false
    }
  }

  async function sendFriendRequest(targetId) {
    if (authStore.sessionMode === 'offline') return

    const { error } = await gameStore.db.from('friendships').insert({
      requester_id: authStore.user.id,
      addressee_id: targetId,
      status: 'pending'
    })

    if (error) {
      uiStore.notify('Error al enviar solicitud', '❌')
    } else {
      uiStore.notify('Solicitud enviada correctamente', '👥')
      window.SFX?.sentMsg() // Sonido al enviar solicitud
      const res = searchResults.value.find(p => p.id === targetId)
      if (res) { 
        res.status = 'pending'
        res.isRequester = true 
      }
    }
  }

  async function respondRequest(fId, status) {
    const { error } = await gameStore.db.from('friendships').update({ status }).eq('id', fId)
    if (!error) {
      uiStore.notify(status === 'accepted' ? '¡Amistad aceptada!' : 'Solicitud rechazada', '✅')
      await loadSocialData()
    }
  }

  async function removeFriend(targetId) {
    const { error } = await gameStore.db.from('friendships')
      .delete()
      .or(`and(requester_id.eq.${authStore.user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${authStore.user.id})`)

    if (!error) {
      uiStore.notify('Amigo eliminado', '👋')
      await loadSocialData()
    }
  }

  async function refreshNotificationCount() {
    if (!authStore.user || authStore.sessionMode === 'offline') return

    const db = gameStore.db
    const [
      { count: friendsCount },
      { count: tradesReceived },
      { count: tradesAccepted },
      { count: battlesCount }
    ] = await Promise.all([
      db.from('friendships').select('id', { count: 'exact', head: true }).eq('addressee_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('id', { count: 'exact', head: true }).eq('receiver_id', authStore.user.id).eq('status', 'pending'),
      db.from('trade_offers').select('id', { count: 'exact', head: true }).eq('sender_id', authStore.user.id).eq('status', 'accepted'),
      db.from('battle_invites').select('id', { count: 'exact', head: true }).eq('opponent_id', authStore.user.id).eq('status', 'pending').gte('created_at', new Date(Date.now() - 60000).toISOString())
    ])

    notifications.friends = friendsCount || 0
    notifications.trades = (tradesReceived || 0) + (tradesAccepted || 0)
    notifications.battles = battlesCount || 0
    notifications.total = notifications.friends + notifications.trades + notifications.battles
  }

  function startPresence() {
    if (presenceInterval) clearInterval(presenceInterval)
    if (authStore.sessionMode === 'offline') return
    
    const ping = async () => {
      if (!authStore.user) return
      await gameStore.db.from('game_saves').update({ 
        updated_at: new Date().toISOString() 
      }).eq('user_id', authStore.user.id)
    }
    
    ping()
    presenceInterval = setInterval(ping, 120000)
  }

  function stopPresence() {
    if (presenceInterval) clearInterval(presenceInterval)
    presenceInterval = null
  }

  const leaderboard = ref([])
  const leaderboardLoading = ref(false)

  /**
   * Obtiene el Top 100 mundial basado en el criterio especificado.
   * @param {string} sortBy - 'elo_rating' | 'trainer_level' | 'badges'
   */
  async function fetchLeaderboard(sortBy = 'elo_rating') {
    if (authStore.sessionMode === 'offline') {
      leaderboard.value = []
      return
    }

    leaderboardLoading.value = true
    try {
      const db = gameStore.db
      const { data, error } = await db
        .from('profiles')
        .select('*')
        .order(sortBy, { ascending: false })
        .limit(100)

      if (error) throw error

      if (data && data.length > 0) {
        const ids = data.map(p => p.id)
        const { data: saves } = await db
          .from('game_saves')
          .select('user_id, updated_at')
          .in('user_id', ids)

        leaderboard.value = data.map(p => {
          const saveRow = saves?.find(s => s.user_id === p.id)
          const lastSeen = saveRow?.updated_at ? new Date(saveRow.updated_at) : null
          const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 5 * 60 * 1000

          return {
            id: p.id,
            username: p.username,
            elo: p.elo_rating || 1000,
            level: p.trainer_level || 1,
            badges: p.badges || 0,
            playerClass: p.player_class,
            faction: p.faction,
            nick_style: p.nick_style,
            isOnline
          }
        })
      }
    } catch (err) {
      console.error('[SocialStore] Leaderboard error:', err)
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
