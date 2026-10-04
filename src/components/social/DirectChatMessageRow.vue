<script setup lang="ts">
import { computed } from 'vue'
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import ChatBattleCodeBadge from './ChatBattleCodeBadge.vue'
import { formatChatTimestamp } from '@/logic/utils/timeUtils.ts'
import { BATTLE_CODE_REGEX } from '@/logic/constants/gameplay.ts'
import type { ChatMessage } from '@/stores/social/chatPrivate.ts'
import type { ProfileCacheItem } from '@/stores/social/chatCosmetics.ts'

const {
  msg,
  isMe = false,
  cosmetics = null
} = defineProps<{
  msg: ChatMessage
  isMe?: boolean
  cosmetics?: ProfileCacheItem | null
}>()

const emit = defineEmits<{
  openProfile: [userId: string]
}>()

function extractBattleCode(message?: string): string | null {
  if (!message) return null
  const match = message.match(BATTLE_CODE_REGEX)
  // domain-ok: UI presentation uppercase battle code
  return match ? match[0].toUpperCase() : null
}

const playerClass = computed(() => cosmetics?.player_class || msg.player_class)
const trainerLevel = computed(() => cosmetics?.trainer_level || msg.trainer_level)
const avatarStyle = computed(() => cosmetics?.avatar_style || undefined)
const gender = computed(() => cosmetics?.gender || msg.gender || 'h')
const username = computed(() => cosmetics?.username || msg.senderName)
const nickStyle = computed(() => cosmetics?.nick_style || 'normal')
const formattedTime = computed(() => formatChatTimestamp(msg.timestamp))
const battleCode = computed(() => extractBattleCode(msg.text))
</script>

<template>
  <div class="message-row">
    <TrainerAvatar 
      :player-class="playerClass" 
      :level="trainerLevel" 
      :avatar-style="avatarStyle"
      :gender="gender"
      :size="32"
      class="clickable-avatar"
      @click.stop="emit('openProfile', msg.senderId || '')"
    />
    <div
      class="message-content"
      :class="{ 'is-me': isMe }"
    >
      <div class="message-meta">
        <span
          v-gsap-nick="nickStyle"
          class="username clickable-username"
          :class="nickStyle"
          @click.stop="emit('openProfile', msg.senderId || '')"
        >{{ username }}</span>
        <span class="time">{{ formattedTime }}</span>
      </div>
      <p class="text">
        {{ msg.text }}
      </p>
      <ChatBattleCodeBadge
        v-if="battleCode"
        :battle-code="battleCode"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

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

.clickable-avatar {
  cursor: pointer;
  will-change: transform, filter;

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
