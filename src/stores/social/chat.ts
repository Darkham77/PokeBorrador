// fallow-ignore-file circular-dependencies
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.ts'
import { useGameStore } from '@/stores/game.ts'
import { useUIStore } from '@/stores/ui.ts'
import { useAudioStore } from '@/stores/audio.ts'
import { logger } from '@/logic/utils/logger'
import { useChatCosmeticsStore } from '@/stores/social/chatCosmetics.ts'
import { useChatPrivateStore, type ChatMessage } from '@/stores/social/chatPrivate.ts'

import type { RealtimeChannel } from '@supabase/supabase-js'
import { validateChatMessage } from '@/logic/validation/schemas'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const gameStore = useGameStore()
  const uiStore = useUIStore()
  const audioStore = useAudioStore()

  const globalMessages = ref<ChatMessage[]>([])
  
  const cosmeticsStore = useChatCosmeticsStore()
  const profileCosmetics = computed(() => cosmeticsStore.profileCosmetics)
  const fetchMissingCosmetics = cosmeticsStore.fetchMissingCosmetics

  const privateStore = useChatPrivateStore()
  const privateChats = privateStore.privateChats
  const activeChatId = computed({
    get: () => privateStore.activeChatId,
    set: (val: string) => { privateStore.activeChatId = val }
  })
  const totalUnreadChats = computed(() => privateStore.totalUnreadChats)

  const initPrivateInbox = privateStore.initPrivateInbox
  const sendPrivateMessage = privateStore.sendPrivateMessage
  const openChat = privateStore.openChat
  const closeChat = privateStore.closeChat

  let globalChannel: RealtimeChannel | null = null
  let lastMessageSentTimestamp = 0

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
        const validation = validateChatMessage(row)
        if (!validation.success) {
          logger.error('Chat', 'Mensaje de chat entrante inválido omitido por esquema incorrecto', validation.issues)
          return
        }

        // Deduplicar por ID real de Supabase
        const alreadyById = globalMessages.value.some(m => m.id !== undefined && m.id === row.id)
        if (alreadyById) return

        // Deduplicar el push optimista propio: mismo user_id + mismo mensaje + timestamp muy cercano (<3s)
        const isOwnOptimistic = row.user_id === authStore.user?.id &&
          globalMessages.value.some(m => {
            if (m.user_id !== row.user_id || m.message !== row.message) return false
            // Si el ID del optimista es un número temporal (epochMs) y no un UUID, es el push optimista
            if (typeof m.id === 'number') {
              const diff = Math.abs((m.id as number) - (Temporal.Instant.from(row.created_at as string).epochMilliseconds))
              return diff < 3000
            }
            return false
          })

        if (isOwnOptimistic) {
          // Reemplazar el mensaje optimista con el definitivo (que tiene el ID real de Supabase)
          const idx = globalMessages.value.findIndex(m =>
            typeof m.id === 'number' &&
            m.user_id === row.user_id &&
            m.message === row.message
          )
          if (idx !== -1 && globalMessages.value[idx]) {
            // Preserve the numeric optimistic ID so Vue doesn't re-animate the element on key change
            const updatedRow: ChatMessage = {
              ...row,
              id: globalMessages.value[idx].id
            }
            globalMessages.value.splice(idx, 1, updatedRow)
          }
          return
        }

        globalMessages.value.push(row as ChatMessage) // domain-ok
        if (globalMessages.value.length > 50) globalMessages.value.shift()
        
        const senderId = row.user_id as string
        const cached = profileCosmetics.value[senderId]
        const needsUpdate = !cached || cached.username !== row.username || cached.player_class !== row.player_class || cached.trainer_level !== row.trainer_level
        fetchMissingCosmetics(needsUpdate ? [senderId] : [])
        
        // Sonido si el mensaje no es mío
        if (row.user_id !== authStore.user?.id) {
          audioStore.play('receivedMsg');
        }
      })
      .subscribe()
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

    // Immediate optimistic push before the async insert to prevent race conditions with Realtime
    const optimisticId = Temporal.Now.instant().epochMilliseconds
    const optimisticRow = {
      id: optimisticId,
      ...payload,
      created_at: Temporal.Now.instant().toString()
    }
    globalMessages.value.push(optimisticRow as ChatMessage) // domain-ok
    if (globalMessages.value.length > 50) globalMessages.value.shift()
    fetchMissingCosmetics(authStore.user?.id ? [authStore.user.id] : [])

    audioStore.play('sentMsg') // Sound on immediate send

    const { error } = await gameStore.db.from('global_chat_messages').insert(payload)
    if (error) {
      logger.error('Chat', `Global message error: ${(error as Error).message}`)
      // If there is an error, remove the optimistic message from list
      const idx = globalMessages.value.findIndex(m => m.id === optimisticId)
      if (idx !== -1) {
        globalMessages.value.splice(idx, 1)
      }
    }
  }



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
