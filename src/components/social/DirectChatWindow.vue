<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/social/chat';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { gsap } from 'gsap';
import { formatChatTimestamp } from '@/logic/utils/timeUtils';


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

watch(() => chat.value?.isCollapsed, (collapsed) => {
  if (collapsed === false) {
    nextTick(() => {
      scrollToBottom();
      inputField.value?.focus();
    });
    // Sincronizar el scroll al fondo con la animación de slide-in del modal lateral
    gsap.delayedCall(0.1, scrollToBottom);
    gsap.delayedCall(0.3, scrollToBottom);
    gsap.delayedCall(0.5, scrollToBottom);
    chatStore.fetchMissingCosmetics();
  }
}, { immediate: true });

import { MESSAGE_ANIM_DURATION_SEC, MESSAGE_ANIM_OVERSHOOT } from '@/logic/constants/visuals';

const onMessageEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el,
    { scale: 0.9, opacity: 0 },
    { scale: 1.0, opacity: 1, duration: MESSAGE_ANIM_DURATION_SEC, ease: `back.out(${MESSAGE_ANIM_OVERSHOOT})`, onComplete: done }
  )
}

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
        
        <TransitionGroup
          :css="false"
          @enter="onMessageEnter"
        >
          <div 
            v-for="(msg, idx) in chat?.messages" 
            :key="idx" 
            class="message-row"
          >
            <TrainerAvatar 
              :player-class="chatStore.profileCosmetics[msg.senderId || '']?.player_class || msg.player_class" 
              :level="chatStore.profileCosmetics[msg.senderId || '']?.trainer_level || msg.trainer_level" 
              :avatar-style="chatStore.profileCosmetics[msg.senderId || '']?.avatar_style || undefined"
              :gender="chatStore.profileCosmetics[msg.senderId || '']?.gender || msg.gender || 'h'"
              :size="32"
              class="clickable-avatar"
              @click.stop="openTrainerProfile(msg.senderId)"
            />
            <div
              class="message-content"
              :class="{ 'is-me': msg.senderId === authStore.user?.id }"
            >
              <div class="message-meta">
                <span
                  v-gsap-nick="chatStore.profileCosmetics[msg.senderId || '']?.nick_style || 'normal'"
                  class="username clickable-username"
                  :class="chatStore.profileCosmetics[msg.senderId || '']?.nick_style || 'normal'"
                  @click.stop="openTrainerProfile(msg.senderId)"
                >{{ chatStore.profileCosmetics[msg.senderId || '']?.username || msg.senderName }}</span>
                <span class="time">{{ formatChatTimestamp(msg.timestamp) }}</span>
              </div>
              <p class="text">
                {{ msg.text }}
              </p>
            </div>
          </div>
        </TransitionGroup>
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
            <span class="emoji">➤</span>
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
  @include chat-message-meta;
}

.text {
  @include chat-message-text;
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

.clickable-avatar {
  cursor: pointer;

  &:hover {
    transform: Scale(1.1);
    filter: Brightness(1.2);
  }
}

.clickable-username {
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    opacity: 0.85;
  }
}
</style>
