<script setup lang="ts">
import TrainerAvatar from '@/components/profile/TrainerAvatar.vue'
import { formatPlayerClass } from '@/logic/utils/formatters'
import { resolveFactionColor, resolveFactionLabel } from '@/components/modals/trainerProfileResolver'

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

const DEFAULT_TRAINER_AVATAR_SIZE_PX = 40

const _TRAINER_CARD_VARIANTS = ['normal', 'pending'] as const
type TrainerCardVariant = (typeof _TRAINER_CARD_VARIANTS)[number]

const props = withDefaults(defineProps<{
  profile: ProfileData
  avatarSize?: number
  variant?: TrainerCardVariant
}>(), {
  avatarSize: DEFAULT_TRAINER_AVATAR_SIZE_PX,
  variant: 'normal'
})

const emit = defineEmits<{
  (e: 'click-profile', userId: string): void
}>()

function onClickProfile() {
  emit('click-profile', props.profile.id)
}

function hasValidFaction(faction?: string | null): boolean {
  if (!faction) return false
  const clean = faction.trim().toLowerCase()
  return clean !== '' && clean !== 'null' && clean !== 'undefined' && clean !== 'sin bando'
}

function getFactionColor(faction?: string | null): string {
  return resolveFactionColor(faction)
}

function getFactionLabel(faction?: string | null): string {
  const clean = faction?.trim().toLowerCase() || ''
  if (clean === 'poder') return 'PODER'
  if (clean === 'union') return 'UNIÓN'
  if (clean === 'rocket') return 'ROCKET'
  return resolveFactionLabel(faction).toUpperCase()
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
        <div class="trainer-name-row">
          <span
            v-gsap-nick="profile.nick_style || 'normal'"
            class="name clickable-username text-outline"
            :class="profile.nick_style || 'normal'"
            @click.stop="onClickProfile"
          >
            {{ profile.username }}
          </span>
          <span
            v-if="hasValidFaction(profile.faction)"
            class="faction-tag-badge text-outline"
            :style="{ backgroundColor: getFactionColor(profile.faction) }"
          >
            {{ getFactionLabel(profile.faction) }}
          </span>
        </div>
        <div class="meta">
          <slot name="subtext">
            Nv.{{ profile.level }} • {{ formatPlayerClass(profile.playerClass) }}
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

.trainer-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.faction-tag-badge {
  @include pixelated;

  padding: 1px 4px;
  border-radius: 4px;
  color: white;
  font-size: 6px;
  line-height: 1.25;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.trainer-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 12px;
  border-radius: 16px;
  border-width: 1px;
  border-style: solid;
  box-sizing: border-box;
  cursor: pointer;


  &.normal {
    background: Rgb(255 255 255 / 3%);
    border-color: Rgb(255 255 255 / 10%);

    &:hover {
      background: Rgb(255 255 255 / 5%);
      border-color: Rgb(255 255 255 / 30%);
    }
  }

  &.pending {
    background: Rgb(157 78 221 / 5%);
    border-color: Rgb(157 78 221 / 25%);

    &:hover {
      background: Rgb(157 78 221 / 8%);
      border-color: Rgb(157 78 221 / 45%);
    }
  }
}

.trainer-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trainer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .name {
    color: var(--white);
    font-size: 14px;
    font-weight: 700;
    line-height: 1.2;
  }

  .meta {
    color: Rgb(255 255 255 / 50%);
    font-size: 11px;
    line-height: 1.2;
  }
}

.trainer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
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
