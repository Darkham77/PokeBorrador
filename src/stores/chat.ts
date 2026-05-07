import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'
import { logger } from '@/logic/utils/logger'
import { Temporal } from '@js-temporal/polyfill'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()

  const globalMessages = ref<any[]>([])
  const activeChatId = ref('global') // 'global' or userId
  
  let globalChannel: any = null
  let inboxChannel: any = null
  const outboxChannels: any = {}

  // Computed proxy to private chats in game state for persistence
  const privateChats = reactive(gameStore.state.chats || {})

  // Watch for game state changes (e.g. after a load) to sync privateChats
  watch(() => gameStore.state.chats, (newChats) => {
    Object.assign(privateChats, newChats || {})
  }, { deep: true })

  async function loadGlobalHistory() {
    // If offline, ProxyQuery will handle the local SELECT

    const db = gameStore.db
    if (!db) return
    const { data, error } = await db
      .from('global_chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      globalMessages.value = data.reverse()
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
      }, ({ new: row }: { new: any }) => {
        if (!globalMessages.value.some(m => m.id === row.id)) {
          globalMessages.value.push(row)
          if (globalMessages.value.length > 50) globalMessages.value.shift()
          
          // Sonido si el mensaje no es mío
          if (row.user_id !== authStore.user?.id) {
            audioStore.receivedMsg();
          }
        }
      })
      .subscribe()
  }

  async function initPrivateInbox() {
    if (!authStore.user || inboxChannel) return

    const db = gameStore.db
    if (!db) return
    inboxChannel = db.channel(`chat-inbox-${authStore.user.id}`)
      inboxChannel.on('broadcast', { event: 'private_message' }, ({ payload }: { payload: any }) => {
        handleIncomingPrivate(payload)
        audioStore.receivedMsg(); // Sonido al recibir mensaje privado
      })
      .subscribe()
  }

  function handleIncomingPrivate(payload: any) {
    const friendId = payload.senderId
    
    if (!privateChats[friendId]) {
      privateChats[friendId] = {
        username: payload.senderName || 'Entrenador',
        messages: [],
        unreadCount: 0,
        isCollapsed: false,
        lastInteraction: Temporal.Now.instant().epochMilliseconds
      }
    }

    const chat = privateChats[friendId]
    
    // Evitar duplicados sutiles (broadcast propio)
    const isDup = chat.messages.some((m: any) => m.timestamp === payload.timestamp && m.text === payload.text)
    if (isDup) return

    chat.messages.push(payload)
    chat.lastInteraction = Temporal.Now.instant().epochMilliseconds
    
    // Limitar historial por chat (25 mensajes)
    if (chat.messages.length > 25) chat.messages.shift()

    if (activeChatId.value !== friendId && payload.senderId !== authStore.user?.id) {
      chat.unreadCount++
      uiStore.notify(`Mensaje de ${chat.username}`, '💬')
    }
    
    // Sincronizar de vuelta al estado del juego para persistencia en el save_data
    gameStore.state.chats = { ...privateChats }
  }

  async function sendGlobalMessage(text: string) {
    if (!authStore.user || !text.trim() || !gameStore.db) return

    const payload = {
      user_id: authStore.user.id,
      username: gameStore.state.trainer || (authStore.user as any).user_metadata?.username || 'Entrenador',
      message: text.slice(0, 180),
      player_class: gameStore.state.playerClass,
      trainer_level: gameStore.state.trainerLevel || 1
    }

    const { error } = await gameStore.db.from('global_chat_messages').insert(payload)
    if (error) {
      logger.error('Chat', `Global message error: ${(error as any).message}`)
    } else {
      audioStore.sentMsg(); // Sonido al enviar satisfactoriamente
      
      // En modo Offline, no hay disparador de Postgres Realtime, así que pusheamos manualmente
      if (authStore.sessionMode === 'offline') {
        const localRow = {
          id: Temporal.Now.instant().epochMilliseconds,
          ...payload,
          created_at: Temporal.Now.instant().toString()
        }
        globalMessages.value.push(localRow as any)
        if (globalMessages.value.length > 50) globalMessages.value.shift()
      }
    }
  }

  async function sendPrivateMessage(friendId: string, text: string) {
    if (!authStore.user || !text.trim() || !privateChats[friendId] || !gameStore.db) return

    const payload = {
      senderId: authStore.user.id,
      senderName: gameStore.state.trainer || (authStore.user as any).user_metadata?.username || 'Entrenador',
      text: text.slice(0, 250),
      timestamp: Temporal.Now.instant().toString()
    }

    const db = gameStore.db
    // 1. Enviar vía broadcast
    if (!(outboxChannels as any)[friendId]) {
      (outboxChannels as any)[friendId] = db.channel(`chat-inbox-${friendId}`).subscribe((status: string) => {
        if (status === 'SUBSCRIBED' && (outboxChannels as any)[friendId]) {
          (outboxChannels as any)[friendId].send({ type: 'broadcast', event: 'private_message', payload })
        }
      })
    } else {
      (outboxChannels as any)[friendId].send({ type: 'broadcast', event: 'private_message', payload })
    }

    // 2. Agregar a historial propio y persistir
    handleIncomingPrivate({ ...payload, senderId: authStore.user.id })
    audioStore.sentMsg(); // Sonido al enviar privado
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
    privateChats[friendId].unreadCount = 0
    privateChats[friendId].isCollapsed = false
    activeChatId.value = friendId
  }

  function closeChat(friendId: string) {
    if (privateChats[friendId]) {
      delete privateChats[friendId]
      gameStore.state.chats = { ...privateChats }
    }
    if (activeChatId.value === friendId) {
      activeChatId.value = 'global'
    }
  }

  return {
    globalMessages,
    privateChats,
    activeChatId,
    initGlobalChat,
    initPrivateInbox,
    sendGlobalMessage,
    sendPrivateMessage,
    openChat,
    closeChat
  }
})
