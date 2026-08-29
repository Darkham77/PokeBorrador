import { defineStore } from 'pinia'
import { ref, reactive, watch, computed } from 'vue'
import { gsap } from 'gsap'

import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useAudioStore } from '@/stores/audio.ts'
import { useChatStore } from '@/stores/social/chat.ts'
import { useLeaderboardStore } from '@/stores/leaderboard.ts'
import { usePlayerSearchStore } from '@/stores/player/playerSearch.ts'
import { logger } from '@/logic/utils/logger'
import { parseInstantSafe } from '@/logic/utils/timeUtils'
import type { GameState } from '@/types/system/game'
import type { ProfileRow, GameSaveRow } from '@/types/system/database'
import { ONLINE_PRESENCE_WINDOW_MS, MAX_FRIEND_REQUESTS_PER_MINUTE, BATTLE_INVITE_EXPIRY_SECONDS, ONLINE_PRESENCE_PING_INTERVAL_SEC } from '@/logic/constants/gameplay.ts'
import { ONE_MINUTE_MS } from '@/logic/constants/items.ts'


export interface Friend {
  id: string;
  username: string;
  level: number;
  badges: number;
  playerClass?: string;
  faction?: string;
  nick_style?: string;
  avatar_style?: string;
  gender?: string;
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
    nick_style?: string;
    avatar_style?: string;
    gender?: string;
    save_data?: GameState;
  };
}

export interface SearchResult {
  id: string;
  username: string;
  level: number;
  playerClass?: string;
  faction?: string;
  nick_style?: string;
  avatar_style?: string;
  gender?: string;
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
  avatar_style?: string;
  gender?: string;
  isOnline?: boolean;
}

interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: string
}


