<script setup lang="ts">


import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { gsap } from 'gsap';
import { useDocumentListener } from '@/composables/ui/useWindowListener';
import { useChatStore } from '@/stores/chat';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { formatTime } from '@/logic/utils/timeUtils';


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
    { scale: 1.0, opacity: 1, duration: 0.25, ease: 'back.out(1.7)', onComplete: done }
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
      <span class="icon">💬</span>
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
              v-for="msg in chatStore.globalMessages" 
              :key="msg.id" 
              class="message-row"
            >
              <TrainerAvatar 
                :player-class="chatStore.profileCosmetics[msg.user_id || '']?.player_class || msg.player_class" 
                :level="chatStore.profileCosmetics[msg.user_id || '']?.trainer_level || msg.trainer_level" 
                :avatar-style="chatStore.profileCosmetics[msg.user_id || '']?.avatar_style || undefined"
                :gender="chatStore.profileCosmetics[msg.user_id || '']?.gender || msg.gender || 'h'"
                :size="32"
                class="clickable-avatar"
                @click.stop="openTrainerProfile(msg.user_id)"
              />
              <div class="message-content">
                <div class="message-meta">
                  <span
                    v-gsap-nick="chatStore.profileCosmetics[msg.user_id || '']?.nick_style || 'normal'"
                    class="username clickable-username"
                    :class="chatStore.profileCosmetics[msg.user_id || '']?.nick_style || 'normal'"
                    @click.stop="openTrainerProfile(msg.user_id)"
                  >{{ chatStore.profileCosmetics[msg.user_id || '']?.username || msg.username }}</span>
                  <span class="time">{{ formatTime(msg.created_at) }}</span>
                </div>
                <p class="text">
                  {{ msg.message }}
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
              :placeholder="canWrite ? 'Habla con el mundo...' : `Nivel ${MIN_LEVEL} requerido`"
              :disabled="!canWrite"
              :maxlength="MAX_CHARS"
              @keydown.enter="handleSendMessage"
            >
            <button 
              class="send-btn" 
              :disabled="!canWrite || !newMessage.trim()"
              @click.stop="handleSendMessage"
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
  background: Rgba(13, 17, 23, 0.98);
  border: 1px solid Rgba(199, 125, 255, 0.3);
  border-radius: 12px;
  padding: 10px 16px;
  color: $white;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.4);

  &:hover {
    transform: Translatey(-2px);
    border-color: var(--purple-light);
    background: Rgba(13, 17, 23, 0.95);
  }

  .icon { font-size: 18px; }
  .label { 
    @include pixelated;
    font-size: 8px;
    letter-spacing: 0.5px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    min-width: 60px;

    .icon { font-size: 16px; }
    .label { font-size: 6px; }
  }
}

.chat-panel {
  width: 100%;
  height: 100%;
  background: Rgba(13, 17, 23, 0.98);
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 20px;
  background: Linear-Gradient(to bottom, Rgba(157, 78, 221, 0.1), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);

  .title {
    @include pixelated;
    font-size: 10px;
    color: var(--purple-light);
    text-shadow: 2px 2px 0px Rgba(0, 0, 0, 0.5); // Sharp shadow for pixel font
  }

  .close-btn {
    background: Rgba(255, 255, 255, 0.05);
    border: none;
    color: Rgba(148, 163, 184, 1);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: Rgba(239, 68, 68, 0.15);
      color: Rgba(248, 113, 113, 1);
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
  min-height: 0; // Fix flex collapse for scroll stability
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

    &.rocket { color: Rgba(248, 113, 113, 1); }
    &.cazabichos { color: Rgba(74, 222, 128, 1); }
    &.criador { color: Rgba(192, 132, 252, 1); }
    &.entrenador { color: Rgba(96, 165, 250, 1); }
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
    color: $white;
    font-size: 13px;
    outline: none;

    &:focus { border-color: var(--purple-light); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .send-btn {
    background: var(--purple);
    border: none;
    border-radius: 8px;
    width: 38px;
    height: 38px;
    color: $white;
    cursor: pointer;

    &:hover:not(:disabled) { background: Rgba(157, 78, 221, 1); transform: Scale(1.05); }
    &:disabled { opacity: 0.3; }
  }

  .hint, .hint-error {
    font-size: 10px;
    margin: 0;
    text-align: right;
  }

  .hint { color: Rgba(255, 255, 255, 0.5); }
  .hint-error { color: Rgba(248, 113, 113, 1); font-weight: 700; }
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

