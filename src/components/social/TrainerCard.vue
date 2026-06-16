<script setup lang="ts">
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { formatPlayerClass, formatFaction } from '@/logic/utils/formatters'

interface ProfileData {
  id: string
  username: string
  level: number
  playerClass?: string | null
  faction?: string | null
  nick_style?: string | null
  avatar_style?: string | null
  gender?: string | null
  avatarFrame?: string | null
  avatarDecor?: string | null
}

const props = withDefaults(defineProps<{
  profile: ProfileData
  avatarSize?: number
  variant?: 'normal' | 'pending'
}>(), {
  avatarSize: 40,
  variant: 'normal'
})

const emit = defineEmits<{
  (e: 'click-profile', userId: string): void
}>()

function onClickProfile() {
  emit('click-profile', props.profile.id)
}
</script>

<template>
  <div
    class="trainer-card"
    :class="variant"
    @click.stop="onClickProfile"
  >
    <div class="trainer-main">
      <TrainerAvatar
        :profile="profile"
        :size="avatarSize"
        class="clickable-avatar"
        @click.stop="onClickProfile"
      >
        <template
          v-if="$slots['avatar-overlay']"
          #overlay
        >
          <slot name="avatar-overlay" />
        </template>
      </TrainerAvatar>

      <div class="trainer-info">
        <div
          v-gsap-nick="profile.nick_style || 'normal'"
          class="name clickable-username"
          :class="profile.nick_style || 'normal'"
          @click.stop="onClickProfile"
        >
          {{ profile.username }}
        </div>
        <div class="meta">
          <slot name="subtext">
            Nv.{{ profile.level }} • {{ formatPlayerClass(profile.playerClass) }}
            <template v-if="profile.faction && formatFaction(profile.faction) !== 'SIN BANDO'">
              • <span :class="profile.faction.toLowerCase().trim() + '-text-small'">{{ formatFaction(profile.faction) }}</span>
            </template>
            <template v-else>
              • {{ formatFaction(profile.faction) }}
            </template>
          </slot>
        </div>
      </div>
    </div>

    <div
      v-if="$slots.actions"
      class="trainer-actions"
      @click.stop
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.union-text-small {
  color: #60a5fa;
  font-weight: bold;
}

.poder-text-small {
  color: #f87171;
  font-weight: bold;
}

.trainer-card {
  border-radius: 16px;
  border-width: 1px;
  border-style: solid;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  cursor: pointer;


  &.normal {
    background: Rgba(255, 255, 255, 0.03);
    border-color: Rgba(255, 255, 255, 0.1);

    &:hover {
      background: Rgba(255, 255, 255, 0.05);
      border-color: Rgba(255, 255, 255, 0.3);
    }
  }

  &.pending {
    background: Rgba(157, 78, 221, 0.05);
    border-color: Rgba(157, 78, 221, 0.25);

    &:hover {
      background: Rgba(157, 78, 221, 0.08);
      border-color: Rgba(157, 78, 221, 0.45);
    }
  }
}

.trainer-main {
  display: flex;
  gap: 12px;
  align-items: center;
}

.trainer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .name {
    font-size: 14px;
    font-weight: 700;
    color: var(--white);
    line-height: 1.2;
  }

  .meta {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.5);
    line-height: 1.2;
  }
}

.trainer-actions {
  display: flex;
  gap: 6px;
  align-items: center;
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
    text-decoration: underline;
    opacity: 0.85;
  }
}
</style>
