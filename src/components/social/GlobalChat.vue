<script setup lang="ts">


import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { gsap } from 'gsap';
import { useDocumentListener } from '@/composables/ui/useWindowListener';
import { useChatStore } from '@/stores/social/chat';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import ChatBattleCodeBadge from './ChatBattleCodeBadge.vue';
import { MESSAGE_ANIM_DURATION_SEC, MESSAGE_ANIM_OVERSHOOT } from '@/logic/constants/visuals';
import {
  GLOBAL_CHAT_MIN_LEVEL,
  GLOBAL_CHAT_MAX_CHARS,
  canTrainerParticipateInGlobalChat,
  resolveChatMessageVisuals
} from './globalChatHelper';

const chatStore = useChatStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const isOpen = computed({
  get: () => uiStore.isChatOpen,
  set: (val: boolean) => { uiStore.isChatOpen = val }
});
const newMessage = ref('');
const messagesContainer = ref<HTMLDivElement | null>(null);
const inputField = ref<HTMLInputElement | null>(null);
const chatPanelRef = ref<HTMLElement | null>(null);
const chatToggleRef = ref<HTMLButtonElement | null>(null);

const canWrite = computed(() => canTrainerParticipateInGlobalChat(gameStore.state.trainerLevel));

const displayMessages = computed(() => {
  const cosmetics = chatStore.profileCosmetics;
  return chatStore.globalMessages.map(msg => ({
    raw: msg,
    visuals: resolveChatMessageVisuals(msg, cosmetics)
  }));
});

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

// Auto-scroll when new messages arrive if panel is open
watch(() => chatStore.globalMessages.length, () => {
  if (isOpen.value) {
    nextTick(scrollToBottom);
  }
  chatStore.fetchMissingCosmetics();
});

function handleOutsideClick(e: Event) {
  if (!isOpen.value || !chatPanelRef.value) return;
  
  const target = e.target as Node;
  
  // Check if click is outside the panel and the toggle button
  const isInsidePanel = chatPanelRef.value.contains(target);
  const isToggleButton = chatToggleRef.value?.contains(target);
  
  if (!isInsidePanel && !isToggleButton) {
    isOpen.value = false;
  }
}

function openTrainerProfile(userId?: string) {
  if (!userId) return;
  uiStore.open('TrainerProfile', { userId });
}


const onMessageEnter = (el: Element, done: () => void) => {
  gsap.fromTo(el,
    { scale: 0.9, opacity: 0 },
    { scale: 1.0, opacity: 1, duration: MESSAGE_ANIM_DURATION_SEC, ease: `back.out(${MESSAGE_ANIM_OVERSHOOT})`, onComplete: done }
  )
}

onMounted(async () => {
  chatStore.initGlobalChat();
  await chatStore.fetchMissingCosmetics();
});

useDocumentListener('click', handleOutsideClick); // [PureVue-Ignore]
</script>

