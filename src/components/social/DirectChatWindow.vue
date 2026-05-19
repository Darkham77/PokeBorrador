<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/TrainerAvatar.vue';
import BaseModal from '@/components/common/BaseModal.vue';

interface Props {
  friendId: string;
}

const props = defineProps<Props>();

const chatStore = useChatStore();
const authStore = useAuthStore();
const uiStore = useUIStore();

const newMessage = ref('');
const messagesContainer = ref<HTMLDivElement | null>(null);
const inputField = ref<HTMLInputElement | null>(null);

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

function formatTime(iso: string | number | undefined) {
  if (!iso) return '';
  try {
    let instant: Temporal.Instant;
    if (typeof iso === 'string') {
      const normalized = iso.includes('Z') || iso.includes('+') ? iso : iso.replace(' ', 'T') + 'Z';
      instant = Temporal.Instant.from(normalized);
    } else {
      const ms = typeof iso === 'number' ? iso : Number(iso);
      instant = Temporal.Instant.fromEpochMilliseconds(ms);
    }
    return instant.toZonedDateTimeISO('UTC').toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return '';
  }
}

function openTrainerProfile(userId?: string) {
  if (!userId) return;
  uiStore.open('TrainerProfile', { userId });
}

watch(() => chat.value?.messages.length, () => {
  if (chat.value && !chat.value.isCollapsed) {
    nextTick(scrollToBottom);
    chatStore.fetchMissingCosmetics();
  }
});

onMounted(() => {
  nextTick(scrollToBottom);
  inputField.value?.focus();
  chatStore.fetchMissingCosmetics();
});
</script>

<template>
  <BaseModal
    :show="!!chat && !chat.isCollapsed"
    :title="'CHAT: ' + (chat?.username?.toUpperCase() || 'ENTRENADOR')"
    type="side-right"
    :lock-scroll="false"
    overlay="none"
    :show-close-button="true"
    padding="raw"
    @close="closeChat"
  >
    <section class="chat-panel">
      <div
        ref="messagesContainer"
        class="messages-list custom-scrollbar-vicio"
      >
        <div class="chat-start-hint">
          Comienzo de la conversación con {{ chat?.username }}
        </div>
        
        <div
          v-if="!chat?.messages?.length"
          class="empty-state"
        >
          No hay mensajes aún...
        </div>
        
        <div 
          v-for="(msg, idx) in chat?.messages" 
          :key="idx" 
          class="message-row animate-pop"
        >
          <TrainerAvatar 
            :player-class="chatStore.profileCosmetics[msg.senderId || '']?.player_class || msg.player_class" 
            :level="chatStore.profileCosmetics[msg.senderId || '']?.trainer_level || msg.trainer_level" 
            :avatar-style="chatStore.profileCosmetics[msg.senderId || '']?.avatar_style || undefined"
            :size="32"
            class="clickable-avatar"
            @click.stop="openTrainerProfile(msg.senderId)"
          />
          <div class="message-content" :class="{ 'is-me': msg.senderId === authStore.user?.id }">
            <div class="message-meta">
              <span
                class="username clickable-username"
                :class="chatStore.profileCosmetics[msg.senderId || '']?.nick_style || 'normal'"
                @click.stop="openTrainerProfile(msg.senderId)"
              >{{ chatStore.profileCosmetics[msg.senderId || '']?.username || msg.senderName }}</span>
              <span class="time">{{ formatTime(msg.timestamp) }}</span>
            </div>
            <p class="text">
              {{ msg.text }}
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
            :placeholder="`Escribe a ${chat?.username}...`"
            :maxlength="250"
            @keydown.enter="handleSendMessage"
          >
          <button 
            class="send-btn" 
            :disabled="!newMessage.trim()"
            @click.stop="handleSendMessage"
          >
            ➤
          </button>
        </div>
        <p class="hint">
          {{ newMessage.length }}/250
        </p>
      </footer>
    </section>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "sass:string";

.chat-panel {
  width: 100%;
  height: 100%;
  background: Rgba(13, 17, 23, 0.98);
  display: flex;
  flex-direction: column;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.chat-start-hint {
  font-size: 9px;
  color: Rgba(255, 255, 255, 0.5);
  text-align: center;
  margin-bottom: 5px;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: Rgba(148, 163, 184, 1);
  font-size: 12px;
}

.message-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-content {
  flex: 1;
  background: Rgba(255, 255, 255, 0.03);
  border-radius: 0 12px 12px 12px;
  padding: 8px 12px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  &.is-me {
    background: Rgba(157, 78, 221, 0.15);
    border-color: Rgba(157, 78, 221, 0.3);
  }
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;

  .username {
    font-size: 11px;
    font-weight: 700;
    color: Rgba(226, 232, 240, 1);
  }

  .time {
    font-size: 9px;
    color: Rgba(255, 255, 255, 0.5);
  }
}

.text {
  font-size: 13px;
  color: Rgba(203, 213, 225, 1);
  line-height: 1.4;
  word-break: break-all;
  margin: 0;
}

.chat-footer {
  padding: 20px;
  background: Rgba(0, 0, 0, 0.2);
  border-top: 1px solid Rgba(255, 255, 255, 0.05);

  .input-container {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  input {
    flex: 1;
    background: Rgba(0, 0, 0, 0.3);
    border: 1px solid Rgba(199, 125, 255, 0.2);
    border-radius: 8px;
    padding: 10px 12px;
    color: var(--white);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;

    &:focus { border-color: var(--purple-light); }
  }

  .send-btn {
    background: var(--purple);
    border: none;
    border-radius: 8px;
    width: 38px;
    height: 38px;
    color: var(--white);
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) { background: Rgba(157, 78, 221, 1); transform: Scale(1.05); }
    &:disabled { opacity: 0.3; }
  }

  .hint {
    font-size: 10px;
    margin: 0;
    text-align: right;
    color: Rgba(255, 255, 255, 0.5);
  }
}

.animate-pop {
  animation: pop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

@keyframes pop {
  0% { transform: Scale(0.9); opacity: 0; }
  100% { transform: Scale(1.0); opacity: 1; }
}

.clickable-avatar {
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}
</style>
