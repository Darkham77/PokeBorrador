import { defineStore } from 'pinia'
import { ref, reactive, watch, computed } from 'vue'
import { gsap } from 'gsap'
import { useAuthStore } from './auth.ts'
import { useGameStore } from './game.ts'
import { useUIStore } from './ui.ts'
import { useAudioStore } from './audio.ts'
import { useSocialStore } from './social.ts'
import { logger } from '@/logic/utils/logger'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
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

export interface PrivateChat {
  username: string;
  messages: ChatMessage[];
  unreadCount: number;
  isCollapsed: boolean;
  lastInteraction: number;
}

export const useChatPrivateStore = defineStore('chatPrivate', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()

  const activeChatId = ref('global') // 'global' or userId
  const privateChats = reactive<Record<string, PrivateChat>>({})
  
  let inboxChannel: RealtimeChannel | null = null
  let lastMessageSentTimestamp = 0
  const outboxChannels: Record<string, RealtimeChannel> = {}
  let isInitialized = false

  const getSanitizedChats = (chats: Record<string, PrivateChat> | undefined, forceCollapse = false): Record<string, PrivateChat> => {
    const sanitized: Record<string, PrivateChat> = {}
    if (chats) {
      for (const [id, chat] of Object.entries(chats)) {
        if (authStore.user?.id && id === authStore.user.id) continue
        
        const isLocalKey = id === 'local_user' || id === 'eq.local_user' || id.startsWith('local_')
        if (authStore.sessionMode === 'online' && isLocalKey) {
          logger.info('Chat', `Filtrando chat local contaminado en modo online: ${id}`)
          continue
        }
        
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (authStore.sessionMode === 'offline' && uuidRegex.test(id)) {
          logger.info('Chat', `Filtrando chat remoto en modo offline: ${id}`)
          continue
        }

        const currentCollapsed = isInitialized && privateChats[id] ? privateChats[id].isCollapsed : true

        sanitized[id] = {
          ...chat,
          isCollapsed: forceCollapse ? true : currentCollapsed
        }
      }
    }
    return sanitized
  }

  // Initialize existing chats
  if (gameStore.state.chats) {
    Object.assign(privateChats, getSanitizedChats(gameStore.state.chats as Record<string, PrivateChat>, true))
  }
  isInitialized = true

  // Sync chats with game state updates
  watch(() => gameStore.state.chats, (newChats) => {
    if (newChats) {
      const sanitized = getSanitizedChats(newChats as Record<string, PrivateChat>, false)
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
    
    const { data, error } = await gameStore.db.from('chat_messages')
      .select('*')
      .or(`type.eq.private:${myId},senderId.eq.${myId}`)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Chat', `Private history load error: ${(error as Error).message}`)
      return
    }

    if (data && Array.isArray(data)) {
      const lastSaveTime = ((gameStore.state as Record<string, unknown>)._last_updated as number) || 0
      const initialLastInteractions: Record<string, number> = {}

      data.forEach((row: Record<string, unknown>) => {
        const senderId = (row.senderId as string) || (row.senderid as string) || ''
        const typeStr = (row.type as string) || ''
        const isIncoming = senderId !== myId
        const friendId = isIncoming ? senderId : typeStr.replace('private:', '')
        if (!friendId) return

        if (privateChats[friendId] && initialLastInteractions[friendId] === undefined) {
          initialLastInteractions[friendId] = privateChats[friendId].lastInteraction || 0
        }
      })

      data.forEach((row: Record<string, unknown>) => {
        const senderId = (row.senderId as string) || (row.senderid as string) || ''
        const senderName = (row.senderName as string) || (row.sendername as string) || 'Entrenador'
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
      audioStore.receivedMsg()
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
        isCollapsed: true,
        lastInteraction: Temporal.Now.instant().epochMilliseconds
      }
    }

    const chat = privateChats[chatKey]
    if (!chat) return
    
    const isDup = chat.messages.some((m: ChatMessage) => m.timestamp === payload.timestamp && m.text === payload.text)
    if (isDup) return

    chat.messages.push(payload as ChatMessage)
    chat.lastInteraction = Temporal.Now.instant().epochMilliseconds
    
    if (chat.messages.length > 25) chat.messages.shift()

    if (activeChatId.value !== chatKey && payload.senderId !== authStore.user?.id) {
      chat.unreadCount++
      uiStore.notify(`Mensaje de ${chat.username}`, '💬')
    }
    
    gameStore.state.chats = { ...privateChats }
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

    handleIncomingPrivate({ ...payload, senderId: authStore.user.id }, friendId)
    audioStore.sentMsg()

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
    const existingChat = privateChats[friendId]
    if (existingChat && activeChatId.value === friendId && !existingChat.isCollapsed) {
      return
    }

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
    activeChatId,
    privateChats,
    totalUnreadChats,
    initPrivateInbox,
    sendPrivateMessage,
    openChat,
    closeChat
  }
})
