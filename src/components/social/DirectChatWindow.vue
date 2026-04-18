<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import TrainerAvatar from '@/components/TrainerAvatar.vue';

const props = defineProps({
  friendId: {
    type: String,
    required: true
  }
});

const chatStore = useChatStore();
const authStore = useAuthStore();

const newMessage = ref('');
const messagesContainer = ref(null);
const inputField = ref(null);

const chat = computed(() => chatStore.privateChats[props.friendId]);

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

async function handleSendMessage() {
  const text = newMessage.value.trim();
  if (!text) return;

  await chatStore.sendPrivateMessage(props.friendId, text);
  newMessage.value = '';
  nextTick(scrollToBottom);
}

function closeChat() {
  chatStore.closeChat(props.friendId);
}

function toggleCollapse() {
  if (chat.value) {
    chat.value.isCollapsed = !chat.value.isCollapsed;
    if (!chat.value.isCollapsed) {
      nextTick(() => {
        scrollToBottom();
        inputField.value?.focus();
      });
    }
  }
}

watch(() => chat.value?.messages.length, () => {
  if (chat.value && !chat.value.isCollapsed) {
    nextTick(scrollToBottom);
  }
});

onMounted(() => {
  nextTick(scrollToBottom);
  inputField.value?.focus();
});
</script>

<template>
  <div 
    v-if="chat" 
    class="direct-chat-window" 
    :class="{ collapsed: chat.isCollapsed }"
  >
    <!-- Header -->
    <header
      class="chat-header"
      @click="toggleCollapse"
    >
      <div class="header-left">
        <div
          v-if="chat.unreadCount > 0"
          class="unread-dot"
        />
        <div class="title">
          {{ chat.username.toUpperCase() }}
        </div>
      </div>
      <div class="header-right">
        <button
          class="header-btn"
          @click.stop="toggleCollapse"
        >
          {{ chat.isCollapsed ? '□' : '–' }}
        </button>
        <button
          class="header-btn close"
          @click.stop="closeChat"
        >
          ×
        </button>
      </div>
    </header>

    <!-- Content (Hidden when collapsed) -->
    <template v-if="!chat.isCollapsed">
      <div
        ref="messagesContainer"
        class="messages-container custom-scrollbar"
      >
        <div class="chat-start-hint">
          Comienzo de la conversación
        </div>
        
        <div 
          v-for="(msg, idx) in chat.messages" 
          :key="idx" 
          class="message-wrap"
          :class="{ 'is-me': msg.senderId === authStore.user.id }"
        >
          <div class="bubble animate-pop">
            {{ msg.text }}
          </div>
        </div>
      </div>

      <footer class="chat-footer">
        <input 
          ref="inputField"
          v-model="newMessage"
          type="text" 
          placeholder="Escribe algo..."
          @keydown.enter="handleSendMessage"
        >
        <button
          class="send-btn"
          @click="handleSendMessage"
        >
          ➤
        </button>
      </footer>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use "sass:string";

.direct-chat-window {
  width: 280px;
  background: rgba(13, 17, 23, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(199, 125, 255, 0.2);
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &.collapsed {
    height: 40px;
  }
}

.chat-header {
  height: 40px;
  padding: 0 12px;
  background: linear-gradient(90deg, var(--purple), #9d4edd);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .unread-dot {
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 10px #fff;
    animation: pulse 1.5s infinite;
  }

  .title {
    font-family: 'Press Start 2P', cursive;
    font-size: 7px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .header-right {
    display: flex;
    gap: 4px;
  }

  .header-btn {
    background: rgba(0, 0, 0, 0.1);
    border: none;
    color: #fff;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;

    &:hover { background: rgba(255, 255, 255, 0.1); }
    &.close:hover { background: rgba(239, 68, 68, 0.4); }
  }
}

.messages-container {
  height: 300px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.2);
}

.chat-start-hint {
  font-size: 9px;
  color: #64748b;
  text-align: center;
  margin-bottom: 5px;
  font-style: italic;
}

.message-wrap {
  display: flex;
  flex-direction: column;
  
  &.is-me {
    align-items: flex-end;
    .bubble {
      background: rgba(157, 78, 221, 0.25);
      color: #e9d5ff;
      border-bottom-right-radius: 2px;
      border: 1px solid rgba(157, 78, 221, 0.3);
    }
  }

  &:not(.is-me) {
    align-items: flex-start;
    .bubble {
      background: rgba(255, 255, 255, 0.05);
      color: #eee;
      border-bottom-left-radius: 2px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  }
}

.bubble {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
  word-break: break-all;
}

.chat-footer {
  padding: 10px;
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 8px 10px;
    color: #fff;
    font-size: 12px;
    outline: none;

    &:focus { border-color: var(--purple-light); }
  }

  .send-btn {
    background: var(--purple);
    border: none;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    
    &:hover { background: #9d4edd; }
  }
}

.animate-pop {
  animation: pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pulse {
  0% { transform: string.unquote("scale(#{1.0})"); opacity: 0.8; }
  50% { transform: string.unquote("scale(#{1.3})"); opacity: 1; }
  100% { transform: string.unquote("scale(#{1.0})"); opacity: 0.8; }
}

@keyframes pop {
  0% { transform: string.unquote("scale(#{0.8})"); opacity: 0; }
  100% { transform: string.unquote("scale(#{1.0})"); opacity: 1; }
}

.custom-scrollbar::-webkit-scrollbar { width: 3px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
</style>
