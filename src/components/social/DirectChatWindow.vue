<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/social/chat';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import BaseModal from '@/components/common/BaseModal.vue';
import DirectChatMessageRow from './DirectChatMessageRow.vue';
import { gsap } from 'gsap';


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
    const SCROLL_SYNC_STEP_1_SEC = 0.1;
    const SCROLL_SYNC_STEP_2_SEC = 0.3;
    const SCROLL_SYNC_STEP_3_SEC = 0.5;
    gsap.delayedCall(SCROLL_SYNC_STEP_1_SEC, scrollToBottom);
    gsap.delayedCall(SCROLL_SYNC_STEP_2_SEC, scrollToBottom);
    gsap.delayedCall(SCROLL_SYNC_STEP_3_SEC, scrollToBottom);
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
          <DirectChatMessageRow
            v-for="(msg, idx) in chat?.messages"
            :key="idx"
            :msg="msg"
            :is-me="msg.senderId === authStore.user?.id"
            :cosmetics="chatStore.profileCosmetics[msg.senderId || '']"
            @open-profile="openTrainerProfile"
          />
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
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: Rgb(13 17 23 / 98%);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  padding: 15px;
  flex: 1;
  overflow-y: auto;
}

.chat-start-hint {
  color: Rgb(255 255 255 / 50%);
  font-size: 9px;
  text-align: center;
  margin-bottom: 5px;
  font-style: italic;
}

.empty-state {
  padding: 40px 20px;
  color: Rgb(148 163 184 / 100%);
  font-size: 12px;
  text-align: center;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.message-content {
  padding: 8px 12px;
  border: 1px solid Rgb(255 255 255 / 5%);
  border-radius: 0 12px 12px;
  background: Rgb(255 255 255 / 3%);
  flex: 1;

  &.is-me {
    background: Rgb(157 78 221 / 15%);
    border-color: Rgb(157 78 221 / 30%);
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
  background: Rgb(0 0 0 / 20%);
  border-top: 1px solid Rgb(255 255 255 / 5%);

  .input-container {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  input {
    padding: 10px 12px;
    border: 1px solid Rgb(199 125 255 / 20%);
    border-radius: 8px;
    background: Rgb(0 0 0 / 30%);
    color: var(--white);
    font-size: 13px;
    flex: 1;
    outline: none;

    &:focus { border-color: var(--purple-light); }
  }

  .send-btn {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 8px;
    background: var(--purple);
    color: var(--white);
    cursor: pointer;

    &:hover:not(:disabled) { background: Rgb(157 78 221 / 100%); transform: Scale(1.05); }
    &:disabled { opacity: 0.3; }
  }

  .hint {
    margin: 0;
    color: Rgb(255 255 255 / 50%);
    font-size: 10px;
    text-align: right;
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
    opacity: 0.85;
    text-decoration: underline;
  }
}
</style>
