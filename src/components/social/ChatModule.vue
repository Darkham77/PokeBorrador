<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat.js'
import { useAuthStore } from '@/stores/auth.js'

const chatStore = useChatStore()
const authStore = useAuthStore()

const isGlobalOpen = ref(false)
const messageInput = ref('')
const privateInputs = ref({}) // { friendId: 'text' }
const messagesContainer = ref(null)

const scrollToBottom = (el) => {
  nextTick(() => {
    if (el) el.scrollTop = el.scrollHeight
  })
}

// Watch for global messages
watch(() => chatStore.globalMessages.length, () => {
  if (isGlobalOpen.value) {
    scrollToBottom(messagesContainer.value)
  }
})

const sendGlobal = () => {
  if (!messageInput.value.trim()) return
  chatStore.sendGlobalMessage(messageInput.value)
  messageInput.value = ''
}

const sendPrivate = (friendId) => {
  const text = privateInputs.value[friendId]
  if (!text || !text.trim()) return
  chatStore.sendPrivateMessage(friendId, text)
  privateInputs.value[friendId] = ''
  scrollToBottom(document.getElementById(`private-msg-container-${friendId}`))
}

const toggleGlobal = () => {
  isGlobalOpen.value = !isGlobalOpen.value
  if (isGlobalOpen.value) {
    scrollToBottom(messagesContainer.value)
  }
}

const formatTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  chatStore.initGlobalChat()
  chatStore.initPrivateInbox()
})
</script>

<template>
  <div class="chat-system">
    <!-- 1. GLOBAL CHAT (Bottom-Left) -->
    <div id="global-chat-root">
      <button 
        id="global-chat-toggle" 
        @click="toggleGlobal"
      >
        <span class="gc-icon">💬</span>
        <span class="gc-label">Chat</span>
      </button>

      <div 
        v-if="isGlobalOpen" 
        id="global-chat-panel"
      >
        <header class="gc-header">
          <div class="gc-title">
            CHAT GLOBAL
          </div>
          <button
            class="gc-close"
            @click="isGlobalOpen = false"
          >
            x
          </button>
        </header>
        
        <div
          id="global-chat-messages"
          ref="messagesContainer"
        >
          <div
            v-if="!chatStore.globalMessages.length"
            class="gc-empty"
          >
            No hay mensajes todavia.
          </div>
          <div
            v-for="msg in chatStore.globalMessages"
            :key="msg.id"
            class="gc-row"
          >
            <div class="gc-avatar">
              <span v-if="msg.user_id === authStore.user?.id">👤</span>
              <span v-else>🧢</span>
            </div>
            <div class="gc-msg">
              <div class="gc-line">
                <span
                  class="gc-nick"
                  :class="msg.nick_style"
                >{{ msg.username }}</span>
                <span class="gc-colon">: </span>
                <span>{{ msg.message }}</span>
              </div>
              <div class="gc-time">
                {{ formatTime(msg.created_at) }}
              </div>
            </div>
          </div>
        </div>

        <div class="gc-compose">
          <div class="gc-input-row">
            <input 
              v-model="messageInput" 
              placeholder="Escribe en el chat global..." 
              @keydown.enter="sendGlobal"
            >
            <button
              id="global-chat-send"
              @click="sendGlobal"
            >
              Enviar
            </button>
          </div>
          <div id="global-chat-hint">
            Nv. {{ authStore.profile?.level || 1 }}. 
            <span v-if="(authStore.profile?.level || 1) < 10">Necesitas Nv. 10.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. PRIVATE CHATS (Bottom-Right) -->
    <div class="private-chats-container">
      <div 
        v-for="(chat, friendId) in chatStore.privateChats" 
        :key="friendId"
        class="private-chat-modal"
        :class="{ collapsed: chat.isCollapsed }"
      >
        <header 
          class="private-header"
          @click="chat.isCollapsed = !chat.isCollapsed"
        >
          <div class="header-left">
            <span class="p-icon">💬</span>
            <span class="p-title">{{ chat.username.toUpperCase() }}</span>
          </div>
          <div class="header-right">
            <button
              class="p-close"
              @click.stop="chatStore.closeChat(friendId)"
            >
              x
            </button>
          </div>
        </header>

        <div
          v-show="!chat.isCollapsed"
          class="private-body"
        >
          <div
            :id="`private-msg-container-${friendId}`"
            class="private-messages custom-scrollbar"
          >
            <div class="start-hint">
              Conversación con {{ chat.username }}
            </div>
            <div 
              v-for="msg in chat.messages" 
              :key="msg.timestamp" 
              class="msg-bubble"
              :class="{ mine: msg.senderId === authStore.user?.id }"
            >
              {{ msg.text }}
            </div>
          </div>
          <div class="private-footer">
            <input 
              v-model="privateInputs[friendId]" 
              placeholder="Escribe un mensaje..."
              @keydown.enter="sendPrivate(friendId)"
            >
            <button
              class="p-send"
              @click="sendPrivate(friendId)"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 1:1 LEGACY STYLES */

