import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import { useAuthStore } from './auth'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { useAudioStore } from './audio'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()

  const globalMessages = ref([])
  const activeChatId = ref('global') // 'global' or userId
  
  let globalChannel = null
  let inboxChannel = null
  const outboxChannels = {}

  // Computed proxy to private chats in game state for persistence
  const privateChats = reactive(gameStore.state.chats || {})

  // Watch for game state changes (e.g. after a load) to sync privateChats
  watch(() => gameStore.state.chats, (newChats) => {
    Object.assign(privateChats, newChats || {})
  }, { deep: true })

  async function loadGlobalHistory() {
    if (authStore.sessionMode === 'offline') return

    const { data, error } = await gameStore.db
      .from('global_chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      globalMessages.value = data.reverse()
    }
  }

  async function initGlobalChat() {
    if (authStore.sessionMode === 'offline') return
    if (globalChannel) return
    
    await loadGlobalHistory()

    const db = gameStore.db
    globalChannel = db.channel('global-chat-room')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'global_chat_messages'
      }, ({ new: row }) => {
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
    if (authStore.sessionMode === 'offline') return
    if (!authStore.user || inboxChannel) return

    const db = gameStore.db
    inboxChannel = db.channel(`chat-inbox-${authStore.user.id}`)
      .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
        handleIncomingPrivate(payload)
        audioStore.receivedMsg(); // Sonido al recibir mensaje privado
      })
      .subscribe()
  }

  function handleIncomingPrivate(payload) {
    const friendId = payload.senderId
    
    if (!privateChats[friendId]) {
      privateChats[friendId] = {
        username: payload.senderName || 'Entrenador',
        messages: [],
        unreadCount: 0,
        isCollapsed: false,
        lastInteraction: Date.now()
      }
    }

    const chat = privateChats[friendId]
    
    // Evitar duplicados sutiles (broadcast propio)
    const isDup = chat.messages.some(m => m.timestamp === payload.timestamp && m.text === payload.text)
    if (isDup) return

    chat.messages.push(payload)
    chat.lastInteraction = Date.now()
    
    // Limitar historial por chat (25 mensajes)
    if (chat.messages.length > 25) chat.messages.shift()

    if (activeChatId.value !== friendId && payload.senderId !== authStore.user.id) {
      chat.unreadCount++
      uiStore.notify(`Mensaje de ${chat.username}`, '💬')
    }
    
    // Sincronizar de vuelta al estado del juego para persistencia en el save_data
    gameStore.state.chats = { ...privateChats }
  }

  async function sendGlobalMessage(text) {
    if (authStore.sessionMode === 'offline') return
    if (!authStore.user || !text.trim()) return

    const payload = {
      user_id: authStore.user.id,
      username: gameStore.state.trainer || 'Entrenador',
      message: text.slice(0, 180),
      player_class: gameStore.state.playerClass,
      trainer_level: gameStore.state.trainerLevel || 1
    }

    const { error } = await gameStore.db.from('global_chat_messages').insert(payload)
    if (error) {
      console.error('[ChatStore] Global message error:', error)
    } else {
      audioStore.sentMsg(); // Sonido al enviar satisfactoriamente
    }
  }

  async function sendPrivateMessage(friendId, text) {
    if (authStore.sessionMode === 'offline') return
    if (!authStore.user || !text.trim() || !privateChats[friendId]) return

    const payload = {
      senderId: authStore.user.id,
      senderName: gameStore.state.trainer || 'Entrenador',
      text: text.slice(0, 250),
      timestamp: new Date().toISOString()
    }

    const db = gameStore.db
    // 1. Enviar vía broadcast
    if (!outboxChannels[friendId]) {
      outboxChannels[friendId] = db.channel(`chat-inbox-${friendId}`).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          outboxChannels[friendId].send({ type: 'broadcast', event: 'chat_msg', payload })
        }
      })
    } else {
      outboxChannels[friendId].send({ type: 'broadcast', event: 'chat_msg', payload })
    }

    // 2. Agregar a historial propio y persistir
    handleIncomingPrivate({ ...payload, senderId: authStore.user.id })
    audioStore.sentMsg(); // Sonido al enviar privado
  }

  function openChat(friendId, username) {
    if (!privateChats[friendId]) {
      privateChats[friendId] = {
        username: username || 'Entrenador',
        messages: [],
        unreadCount: 0,
        isCollapsed: false,
        lastInteraction: Date.now()
      }
    }
    privateChats[friendId].unreadCount = 0
    privateChats[friendId].isCollapsed = false
    activeChatId.value = friendId
  }

  function closeChat(friendId) {
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
