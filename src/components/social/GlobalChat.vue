<script setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import TrainerAvatar from '@/components/TrainerAvatar.vue';

const chatStore = useChatStore();
const authStore = useAuthStore();
const gameStore = useGameStore();

const isOpen = ref(false);
const newMessage = ref('');
const messagesContainer = ref(null);
const inputField = ref(null);

const MIN_LEVEL = 10;
const MAX_CHARS = 100;

const canWrite = computed(() => (gameStore.state.trainerLevel || 1) >= MIN_LEVEL);

function toggleChat() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    nextTick(() => {
      scrollToBottom();
      inputField.value?.focus();
    });
  }
}

async function handleSendMessage() {
  const text = newMessage.value.trim();
  if (!text || !canWrite.value) return;

  await chatStore.sendGlobalMessage(text);
  newMessage.value = '';
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Auto-scroll when new messages arrive if panel is open
watch(() => chatStore.globalMessages.length, () => {
  if (isOpen.value) {
    nextTick(scrollToBottom);
  }
});

onMounted(() => {
  chatStore.initGlobalChat();
});
</script>

<template>
  <div class="global-chat-root">
    <!-- Toggle Button -->
    <button 
      class="chat-toggle-btn" 
      :class="{ 'has-unread': !isOpen && chatStore.globalMessages.length > 0 }"
      @click="toggleChat"
    >
      <span class="icon">💬</span>
      <span class="label">Chat Global</span>
    </button>

    <!-- Side Panel -->
    <transition name="slide">
      <section
        v-if="isOpen"
        class="chat-panel"
      >
        <header class="chat-header">
          <div class="title">
            MUNDO
          </div>
          <button
            class="close-btn"
            @click="toggleChat"
          >
            ×
          </button>
        </header>

        <div
          ref="messagesContainer"
          class="messages-list custom-scrollbar"
        >
          <div
            v-if="chatStore.globalMessages.length === 0"
            class="empty-state"
          >
            No hay mensajes aún...
          </div>
          
          <div 
            v-for="msg in chatStore.globalMessages" 
            :key="msg.id" 
            class="message-row animate-pop"
          >
            <TrainerAvatar 
              :player-class="msg.player_class" 
              :level="msg.trainer_level" 
              :size="32"
            />
            <div class="message-content">
              <div class="message-meta">
                <span
                  class="username"
                  :class="msg.player_class"
                >{{ msg.username }}</span>
                <span class="time">{{ formatTime(msg.created_at) }}</span>
              </div>
              <p class="text">
                {{ msg.message }}
              </p>
            </div>
          </div>
        </div>

        <footer class="chat-footer">
          <div class="input-container">
            <input 
              ref="inputField"
              v-model="newMessage"
              type="text" 
              :placeholder="canWrite ? 'Habla con el mundo...' : `Nivel ${MIN_LEVEL} requerido`"
              :disabled="!canWrite"
              :maxlength="MAX_CHARS"
              @keydown.enter="handleSendMessage"
            >
            <button 
              class="send-btn" 
              :disabled="!canWrite || !newMessage.trim()"
              @click="handleSendMessage"
            >
              ➤
            </button>
          </div>
          <p
            v-if="!canWrite"
            class="hint-error"
          >
            Subí a nivel {{ MIN_LEVEL }} para participar.
          </p>
          <p
            v-else
            class="hint"
          >
            {{ newMessage.length }}/{{ MAX_CHARS }}
          </p>
        </footer>
      </section>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.global-chat-root {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-toggle-btn {
  background: rgba(13, 17, 23, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(199, 125, 255, 0.3);
  border-radius: 12px;
  padding: 10px 16px;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--purple-light);
    background: rgba(13, 17, 23, 0.95);
  }

  .icon { font-size: 18px; }
  .label { 
    font-family: 'Press Start 2P', cursive;
    font-size: 8px;
    letter-spacing: 0.5px;
  }
}

.chat-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: min(350px, 100vw);
  height: 100vh;
  background: rgba(13, 17, 23, 0.94);
  backdrop-filter: blur(12px);
  border-left: 1px solid rgba(199, 125, 255, 0.2);
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
}

.chat-header {
  padding: 20px;
  background: linear-gradient(to bottom, rgba(157, 78, 221, 0.1), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .title {
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    color: var(--purple-light);
    text-shadow: 0 0 10px rgba(157, 78, 221, 0.4);
  }

  .close-btn {
    background: rgba(255, 255, 255, 0.05);
    border: none;
    color: #94a3b8;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }
  }
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-content {
  flex: 1;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 0 12px 12px 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;

    .username {
      font-size: 11px;
      font-weight: 700;
      color: #e2e8f0;

    &.rocket { color: #f87171; }
    &.cazabichos { color: #4ade80; }
    &.criador { color: #c084fc; }
    &.entrenador { color: #60a5fa; }
  }

  .time {
    font-size: 9px;
    color: #64748b;
  }
}

.text {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.4;
  word-break: break-all;
  margin: 0;
}

.chat-footer {
  padding: 20px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  .input-container {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(199, 125, 255, 0.2);
    border-radius: 8px;
    padding: 10px 12px;
    color: #fff;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;

    &:focus { border-color: var(--purple-light); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .send-btn {
    background: var(--purple);
    border: none;
    border-radius: 8px;
    width: 38px;
    height: 38px;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) { background: #9d4edd; transform: unquote("scale(1.05)"); }
    &:disabled { opacity: 0.3; }
  }

  .hint, .hint-error {
    font-size: 10px;
    margin: 0;
    text-align: right;
  }

  .hint { color: #64748b; }
  .hint-error { color: #f87171; font-weight: 700; }
}

// Animations
.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}

.animate-pop {
  animation: pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pop {
  0% { transform: unquote("scale(0.9)"); opacity: 0; }
  100% { transform: unquote("scale(1)"); opacity: 1; }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(157, 78, 221, 0.2); border-radius: 10px; }
</style>