export const useSocialStore = defineStore('social', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()
  const leaderboardStore = useLeaderboardStore()
  const playerSearchStore = usePlayerSearchStore()

  const friends = ref<Friend[]>([])
  const pendingRequests = ref<PendingRequest[]>([])
  const searchResults = computed<SearchResult[]>({
    get: () => playerSearchStore.searchResults,
    set: (val: SearchResult[]) => { playerSearchStore.searchResults = val }
  })
  const searchLoading = computed<boolean>({
    get: () => playerSearchStore.searchLoading,
    set: (val: boolean) => { playerSearchStore.searchLoading = val }
  })
  const sentRequestTimestamps = ref<number[]>([])
  
  const notifications = reactive({
    friends: 0,
    trades: 0,
    battles: 0,
    chats: 0,
    total: 0
  })

  watch(() => {
    const chatStore = useChatStore()
    return chatStore.totalUnreadChats
  }, (unread) => {
    notifications.chats = unread
    notifications.total = notifications.friends + notifications.trades + notifications.battles + notifications.chats
  }, { immediate: true })

  let presenceInterval: gsap.core.Tween | null = null

function parseFriendsList(
  friendIds: string[],
  profilesData: ProfileRow[],
  savesData: GameSaveRow[]
): Friend[] {
  const profilesById: Record<string, ProfileRow> = Object.fromEntries(
    profilesData.map((p) => [p.id, p])
  );
  const savesByUserId: Record<string, GameSaveRow> = Object.fromEntries(
    savesData.map((s) => [s.user_id, s])
  );

  return friendIds.map((fId: string) => {
    const p = profilesById[fId];
    const saveRow = savesByUserId[fId];
    const empty: Partial<GameState> = {};
    const save = saveRow?.save_data
      ? (typeof saveRow.save_data === 'string'
          ? JSON.parse(saveRow.save_data)
          : saveRow.save_data) as Partial<GameState>
      : empty;
    const lastSeen = parseInstantSafe(saveRow?.updated_at);
    const isOnline = !!(
      lastSeen &&
      Temporal.Now.instant().epochMilliseconds - lastSeen.epochMilliseconds <
        ONLINE_PRESENCE_WINDOW_MS
    );

    const fallbackName = fId.startsWith('local_') ? fId.replace('local_', '') : 'Entrenador';
    const capitalizedFallback = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    const username = (save.trainer as string) || p?.username || capitalizedFallback;

    return {
      id: fId,
      username,
      level: (save.trainerLevel as number) || p?.trainer_level || 1,
      badges:
        typeof save.badges === 'object'
          ? Object.keys(save.badges).length
          : (save.badges as number) || 0,
      playerClass: (save.playerClass as string) || p?.player_class || '',
      faction: (save.faction as string) || p?.faction || '',
      nick_style: (save.nick_style as string) || p?.nick_style || '',
      avatar_style: (save.avatar_style as string) || p?.avatar_style || '',
      gender: (save.gender as string) || p?.gender || 'h',
      isOnline,
      lastSeen,
    };
  });
}

function parsePendingRequests(
  pending: PendingRequest[],
  profilesData: ProfileRow[],
  savesData: GameSaveRow[]
): PendingRequest[] {
  const savesByUserId: Record<string, GameSaveRow> = Object.fromEntries(
    savesData.map((s) => [s.user_id, s])
  );

  const initialMap: Record<
    string,
    {
      username: string;
      nick_style: string;
      trainer_level: number;
      player_class: string;
      avatar_style: string;
      gender: string;
    }
  > = {};

  const profilesMap = profilesData.reduce((acc, p) => {
    const reqId = p.id;
    const saveRow = savesByUserId[reqId];
    const save = (saveRow?.save_data || {}) as Record<string, unknown>; // open-record
    const capitalizedFallback = reqId.slice(0, 8).toUpperCase();
    const username = (save.trainer as string) || p?.username || capitalizedFallback;

    acc[reqId] = {
      username,
      nick_style: (save.nick_style as string) || p?.nick_style || '',
      trainer_level: (save.trainerLevel as number) || p?.trainer_level || 1,
      player_class: (save.playerClass as string) || p?.player_class || 'entrenador',
      avatar_style: (save.avatar_style as string) || p?.avatar_style || '',
      gender: (save.gender as string) || p?.gender || 'h',
    };
    return acc;
  }, initialMap);

  pending.forEach((r: PendingRequest) => {
    const profInfo = profilesMap[r.requester_id];
    if (profInfo) {
      r.profiles = {
        username: profInfo.username,
        nick_style: profInfo.nick_style,
        trainer_level: profInfo.trainer_level,
        player_class: profInfo.player_class,
        playerClass: profInfo.player_class,
        level: profInfo.trainer_level,
        avatar_style: profInfo.avatar_style,
        gender: profInfo.gender,
      };
    }
  });

  return pending;
}

  /**
   * Carga datos sociales (amigos y solicitudes) usando DBRouter.
   */
  async function loadSocialData() {
    if (!authStore.user) {
      friends.value = []
      pendingRequests.value = []
      return
    }

    const db = gameStore.db
    if (!db) { return }
    
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

        friends.value = parseFriendsList(friendIds, profRes.data || [], saveRes.data || [])
      } else {
        friends.value = []
      }

      // 2. Solicitudes pendientes
      const { data: pending } = await db
        .from('friendships')
        .select('*')
        .eq('addressee_id', authStore.user?.id)
        .eq('status', 'pending') as { data: PendingRequest[] | null; error: unknown }

      if (pending && pending.length > 0) {
        const requesterIds = pending.map((r: PendingRequest) => r.requester_id)
        const [profRes, saveRes] = await Promise.all([
          db.from('profiles').select('*').in('id', requesterIds),
          db.from('game_saves').select('user_id,save_data').in('user_id', requesterIds)
        ]) as [
          { data: ProfileRow[] | null; error: unknown },
          { data: GameSaveRow[] | null; error: unknown }
        ]

        pendingRequests.value = parsePendingRequests(pending, profRes.data || [], saveRes.data || [])
      } else {
        pendingRequests.value = []
      }
      
      await refreshNotificationCount()
    } catch (err) {
      logger.error('Social', `Error loading data: ${(err as Error).message}`)
    }
  }

  async function searchPlayers(query: string, filters?: { playerClass?: string; faction?: string }) {
    await playerSearchStore.searchPlayers(query, filters)
  }

  async function sendFriendRequest(targetId: string) {
    if (!gameStore.db || !authStore.user) return

    const now = Temporal.Now.instant().epochMilliseconds
    sentRequestTimestamps.value = sentRequestTimestamps.value.filter(t => now - t < ONE_MINUTE_MS)

    if (sentRequestTimestamps.value.length >= MAX_FRIEND_REQUESTS_PER_MINUTE) {
      uiStore.notify(`Límite de solicitudes de amistad alcanzado (máx. ${MAX_FRIEND_REQUESTS_PER_MINUTE} por minuto)`, '⚠️')
      return
    }

    const { error } = await gameStore.db.from('friendships').insert({
      requester_id: authStore.user?.id,
      addressee_id: targetId,
      status: 'pending'
    })

    if (error) {
      uiStore.notify('Error al enviar solicitud', '❌')
    } else {
      sentRequestTimestamps.value.push(now)
      uiStore.notify('Solicitud enviada correctamente', '👥')
      audioStore.play('sentMsg') // Sonido al enviar solicitud
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
      const chatStore = useChatStore()
      chatStore.closeChat(targetId)
      await loadSocialData()
    }
  }

  async function refreshNotificationCount() {
    if (!authStore.user) return

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
      db.from('battle_invites').select('id', { count: 'exact', head: true }).eq('opponent_id', authStore.user?.id).eq('status', 'pending').gte('created_at', Temporal.Now.instant().subtract({ seconds: BATTLE_INVITE_EXPIRY_SECONDS }).toString())
    ])

    notifications.friends = res1.count || 0
    notifications.trades = (res2.count || 0) + (res3.count || 0)
    notifications.battles = res4.count || 0
    notifications.total = notifications.friends + notifications.trades + notifications.battles + notifications.chats
  }

  /**
   * Re-fetches the updated_at for all current friends and recalculates isOnline.
   * Lightweight — only queries game_saves for friend IDs already loaded.
   */
  async function refreshFriendsPresence() {
    const db = gameStore.db
    if (!db || friends.value.length === 0) return
    try {
      const ids = friends.value.map(f => f.id)
      const { data } = await db
        .from('game_saves')
        .select('user_id, updated_at')
        .in('user_id', ids) as { data: { user_id: string; updated_at: string }[] | null }

      if (!data) return
      const now = Temporal.Now.instant().epochMilliseconds
      friends.value = friends.value.map(f => {
        const row = data.find(r => r.user_id === f.id)
        const lastSeen = parseInstantSafe(row?.updated_at)
        return {
          ...f,
          lastSeen,
          isOnline: !!(lastSeen && (now - lastSeen.epochMilliseconds) < ONLINE_PRESENCE_WINDOW_MS)
        }
      })
    } catch (err) {
      logger.warn('Social', `refreshFriendsPresence error: ${(err as Error).message}`)
    }
  }

  function startPresence() {
    if (presenceInterval) presenceInterval.kill()
    if (authStore.sessionMode === 'offline') return
    
    const ping = async () => {
      if (!authStore.user || !gameStore.db) return
      await gameStore.db.from('game_saves').update({ 
        updated_at: Temporal.Now.instant().toString() 
      }).eq('user_id', authStore.user?.id)

      // Refresh friends' presence on every ping cycle
      await refreshFriendsPresence()

      presenceInterval = gsap.delayedCall(ONLINE_PRESENCE_PING_INTERVAL_SEC, ping)
    }
    
    ping()
  }

  function stopPresence() {
    if (presenceInterval) presenceInterval.kill()
    presenceInterval = null
  }

  const leaderboard = computed<LeaderboardEntry[]>({
    get: () => leaderboardStore.leaderboard,
    set: (val: LeaderboardEntry[]) => { leaderboardStore.leaderboard = val }
  })
  const leaderboardLoading = computed<boolean>({
    get: () => leaderboardStore.leaderboardLoading,
    set: (val: boolean) => { leaderboardStore.leaderboardLoading = val }
  })

  async function fetchLeaderboard(sortBy = 'elo_rating') {
    await leaderboardStore.fetchLeaderboard(sortBy)
  }

  return {
    friends,
    pendingRequests,
    searchResults,
    searchLoading,
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
    refreshFriendsPresence,
    refreshNotificationCount,
    fetchLeaderboard
  }
})