#global-chat-root {
  position: fixed;
  left: 0;
  bottom: 0;
  z-index: 1600;
}

#global-chat-toggle {
  position: fixed;
  left: 14px;
  bottom: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(199,125,255,0.35);
  background: rgba(10,14,22,0.9);
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
  box-shadow: 0 8px 26px rgba(0,0,0,0.45);
}

#global-chat-panel {
  position: fixed;
  left: 14px;
  bottom: 70px;
  width: 360px;
  height: 430px;
  border-radius: 18px;
  border: 1px solid rgba(199,125,255,0.3);
  background: rgba(10,14,22,0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 40px rgba(0,0,0,0.55);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: linear-gradient(90deg, rgba(119,67,219,0.3), rgba(59,139,255,0.25));
}

.gc-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
}

.gc-close {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.25);
  color: #fff;
  cursor: pointer;
  font-weight: 700;
}

#global-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scrollbar-width: thin;
  background: rgba(0,0,0,0.15);
}

.gc-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.gc-avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.08);
}

.gc-msg {
  min-width: 0;
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 6px 8px;
  color: #e5e7eb;
  font-size: 11px;
  line-height: 1.35;
}

.gc-nick {
  color: #93c5fd;
  font-weight: 700;
  font-size: 11px;
}

.gc-time {
  color: #6b7280;
  font-size: 9px;
  margin-top: 2px;
}

.gc-compose {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 8px;
  background: rgba(255,255,255,0.02);
}

.gc-input-row {
  display: flex;
  gap: 6px;
  input {
    flex: 1;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.15);
    background: rgba(0,0,0,0.3);
    color: #fff;
    font-size: 12px;
    padding: 8px 10px;
    outline: none;
  }
}

#global-chat-send {
  border: none;
  border-radius: 10px;
  min-width: 80px;
  background: rgba(119,67,219,0.9);
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}

#global-chat-hint {
  color: #9ca3af;
  font-size: 10px;
  padding-top: 4px;
}

/* PRIVATE MODALS (1:1 with legacy) */

.private-chats-container {
  position: fixed;
  right: 20px;
  bottom: 0;
  display: flex;
  flex-direction: row-reverse;
  gap: 10px;
  pointer-events: none;
  z-index: 1000;
}

.private-chat-modal {
  width: 300px;
  height: 400px;
  background: rgba(13,17,23,0.9);
  backdrop-filter: blur(10px);
  border-radius: 18px 18px 0 0;
  box-shadow: 0 12px 40px rgba(0,0,0,0.7);
  border: 1px solid rgba(199,125,255,0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
  pointer-events: auto;

  &.collapsed {
    height: 45px;
  }
}

.private-header {
  background: linear-gradient(90deg, var(--purple), #9d4edd);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.p-title {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-left: 8px;
}

.p-close {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0,0,0,0.1);
  border: none;
  cursor: pointer;
}

.private-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(0,0,0,0.15);
}

.private-messages {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.start-hint {
  color: var(--gray);
  font-size: 10px;
  text-align: center;
  margin-bottom: 10px;
  font-style: italic;
  opacity: 0.7;
}

.msg-bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 11px;
  line-height: 1.4;
  word-break: break-word;
  align-self: flex-start;
  background: rgba(255,255,255,0.05);
  color: #eee;
  border-bottom-left-radius: 2px;

  &.mine {
    align-self: flex-end;
    background: rgba(199,125,255,0.2);
    color: var(--purple-light);
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 2px;
  }
}

.private-footer {
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  gap: 10px;
  input {
    flex: 1;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 10px 12px;
    color: #fff;
    font-size: 13px;
    outline: none;
  }
}

.p-send {
  background: var(--purple);
  border: none;
  border-radius: 10px;
  width: 38px;
  height: 38px;
  cursor: pointer;
  color: #fff;
  font-size: 18px;
}

.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(199,125,255,0.2); border-radius: 10px; }
</style>