<template>
  <div class="global-chat-root">
    <!-- Toggle Button -->
    <button 
      ref="chatToggleRef"
      class="chat-toggle-btn" 
      :class="{ 'has-unread': !isOpen && chatStore.globalMessages.length > 0 }"
      @click.stop="toggleChat"
    >
      <span class="emoji">💬</span>
      <span class="label">Chat</span>
    </button>

    <!-- Side Panel via BaseModal -->
    <BaseModal
      :show="isOpen"
      title="MUNDO"
      type="side-left"
      :lock-scroll="false"
      overlay="none"
      :show-close-button="true"
      padding="raw"
      @close="toggleChat"
    >
      <section 
        ref="chatPanelRef"
        class="chat-panel"
      >
        <div
          ref="messagesContainer"
          class="messages-list custom-scrollbar-vicio"
        >
          <div
            v-if="chatStore.globalMessages.length === 0"
            class="empty-state"
          >
            No hay mensajes aún...
          </div>

          <TransitionGroup
            :css="false"
            @enter="onMessageEnter"
          >
            <div 
              v-for="item in displayMessages" 
              :key="item.raw.id" 
              class="message-row"
            >
              <TrainerAvatar 
                :player-class="item.visuals.playerClass" 
                :level="item.visuals.level" 
                :avatar-style="item.visuals.avatarStyle"
                :gender="item.visuals.gender"
                :size="32"
                class="clickable-avatar"
                @click.stop="openTrainerProfile(item.raw.user_id)"
              />
              <div class="message-content">
                <div class="message-meta">
                  <span
                    v-gsap-nick="item.visuals.nickStyle"
                    class="username clickable-username"
                    :class="item.visuals.nickStyle"
                    @click.stop="openTrainerProfile(item.raw.user_id)"
                  >{{ item.visuals.username }}</span>
                  <span class="time">{{ item.visuals.time }}</span>
                </div>
                <p class="text">
                  {{ item.visuals.messageText }}
                </p>
                <ChatBattleCodeBadge
                  v-if="item.visuals.battleCode"
                  :battle-code="item.visuals.battleCode"
                />
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
              :placeholder="canWrite ? 'Habla con el mundo...' : `Nivel ${GLOBAL_CHAT_MIN_LEVEL} requerido`"
              :disabled="!canWrite"
              :maxlength="GLOBAL_CHAT_MAX_CHARS"
              @keydown.enter="handleSendMessage"
            >
            <button 
              class="send-btn" 
              :disabled="!canWrite || !newMessage.trim()"
              @click.stop="handleSendMessage"
            >
              <span class="emoji">➤</span>
            </button>
          </div>
          <p
            v-if="!canWrite"
            class="hint-error"
          >
            Subí a nivel {{ GLOBAL_CHAT_MIN_LEVEL }} para participar.
          </p>
          <p
            v-else
            class="hint"
          >
            {{ newMessage.length }}/{{ GLOBAL_CHAT_MAX_CHARS }}
          </p>
        </footer>
      </section>
    </BaseModal>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "sass:string";

.global-chat-root {
  position: relative;
  z-index: var(--z-max);
}

.chat-toggle-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: 1px solid Rgb(199 125 255 / 30%);
  border-radius: 12px;
  background: Rgb(13 17 23 / 98%);
  color: $white;
  cursor: pointer;
  box-shadow: 0 4px 15px Rgb(0 0 0 / 40%);

  &:hover {
    background: Rgb(13 17 23 / 95%);
    transform: Translatey(-2px);
    border-color: var(--purple-light);
  }

  .icon { font-size: 18px; }
  .label { 
    @include pixelated;

    font-size: 8px;
    letter-spacing: 0.5px;
  }

  @media (width <= 600px) {
    flex-direction: column;
    gap: 4px;
    min-width: 60px;
    padding: 8px;

    .icon { font-size: 16px; }
    .label { font-size: 6px; }
  }
}

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
  min-height: 0; // Fix flex collapse for scroll stability
  padding: 15px;
  flex: 1;
  overflow-y: auto;
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
}

.message-meta {
  @include chat-message-meta;

  .username {
    &.rocket { color: Rgb(248 113 113 / 100%); }
    &.cazabichos { color: Rgb(74 222 128 / 100%); }
    &.criador { color: Rgb(192 132 252 / 100%); }
    &.entrenador { color: Rgb(96 165 250 / 100%); }
  }
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
    color: $white;
    font-size: 13px;
    flex: 1;
    outline: none;

    &:focus { border-color: var(--purple-light); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .send-btn {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 8px;
    background: var(--purple);
    color: $white;
    cursor: pointer;

    &:hover:not(:disabled) { background: Rgb(157 78 221 / 100%); transform: Scale(1.05); }
    &:disabled { opacity: 0.3; }
  }

  %hint-base {
    margin: 0;
    font-size: 10px;
    text-align: right;
  }

  .hint {
    @extend %hint-base;

    color: Rgb(255 255 255 / 50%);
  }

  .hint-error {
    @extend %hint-base;

    color: Rgb(248 113 113 / 100%);
    font-weight: 700;
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

