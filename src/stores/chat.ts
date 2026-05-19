import { defineStore } from 'pinia'
import { ref, reactive, watch, computed } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { useAudioStore } from './audio.ts'
import { logger } from '@/logic/utils/logger'
import { useSocialStore } from './social.ts'


import type { RealtimeChannel } from '@supabase/supabase-js'

interface ChatMessage {
  id?: string | number;
  user_id?: string;
  senderId?: string;
  senderName?: string;
  username?: string;
  message?: string;
  text?: string;
  timestamp?: string | number;
  created_at?: string;
  player_class?: string;
  trainer_level?: number;
}

interface PrivateChat {
  username: string;
  messages: ChatMessage[];
  unreadCount: number;
  isCollapsed: boolean;
  lastInteraction: number;
}

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()

  const globalMessages = ref<ChatMessage[]>([])
  const activeChatId = ref('global') // 'global' or userId
  
  interface ProfileCacheItem {
    username?: string;
    player_class?: string;
    trainer_level?: number;
    avatar_style?: string;
    nick_style?: string;
  }
  const profileCosmetics = ref<Record<string, ProfileCacheItem>>({})
  
  let globalChannel: RealtimeChannel | null = null
  let inboxChannel: RealtimeChannel | null = null
  let lastMessageSentTimestamp = 0
  const outboxChannels: Record<string, RealtimeChannel> = {}

  // Computed proxy to private chats in game state for persistence
  let isInitialized = false
  const privateChats = reactive<Record<string, PrivateChat>>({})

  const getSanitizedChats = (chats: Record<string, PrivateChat> | undefined, forceCollapse = false): Record<string, PrivateChat> => {
    const sanitized: Record<string, PrivateChat> = {}
    if (chats) {
      for (const [id, chat] of Object.entries(chats)) {
        // 1. Ignorar chats contigo mismo
        if (authStore.user?.id && id === authStore.user.id) continue
        
        // 2. Si estamos en modo online, filtrar chats con IDs locales o corruptos (ej. eq.local_user)
        const isLocalKey = id === 'local_user' || id === 'eq.local_user' || id.startsWith('local_')
        if (authStore.sessionMode === 'online' && isLocalKey) {
          logger.info('Chat', `Filtrando chat local contaminado en modo online: ${id}`)
          continue
        }
        
        // 3. Si estamos en modo offline, filtrar chats que contengan UUIDs reales de Supabase en la nube
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (authStore.sessionMode === 'offline' && uuidRegex.test(id)) {
          logger.info('Chat', `Filtrando chat remoto en modo offline: ${id}`)
          continue
        }

        // Si ya está inicializado, preservar el estado visual de isCollapsed de la instancia reactiva actual
        const currentCollapsed = isInitialized && privateChats[id] ? privateChats[id].isCollapsed : true

        sanitized[id] = {
          ...chat,
          isCollapsed: forceCollapse ? true : currentCollapsed
        }
      }
    }
    return sanitized
  }

  // Inicializar los chats existentes forzando que comiencen colapsados
  if (gameStore.state.chats) {
    Object.assign(privateChats, getSanitizedChats(gameStore.state.chats as Record<string, PrivateChat>, true))
  }
  isInitialized = true

  // Watch for game state changes (e.g. after a load) to sync privateChats
  watch(() => gameStore.state.chats, (newChats) => {
    if (newChats) {
      const sanitized = getSanitizedChats(newChats as Record<string, PrivateChat>, false)
      // Eliminar chats locales que ya no existen en el nuevo estado
      for (const key in privateChats) {
        if (!sanitized[key]) {
          delete privateChats[key]
        }
      }
      Object.assign(privateChats, sanitized)
    } else {
      for (const key in privateChats) {
        delete privateChats[key]
      }
    }
  }, { deep: true })

  // Mantener el perfil del propio usuario en la caché sincronizado de forma reactiva
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

  async function loadGlobalHistory() {
    // If offline, ProxyQuery will handle the local SELECT

    const db = gameStore.db
    if (!db) return
    const { data, error } = await db
      .from('global_chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50) as { data: ChatMessage[] | null, error: unknown }

    if (!error && data) {
      globalMessages.value = [...data].reverse()
      await fetchMissingCosmetics()
    }
  }

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

    if (!globalMessages.value.length && !forceIds.length) return

    const uniqueUserIds = [...new Set(globalMessages.value.map(m => m.user_id).filter(Boolean))] as string[]
    const missingIds = [...new Set([...uniqueUserIds.filter(id => !profileCosmetics.value[id]), ...forceIds])]
    
    if (missingIds.length > 0) {
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
  }

  async function initGlobalChat() {
    if (globalChannel) return
    
    await loadGlobalHistory()

    const db = gameStore.db
    if (!db) return
    globalChannel = db.channel('global-chat-room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'global_chat_messages'
      }, ({ new: row }: { new: Record<string, unknown> }) => {
        if (!globalMessages.value.some(m => m.id === row.id)) {
          globalMessages.value.push(row)
          if (globalMessages.value.length > 50) globalMessages.value.shift()
          
          const senderId = row.user_id as string
          const cached = profileCosmetics.value[senderId]
          const needsUpdate = !cached || cached.username !== row.username || cached.player_class !== row.player_class || cached.trainer_level !== row.trainer_level
          fetchMissingCosmetics(needsUpdate ? [senderId] : [])
          
          // Sonido si el mensaje no es mío
          if (row.user_id !== authStore.user?.id) {
            audioStore.receivedMsg();
          }
        }
      })
      .subscribe()
  }

  function parseInstantEpoch(val: string | number | undefined): number {
    if (!val) return 0
    try {
      if (typeof val === 'number') return val
      let isoStr = val.trim()
      const num = Number(isoStr)
      if (!isNaN(num) && isoStr.length > 8) return num
      if (isoStr.includes(' ') && !isoStr.includes('T')) {
        isoStr = isoStr.replace(' ', 'T')
      }
      if (!isoStr.endsWith('Z') && !isoStr.includes('+') && !isoStr.includes('-')) {
        isoStr += 'Z'
      }
      return Temporal.Instant.from(isoStr).epochMilliseconds
    } catch {
      return 0
    }
  }

  async function loadPrivateHistory() {
    if (!authStore.user || !gameStore.db) return
    const myId = authStore.user.id
    
    // Buscar mensajes donde soy el destinatario o el remitente
    const { data, error } = await gameStore.db.from('chat_messages')
      .select('*')
      .or(`type.eq.private:${myId},senderId.eq.${myId}`)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Chat', `Private history load error: ${(error as Error).message}`)
      return
    }

    if (data && Array.isArray(data)) {
      // Registrar el lastInteraction inicial o el lastSaveTime para calcular nuevos mensajes
      const lastSaveTime = ((gameStore.state as Record<string, unknown>)._last_updated as number) || 0
      const initialLastInteractions: Record<string, number> = {}

      data.forEach((row: Record<string, unknown>) => {
        const senderId = (row.senderId as string) || ''
        const typeStr = (row.type as string) || ''
        const isIncoming = senderId !== myId
        const friendId = isIncoming ? senderId : typeStr.replace('private:', '')
        if (!friendId) return

        if (privateChats[friendId] && initialLastInteractions[friendId] === undefined) {
          initialLastInteractions[friendId] = privateChats[friendId].lastInteraction || 0
        }
      })

      data.forEach((row: Record<string, unknown>) => {
        const senderId = (row.senderId as string) || ''
        const senderName = (row.senderName as string) || 'Entrenador'
        const message = (row.message as string) || ''
        const typeStr = (row.type as string) || ''
        const createdAt = (row.created_at as string) || Temporal.Now.instant().toString()

        const isIncoming = senderId !== myId
        const friendId = isIncoming ? senderId : typeStr.replace('private:', '')
        if (!friendId) return

        const chatKey = friendId

        if (!privateChats[chatKey]) {
          privateChats[chatKey] = {
            username: isIncoming ? senderName : 'Entrenador',
            messages: [],
            unreadCount: 0,
            isCollapsed: true,
            lastInteraction: 0
          }
          initialLastInteractions[chatKey] = 0
        }
        const chat = privateChats[chatKey]
        if (chat) {
          const msgObj: ChatMessage = {
            senderId,
            senderName,
            text: message,
            timestamp: createdAt
          }

          const msgEpoch = parseInstantEpoch(createdAt)
          const isDup = chat.messages.some((m: ChatMessage) => {
            return m.text === message && Math.abs(parseInstantEpoch(m.timestamp) - msgEpoch) < 2000
          })

          if (!isDup) {
            chat.messages.push(msgObj)
            if (chat.messages.length > 25) {
              chat.messages.shift()
            }
            chat.lastInteraction = msgEpoch

            // Solo es un mensaje nuevo/no leído si se recibió después de la última interacción del chat,
            // o si el chat no existía, se recibió después de la última vez que guardamos la partida.
            const initialLast = initialLastInteractions[chatKey] || 0
            const baselineTime = initialLast > 0 ? initialLast : lastSaveTime

            if (isIncoming && chat.isCollapsed && baselineTime > 0 && msgEpoch > baselineTime) {
              chat.unreadCount++
            }
          }
        }
      })
      gameStore.state.chats = { ...privateChats }
      pruneOldMessages()
    }
  }

  async function pruneOldMessages() {
    if (!authStore.user || !gameStore.db) return
    const myId = authStore.user.id

    try {
      const { data } = await gameStore.db.from('chat_messages')
        .select('created_at')
        .eq('senderId', myId)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (data && Array.isArray(data) && data.length === 1000) {
        const thresholdDate = ((data as unknown[])[999] as Record<string, unknown>)?.created_at as string
        if (thresholdDate) {
          await gameStore.db.from('chat_messages')
            .delete()
            .eq('senderId', myId)
            .lt('created_at', thresholdDate)
        }
      }
    } catch (err) {
      logger.warn('Chat', `Pruning error: ${(err as Error).message}`)
    }
  }

  async function initPrivateInbox() {
    if (!authStore.user || inboxChannel) return

    const db = gameStore.db
    if (!db) return
    
    await loadPrivateHistory()

    inboxChannel = db.channel(`chat-inbox-${authStore.user.id}`)
    inboxChannel.on('broadcast', { event: 'private_message' }, ({ payload }: { payload: ChatMessage }) => {
      handleIncomingPrivate(payload)
      audioStore.receivedMsg(); // Sonido al recibir mensaje privado
    })
    .subscribe()
  }

  watch(() => authStore.user, (user) => {
    if (user) {
      gsap.delayedCall(0.5, () => {
        if (inboxChannel) {
          inboxChannel.unsubscribe()
          inboxChannel = null
        }
        initPrivateInbox()
      })
    } else {
      if (inboxChannel) {
        inboxChannel.unsubscribe()
        inboxChannel = null
      }
    }
  }, { immediate: true })

  function handleIncomingPrivate(payload: ChatMessage, targetChatId?: string) {
    const chatKey = targetChatId || (payload.senderId as string)
    
    if (!privateChats[chatKey]) {
      privateChats[chatKey] = {
        username: payload.senderName || 'Entrenador',
        messages: [],
        unreadCount: 0,
        isCollapsed: true, // Nunca abrir automáticamente al recibir un mensaje
        lastInteraction: Temporal.Now.instant().epochMilliseconds
      }
    }

    const chat = privateChats[chatKey]
    if (!chat) return
    
    // Evitar duplicados sutiles (broadcast propio)
    const isDup = chat.messages.some((m: ChatMessage) => m.timestamp === payload.timestamp && m.text === payload.text)
    if (isDup) return

    chat.messages.push(payload as ChatMessage)
    chat.lastInteraction = Temporal.Now.instant().epochMilliseconds
    
    // Limitar historial por chat (25 mensajes)
    if (chat.messages.length > 25) chat.messages.shift()

    if (activeChatId.value !== chatKey && payload.senderId !== authStore.user?.id) {
      chat.unreadCount++
      uiStore.notify(`Mensaje de ${chat.username}`, '💬')
    }
    
    // Sincronizar de vuelta al estado del juego para persistencia en el save_data
    gameStore.state.chats = { ...privateChats }
  }

  async function sendGlobalMessage(text: string) {
    if (!authStore.user || !text.trim() || !gameStore.db) return

    const now = Temporal.Now.instant().epochMilliseconds
    if (now - lastMessageSentTimestamp < 1000) {
      uiStore.notify('Debes esperar 1 segundo entre mensajes', '⏳')
      return
    }
    lastMessageSentTimestamp = now

    const payload = {
      user_id: authStore.user.id,
      username: gameStore.state.trainer || authStore.user.user_metadata?.username || 'Entrenador',
      message: text.slice(0, 180),
      player_class: gameStore.state.playerClass,
      trainer_level: gameStore.state.trainerLevel || 1
    }

    const { error } = await gameStore.db.from('global_chat_messages').insert(payload)
    if (error) {
      logger.error('Chat', `Global message error: ${(error as Error).message}`)
    } else {
      audioStore.sentMsg(); // Sonido al enviar satisfactoriamente
      
      // En modo Offline, no hay disparador de Postgres Realtime, así que pusheamos manualmente
      if (authStore.sessionMode === 'offline') {
        const localRow = {
          id: Temporal.Now.instant().epochMilliseconds,
          ...payload,
          created_at: Temporal.Now.instant().toString()
        }
        globalMessages.value.push(localRow as unknown as ChatMessage)
        if (globalMessages.value.length > 50) globalMessages.value.shift()
        fetchMissingCosmetics(authStore.user?.id ? [authStore.user.id] : [])
      }
    }
  }

  async function sendPrivateMessage(friendId: string, text: string) {
    if (!authStore.user || !text.trim() || !privateChats[friendId] || !gameStore.db) return

    const now = Temporal.Now.instant().epochMilliseconds
    if (now - lastMessageSentTimestamp < 1000) {
      uiStore.notify('Debes esperar 1 segundo entre mensajes', '⏳')
      return
    }
    lastMessageSentTimestamp = now

    const payload = {
      senderId: authStore.user.id,
      senderName: gameStore.state.trainer || authStore.user.user_metadata?.username || 'Entrenador',
      text: text.slice(0, 250),
      timestamp: Temporal.Now.instant().toString()
    }

    const db = gameStore.db
    // 1. Enviar vía broadcast
    if (!outboxChannels[friendId]) {
      const chan = db.channel(`chat-inbox-${friendId}`)
      outboxChannels[friendId] = chan
      chan.subscribe((status: string) => {
        if (status === 'SUBSCRIBED' && outboxChannels[friendId]) {
          outboxChannels[friendId]?.send({ type: 'broadcast', event: 'private_message', payload })
        }
      })
    } else {
      outboxChannels[friendId]?.send({ type: 'broadcast', event: 'private_message', payload })
    }

    // 2. Agregar a historial propio y persistir
    handleIncomingPrivate({ ...payload, senderId: authStore.user.id }, friendId)
    audioStore.sentMsg(); // Sonido al enviar privado

    // 3. Persistir en base de datos (chat_messages) para que le llegue si está offline
    const dbPayload = {
      senderId: authStore.user.id,
      senderName: payload.senderName,
      message: payload.text,
      type: `private:${friendId}`,
      created_at: payload.timestamp
    }
    const { error } = await db.from('chat_messages').insert(dbPayload)
    if (error) {
      logger.error('Chat', `Private message db error: ${(error as Error).message}`)
    }
  }

  function openChat(friendId: string, username: string) {
    if (!privateChats[friendId]) {
      privateChats[friendId] = {
        username: username || 'Entrenador',
        messages: [],
        unreadCount: 0,
        isCollapsed: false,
        lastInteraction: Temporal.Now.instant().epochMilliseconds
      }
    }
    const chat = privateChats[friendId]
    if (chat) {
      chat.unreadCount = 0
      chat.isCollapsed = false
    }
    activeChatId.value = friendId
    gameStore.state.chats = { ...privateChats }
    gameStore.scheduleSave()
    loadPrivateHistory()
  }

  function closeChat(friendId: string) {
    if (privateChats[friendId]) {
      privateChats[friendId].isCollapsed = true
      gameStore.state.chats = { ...privateChats }
    }
    if (activeChatId.value === friendId) {
      activeChatId.value = 'global'
    }
  }

  const totalUnreadChats = computed(() => {
    const socialStore = useSocialStore()
    const activeFriendIds = new Set((socialStore.friends || []).map(f => f.id))
    return Object.entries(privateChats).reduce((sum, [friendId, chat]) => {
      if (!activeFriendIds.has(friendId)) return sum
      return sum + chat.unreadCount
    }, 0)
  })

  return {
    globalMessages,
    privateChats,
    activeChatId,
    profileCosmetics,
    totalUnreadChats,
    initGlobalChat,
    initPrivateInbox,
    sendGlobalMessage,
    sendPrivateMessage,
    openChat,
    closeChat,
    fetchMissingCosmetics
  }
})
